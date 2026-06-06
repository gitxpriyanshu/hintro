const prisma = require('../../config/database');
const { OpenAI } = require('openai');
const { NotFoundError, AppError } = require('../../utils/errors');
const logger = require('../../config/logger');

// Lazy-initialized OpenRouter client via OpenAI package
let _openai = null;
function getOpenAIClient() {
  if (!_openai) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new AppError('Server Configuration Error: GROQ_API_KEY environment variable is missing.', 500, 'CONFIG_ERROR');
    }
    _openai = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey
    });
  }
  return _openai;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function timeStringToSeconds(timeStr) {
  if (typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function findNearestTimestamp(target, validList) {
  if (!validList || validList.length === 0) return target;
  if (validList.includes(target)) return target;

  const targetSec = timeStringToSeconds(target);
  let nearest = validList[0];
  let minDiff = Math.abs(timeStringToSeconds(nearest) - targetSec);

  for (let i = 1; i < validList.length; i++) {
    const current = validList[i];
    const diff = Math.abs(timeStringToSeconds(current) - targetSec);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = current;
    }
  }
  return nearest;
}

async function analyzeMeeting(meetingId, userId, traceId) {
  // 1. Fetch meeting and check ownership
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, userId },
    include: { analysis: true }
  });

  if (!meeting) {
    throw new NotFoundError('Meeting could not be found or access is restricted.');
  }

  // If already analyzed, return cached result
  if (meeting.status === 'ANALYZED' && meeting.analysis) {
    logger.info(`Meeting ${meetingId} already analyzed. Returning cached report.`, { traceId, meetingId });
    const actionItems = await prisma.actionItem.findMany({
      where: { meetingId }
    });
    return {
      ...meeting.analysis,
      actionItems
    };
  }

  // 2. Format transcript
  const formattedTranscript = meeting.transcript
    .map(line => `[${line.timestamp}] ${line.speaker}: ${line.text}`)
    .join('\n');

  const systemPrompt = `You are a meeting analyst that ONLY uses information explicitly present in the transcript.
NEVER invent, assume, or add information not explicitly stated in the transcript. If something is not directly discussed, do not include it.
You must cite every single insight or item you produce. A citation must point to the exact transcript segment using its timestamp, speaker name, and a short direct quote from the speaker's text.
You must return ONLY valid JSON. Do not include markdown code fences, do not include any markdown syntax, and do not provide any explanations before or after the JSON.`;

  const userPrompt = `Here is the meeting transcript and its participants.

Participants:
${meeting.participants.join(', ')}

Transcript:
${formattedTranscript}

Perform an analysis and return a JSON object with exactly this structure:
{
  "summary": [
    {
      "text": "Brief summary sentence of a point discussed.",
      "citations": [
        { "timestamp": "MM:SS", "speaker": "Speaker Name", "quote": "exact quote from transcript" }
      ]
    }
  ],
  "decisions": [
    {
      "text": "Decision that was agreed upon.",
      "citations": [
        { "timestamp": "MM:SS", "speaker": "Speaker Name", "quote": "exact quote from transcript" }
      ]
    }
  ],
  "actionItems": [
    {
      "task": "Specific task description.",
      "assignee": "Name or email of the assigned participant.",
      "dueDate": "ISO 8601 date string, or null if not discussed",
      "citations": [
        { "timestamp": "MM:SS", "speaker": "Speaker Name", "quote": "exact quote from transcript" }
      ]
    }
  ],
  "followUpSuggestions": [
    {
      "text": "Suggested follow-up action or next topic.",
      "citations": [
        { "timestamp": "MM:SS", "speaker": "Speaker Name", "quote": "exact quote from transcript" }
      ]
    }
  ]
}

Every summary point, decision, action item, and follow-up suggestion MUST have at least one valid citation from the transcript. Insights without citations are invalid.
Return ONLY the JSON object. No markdown, no explanation, no code fences.`;

  // 3. Call OpenRouter AI with retry
  let response;
  const callAIClient = async () => {
    const client = getOpenAIClient();
    return await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 4096
    });
  };

  try {
    logger.info(`Sending AI meeting analysis request for meeting ID: ${meetingId} (Attempt 1)`, { traceId, meetingId });
    response = await callAIClient();
  } catch (firstErr) {
    logger.warn(`AI meeting analysis request failed on first attempt: ${firstErr.message}. Retrying in 2 seconds...`, { traceId, meetingId });
    await delay(2000);
    try {
      logger.info(`Sending AI meeting analysis request for meeting ID: ${meetingId} (Attempt 2 - Retry)`, { traceId, meetingId });
      response = await callAIClient();
    } catch (secondErr) {
      logger.error(`AI meeting analysis request failed on second attempt: ${secondErr.message}`, { traceId, meetingId });
      throw new AppError('AI meeting intelligence analysis API connection failed.', 502, 'AI_CONNECTION_ERROR');
    }
  }

  // 4. Extract and log token usage
  const usage = response.usage;
  const responseText = response.choices[0]?.message?.content;
  logger.info(`AI analysis completion successful for meeting: ${meetingId}`, {
    traceId,
    meetingId,
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
    totalTokens: usage?.total_tokens
  });

  if (!responseText) {
    throw new AppError('AI returned an empty response.', 502, 'AI_PARSE_ERROR');
  }

  // 5. Parse and validate response
  let parsedData;
  try {
    const cleanJson = responseText.replace(/```json|```/gi, '').trim();
    parsedData = JSON.parse(cleanJson);
  } catch (err) {
    logger.error('Failed to parse AI response content as JSON.', { traceId, meetingId, responseText, error: err.message });
    throw new AppError('AI response format was invalid or could not be parsed.', 502, 'AI_PARSE_ERROR');
  }

  // Validate structural arrays
  if (
    !parsedData ||
    typeof parsedData !== 'object' ||
    !Array.isArray(parsedData.summary) ||
    !Array.isArray(parsedData.decisions) ||
    !Array.isArray(parsedData.actionItems) ||
    !Array.isArray(parsedData.followUpSuggestions)
  ) {
    logger.error('AI response lacks standard arrays', { traceId, meetingId, parsedData });
    throw new AppError('AI response was missing required structural arrays.', 502, 'AI_PARSE_ERROR');
  }

  // Validate citations presence
  const validateCitations = (items) => {
    for (const item of items) {
      if (!Array.isArray(item.citations) || item.citations.length === 0) {
        return false;
      }
      for (const citation of item.citations) {
        if (!citation.timestamp || !citation.speaker || !citation.quote) {
          return false;
        }
      }
    }
    return true;
  };

  if (
    !validateCitations(parsedData.summary) ||
    !validateCitations(parsedData.decisions) ||
    !validateCitations(parsedData.actionItems) ||
    !validateCitations(parsedData.followUpSuggestions)
  ) {
    logger.error('One or more AI insights contain blank or invalid citations', { traceId, meetingId, parsedData });
    throw new AppError('AI response included insights without valid citations.', 502, 'AI_PARSE_ERROR');
  }

  // 6. Validate citations against transcript timestamps
  const validTimestamps = meeting.transcript.map(t => t.timestamp);

  const cleanCitationsTimestamps = (items) => {
    for (const item of items) {
      for (const citation of item.citations) {
        if (!validTimestamps.includes(citation.timestamp)) {
          logger.warn(`AI citation timestamp "${citation.timestamp}" not in transcript list. Finding closest.`, { traceId, meetingId });
          const nearest = findNearestTimestamp(citation.timestamp, validTimestamps);
          citation.timestamp = nearest;
        }
      }
    }
  };

  cleanCitationsTimestamps(parsedData.summary);
  cleanCitationsTimestamps(parsedData.decisions);
  cleanCitationsTimestamps(parsedData.actionItems);
  cleanCitationsTimestamps(parsedData.followUpSuggestions);

  // 7. Save to database in Prisma transaction
  return await prisma.$transaction(async (tx) => {
    const meetingAnalysis = await tx.meetingAnalysis.create({
      data: {
        meetingId,
        summary: parsedData.summary,
        decisions: parsedData.decisions,
        actionItemsRaw: parsedData.actionItems,
        followUpSuggestions: parsedData.followUpSuggestions
      }
    });

    const actionItemsData = parsedData.actionItems.map(item => {
      let parsedDueDate = null;
      if (item.dueDate) {
        const d = new Date(item.dueDate);
        if (!isNaN(d.getTime())) {
          parsedDueDate = d;
        }
      }
      return {
        meetingId,
        task: item.task,
        assignee: item.assignee,
        dueDate: parsedDueDate,
        status: 'PENDING',
        citations: item.citations
      };
    });

    if (actionItemsData.length > 0) {
      await tx.actionItem.createMany({
        data: actionItemsData
      });
    }

    await tx.meeting.update({
      where: { id: meetingId },
      data: { status: 'ANALYZED' }
    });

    const actionItems = await tx.actionItem.findMany({
      where: { meetingId }
    });

    return {
      ...meetingAnalysis,
      actionItems
    };
  });
}

async function getAnalysisByMeetingId(meetingId, userId) {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, userId }
  });

  if (!meeting) {
    throw new NotFoundError('Meeting could not be found or access is restricted.');
  }

  const analysis = await prisma.meetingAnalysis.findUnique({
    where: { meetingId }
  });

  if (!analysis) {
    throw new NotFoundError('No analysis report has been generated for this meeting yet.');
  }

  const actionItems = await prisma.actionItem.findMany({
    where: { meetingId }
  });

  return {
    ...analysis,
    actionItems
  };
}

module.exports = {
  analyzeMeeting,
  getAnalysisByMeetingId
};