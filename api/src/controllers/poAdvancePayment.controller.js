const db = require('../config/database');
const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');

/**
 * Purchase Order Advance Payment Controller
 * Manages advance payments for purchase orders including tracking, approvals, and adjustments
 */
class POAdvancePaymentController {

  // Create new advance payment
  async createAdvancePayment(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        purchase_order_id,
        payment_amount,
        payment_date,
        payment_method = 'bank_transfer',
        bank_name,
        cheque_number,
        transaction_reference,
        utr_number,
        payment_due_date,
        notes,
        advance_percentage
      } = req.body;

      const requested_by = req.user?.id || 1;

      // Validate purchase order exists
      const [poDetails] = await connection.execute(`
                SELECT id, po_number, grand_total, status, supplier_id
                FROM purchase_orders 
                WHERE id = ?
            `, [purchase_order_id]);

      if (poDetails.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order not found'
        });
      }

      const po = poDetails[0];

      // Validate PO is approved
      if (po.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Advance payment can only be made for approved purchase orders'
        });
      }

      // Check existing advance payments
      const [existingPayments] = await connection.execute(`
                SELECT 
                    COALESCE(SUM(payment_amount), 0) as total_paid,
                    COALESCE(SUM(CASE WHEN payment_status = 'cleared' THEN payment_amount ELSE 0 END), 0) as total_cleared
                FROM po_advance_payments 
                WHERE purchase_order_id = ? AND payment_status != 'cancelled'
            `, [purchase_order_id]);

      const totalExisting = parseFloat(existingPayments[0].total_paid) || 0;
      const newTotal = totalExisting + parseFloat(payment_amount);
      const poTotal = parseFloat(po.grand_total);

      // Warn if payment exceeds 100% of PO
      if (newTotal > poTotal) {
        console.warn(`Advance payment exceeds PO total. PO: ${poTotal}, Total Advance: ${newTotal}`);
      }

      // Generate payment number
      const payment_number = await generateDocumentId(DOCUMENT_TYPES.ADVANCE_PAYMENT);

      // Insert advance payment
      const [paymentResult] = await connection.execute(`
                INSERT INTO po_advance_payments (
                    payment_number, purchase_order_id, payment_amount, po_grand_total,
                    payment_date, payment_method, bank_name, cheque_number, 
                    transaction_reference, utr_number, payment_due_date, 
                    notes, requested_by, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
        payment_number, purchase_order_id, payment_amount, po.grand_total,
        payment_date, payment_method, bank_name, cheque_number,
        transaction_reference, utr_number, payment_due_date,
        notes, requested_by, requested_by
      ]);

      // Update PO advance information if provided
      if (advance_percentage) {
        await connection.execute(`
                    UPDATE purchase_orders 
                    SET advance_percentage = ?, advance_amount = ?, advance_due_date = ?
                    WHERE id = ?
                `, [advance_percentage, payment_amount, payment_due_date, purchase_order_id]);
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Advance payment created successfully',
        data: {
          id: paymentResult.insertId,
          payment_number,
          amount: payment_amount,
          po_number: po.po_number,
          status: 'pending'
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating advance payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating advance payment',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Get all advance payments for a PO
  async getAdvancePaymentsByPO(req, res) {
    try {
      const { po_id } = req.params;

      const query = `
                SELECT 
                    pap.*,
                    po.po_number,
                    po.grand_total,
                    s.company_name as supplier_name,
                    u1.full_name as requested_by_name,
                    u2.full_name as approved_by_name
                FROM po_advance_payments pap
                JOIN purchase_orders po ON pap.purchase_order_id = po.id
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                LEFT JOIN users u1 ON pap.requested_by = u1.id
                LEFT JOIN users u2 ON pap.approved_by = u2.id
                WHERE pap.purchase_order_id = ?
                ORDER BY pap.payment_date DESC, pap.created_at DESC
            `;

      const [payments] = await db.execute(query, [po_id]);

      // Get payment summary
      const [summary] = await db.execute(`
                SELECT * FROM po_payment_summary WHERE purchase_order_id = ?
            `, [po_id]);

      res.json({
        success: true,
        message: 'Advance payments retrieved successfully',
        data: {
          payments,
          summary: summary[0] || null,
          count: payments.length
        }
      });

    } catch (error) {
      console.error('Error getting advance payments:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving advance payments',
        error: error.message
      });
    }
  }

  // Approve advance payment
  async approveAdvancePayment(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { payment_id } = req.params;
      const { notes } = req.body;
      const approved_by = req.user?.id || 1;

      // Check if user has approval rights
      if (!['admin', 'director', 'finance_manager'].includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to approve advance payments'
        });
      }

      // Update payment status
      await connection.execute(`
                UPDATE po_advance_payments 
                SET approval_status = 'approved', approved_by = ?, approved_at = NOW()
                WHERE id = ? AND approval_status = 'pending'
            `, [approved_by, payment_id]);

      // Add approval note if provided
      if (notes) {
        await connection.execute(`
                    UPDATE po_advance_payments 
                    SET notes = CONCAT(COALESCE(notes, ''), '\nApproval Note: ', ?)
                    WHERE id = ?
                `, [notes, payment_id]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Advance payment approved successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error approving advance payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error approving advance payment',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Update payment status (cleared, bounced, etc.)
  async updatePaymentStatus(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { payment_id } = req.params;
      const { payment_status, cleared_date, notes } = req.body;

      const validStatuses = ['pending', 'cleared', 'bounced', 'cancelled'];
      if (!validStatuses.includes(payment_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment status'
        });
      }

      // Update payment status
      const updateFields = ['payment_status = ?'];
      const updateValues = [payment_status];

      if (payment_status === 'cleared' && cleared_date) {
        updateFields.push('cleared_date = ?');
        updateValues.push(cleared_date);
      }

      if (notes) {
        updateFields.push('notes = CONCAT(COALESCE(notes, ""), "\nStatus Update: ", ?)');
        updateValues.push(notes);
      }

      updateValues.push(payment_id);

      await connection.execute(`
                UPDATE po_advance_payments 
                SET ${updateFields.join(', ')}, updated_at = NOW()
                WHERE id = ?
            `, updateValues);

      await connection.commit();

      res.json({
        success: true,
        message: `Payment status updated to ${payment_status}`
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating payment status',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Create payment adjustment (refund or adjustment against invoice)
  async createPaymentAdjustment(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { payment_id } = req.params;
      const {
        adjustment_type, // 'refund' or 'invoice_adjustment'
        adjustment_amount,
        adjustment_reason,
        invoice_id = null
      } = req.body;

      // Get payment details
      const [paymentDetails] = await connection.execute(`
                SELECT * FROM po_advance_payments WHERE id = ?
            `, [payment_id]);

      if (paymentDetails.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      const payment = paymentDetails[0];
      const currentAdjusted = parseFloat(payment.refund_amount) + parseFloat(payment.adjusted_against_invoice);
      const availableAmount = parseFloat(payment.payment_amount) - currentAdjusted;

      if (parseFloat(adjustment_amount) > availableAmount) {
        return res.status(400).json({
          success: false,
          message: `Adjustment amount exceeds available balance. Available: ₹${availableAmount}`
        });
      }

      // Update payment record
      if (adjustment_type === 'refund') {
        await connection.execute(`
                    UPDATE po_advance_payments 
                    SET refund_amount = refund_amount + ?,
                        adjustment_reason = CONCAT(COALESCE(adjustment_reason, ''), '\nRefund: ', ?)
                    WHERE id = ?
                `, [adjustment_amount, adjustment_reason, payment_id]);
      } else {
        await connection.execute(`
                    UPDATE po_advance_payments 
                    SET adjusted_against_invoice = adjusted_against_invoice + ?,
                        adjustment_reason = CONCAT(COALESCE(adjustment_reason, ''), '\nInvoice Adjustment: ', ?)
                    WHERE id = ?
                `, [adjustment_amount, adjustment_reason, payment_id]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Payment adjustment of ₹${adjustment_amount} created successfully`
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating payment adjustment:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating payment adjustment',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Get advance payment dashboard/summary
  async getAdvancePaymentDashboard(req, res) {
    try {
      const { date_from, date_to, status } = req.query;

      let whereClause = '1=1';
      const queryParams = [];

      if (date_from && date_to) {
        whereClause += ' AND pap.payment_date BETWEEN ? AND ?';
        queryParams.push(date_from, date_to);
      }

      if (status) {
        whereClause += ' AND pap.payment_status = ?';
        queryParams.push(status);
      }

      // Summary statistics
      const [summaryStats] = await db.execute(`
                SELECT 
                    COUNT(DISTINCT pap.purchase_order_id) as total_pos_with_advances,
                    COUNT(pap.id) as total_payments,
                    SUM(pap.payment_amount) as total_amount_paid,
                    SUM(CASE WHEN pap.payment_status = 'cleared' THEN pap.payment_amount ELSE 0 END) as total_cleared,
                    SUM(CASE WHEN pap.payment_status = 'pending' THEN pap.payment_amount ELSE 0 END) as total_pending,
                    SUM(pap.refund_amount) as total_refunded,
                    SUM(pap.adjusted_against_invoice) as total_adjusted,
                    AVG(pap.payment_percentage) as avg_advance_percentage
                FROM po_advance_payments pap
                WHERE ${whereClause}
            `, queryParams);

      // Recent payments
      const [recentPayments] = await db.execute(`
                SELECT 
                    pap.payment_number,
                    pap.payment_date,
                    pap.payment_amount,
                    pap.payment_status,
                    po.po_number,
                    s.company_name as supplier_name
                FROM po_advance_payments pap
                JOIN purchase_orders po ON pap.purchase_order_id = po.id
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                WHERE ${whereClause}
                ORDER BY pap.payment_date DESC, pap.created_at DESC
                LIMIT 10
            `, queryParams);

      // Overdue payments
      const [overduePayments] = await db.execute(`
                SELECT 
                    pap.payment_number,
                    pap.payment_due_date,
                    pap.payment_amount,
                    DATEDIFF(CURDATE(), pap.payment_due_date) as days_overdue,
                    po.po_number,
                    s.company_name as supplier_name
                FROM po_advance_payments pap
                JOIN purchase_orders po ON pap.purchase_order_id = po.id
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                WHERE pap.payment_status = 'pending' 
                AND pap.payment_due_date < CURDATE()
                ORDER BY days_overdue DESC
                LIMIT 10
            `);

      // Status breakdown
      const [statusBreakdown] = await db.execute(`
                SELECT 
                    pap.payment_status,
                    COUNT(*) as count,
                    SUM(pap.payment_amount) as total_amount
                FROM po_advance_payments pap
                WHERE ${whereClause}
                GROUP BY pap.payment_status
            `, queryParams);

      res.json({
        success: true,
        message: 'Advance payment dashboard data retrieved successfully',
        data: {
          summary: summaryStats[0],
          recent_payments: recentPayments,
          overdue_payments: overduePayments,
          status_breakdown: statusBreakdown,
          generated_at: new Date()
        }
      });

    } catch (error) {
      console.error('Error getting advance payment dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving dashboard data',
        error: error.message
      });
    }
  }
}

module.exports = new POAdvancePaymentController();