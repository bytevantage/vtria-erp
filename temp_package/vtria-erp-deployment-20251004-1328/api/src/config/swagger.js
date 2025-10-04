const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VTRIA ERP API',
      version: '1.0.0',
      description: 'API documentation for VTRIA Engineering Solutions ERP System',
      contact: {
        name: 'VTRIA Engineering Solutions',
        email: 'info@vtria.com',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.vtria.com' 
          : 'http://localhost:3001',
        description: process.env.NODE_ENV === 'production' 
          ? 'Production server' 
          : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'full_name', 'user_role'],
          properties: {
            id: {
              type: 'integer',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            full_name: {
              type: 'string',
              description: 'Full name of the user',
            },
            user_role: {
              type: 'string',
              enum: ['director', 'admin', 'sales-admin', 'designer', 'accounts', 'technician'],
              description: 'User role in the system',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: 'User status',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        SalesEnquiry: {
          type: 'object',
          required: ['date', 'client_id', 'project_name', 'enquiry_by'],
          properties: {
            id: {
              type: 'integer',
              description: 'Enquiry ID',
            },
            enquiry_id: {
              type: 'string',
              pattern: '^VESPL/EQ/[0-9]{4}/[0-9]{3}$',
              description: 'Formatted enquiry ID (VESPL/EQ/2526/XXX)',
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Enquiry date',
            },
            client_id: {
              type: 'integer',
              description: 'Client ID reference',
            },
            project_name: {
              type: 'string',
              description: 'Name of the project',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the enquiry',
            },
            enquiry_by: {
              type: 'integer',
              description: 'User ID who created the enquiry',
            },
            status: {
              type: 'string',
              enum: ['new', 'assigned', 'estimated', 'quoted', 'approved', 'rejected'],
              description: 'Current status of the enquiry',
            },
            assigned_to: {
              type: 'integer',
              description: 'User ID assigned to handle the enquiry',
            },
          },
        },
        Estimation: {
          type: 'object',
          required: ['enquiry_id', 'date', 'created_by'],
          properties: {
            id: {
              type: 'integer',
              description: 'Estimation ID',
            },
            estimation_id: {
              type: 'string',
              pattern: '^VESPL/ES/[0-9]{4}/[0-9]{3}$',
              description: 'Formatted estimation ID (VESPL/ES/2526/XXX)',
            },
            enquiry_id: {
              type: 'integer',
              description: 'Related enquiry ID',
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Estimation date',
            },
            status: {
              type: 'string',
              enum: ['draft', 'submitted', 'approved', 'rejected'],
              description: 'Current status of the estimation',
            },
            total_mrp: {
              type: 'number',
              format: 'decimal',
              description: 'Total MRP amount',
            },
            total_discount: {
              type: 'number',
              format: 'decimal',
              description: 'Total discount amount',
            },
            total_final_price: {
              type: 'number',
              format: 'decimal',
              description: 'Final price after discount',
            },
            created_by: {
              type: 'integer',
              description: 'User ID who created the estimation',
            },
            approved_by: {
              type: 'integer',
              description: 'User ID who approved the estimation',
            },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful',
            },
            message: {
              type: 'string',
              description: 'Response message',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
            error: {
              type: 'string',
              description: 'Error message if request failed',
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Validation failed',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name that failed validation',
                  },
                  message: {
                    type: 'string',
                    description: 'Validation error message',
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API files
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi,
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'VTRIA ERP API Documentation',
  }),
};