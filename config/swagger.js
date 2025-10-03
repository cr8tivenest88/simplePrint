const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SimplePrint API',
            version: '1.0.0',
            description: `
# SimplePrint Calculator API

A stateless API for calculating printing quotes and retrieving product information.

## Architecture

This Node.js service serves as a calculation engine for WordPress:
- **Node** handles form rendering and price calculations
- **WordPress** manages data persistence and user interactions

## Data Contract

### Input
- **productId**: string - Product identifier
- **quantity**: integer > 0 - Number of items to print
- **size**: string - Size name (e.g., "Standard US")
- **paperId**: string - Paper type ID (e.g., "P001")
- **upgradeNames**: array (optional) - List of upgrade names

### Output
- **inputs**: Echo of inputs with resolved names
- **totals**: Complete price breakdown
- **lineItems**: Detailed charges list
- **engineMeta**: Version, calculation time, timestamp

## Boundaries

- **Stateless**: No session or user state management
- **Fast**: Target <300ms p95 for calculations
- **Versioned**: API versioned at /api/v1
- **Secure**: CORS-protected, rate-limited

## Error Handling

All errors follow this format:
\`\`\`json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "details": ["Optional array of details"]
}
\`\`\`

Error codes:
- **VALIDATION_ERROR** (400): Invalid input
- **NOT_FOUND** (404): Resource not found
- **SERVER_ERROR** (500): Internal error
            `,
            contact: {
                name: 'API Support',
                email: 'support@simpleprint.com'
            },
            license: {
                name: 'ISC'
            }
        },
        servers: [
            {
                url: 'http://localhost:3080',
                description: 'Development server'
            },
            {
                url: 'https://api.simpleprint.com',
                description: 'Production server'
            }
        ],
        tags: [
            {
                name: 'Authentication',
                description: 'API token generation and verification'
            },
            {
                name: 'Products',
                description: 'Product catalog and details'
            },
            {
                name: 'Calculator',
                description: 'Price calculation endpoints'
            },
            {
                name: 'Resources',
                description: 'Papers and upgrades reference data'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your API token generated from /api/v1/auth/token'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error code',
                            enum: ['VALIDATION_ERROR', 'NOT_FOUND', 'SERVER_ERROR']
                        },
                        message: {
                            type: 'string',
                            description: 'Human-readable error message'
                        },
                        details: {
                            type: 'array',
                            description: 'Optional array of detailed error messages',
                            items: {
                                type: 'string'
                            }
                        }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: '1' },
                        name: { type: 'string', example: 'Standard Business Cards' },
                        description: { type: 'string' },
                        sizes: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    width: { type: 'number' },
                                    height: { type: 'number' },
                                    priceMultiplier: { type: 'number' }
                                }
                            }
                        },
                        quantityPrices: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    quantity: { type: 'integer' },
                                    price: { type: 'number' }
                                }
                            }
                        },
                        upgrades: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    upgradeCost: { type: 'number' }
                                }
                            }
                        },
                        availablePapers: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Paper' }
                        }
                    }
                },
                Paper: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'P001' },
                        name: { type: 'string', example: 'Glossy' },
                        category: { type: 'string', enum: ['standard', 'premium'] },
                        thickness: { type: 'string', example: '14pt' },
                        finish: { type: 'string', example: 'Glossy (shiny)' },
                        description: { type: 'string' },
                        upgradeCost: { type: 'number', example: 0 }
                    }
                },
                CalculationRequest: {
                    type: 'object',
                    required: ['productId', 'quantity', 'size', 'paperId'],
                    properties: {
                        productId: { type: 'string', example: '1' },
                        quantity: { type: 'integer', minimum: 1, example: 100 },
                        size: { type: 'string', example: 'Standard US' },
                        paperId: { type: 'string', example: 'P001' },
                        upgradeNames: {
                            type: 'array',
                            items: { type: 'string' },
                            example: ['Rounded Corners']
                        }
                    }
                },
                CalculationResponse: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'object',
                            properties: {
                                inputs: {
                                    type: 'object',
                                    description: 'Echo of inputs with resolved names'
                                },
                                totals: {
                                    type: 'object',
                                    properties: {
                                        basePrice: { type: 'number' },
                                        sizeMultiplier: { type: 'number' },
                                        subtotal: { type: 'number' },
                                        paperUpgrade: { type: 'number' },
                                        upgradesCost: { type: 'number' },
                                        grandTotal: { type: 'number' },
                                        unitPrice: { type: 'number' }
                                    }
                                },
                                lineItems: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            description: { type: 'string' },
                                            quantity: { type: 'integer' },
                                            unitPrice: { type: 'number' },
                                            total: { type: 'number' }
                                        }
                                    }
                                },
                                appliedUpgrades: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            description: { type: 'string' },
                                            cost: { type: 'number' }
                                        }
                                    }
                                },
                                engineMeta: {
                                    type: 'object',
                                    properties: {
                                        version: { type: 'string', example: 'v1.0.0' },
                                        calcMs: { type: 'integer', description: 'Calculation time in ms' },
                                        timestamp: { type: 'string', format: 'date-time' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    apis: ['./routes/*.js'] // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
