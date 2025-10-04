const moment = require('moment');
const db = require('../config/database');

// Helper functions
async function generateQuoteRequestNumber() {
    const year = new Date().getFullYear();
    const [result] = await db.execute(
        `SELECT COUNT(*) as count FROM supplier_quote_requests WHERE YEAR(created_at) = ?`,
        [year]
    );
    const sequence = (result[0].count || 0) + 1;
    return `RFQ/${year}/${sequence.toString().padStart(4, '0')}`;
}

async function generateSupplierQuoteNumber() {
    const year = new Date().getFullYear();
    const [result] = await db.execute(
        `SELECT COUNT(*) as count FROM supplier_quotes WHERE YEAR(created_at) = ?`,
        [year]
    );
    const sequence = (result[0].count || 0) + 1;
    return `SQ/${year}/${sequence.toString().padStart(4, '0')}`;
}

class PurchasePriceComparisonController {
    // Get price comparison for estimation items
    async getEstimationPriceComparison(req, res) {
        try {
            const { estimationId } = req.params;

            // Get estimation items with their current quotes
            const estimationItemsQuery = `
                SELECT 
                    ei.id as estimation_item_id,
                    p.name as item_name,
                    ei.quantity,
                    ei.discounted_price as estimated_price,
                    ei.final_price as estimated_total,
                    ei.product_id,
                    p.name as product_name,
                    p.sku,
                    p.cost_price as current_cost_price
                FROM estimation_items ei
                LEFT JOIN products p ON ei.product_id = p.id
                WHERE ei.estimation_id = ?
                ORDER BY ei.id
            `;

            const [estimationItems] = await db.execute(estimationItemsQuery, [estimationId]);

            const priceComparison = [];

            for (const item of estimationItems) {
                // Get quotes for this item
                const quotesQuery = `
                    SELECT 
                        sq.id as quote_id,
                        sq.quote_number,
                        sq.supplier_id,
                        iv.vendor_name as supplier_name,
                        sqi.unit_price as quoted_price,
                        sqi.final_price as quoted_total,
                        sq.valid_until,
                        sq.quote_date,
                        ((sqi.unit_price - ?) / ? * 100) as price_variance_percent,
                        (sqi.unit_price - ?) as price_variance_amount
                    FROM supplier_quotes sq
                    JOIN supplier_quote_items sqi ON sq.id = sqi.quote_id
                    JOIN supplier_quote_request_items sqri ON sqi.request_item_id = sqri.id
                    JOIN inventory_vendors iv ON sq.supplier_id = iv.id
                    WHERE sqri.estimation_item_id = ?
                        AND sq.status IN ('submitted', 'under_review', 'approved')
                        AND sq.valid_until >= CURDATE()
                    ORDER BY sqi.unit_price ASC
                `;

                const [quotes] = await db.execute(quotesQuery, [
                    item.estimated_price, item.estimated_price, item.estimated_price, item.estimation_item_id
                ]);

                const best_quote = quotes.length > 0 ? quotes[0] : null;

                priceComparison.push({
                    ...item,
                    supplier_quotes: quotes,
                    best_quote,
                    has_quotes: quotes.length > 0,
                    potential_savings: best_quote ? (item.estimated_price - best_quote.quoted_price) * item.quantity : 0
                });
            }

            // Calculate summary
            const total_estimated_cost = priceComparison.reduce((sum, item) => sum + item.estimated_total, 0);
            const items_with_quotes = priceComparison.filter(item => item.has_quotes).length;
            const total_potential_savings = priceComparison.reduce((sum, item) => sum + item.potential_savings, 0);

            const summary = {
                total_items: priceComparison.length,
                items_with_quotes,
                quote_coverage_percent: priceComparison.length > 0 ? (items_with_quotes / priceComparison.length * 100).toFixed(2) : 0,
                total_estimated_cost,
                total_potential_savings,
                savings_percent: total_estimated_cost > 0 ? (total_potential_savings / total_estimated_cost * 100).toFixed(2) : 0
            };

            res.json({
                success: true,
                data: {
                    estimation_id: estimationId,
                    items: priceComparison,
                    summary
                }
            });

        } catch (error) {
            console.error('Error in getEstimationPriceComparison:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching price comparison data',
                error: error.message
            });
        }
    }

    // Create quote request to suppliers
    async createQuoteRequest(req, res) {
        try {
            const {
                estimation_id,
                supplier_ids,
                vendor_ids,
                due_date,
                notes,
                terms_conditions,
                items
            } = req.body;

            const user_id = req.user?.id || 1;

            // Handle both supplier_ids and vendor_ids field names
            const vendorIds = supplier_ids || vendor_ids || [];

            // Ensure vendorIds is an array
            const vendorIdsArray = Array.isArray(vendorIds) ? vendorIds : [vendorIds];

            const quoteRequests = [];

            for (const supplier_id of vendorIdsArray) {
                // Generate request number
                const request_number = await generateQuoteRequestNumber();

                // Create quote request
                const requestQuery = `
                    INSERT INTO supplier_quote_requests 
                    (request_number, estimation_id, supplier_id, requested_by, due_date, status, notes, terms_conditions)
                    VALUES (?, ?, ?, ?, ?, 'sent', ?, ?)
                `;

                const [requestResult] = await db.execute(requestQuery, [
                    request_number, estimation_id, supplier_id, user_id, due_date, notes, terms_conditions
                ]);

                const request_id = requestResult.insertId;

                // Add items to request
                for (const item of items) {
                    const itemQuery = `
                        INSERT INTO supplier_quote_request_items 
                        (request_id, estimation_item_id, item_name, item_description, quantity, unit, estimated_price, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    await db.execute(itemQuery, [
                        request_id,
                        item.estimation_item_id,
                        item.item_name,
                        item.item_description || '',
                        item.quantity,
                        item.unit || 'NOS',
                        item.estimated_price,
                        item.notes || ''
                    ]);
                }

                quoteRequests.push({
                    request_id,
                    request_number,
                    supplier_id,
                    estimation_id
                });
            }

            res.json({
                success: true,
                message: `Quote requests created for ${vendorIdsArray.length} suppliers`,
                data: {
                    quote_requests: quoteRequests
                }
            });

        } catch (error) {
            console.error('Error in createQuoteRequest:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating quote request',
                error: error.message
            });
        }
    }

    // Record supplier quote response
    async recordSupplierQuote(req, res) {
        try {
            const {
                request_id,
                supplier_id,
                quote_date,
                valid_until,
                payment_terms,
                delivery_terms,
                warranty_terms,
                items,
                notes
            } = req.body;

            const user_id = req.user?.id || 1;

            // Generate quote number
            const quote_number = await generateSupplierQuoteNumber();

            // Calculate totals
            const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);
            const tax_amount = items.reduce((sum, item) => sum + parseFloat(item.tax_amount || 0), 0);
            const total_amount = items.reduce((sum, item) => sum + parseFloat(item.final_price || 0), 0);

            // Create supplier quote
            const quoteQuery = `
                INSERT INTO supplier_quotes 
                (quote_number, request_id, supplier_id, quote_date, valid_until, 
                 subtotal, tax_amount, total_amount, payment_terms, delivery_terms, 
                 warranty_terms, notes, status, reviewed_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
            `;

            const [quoteResult] = await db.execute(quoteQuery, [
                quote_number, request_id, supplier_id, quote_date, valid_until,
                subtotal, tax_amount, total_amount, payment_terms, delivery_terms,
                warranty_terms, notes, user_id
            ]);

            const quote_id = quoteResult.insertId;

            // Add quote items
            for (const item of items) {
                const itemQuery = `
                    INSERT INTO supplier_quote_items 
                    (quote_id, request_item_id, item_name, item_description, quantity, unit, 
                     unit_price, total_price, tax_rate, tax_amount, final_price, 
                     specifications, brand, model_number, part_number, delivery_days, warranty_months, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                await db.execute(itemQuery, [
                    quote_id,
                    item.request_item_id,
                    item.item_name,
                    item.item_description || '',
                    item.quantity,
                    item.unit || 'NOS',
                    item.unit_price,
                    item.total_price,
                    item.tax_rate || 0,
                    item.tax_amount || 0,
                    item.final_price,
                    JSON.stringify(item.specifications || {}),
                    item.brand || '',
                    item.model_number || '',
                    item.part_number || '',
                    item.delivery_days || null,
                    item.warranty_months || 12,
                    item.notes || ''
                ]);
            }

            res.json({
                success: true,
                message: 'Supplier quote recorded successfully',
                data: {
                    quote_id,
                    quote_number,
                    total_amount
                }
            });

        } catch (error) {
            console.error('Error in recordSupplierQuote:', error);
            res.status(500).json({
                success: false,
                message: 'Error recording supplier quote',
                error: error.message
            });
        }
    }

    // Get quote requests
    async getQuoteRequests(req, res) {
        try {
            const { estimation_id, supplier_id, status } = req.query;

            let whereConditions = [];
            let queryParams = [];

            if (estimation_id) {
                whereConditions.push('sqr.estimation_id = ?');
                queryParams.push(estimation_id);
            }

            if (supplier_id) {
                whereConditions.push('sqr.supplier_id = ?');
                queryParams.push(supplier_id);
            }

            if (status) {
                whereConditions.push('sqr.status = ?');
                queryParams.push(status);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const query = `
                SELECT 
                    sqr.*,
                    iv.vendor_name as supplier_name,
                    e.estimation_id as estimation_number,
                    u.full_name as requested_by_name,
                    COUNT(sqri.id) as item_count
                FROM supplier_quote_requests sqr
                JOIN inventory_vendors iv ON sqr.supplier_id = iv.id
                LEFT JOIN estimations e ON sqr.estimation_id = e.id
                LEFT JOIN users u ON sqr.requested_by = u.id
                LEFT JOIN supplier_quote_request_items sqri ON sqr.id = sqri.request_id
                ${whereClause}
                GROUP BY sqr.id
                ORDER BY sqr.created_at DESC
            `;

            const [requests] = await db.execute(query, queryParams);

            res.json({
                success: true,
                data: requests
            });

        } catch (error) {
            console.error('Error in getQuoteRequests:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching quote requests',
                error: error.message
            });
        }
    }

    // Get supplier quotes
    async getSupplierQuotes(req, res) {
        try {
            const { request_id, supplier_id, status } = req.query;

            let whereConditions = [];
            let queryParams = [];

            if (request_id) {
                whereConditions.push('sq.request_id = ?');
                queryParams.push(request_id);
            }

            if (supplier_id) {
                whereConditions.push('sq.supplier_id = ?');
                queryParams.push(supplier_id);
            }

            if (status) {
                whereConditions.push('sq.status = ?');
                queryParams.push(status);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const query = `
                SELECT 
                    sq.*,
                    iv.vendor_name as supplier_name,
                    sqr.request_number,
                    sqr.estimation_id,
                    e.estimation_id as estimation_number,
                    COUNT(sqi.id) as item_count
                FROM supplier_quotes sq
                JOIN inventory_vendors iv ON sq.supplier_id = iv.id
                JOIN supplier_quote_requests sqr ON sq.request_id = sqr.id
                LEFT JOIN estimations e ON sqr.estimation_id = e.id
                LEFT JOIN supplier_quote_items sqi ON sq.id = sqi.quote_id
                ${whereClause}
                GROUP BY sq.id
                ORDER BY sq.created_at DESC
            `;

            const [quotes] = await db.execute(query, queryParams);

            res.json({
                success: true,
                data: quotes
            });

        } catch (error) {
            console.error('Error in getSupplierQuotes:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching supplier quotes',
                error: error.message
            });
        }
    }

    // Get price analysis report
    async getPriceAnalysisReport(req, res) {
        try {
            const { estimationId } = req.params;

            // Get or create analysis
            const analysisQuery = `
                SELECT * FROM price_comparison_analysis 
                WHERE estimation_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `;

            let [analysis] = await db.execute(analysisQuery, [estimationId]);

            if (analysis.length === 0) {
                // Generate new analysis
                analysis = await this.generatePriceAnalysis(estimationId);
            } else {
                analysis = analysis[0];
            }

            res.json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error('Error in getPriceAnalysisReport:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating price analysis report',
                error: error.message
            });
        }
    }

    // Helper: Generate price analysis
    async generatePriceAnalysis(estimationId) {
        const user_id = 1; // Default user for system-generated analysis

        // Get estimation items and their best quotes
        const itemsQuery = `
            SELECT 
                ei.id,
                ei.final_price as estimated_cost,
                MIN(sqi.final_price) as best_quote_price
            FROM estimation_items ei
            LEFT JOIN supplier_quote_request_items sqri ON ei.id = sqri.estimation_item_id
            LEFT JOIN supplier_quote_items sqi ON sqri.id = sqi.request_item_id
            LEFT JOIN supplier_quotes sq ON sqi.quote_id = sq.id
            WHERE ei.estimation_id = ? 
                AND (sq.status IN ('submitted', 'under_review', 'approved') OR sq.id IS NULL)
                AND (sq.valid_until >= CURDATE() OR sq.id IS NULL)
            GROUP BY ei.id
        `;

        const [items] = await db.execute(itemsQuery, [estimationId]);

        const total_estimated_cost = items.reduce((sum, item) => sum + item.estimated_cost, 0);
        const total_best_quote_cost = items.reduce((sum, item) => sum + (item.best_quote_price || item.estimated_cost), 0);
        const total_potential_savings = total_estimated_cost - total_best_quote_cost;
        const items_with_quotes = items.filter(item => item.best_quote_price).length;

        const analysisData = {
            total_items: items.length,
            items_with_quotes,
            quote_coverage_percent: items.length > 0 ? (items_with_quotes / items.length * 100).toFixed(2) : 0,
            total_estimated_cost,
            total_best_quote_cost,
            total_potential_savings,
            average_savings_percent: total_estimated_cost > 0 ? (total_potential_savings / total_estimated_cost * 100).toFixed(2) : 0
        };

        // Save analysis
        const insertQuery = `
            INSERT INTO price_comparison_analysis 
            (estimation_id, analysis_date, total_estimated_cost, total_best_quote_cost, 
             total_potential_savings, average_savings_percent, items_with_quotes, 
             total_items, quote_coverage_percent, analysis_data, generated_by)
            VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.execute(insertQuery, [
            estimationId,
            analysisData.total_estimated_cost,
            analysisData.total_best_quote_cost,
            analysisData.total_potential_savings,
            analysisData.average_savings_percent,
            analysisData.items_with_quotes,
            analysisData.total_items,
            analysisData.quote_coverage_percent,
            JSON.stringify(analysisData),
            user_id
        ]);

        return analysisData;
    }
}

module.exports = new PurchasePriceComparisonController();