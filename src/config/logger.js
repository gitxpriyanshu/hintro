const winston = require('winston');
const path = require('path');

// Production checks
const isProduction = process.env.NODE_ENV === 'production';

// Helper format to clean up log objects and format traceId
const logFormatter = (colorize = false) => {
  return winston.format.printf((info) => {
    const { timestamp, level, message, traceId, stack } = info;
    
    // Determine trace ID representation
    let activeTraceId = traceId;
    if (!activeTraceId && info.metadata && info.metadata.traceId) {
      activeTraceId = info.metadata.traceId;
    }
    const traceStr = activeTraceId ? ` [TraceID: ${activeTraceId}]` : '';

    // Filter out top-level winston fields for metadata presentation
    const meta = { ...info };
    delete meta.timestamp;
    delete meta.level;
    delete meta.message;
    delete meta.traceId;
    delete meta.stack;
    delete meta.service; // default metadata key

    if (meta.metadata) {
      delete meta.metadata.traceId;
      if (Object.keys(meta.metadata).length === 0) {
        delete meta.metadata;
      }
    }

    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    const levelStr = colorize ? level : `[${level.toUpperCase()}]`;

    return `${timestamp}${traceStr} ${levelStr}: ${message}${metaStr}${stackStr}`;
  });
};

// Custom formats
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  logFormatter(false)
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  logFormatter(true)
);

// Transports configuration
const transports = [
  new winston.transports.Console({
    level: isProduction ? 'info' : 'debug',
    format: consoleFormat
  })
];

// In production, log errors to error.log and all logs to combined.log
if (isProduction) {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: fileFormat
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      format: fileFormat
    })
  );
}

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true })
  ),
  defaultMeta: { service: 'hintro-meeting-intelligence' },
  transports
});

module.exports = logger;
