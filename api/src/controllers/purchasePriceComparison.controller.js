const moment = require('moment');

class PurchasePriceComparisonController {
    // Get price comparison for estimation items
    async getEstimationPriceComparison(req, res) {
        try {
            const { estimationId } = req.params;
            
            const query = `
                SELECT 
                    ei.id as estimation_item_id,
                    ei.item_name,
                    ei.quantity,
                    ei.unit_price as estimated_price,
                    ei.total_price as estimated_total,
                    p.id as product_id,
                    p.name as product_name,
                    p.sku,
                    p.cost_price as current_cost_price,
                    -- Get latest supplier quotes
                    sq.id as quote_id,
                    sq.quote_number,
                    sq.supplier_id,
                    s.name as supplier_name,
                    sqi.unit_price as quoted_price,
                    sqi.total_price as quoted_total,
                    sq.valid_until,
                    sq.created_at as quote_date,
                    -- Calculate variance
                    ROUND(((sqi.unit_price - ei.unit_price) / ei.unit_price) * 100, 2) as price_variance_percent,
                    (sqi.unit_price - ei.unit_price) as price_variance_amount
                FROM estimation_items ei
                LEFT JOIN products p ON ei.product_id = p.id
                LEFT JOIN supplier_quote_items sqi ON p.id = sqi.product_id
                LEFT JOIN supplier_quotes sq ON sqi.quote_id = sq.id
                LEFT JOIN suppliers s ON sq.supplier_id = s.id
                WHERE ei.estimation_id = ?
                AND (sq.id IS NULL OR sq.valid_until >= CURDATE())
                ORDER BY ei.id, sq.created_at DESC
            `;
            
            const [rows] = await req.db.execute(query, [estimationId]);
            
            // Group by estimation item and get best quotes
            const comparisonData = {};
            
            rows.forEach(row => {
                const itemId = row.estimation_item_id;
                
                if (!comparisonData[itemId]) {
                    comparisonData[itemId] = {
                        estimation_item_id: row.estimation_item_id,
                        item_name: row.item_name,
                        quantity: row.quantity,
                        estimated_price: row.estimated_price,
                        estimated_total: row.estimated_total,
                        product_id: row.product_id,
                        product_name: row.product_name,
                        sku: row.sku,
                        current_cost_price: row.current_cost_price,
                        supplier_quotes: []
                    };
                }
                
                if (row.quote_id) {
                    comparisonData[itemId].supplier_quotes.push({
                        quote_id: row.quote_id,
                        quote_number: row.quote_number,
                        supplier_id: row.supplier_id,
                        supplier_name: row.supplier_name,
                        quoted_price: row.quoted_price,
                        quoted_total: row.quoted_total,
                        valid_until: row.valid_until,
                        quote_date: row.quote_date,
                        price_variance_percent: row.price_variance_percent,
                        price_variance_amount: row.price_variance_amount
                    });
                }
            });
            
            // Convert to array and find best quotes
            const result = Object.values(comparisonData).map(item => {
                // Sort quotes by price (ascending)
                item.supplier_quotes.sort((a, b) => a.quoted_price - b.quoted_price);
                
                // Find best quote
                const bestQuote = item.supplier_quotes.length > 0 ? item.supplier_quotes[0] : null;
                
                return {
                    ...item,
                    best_quote: bestQuote,
                    has_quotes: item.supplier_quotes.length > 0,
                    potential_savings: bestQuote ? 
                        (item.estimated_price - bestQuote.quoted_price) * item.quantity : 0
                };
            });
            
            res.json({
                success: true,
                data: result
            });
            
        } catch (error) {
            console.error('Error fetching price comparison:', error);
            res.status(500).json({ error: 'Failed to fetch price comparison' });
        }
    }
    
    // Create supplier quote request
    async createQuoteRequest(req, res) {
        try {
            const {
                estimation_id,
                supplier_ids,
                items,
                due_date,
                notes
            } = req.body;
            
            const user_id = req.user?.id || 1;
            
            // Start transaction
            await req.db.beginTransaction();
            
            try {
                const quoteRequests = [];
                
                // Create quote request for each supplier
                for (const supplierId of supplier_ids) {
                    const requestNumber = await this.generateQuoteRequestNumber(req.db);
                    
                    const requestQuery = `
                        INSERT INTO supplier_quote_requests 
                        (request_number, estimation_id, supplier_id, status, 
                         due_date, notes, requested_by, requested_at)
                        VALUES (?, ?, ?, 'sent', ?, ?, ?, NOW())
                    `;
                    
                    const [requestResult] = await req.db.execute(requestQuery, [
                        requestNumber,
                        estimation_id,
                        supplierId,
                        due_date,
                        notes,
                        user_id
                    ]);
                    
                    const requestId = requestResult.insertId;
                    
                    // Add items to quote request
                    for (const item of items) {
                        const itemQuery = `
                            INSERT INTO supplier_quote_request_items 
                            (request_id, product_id, quantity, estimated_price, specifications)
                            VALUES (?, ?, ?, ?, ?)
                        `;
                        
                        await req.db.execute(itemQuery, [
                            requestId,
                            item.product_id,
                            item.quantity,
                            item.estimated_price,
                            item.specifications || null
                        ]);
                    }
                    
                    quoteRequests.push({
                        request_id: requestId,
                        request_number: requestNumber,
                        supplier_id: supplierId
                    });
                }
                
                await req.db.commit();
                
                res.json({
                    success: true,
                    message: 'Quote requests created successfully',
                    requests: quoteRequests
                });
                
            } catch (error) {
                await req.db.rollback();
                throw error;
            }
            
        } catch (error) {
            console.error('Error creating quote request:', error);
            res.status(500).json({ error: 'Failed to create quote request' });
        }
    }
    
    // Record supplier quote response
    async recordSupplierQuote(req, res) {
        try {
            const {
                request_id,
                supplier_id,
                quote_number,
                quote_date,
                valid_until,
                payment_terms,
                delivery_terms,
                items,
                notes
            } = req.body;
            
            const user_id = req.user?.id || 1;
            
            // Start transaction
            await req.db.beginTransaction();
            
            try {
                // Create supplier quote
                const quoteQuery = `
                    INSERT INTO supplier_quotes 
                    (quote_number, request_id, supplier_id, quote_date, 
                     valid_until, payment_terms, delivery_terms, 
                     total_amount, notes, status, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, NOW())
                `;
                
                const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
                
                const [quoteResult] = await req.db.execute(quoteQuery, [
                    quote_number,
                    request_id,
                    supplier_id,
                    quote_date,
                    valid_until,
                    payment_terms,
                    delivery_terms,
                    totalAmount,
                    notes,
                    user_id
                ]);
                
                const quoteId = quoteResult.insertId;
                
                // Add quote items
                for (const item of items) {
                    const itemQuery = `
                        INSERT INTO supplier_quote_items 
                        (quote_id, product_id, quantity, unit_price, total_price, 
                         delivery_time, specifications, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    await req.db.execute(itemQuery, [
                        quoteId,
                        item.product_id,
                        item.quantity,
                        item.unit_price,
                        item.total_price,
                        item.delivery_time || null,
                        item.specifications || null,
                        item.notes || null
                    ]);
                }
                
                // Update request status
                await req.db.execute(
                    'UPDATE supplier_quote_requests SET status = "received" WHERE id = ?',
                    [request_id]
                );
                
                await req.db.commit();
                
                res.json({
                    success: true,
                    message: 'Supplier quote recorded successfully',
                    quote_id: quoteId
                });
                
            } catch (error) {
                await req.db.rollback();
                throw error;
            }
            
        } catch (error) {
            console.error('Error recording supplier quote:', error);
            res.status(500).json({ error: 'Failed to record supplier quote' });
        }
    }
    
    // Get quote requests
    async getQuoteRequests(req, res) {
        try {
            const { status, supplier_id, estimation_id } = req.query;
            
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (status) {
                whereClause += ' AND sqr.status = ?';
                params.push(status);
            }
            
            if (supplier_id) {
                whereClause += ' AND sqr.supplier_id = ?';
                params.push(supplier_id);
            }
            
            if (estimation_id) {
                whereClause += ' AND sqr.estimation_id = ?';
                params.push(estimation_id);
            }
            
            const query = `
                SELECT 
                    sqr.*,
                    s.name as supplier_name,
                    s.email as supplier_email,
                    s.phone as supplier_phone,
                    e.estimation_number,
                    c.name as client_name,
                    u.name as requested_by_name,
                    COUNT(sqri.id) as item_count
                FROM supplier_quote_requests sqr
                LEFT JOIN suppliers s ON sqr.supplier_id = s.id
                LEFT JOIN estimations e ON sqr.estimation_id = e.id
                LEFT JOIN clients c ON e.client_id = c.id
                LEFT JOIN users u ON sqr.requested_by = u.id
                LEFT JOIN supplier_quote_request_items sqri ON sqr.id = sqri.request_id
                ${whereClause}
                GROUP BY sqr.id
                ORDER BY sqr.requested_at DESC
            `;
            
            const [rows] = await req.db.execute(query, params);
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error fetching quote requests:', error);
            res.status(500).json({ error: 'Failed to fetch quote requests' });
        }
    }
    
    // Get supplier quotes
    async getSupplierQuotes(req, res) {
        try {
            const { estimation_id, supplier_id, product_id } = req.query;
            
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (estimation_id) {
                whereClause += ' AND sqr.estimation_id = ?';
                params.push(estimation_id);
            }
            
            if (supplier_id) {
                whereClause += ' AND sq.supplier_id = ?';
                params.push(supplier_id);
            }
            
            if (product_id) {
                whereClause += ' AND sqi.product_id = ?';
                params.push(product_id);
            }
            
            const query = `
                SELECT 
                    sq.*,
                    s.name as supplier_name,
                    sqr.estimation_id,
                    e.estimation_number,
                    COUNT(sqi.id) as item_count,
                    AVG(sqi.unit_price) as avg_unit_price
                FROM supplier_quotes sq
                LEFT JOIN suppliers s ON sq.supplier_id = s.id
                LEFT JOIN supplier_quote_requests sqr ON sq.request_id = sqr.id
                LEFT JOIN estimations e ON sqr.estimation_id = e.id
                LEFT JOIN supplier_quote_items sqi ON sq.id = sqi.quote_id
                ${whereClause}
                GROUP BY sq.id
                ORDER BY sq.created_at DESC
            `;
            
            const [rows] = await req.db.execute(query, params);
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error fetching supplier quotes:', error);
            res.status(500).json({ error: 'Failed to fetch supplier quotes' });
        }
    }
    
    // Get price analysis report
    async getPriceAnalysisReport(req, res) {
        try {
            const { estimationId } = req.params;
            
            // Get estimation summary
            const estimationQuery = `
                SELECT 
                    e.*,
                    c.name as client_name,
                    SUM(ei.total_price) as total_estimated_cost
                FROM estimations e
                LEFT JOIN clients c ON e.client_id = c.id
                LEFT JOIN estimation_items ei ON e.id = ei.estimation_id
                WHERE e.id = ?
                GROUP BY e.id
            `;
            
            const [estimationRows] = await req.db.execute(estimationQuery, [estimationId]);
            
            if (estimationRows.length === 0) {
                return res.status(404).json({ error: 'Estimation not found' });
            }
            
            // Get best quotes summary
            const quotesQuery = `
                SELECT 
                    ei.id as estimation_item_id,
                    ei.item_name,
                    ei.quantity,
                    ei.unit_price as estimated_price,
                    ei.total_price as estimated_total,
                    MIN(sqi.unit_price) as best_quoted_price,
                    MIN(sqi.total_price) as best_quoted_total,
                    s.name as best_supplier_name,
                    sq.quote_number as best_quote_number
                FROM estimation_items ei
                LEFT JOIN products p ON ei.product_id = p.id
                LEFT JOIN supplier_quote_items sqi ON p.id = sqi.product_id
                LEFT JOIN supplier_quotes sq ON sqi.quote_id = sq.id
                LEFT JOIN suppliers s ON sq.supplier_id = s.id
                WHERE ei.estimation_id = ? 
                AND (sq.valid_until IS NULL OR sq.valid_until >= CURDATE())
                GROUP BY ei.id
                HAVING best_quoted_price IS NOT NULL
            `;
            
            const [quotesRows] = await req.db.execute(quotesQuery, [estimationId]);
            
            // Calculate savings
            const totalEstimated = estimationRows[0].total_estimated_cost;
            const totalBestQuoted = quotesRows.reduce((sum, row) => sum + row.best_quoted_total, 0);
            const potentialSavings = totalEstimated - totalBestQuoted;
            const savingsPercentage = totalEstimated > 0 ? (potentialSavings / totalEstimated) * 100 : 0;
            
            res.json({
                success: true,
                data: {
                    estimation: estimationRows[0],
                    items_comparison: quotesRows,
                    summary: {
                        total_estimated_cost: totalEstimated,
                        total_best_quoted_cost: totalBestQuoted,
                        potential_savings: potentialSavings,
                        savings_percentage: Math.round(savingsPercentage * 100) / 100,
                        items_with_quotes: quotesRows.length,
                        total_items: await this.getEstimationItemCount(req.db, estimationId)
                    }
                }
            });
            
        } catch (error) {
            console.error('Error generating price analysis report:', error);
            res.status(500).json({ error: 'Failed to generate price analysis report' });
        }
    }
    
    // Helper methods
    async generateQuoteRequestNumber(db) {
        const year = moment().format('YY');
        const query = `
            SELECT COUNT(*) as count 
            FROM supplier_quote_requests 
            WHERE request_number LIKE 'VESPL/QR/${year}%'
        `;
        
        const [rows] = await db.execute(query);
        const sequence = (rows[0].count + 1).toString().padStart(3, '0');
        
        return `VESPL/QR/${year}/${sequence}`;
    }
    
    async getEstimationItemCount(db, estimationId) {
        const [rows] = await db.execute(
            'SELECT COUNT(*) as count FROM estimation_items WHERE estimation_id = ?',
            [estimationId]
        );
        return rows[0].count;
    }
}

module.exports = new PurchasePriceComparisonController();
