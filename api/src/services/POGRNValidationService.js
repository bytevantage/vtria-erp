const db = require('../config/database');

/**
 * PO-GRN Validation Service
 * Comprehensive validation between Purchase Orders and Goods Receipt Notes
 */
class POGRNValidationService {

  /**
   * Validate GRN against Purchase Order before creation
   */
  static async validateGRNAgainstPO(grnData) {
    const { purchase_order_id, supplier_id, items } = grnData;
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {
        total_items: 0,
        validated_items: 0,
        over_receipts: 0,
        price_variances: 0,
        supplier_mismatch: false
      }
    };

    try {
      // 1. Validate Purchase Order exists and is approved
      const [poDetails] = await db.execute(`
                SELECT po.*, s.company_name as po_supplier_name
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.id = ?
            `, [purchase_order_id]);

      if (poDetails.length === 0) {
        validationResults.isValid = false;
        validationResults.errors.push('Purchase Order not found');
        return validationResults;
      }

      const po = poDetails[0];

      // Check PO status
      if (po.status !== 'approved') {
        validationResults.isValid = false;
        validationResults.errors.push(`Purchase Order status is '${po.status}'. Only approved POs can receive goods.`);
      }

      // 2. Validate supplier match
      if (po.supplier_id !== supplier_id) {
        validationResults.isValid = false;
        validationResults.errors.push(`Supplier mismatch. PO supplier: ${po.po_supplier_name}, GRN supplier: ${supplier_id}`);
        validationResults.summary.supplier_mismatch = true;
      }

      // 3. Get PO items for validation
      const [poItems] = await db.execute(`
                SELECT poi.*, p.name as product_name
                FROM purchase_order_items poi
                LEFT JOIN products p ON poi.product_id = p.id
                WHERE poi.purchase_order_id = ?
            `, [purchase_order_id]);

      // 4. Get existing GRN receipts for this PO
      const [existingReceipts] = await db.execute(`
                SELECT grni.product_id, 
                       SUM(grni.received_quantity) as total_received,
                       SUM(grni.accepted_quantity) as total_accepted
                FROM goods_received_notes grn
                JOIN grn_items grni ON grn.id = grni.grn_id
                WHERE grn.purchase_order_id = ? AND grn.status != 'cancelled'
                GROUP BY grni.product_id
            `, [purchase_order_id]);

      // Build map of existing receipts
      const receiptMap = {};
      existingReceipts.forEach(receipt => {
        receiptMap[receipt.product_id] = {
          total_received: parseFloat(receipt.total_received) || 0,
          total_accepted: parseFloat(receipt.total_accepted) || 0
        };
      });

      // Build map of PO items
      const poItemsMap = {};
      poItems.forEach(item => {
        poItemsMap[item.product_id] = {
          ordered_quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          product_name: item.product_name
        };
      });

      validationResults.summary.total_items = items.length;

      // 5. Validate each GRN item
      for (const grnItem of items) {
        const productId = grnItem.product_id;
        const poItem = poItemsMap[productId];
        const existingReceipt = receiptMap[productId] || { total_received: 0, total_accepted: 0 };

        // Check if item exists in PO
        if (!poItem) {
          validationResults.errors.push(`Product ID ${productId} not found in Purchase Order`);
          continue;
        }

        validationResults.summary.validated_items++;

        // Calculate total quantity after this GRN
        const newTotalReceived = existingReceipt.total_received + (parseFloat(grnItem.received_quantity) || 0);
        const orderedQuantity = poItem.ordered_quantity;

        // Check for over-receipt
        if (newTotalReceived > orderedQuantity) {
          const excess = newTotalReceived - orderedQuantity;
          validationResults.warnings.push({
            type: 'over_receipt',
            product_name: poItem.product_name,
            message: `Over-receipt detected for ${poItem.product_name}. Ordered: ${orderedQuantity}, Total Receiving: ${newTotalReceived}, Excess: ${excess}`
          });
          validationResults.summary.over_receipts++;
        }

        // Check price variance (allow 5% tolerance)
        const priceVariance = Math.abs(parseFloat(grnItem.unit_price) - poItem.unit_price);
        const priceVariancePercent = (priceVariance / poItem.unit_price) * 100;

        if (priceVariancePercent > 5) {
          validationResults.warnings.push({
            type: 'price_variance',
            product_name: poItem.product_name,
            message: `Price variance for ${poItem.product_name}. PO Price: ₹${poItem.unit_price}, GRN Price: ₹${grnItem.unit_price}, Variance: ${priceVariancePercent.toFixed(2)}%`
          });
          validationResults.summary.price_variances++;
        }

        // Validate received quantity logic
        if (parseFloat(grnItem.received_quantity) <= 0) {
          validationResults.errors.push(`Invalid received quantity for ${poItem.product_name}`);
        }

        // Validate accepted + rejected = received
        const acceptedQty = parseFloat(grnItem.accepted_quantity) || 0;
        const rejectedQty = parseFloat(grnItem.rejected_quantity) || 0;
        const receivedQty = parseFloat(grnItem.received_quantity) || 0;

        if (Math.abs((acceptedQty + rejectedQty) - receivedQty) > 0.01) {
          validationResults.warnings.push({
            type: 'quantity_mismatch',
            product_name: poItem.product_name,
            message: `Quantity mismatch for ${poItem.product_name}. Received: ${receivedQty}, Accepted + Rejected: ${acceptedQty + rejectedQty}`
          });
        }
      }

      // 6. Additional validations
      if (validationResults.errors.length > 0) {
        validationResults.isValid = false;
      }

      // Generate validation summary
      validationResults.summary.validation_passed = validationResults.isValid;
      validationResults.summary.total_warnings = validationResults.warnings.length;
      validationResults.summary.total_errors = validationResults.errors.length;

      return validationResults;

    } catch (error) {
      console.error('Error in PO-GRN validation:', error);
      validationResults.isValid = false;
      validationResults.errors.push(`Validation error: ${error.message}`);
      return validationResults;
    }
  }

  /**
   * Get PO completion status after GRN
   */
  static async getPOCompletionStatus(purchase_order_id) {
    try {
      // Get PO items with ordered quantities
      const [poItems] = await db.execute(`
                SELECT poi.product_id, poi.quantity as ordered_quantity, p.name as product_name
                FROM purchase_order_items poi
                LEFT JOIN products p ON poi.product_id = p.id
                WHERE poi.purchase_order_id = ?
            `, [purchase_order_id]);

      // Get total received quantities
      const [receivedItems] = await db.execute(`
                SELECT grni.product_id, 
                       SUM(grni.received_quantity) as total_received,
                       SUM(grni.accepted_quantity) as total_accepted,
                       SUM(grni.rejected_quantity) as total_rejected
                FROM goods_received_notes grn
                JOIN grn_items grni ON grn.id = grni.grn_id
                WHERE grn.purchase_order_id = ? AND grn.status != 'cancelled'
                GROUP BY grni.product_id
            `, [purchase_order_id]);

      // Build completion map
      const receivedMap = {};
      receivedItems.forEach(item => {
        receivedMap[item.product_id] = {
          total_received: parseFloat(item.total_received) || 0,
          total_accepted: parseFloat(item.total_accepted) || 0,
          total_rejected: parseFloat(item.total_rejected) || 0
        };
      });

      const completionStatus = {
        po_id: purchase_order_id,
        items: [],
        overall_status: 'pending',
        completion_percentage: 0,
        fully_received_items: 0,
        partially_received_items: 0,
        pending_items: 0
      };

      let totalOrderedValue = 0;
      let totalReceivedValue = 0;

      for (const poItem of poItems) {
        const received = receivedMap[poItem.product_id] || {
          total_received: 0,
          total_accepted: 0,
          total_rejected: 0
        };

        const orderedQty = parseFloat(poItem.ordered_quantity);
        const receivedQty = received.total_received;
        const completionPercent = orderedQty > 0 ? (receivedQty / orderedQty) * 100 : 0;

        let status = 'pending';
        if (receivedQty >= orderedQty) {
          status = 'completed';
          completionStatus.fully_received_items++;
        } else if (receivedQty > 0) {
          status = 'partial';
          completionStatus.partially_received_items++;
        } else {
          completionStatus.pending_items++;
        }

        completionStatus.items.push({
          product_id: poItem.product_id,
          product_name: poItem.product_name,
          ordered_quantity: orderedQty,
          received_quantity: receivedQty,
          accepted_quantity: received.total_accepted,
          rejected_quantity: received.total_rejected,
          pending_quantity: Math.max(0, orderedQty - receivedQty),
          completion_percentage: completionPercent,
          status: status
        });

        totalOrderedValue += orderedQty;
        totalReceivedValue += receivedQty;
      }

      // Calculate overall completion
      completionStatus.completion_percentage = totalOrderedValue > 0 ?
        (totalReceivedValue / totalOrderedValue) * 100 : 0;

      if (completionStatus.completion_percentage >= 100) {
        completionStatus.overall_status = 'completed';
      } else if (completionStatus.completion_percentage > 0) {
        completionStatus.overall_status = 'partial';
      }

      return completionStatus;

    } catch (error) {
      console.error('Error getting PO completion status:', error);
      throw error;
    }
  }

  /**
   * Validate GRN modification/update
   */
  static async validateGRNUpdate(grnId, updatedItems) {
    try {
      // Get existing GRN details
      const [grnDetails] = await db.execute(`
                SELECT grn.*, po.status as po_status
                FROM goods_received_notes grn
                LEFT JOIN purchase_orders po ON grn.purchase_order_id = po.id
                WHERE grn.id = ?
            `, [grnId]);

      if (grnDetails.length === 0) {
        return { isValid: false, error: 'GRN not found' };
      }

      const grn = grnDetails[0];

      // Can't modify approved GRNs
      if (grn.status === 'approved') {
        return { isValid: false, error: 'Cannot modify approved GRN' };
      }

      // Run standard validation for the updated items
      return await this.validateGRNAgainstPO({
        purchase_order_id: grn.purchase_order_id,
        supplier_id: grn.supplier_id,
        items: updatedItems
      });

    } catch (error) {
      console.error('Error validating GRN update:', error);
      return { isValid: false, error: error.message };
    }
  }
}

module.exports = POGRNValidationService;