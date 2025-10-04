const db = require('../config/database');

// Get best prices for a product from all vendors
exports.getBestPrices = async (req, res) => {
  try {
    const { product_id } = req.params;

    const [prices] = await db.execute(`
            SELECT * FROM v_best_vendor_prices 
            WHERE product_id = ?
            ORDER BY net_price ASC
        `, [product_id]);

    res.json({
      success: true,
      data: prices
    });
  } catch (error) {
    console.error('Error fetching best prices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor prices',
      error: error.message
    });
  }
};

// Get price history for a product-vendor combination
exports.getPriceHistory = async (req, res) => {
  try {
    const { product_id, supplier_id } = req.params;

    const [history] = await db.execute(`
            SELECT vph.*, p.name as product_name, s.supplier_name
            FROM vendor_price_history vph
            JOIN products p ON vph.product_id = p.id
            JOIN suppliers s ON vph.supplier_id = s.id
            WHERE vph.product_id = ? AND vph.supplier_id = ?
            ORDER BY vph.effective_date DESC
        `, [product_id, supplier_id]);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching price history',
      error: error.message
    });
  }
};

// Add or update vendor price
exports.addVendorPrice = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      product_id,
      supplier_id,
      price,
      discount_percentage = 0,
      effective_date,
      valid_until,
      minimum_quantity = 1,
      lead_time_days = 7,
      payment_terms,
      delivery_terms,
      warranty_terms,
      notes,
      source = 'manual'
    } = req.body;

    const created_by = req.user?.id || 1;

    // Validate required fields
    if (!product_id || !supplier_id || !price || !effective_date) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, Supplier ID, Price, and Effective Date are required'
      });
    }

    // Check if there's an existing active price that needs to be superseded
    const [existingPrices] = await connection.execute(`
            SELECT id FROM vendor_price_history 
            WHERE product_id = ? AND supplier_id = ? 
                AND status = 'active' 
                AND effective_date <= ?
                AND (valid_until IS NULL OR valid_until >= ?)
        `, [product_id, supplier_id, effective_date, effective_date]);

    // Mark existing prices as superseded
    if (existingPrices.length > 0) {
      const priceIds = existingPrices.map(p => p.id);
      await connection.execute(`
                UPDATE vendor_price_history 
                SET status = 'superseded', valid_until = ?
                WHERE id IN (${priceIds.map(() => '?').join(',')})
            `, [effective_date, ...priceIds]);
    }

    // Insert new price record
    const [result] = await connection.execute(`
            INSERT INTO vendor_price_history
            (product_id, supplier_id, price, discount_percentage, effective_date, 
             valid_until, minimum_quantity, lead_time_days, payment_terms, 
             delivery_terms, warranty_terms, notes, source, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
      product_id, supplier_id, price, discount_percentage, effective_date,
      valid_until, minimum_quantity, lead_time_days, payment_terms,
      delivery_terms, warranty_terms, notes, source, created_by
    ]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Vendor price added successfully',
      data: { id: result.insertId }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error adding vendor price:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding vendor price',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Get smart pricing suggestions for estimation
exports.getSmartPricing = async (req, res) => {
  try {
    const { product_ids } = req.body;

    if (!product_ids || !Array.isArray(product_ids)) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    const placeholders = product_ids.map(() => '?').join(',');

    const [suggestions] = await db.execute(`
            SELECT 
                vbp.product_id,
                vbp.product_name,
                vbp.supplier_id,
                vbp.supplier_name,
                vbp.price,
                vbp.discount_percentage,
                vbp.net_price,
                vbp.lead_time_days,
                vbp.minimum_quantity,
                vbp.payment_terms,
                'best_price' as recommendation_type
            FROM v_best_vendor_prices vbp
            WHERE vbp.product_id IN (${placeholders}) AND vbp.price_rank = 1
            
            UNION ALL
            
            SELECT 
                vbp.product_id,
                vbp.product_name,
                vbp.supplier_id,
                vbp.supplier_name,
                vbp.price,
                vbp.discount_percentage,
                vbp.net_price,
                vbp.lead_time_days,
                vbp.minimum_quantity,
                vbp.payment_terms,
                'fastest_delivery' as recommendation_type
            FROM v_best_vendor_prices vbp
            WHERE vbp.product_id IN (${placeholders})
            ORDER BY vbp.product_id, vbp.lead_time_days ASC
        `, [...product_ids, ...product_ids]);

    // Group by product_id
    const groupedSuggestions = suggestions.reduce((acc, item) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = {
          product_id: item.product_id,
          product_name: item.product_name,
          best_price: null,
          fastest_delivery: null,
          alternatives: []
        };
      }

      if (item.recommendation_type === 'best_price' && !acc[item.product_id].best_price) {
        acc[item.product_id].best_price = item;
      } else if (item.recommendation_type === 'fastest_delivery' && !acc[item.product_id].fastest_delivery) {
        acc[item.product_id].fastest_delivery = item;
      } else {
        acc[item.product_id].alternatives.push(item);
      }

      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(groupedSuggestions)
    });

  } catch (error) {
    console.error('Error getting smart pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting pricing suggestions',
      error: error.message
    });
  }
};

// Bulk update prices from supplier quotes
exports.bulkUpdateFromQuote = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { quote_id } = req.body;
    const created_by = req.user?.id || 1;

    // Get supplier quote details
    const [quote] = await connection.execute(`
            SELECT sq.*, sqr.estimation_id 
            FROM supplier_quotes sq
            JOIN supplier_quote_requests sqr ON sq.request_id = sqr.id
            WHERE sq.id = ?
        `, [quote_id]);

    if (!quote[0]) {
      return res.status(404).json({
        success: false,
        message: 'Supplier quote not found'
      });
    }

    const quoteData = quote[0];

    // Get quote items
    const [quoteItems] = await connection.execute(`
            SELECT * FROM supplier_quote_items WHERE quote_id = ?
        `, [quote_id]);

    let updatedCount = 0;

    for (const item of quoteItems) {
      // Add to vendor price history
      await connection.execute(`
                INSERT INTO vendor_price_history
                (product_id, supplier_id, price, discount_percentage, effective_date,
                 valid_until, payment_terms, delivery_terms, warranty_terms,
                 source, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'quotation', ?)
            `, [
        item.product_id,
        quoteData.supplier_id,
        item.unit_price,
        item.discount_percentage || 0,
        quoteData.quote_date,
        quoteData.valid_until,
        quoteData.payment_terms,
        quoteData.delivery_terms,
        quoteData.warranty_terms,
        created_by
      ]);

      updatedCount++;
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Successfully updated ${updatedCount} vendor prices from quote`,
      data: { updated_count: updatedCount }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error bulk updating prices from quote:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating prices from quote',
      error: error.message
    });
  } finally {
    connection.release();
  }
};