const request = require('supertest');
const app = require('../src/server');
const db = require('../src/config/database');

beforeAll(async () => {
    // Setup test database or use test containers
});

afterAll(async () => {
    await db.end();
});

describe('Authentication', () => {
    it('should allow access in development mode with BYPASS_AUTH', async () => {
        process.env.NODE_ENV = 'development';
        process.env.BYPASS_AUTH = 'true';

        const response = await request(app)
            .get('/api/purchase-orders/1')
            .expect(200);

        expect(response.body.success).toBe(true);
    });
});

describe('Purchase Orders API', () => {
    it('should create a purchase order', async () => {
        const testData = {
            purchase_request_id: 1,
            supplier_id: 1,
            delivery_date: '2025-12-31',
            shipping_address: 'Test Address',
            billing_address: 'Test Billing Address',
            items: [
                {
                    product_id: 1,
                    quantity: 10,
                    unit: 'pcs',
                    price: 100
                }
            ]
        };

        const response = await request(app)
            .post('/api/purchase-orders')
            .send(testData)
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('po_id');
    });
});

describe('Error Handling', () => {
    it('should handle validation errors', async () => {
        const response = await request(app)
            .post('/api/purchase-orders')
            .send({})
            .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('errorCode', 'VALIDATION_ERROR');
    });
});
