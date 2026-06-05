const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hintro Meeting Intelligence API',
      version: '1.0.0',
      description: 'AI-powered meeting intelligence service for extracting insights, action items, and decisions from meeting transcripts.',
    },
    servers: [
      {
        url: '/',
        description: 'Current server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        TraceResponse: {
          type: 'object',
          properties: {
            traceId: {
              type: 'string',
            },
            success: {
              type: 'boolean',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            email: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Meeting: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            participants: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            meetingDate: {
              type: 'string',
              format: 'date-time',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'ANALYZED'],
            },
            transcript: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestamp: {
                    type: 'string',
                  },
                  speaker: {
                    type: 'string',
                  },
                  text: {
                    type: 'string',
                  },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Citation: {
          type: 'object',
          properties: {
            timestamp: {
              type: 'string',
            },
            speaker: {
              type: 'string',
            },
            quote: {
              type: 'string',
            },
          },
        },
        InsightWithCitation: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
            },
            citations: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Citation',
              },
            },
          },
        },
        ActionItemCitation: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
            },
            assignee: {
              type: 'string',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
            },
            citations: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Citation',
              },
            },
          },
        },
        MeetingAnalysis: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            meetingId: {
              type: 'string',
            },
            summary: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/InsightWithCitation',
              },
            },
            decisions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/InsightWithCitation',
              },
            },
            actionItems: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ActionItemCitation',
              },
            },
            followUpSuggestions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/InsightWithCitation',
              },
            },
          },
        },
        ActionItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            meetingId: {
              type: 'string',
            },
            task: {
              type: 'string',
            },
            assignee: {
              type: 'string',
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
            },
            citations: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Citation',
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            traceId: {
              type: 'string',
            },
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                },
                message: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.js'],
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
  // Mount the swagger-ui-express at /api/docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Expose swagger.json for programmatic access
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = {
  swaggerSpec,
  setupSwagger,
};
