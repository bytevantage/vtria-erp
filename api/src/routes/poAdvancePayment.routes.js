const express = require('express');
const router = express.Router();
const poAdvancePaymentController = require('../controllers/poAdvancePayment.controller');
const authMiddleware = require('../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     AdvancePayment:
 *       type: object
 *       required:
 *         - purchase_order_id
 *         - payment_amount
 *         - payment_date
 *       properties:
 *         purchase_order_id:
 *           type: integer
 *           description: Purchase order ID
 *         payment_amount:
 *           type: number
 *           description: Payment amount
 *         payment_date:
 *           type: string
 *           format: date
 *           description: Payment date
 *         payment_method:
 *           type: string
 *           enum: [bank_transfer, cheque, upi, cash, dd, online]
 *           description: Payment method
 *         bank_name:
 *           type: string
 *           description: Bank name
 *         transaction_reference:
 *           type: string
 *           description: Transaction reference
 *         notes:
 *           type: string
 *           description: Additional notes
 */

/**
 * @swagger
 * /api/po-advance-payments:
 *   post:
 *     summary: Create advance payment for purchase order
 *     tags: [Advance Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdvancePayment'
 *     responses:
 *       201:
 *         description: Advance payment created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['admin', 'finance_manager', 'purchase_manager']),
  poAdvancePaymentController.createAdvancePayment
);

/**
 * @swagger
 * /api/po-advance-payments/po/{po_id}:
 *   get:
 *     summary: Get all advance payments for a purchase order
 *     tags: [Advance Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: po_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Purchase order ID
 *     responses:
 *       200:
 *         description: Advance payments retrieved successfully
 *       404:
 *         description: Purchase order not found
 *       500:
 *         description: Server error
 */
router.get('/po/:po_id',
  authMiddleware.verifyToken,
  poAdvancePaymentController.getAdvancePaymentsByPO
);

/**
 * @swagger
 * /api/po-advance-payments/dashboard:
 *   get:
 *     summary: Get advance payment dashboard data
 *     tags: [Advance Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, cleared, bounced, cancelled]
 *         description: Payment status filter
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/dashboard',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['admin', 'finance_manager', 'director']),
  poAdvancePaymentController.getAdvancePaymentDashboard
);

/**
 * @swagger
 * /api/po-advance-payments/{payment_id}/approve:
 *   put:
 *     summary: Approve advance payment
 *     tags: [Advance Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payment_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Approval notes
 *     responses:
 *       200:
 *         description: Payment approved successfully
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.put('/:payment_id/approve',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['admin', 'director', 'finance_manager']),
  poAdvancePaymentController.approveAdvancePayment
);

/**
 * @swagger
 * /api/po-advance-payments/{payment_id}/status:
 *   put:
 *     summary: Update payment status
 *     tags: [Advance Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payment_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payment_status
 *             properties:
 *               payment_status:
 *                 type: string
 *                 enum: [pending, cleared, bounced, cancelled]
 *               cleared_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Invalid status
 *       500:
 *         description: Server error
 */
router.put('/:payment_id/status',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['admin', 'finance_manager']),
  poAdvancePaymentController.updatePaymentStatus
);

/**
 * @swagger
 * /api/po-advance-payments/{payment_id}/adjust:
 *   post:
 *     summary: Create payment adjustment (refund or invoice adjustment)
 *     tags: [Advance Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payment_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adjustment_type
 *               - adjustment_amount
 *               - adjustment_reason
 *             properties:
 *               adjustment_type:
 *                 type: string
 *                 enum: [refund, invoice_adjustment]
 *               adjustment_amount:
 *                 type: number
 *               adjustment_reason:
 *                 type: string
 *               invoice_id:
 *                 type: integer
 *                 description: Invoice ID (for invoice adjustments)
 *     responses:
 *       200:
 *         description: Adjustment created successfully
 *       400:
 *         description: Invalid adjustment amount
 *       500:
 *         description: Server error
 */
router.post('/:payment_id/adjust',
  authMiddleware.verifyToken,
  authMiddleware.hasRole(['admin', 'finance_manager', 'director']),
  poAdvancePaymentController.createPaymentAdjustment
);

module.exports = router;