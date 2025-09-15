const db = require('../config/database');

// Get all closed cases
exports.getAllClosedCases = async (req, res) => {
    try {
        const query = `
            SELECT 
                se.id,
                se.enquiry_id,
                se.project_name,
                se.created_at as created_date,
                se.closed_at as closed_date,
                DATEDIFF(se.closed_at, se.created_at) as duration_days,
                c.company_name as client_name,
                c.contact_person,
                c.city,
                c.state,
                COALESCE(q.grand_total, e.total_final_price, 0) as total_value
            FROM sales_enquiries se
            JOIN clients c ON se.client_id = c.id
            LEFT JOIN estimations e ON se.id = e.enquiry_id
            LEFT JOIN quotations q ON e.id = q.estimation_id
            WHERE se.status = 'closed'
            ORDER BY se.closed_at DESC
        `;
        
        const [closedCases] = await db.execute(query);
        
        res.json({
            success: true,
            data: closedCases,
            count: closedCases.length
        });
    } catch (error) {
        console.error('Error fetching closed cases:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching closed cases',
            error: error.message
        });
    }
};

// Get complete case history
exports.getCaseHistory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get case basic info
        const [caseInfo] = await db.execute(`
            SELECT 
                se.*,
                c.company_name as client_name,
                c.contact_person,
                c.city,
                c.state,
                c.address,
                DATEDIFF(se.closed_at, se.created_at) as duration_days
            FROM sales_enquiries se
            JOIN clients c ON se.client_id = c.id
            WHERE se.id = ?
        `, [id]);
        
        if (!caseInfo[0]) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }
        
        // Get timeline events from case history
        const [timeline] = await db.execute(`
            SELECT 
                ch.*,
                u.full_name as created_by_name,
                'case_history' as source_type
            FROM case_history ch
            JOIN users u ON ch.created_by = u.id
            WHERE ch.reference_type = 'sales_enquiry' AND ch.reference_id = ?
            
            UNION ALL
            
            SELECT 
                ch.*,
                u.full_name as created_by_name,
                'estimation' as source_type
            FROM case_history ch
            JOIN users u ON ch.created_by = u.id
            JOIN estimations e ON ch.reference_id = e.id
            WHERE ch.reference_type = 'estimation' AND e.enquiry_id = ?
            
            UNION ALL
            
            SELECT 
                ch.*,
                u.full_name as created_by_name,
                'quotation' as source_type
            FROM case_history ch
            JOIN users u ON ch.created_by = u.id
            JOIN quotations q ON ch.reference_id = q.id
            JOIN estimations e ON q.estimation_id = e.id
            WHERE ch.reference_type = 'quotation' AND e.enquiry_id = ?
            
            ORDER BY created_at ASC
        `, [id, id, id]);
        
        // Format timeline for frontend
        const formattedTimeline = timeline.map(event => {
            let title = '';
            let description = event.notes;
            let type = 'general';
            
            switch (event.status) {
                case 'created':
                    title = 'Sales Enquiry Created';
                    type = 'sales_enquiry';
                    break;
                case 'estimation_created':
                    title = 'Estimation Created';
                    type = 'estimation';
                    break;
                case 'approved':
                    title = event.reference_type === 'estimation' ? 'Estimation Approved' : 'Quotation Approved';
                    type = event.reference_type;
                    break;
                case 'quotation_created':
                    title = 'Quotation Generated';
                    type = 'quotation';
                    break;
                case 'order_confirmed':
                    title = 'Sales Order Confirmed';
                    type = 'sales_order';
                    break;
                case 'shipped':
                    title = 'Order Shipped';
                    type = 'delivery';
                    break;
                case 'delivered':
                    title = 'Order Delivered';
                    type = 'delivery';
                    break;
                case 'closed':
                    title = 'Case Closed';
                    type = 'delivery';
                    break;
                default:
                    title = event.status.replace('_', ' ').toUpperCase();
            }
            
            return {
                title,
                description,
                type,
                date: event.created_at,
                created_by: event.created_by_name,
                reference_id: event.reference_type + '_' + event.reference_id,
                amount: null // Will be populated from related records if needed
            };
        });
        
        // Get related documents
        const [documents] = await db.execute(`
            SELECT 
                'quotation_pdf' as type,
                CONCAT('Quotation_', q.quotation_id, '.pdf') as name,
                q.created_at
            FROM quotations q
            JOIN estimations e ON q.estimation_id = e.id
            WHERE e.enquiry_id = ?
            
            UNION ALL
            
            SELECT 
                'estimation' as type,
                CONCAT('Estimation_', e.estimation_id) as name,
                e.created_at
            FROM estimations e
            WHERE e.enquiry_id = ?
            
            ORDER BY created_at DESC
        `, [id, id]);
        
        // Calculate total value
        const [totalValue] = await db.execute(`
            SELECT COALESCE(q.grand_total, e.total_final_price, 0) as total_value
            FROM sales_enquiries se
            LEFT JOIN estimations e ON se.id = e.enquiry_id
            LEFT JOIN quotations q ON e.id = q.estimation_id
            WHERE se.id = ?
        `, [id]);
        
        const responseData = {
            ...caseInfo[0],
            total_value: totalValue[0]?.total_value || 0,
            timeline: formattedTimeline,
            documents
        };
        
        res.json({
            success: true,
            data: responseData
        });
        
    } catch (error) {
        console.error('Error fetching case history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching case history',
            error: error.message
        });
    }
};

// Close a case (when parts are shipped)
exports.closeCase = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { enquiry_id, delivery_notes } = req.body;
        
        // Update sales enquiry status to closed
        await connection.execute(
            `UPDATE sales_enquiries 
             SET status = 'closed', closed_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [enquiry_id]
        );
        
        // Add case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['sales_enquiry', enquiry_id, 'closed', delivery_notes || 'Case closed - parts shipped and delivered', req.user.id]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Case closed successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error closing case:', error);
        res.status(500).json({
            success: false,
            message: 'Error closing case',
            error: error.message
        });
    } finally {
        connection.release();
    }
};
