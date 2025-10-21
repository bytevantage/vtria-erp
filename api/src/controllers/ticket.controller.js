const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');

class TicketController {
    // ==================== CREATE TICKET ====================

    async createTicket(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const {
                title,
                description,
                customer_id: customerId,
                contact_person: contactPerson,
                contact_email: contactEmail,
                contact_phone: contactPhone,
                product_id: productId,
                serial_number: serialNumber,
                category = 'support',
                issue_type: issueType,
                priority = 'medium',
                source = 'direct',
                is_warranty_claim: isWarrantyClaim = false
            } = req.body;

            const createdBy = req.user?.id || 1;

            // Validate required fields
            if (!title || !customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and customer are required'
                });
            }

            // Generate ticket number: VESPL/TK/2526/XXX
            const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
            const ticketNumber = await DocumentNumberGenerator.generateNumber('TK', financialYear);

            // Get warranty information if serial number provided
            let warrantyStatus = null;
            let vendorWarrantyExpiry = null;
            let customerWarrantyExpiry = null;

            if (serialNumber) {
                const [serialInfo] = await connection.execute(
                    `SELECT warranty_end_date, customer_warranty_expiry, status 
                     FROM product_serial_numbers 
                     WHERE serial_number = ?`,
                    [serialNumber]
                );

                if (serialInfo.length > 0) {
                    vendorWarrantyExpiry = serialInfo[0].warranty_end_date;
                    customerWarrantyExpiry = serialInfo[0].customer_warranty_expiry;

                    // Determine warranty status
                    const today = new Date();
                    const customerExpiry = new Date(customerWarrantyExpiry);
                    warrantyStatus = customerExpiry > today ? 'active' : 'expired';
                }
            }

            // Insert ticket
            const insertQuery = `
                INSERT INTO tickets (
                    ticket_number, title, description, customer_id, contact_person,
                    contact_email, contact_phone, product_id, serial_number,
                    category, issue_type, priority, source, status,
                    warranty_status, vendor_warranty_expiry, customer_warranty_expiry,
                    is_warranty_claim, queue_id, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, 
                         (SELECT id FROM ticket_queues WHERE queue_type = 'support' LIMIT 1), ?)
            `;

            const [result] = await connection.execute(insertQuery, [
                ticketNumber, title, description, customerId, contactPerson,
                contactEmail, contactPhone, productId, serialNumber,
                category, issueType, priority, source,
                warrantyStatus, vendorWarrantyExpiry, customerWarrantyExpiry,
                isWarrantyClaim, createdBy
            ]);

            const ticketId = result.insertId;

            // Add system-generated note
            await connection.execute(
                `INSERT INTO ticket_notes (
                        ticket_id, note_type, content, is_system_generated, created_by
                    ) VALUES (?, 'system', ?, TRUE, ?)`,
                [ticketId, `Ticket created via ${source}. Status: Open`, createdBy]
            );

            // Log status change
            await connection.execute(
                `INSERT INTO ticket_status_history (
                    ticket_id, from_status, to_status, changed_by, change_reason
                ) VALUES (?, NULL, 'open', ?, 'Ticket created')`,
                [ticketId, createdBy]
            );

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Ticket created successfully',
                data: {
                    ticketId,
                    ticketNumber,
                    warrantyStatus,
                    customerWarrantyExpiry,
                    vendorWarrantyExpiry
                }
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error creating ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating ticket',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // ==================== GET ALL TICKETS ====================

    async getAllTickets(req, res) {
        try {
            const {
                status,
                priority,
                queue_id: queueId,
                assigned_to: assignedTo,
                customer_id: customerId,
                warranty_status: warrantyStatus,
                limit = 50,
                offset = 0
            } = req.query;

            let whereClause = 'WHERE 1=1';
            const params = [];

            if (status) {
                whereClause += ' AND t.status = ?';
                params.push(status);
            }

            if (priority) {
                whereClause += ' AND t.priority = ?';
                params.push(priority);
            }

            if (queueId) {
                whereClause += ' AND t.queue_id = ?';
                params.push(queueId);
            }

            if (assignedTo) {
                whereClause += ' AND t.assigned_to = ?';
                params.push(assignedTo);
            }

            if (customerId) {
                whereClause += ' AND t.customer_id = ?';
                params.push(customerId);
            }

            if (warrantyStatus) {
                whereClause += ' AND t.warranty_status = ?';
                params.push(warrantyStatus);
            }

            const query = `
                SELECT 
                    t.*,
                    c.company_name as customer_name,
                    c.email as customer_email,
                    p.name as product_name,
                    p.sku as product_sku,
                    u.full_name as assigned_to_name,
                    cu.full_name as created_by_name,
                    tq.name as queue_name,
                    tq.queue_type,
                    TIMESTAMPDIFF(HOUR, t.created_at, NOW()) as hours_open,
                    CASE
                        WHEN TIMESTAMPDIFF(HOUR, t.created_at, NOW()) < 24 THEN 'green'
                        WHEN TIMESTAMPDIFF(HOUR, t.created_at, NOW()) < 72 THEN 'yellow'
                        ELSE 'red'
                    END as age_color
                FROM tickets t
                LEFT JOIN clients c ON t.customer_id = c.id
                LEFT JOIN products p ON t.product_id = p.id
                LEFT JOIN users u ON t.assigned_to = u.id
                LEFT JOIN users cu ON t.created_by = cu.id
                LEFT JOIN ticket_queues tq ON t.queue_id = tq.id
                ${whereClause}
                ORDER BY 
                    CASE t.priority
                        WHEN 'urgent' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                    END,
                    t.created_at DESC
                LIMIT ? OFFSET ?
            `;

            params.push(parseInt(limit), parseInt(offset));
            const [tickets] = await db.execute(query, params);

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM tickets t ${whereClause}`;
            const [countResult] = await db.execute(countQuery, params.slice(0, -2));

            res.json({
                success: true,
                data: tickets,
                meta: {
                    total: countResult[0].total,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });

        } catch (error) {
            console.error('Error fetching tickets:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching tickets',
                error: error.message
            });
        }
    }

    // ==================== GET TICKET BY ID ====================

    async getTicketById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    t.*,
                    c.company_name as customer_name,
                    c.contact_person as customer_contact,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    c.address as customer_address,
                    p.name as product_name,
                    p.sku as product_sku,
                    p.model as product_model,
                    u.full_name as assigned_to_name,
                    u.email as assigned_to_email,
                    cu.full_name as created_by_name,
                    tq.name as queue_name,
                    tq.queue_type,
                    TIMESTAMPDIFF(HOUR, t.created_at, NOW()) as hours_open,
                    CASE
                        WHEN TIMESTAMPDIFF(HOUR, t.created_at, NOW()) < 24 THEN 'green'
                        WHEN TIMESTAMPDIFF(HOUR, t.created_at, NOW()) < 72 THEN 'yellow'
                        ELSE 'red'
                    END as age_color
                FROM tickets t
                LEFT JOIN clients c ON t.customer_id = c.id
                LEFT JOIN products p ON t.product_id = p.id
                LEFT JOIN users u ON t.assigned_to = u.id
                LEFT JOIN users cu ON t.created_by = cu.id
                LEFT JOIN ticket_queues tq ON t.queue_id = tq.id
                WHERE t.id = ? OR t.ticket_number = ?
            `;

            const [tickets] = await db.execute(query, [id, id]);

            if (tickets.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            const ticket = tickets[0];

            // Get ticket notes (append-only)
            const [notes] = await db.execute(
                `SELECT 
                    tn.*,
                    u.full_name as created_by_name,
                    DATE_FORMAT(tn.created_at, '%Y-%m-%d %H:%i:%s') as formatted_date
                 FROM ticket_notes tn
                 LEFT JOIN users u ON tn.created_by = u.id
                 WHERE tn.ticket_id = ?
                 ORDER BY tn.created_at ASC`,
                [ticket.id]
            );

            // Get parts used
            const [parts] = await db.execute(
                `SELECT 
                    tp.*,
                    p.name as product_name,
                    p.sku as product_sku
                 FROM ticket_parts tp
                 LEFT JOIN products p ON tp.product_id = p.id
                 WHERE tp.ticket_id = ?`,
                [ticket.id]
            );

            // Get status history
            const [history] = await db.execute(
                `SELECT 
                    tsh.*,
                    u.full_name as changed_by_name
                 FROM ticket_status_history tsh
                 LEFT JOIN users u ON tsh.changed_by = u.id
                 WHERE tsh.ticket_id = ?
                 ORDER BY tsh.changed_at DESC`,
                [ticket.id]
            );

            res.json({
                success: true,
                data: {
                    ...ticket,
                    notes,
                    parts,
                    history
                }
            });

        } catch (error) {
            console.error('Error fetching ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching ticket details',
                error: error.message
            });
        }
    }

    // ==================== UPDATE TICKET STATUS ====================

    async updateTicketStatus(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { id } = req.params;
            const { status, notes, resolution_summary: resolutionSummary } = req.body;
            const updatedBy = req.user?.id || 1;

            // Get current status
            const [currentTicket] = await connection.execute(
                'SELECT status, ticket_number FROM tickets WHERE id = ?',
                [id]
            );

            if (currentTicket.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            const oldStatus = currentTicket[0].status;
            const ticketNumber = currentTicket[0].ticket_number;

            // Update ticket
            let updateQuery = 'UPDATE tickets SET status = ?, updated_by = ?';
            const updateParams = [status, updatedBy];

            if (status === 'resolved') {
                updateQuery += ', resolved_at = NOW()';
                if (resolutionSummary) {
                    updateQuery += ', resolution_summary = ?';
                    updateParams.push(resolutionSummary);
                }
            } else if (status === 'closed') {
                updateQuery += ', closed_at = NOW()';
                if (resolutionSummary) {
                    updateQuery += ', resolution_summary = ?';
                    updateParams.push(resolutionSummary);
                }
            }

            updateQuery += ' WHERE id = ?';
            updateParams.push(id);

            await connection.execute(updateQuery, updateParams);

            // Log status change
            const statusChangeReason = notes || `Status changed from ${oldStatus} to ${status}`;
            await connection.execute(
                `INSERT INTO ticket_status_history (
                    ticket_id, from_status, to_status, changed_by, change_reason
                ) VALUES (?, ?, ?, ?, ?)`,
                [id, oldStatus, status, updatedBy, statusChangeReason]
            );

            // Add system note
            await connection.execute(
                `INSERT INTO ticket_notes (
                    ticket_id, note_type, content, is_system_generated, created_by
                ) VALUES (?, 'system', ?, TRUE, ?)`,
                [id, `Status changed from ${oldStatus} to ${status}. ${notes || ''}`, updatedBy]
            );

            await connection.commit();

            res.json({
                success: true,
                message: 'Ticket status updated successfully',
                data: {
                    ticketNumber,
                    old_status: oldStatus,
                    new_status: status
                }
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error updating ticket status:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating ticket status',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // ==================== ADD TICKET NOTE ====================

    async addTicketNote(req, res) {
        try {
            const { id } = req.params;
            const { content, note_type: noteType = 'general', is_internal: isInternal = false, title } = req.body;
            const createdBy = req.user?.id || 1;

            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: 'Note content is required'
                });
            }

            // Verify ticket exists
            const [ticket] = await db.execute('SELECT id FROM tickets WHERE id = ?', [id]);

            if (ticket.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            // Insert note (append-only)
            const [result] = await db.execute(
                `INSERT INTO ticket_notes (
                    ticket_id, note_type, title, content, is_internal, created_by
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, noteType, title, content, isInternal, createdBy]
            );

            // Get the created note with formatted timestamp
            const [createdNote] = await db.execute(
                `SELECT 
                    tn.*,
                    u.full_name as created_by_name,
                    DATE_FORMAT(tn.created_at, '%Y-%m-%d %H:%i:%s') as formatted_date
                 FROM ticket_notes tn
                 LEFT JOIN users u ON tn.created_by = u.id
                 WHERE tn.id = ?`,
                [result.insertId]
            );

            res.status(201).json({
                success: true,
                message: 'Note added successfully',
                data: createdNote[0]
            });

        } catch (error) {
            console.error('Error adding ticket note:', error);
            res.status(500).json({
                success: false,
                message: 'Error adding note',
                error: error.message
            });
        }
    }

    // ==================== ASSIGN TICKET ====================

    async assignTicket(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { id } = req.params;
            const { assigned_to: assignedTo, notes } = req.body;
            const assignedBy = req.user?.id || 1;

            // Unassign previous assignment
            await connection.execute(
                'UPDATE ticket_assignments SET is_active = FALSE, unassigned_at = NOW() WHERE ticket_id = ? AND is_active = TRUE',
                [id]
            );

            // Update ticket
            await connection.execute(
                'UPDATE tickets SET assigned_to = ?, updated_by = ? WHERE id = ?',
                [assignedTo, assignedBy, id]
            );

            // Log assignment
            await connection.execute(
                `INSERT INTO ticket_assignments (
                        ticket_id, assigned_to, assigned_by, assignment_reason
                    ) VALUES (?, ?, ?, ?)`,
                [id, assignedTo, assignedBy, notes || 'Ticket assigned']
            );

            // Add system note
            await connection.execute(
                `INSERT INTO ticket_notes (
                        ticket_id, note_type, content, is_system_generated, created_by
                    ) VALUES (?, 'system', ?, TRUE, ?)`,
                [id, `Ticket assigned to user ID ${assignedTo}. 
                    ${notes || ''}`, assignedBy]
            );

            await connection.commit();

            res.json({
                success: true,
                message: 'Ticket assigned successfully'
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error assigning ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Error assigning ticket',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // ==================== CLOSE TICKET ====================

    async closeTicket(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { id } = req.params;
            const {
                resolution_summary: resolutionSummary,
                customer_satisfaction: customerSatisfaction,
                closure_notes: closureNotes
            } = req.body;
            const closedBy = req.user?.id || 1;

            // Validate mandatory closure comments
            if (!closureNotes || closureNotes.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Closure notes are mandatory when closing a ticket'
                });
            }

            // Get current ticket info
            const [ticket] = await connection.execute(
                'SELECT status, ticket_number FROM tickets WHERE id = ?',
                [id]
            );

            if (ticket.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            const oldStatus = ticket[0].status;

            // Update ticket to closed
            await connection.execute(
                `UPDATE tickets 
                 SET status = 'closed', 
                     closed_at = NOW(), 
                     resolution_summary = ?,
                     customer_satisfaction = ?,
                     updated_by = ?
                 WHERE id = ?`,
                [resolutionSummary, customerSatisfaction, closedBy, id]
            );

            // Log status change
            await connection.execute(
                `INSERT INTO ticket_status_history (
                    ticket_id, from_status, to_status, changed_by, change_reason
                ) VALUES (?, ?, 'closed', ?, ?)`,
                [id, oldStatus, closedBy, closureNotes]
            );

            // Add closure note
            await connection.execute(
                `INSERT INTO ticket_notes (ticket_id, note_type, content, created_by)
                 VALUES (?, 'general', ?, ?)`,
                [id, `Ticket closed. ${closureNotes}`, closedBy]
            );

            await connection.commit();

            res.json({
                success: true,
                message: 'Ticket closed successfully',
                data: {
                    ticket_number: ticket[0].ticket_number,
                    closed_at: new Date()
                }
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error closing ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Error closing ticket',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // ==================== GET TICKET QUEUES ====================

    async getTicketQueues(req, res) {
        try {
            const query = `
                SELECT 
                    tq.*,
                    COUNT(t.id) as ticket_count,
                    SUM(CASE WHEN t.priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count
                FROM ticket_queues tq
                LEFT JOIN tickets t ON tq.id = t.queue_id AND t.status != 'closed'
                WHERE tq.is_active = TRUE
                GROUP BY tq.id
                ORDER BY 
                    CASE tq.queue_type
                        WHEN 'support' THEN 1
                        WHEN 'diagnosis' THEN 2
                        WHEN 'resolution' THEN 3
                        WHEN 'closure' THEN 4
                    END
            `;

            const [queues] = await db.execute(query);

            res.json({
                success: true,
                data: queues
            });

        } catch (error) {
            console.error('Error fetching ticket queues:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching queues',
                error: error.message
            });
        }
    }

    // ==================== MOVE TICKET TO QUEUE ====================

    async moveTicketToQueue(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { id } = req.params;
            const { queue_id: queueId, notes } = req.body;
            const movedBy = req.user?.id || 1;

            // Get queue info
            const [queue] = await connection.execute(
                'SELECT name, queue_type FROM ticket_queues WHERE id = ?',
                [queueId]
            );

            if (queue.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Queue not found'
                });
            }

            // Update ticket queue
            await connection.execute(
                'UPDATE tickets SET queue_id = ?, updated_by = ? WHERE id = ?',
                [queueId, movedBy, id]
            );

            // Add system note
            await connection.execute(
                `INSERT INTO ticket_notes (
                        ticket_id, note_type, content, is_system_generated, created_by
                    ) VALUES (?, 'system', ?, TRUE, ?)`,
                [id, `Ticket moved to ${queue[0].name}. 
                    ${notes || ''}`, movedBy]
            );

            await connection.commit();

            res.json({
                success: true,
                message: `Ticket moved to ${queue[0].name}`,
                data: {
                    queue_name: queue[0].name,
                    queue_type: queue[0].queue_type
                }
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error moving ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Error moving ticket to queue',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // ==================== REJECT TICKET ====================

    async rejectTicket(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { id } = req.params;
            const { rejection_reason: rejectionReason, rejection_notes: rejectionNotes } = req.body;
            const rejectedBy = req.user?.id || 1;

            // Validate mandatory rejection reason
            if (!rejectionReason || rejectionReason.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Rejection reason is mandatory'
                });
            }

            // Get current ticket and queue info
            const [ticket] = await connection.execute(
                `SELECT t.*, tq.queue_type, tq.name as current_queue_name 
                 FROM tickets t 
                 LEFT JOIN ticket_queues tq ON t.queue_id = tq.id 
                 WHERE t.id = ?`,
                [id]
            );

            if (ticket.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            const currentQueueType = ticket[0].queue_type;
            let targetQueueType = null;
            let targetQueueId = null;

            // Determine target queue based on current queue (move back one step)
            switch (currentQueueType) {
                case 'diagnosis':
                    targetQueueType = 'support';
                    break;
                case 'resolution':
                    targetQueueType = 'diagnosis';
                    break;
                case 'closure':
                    targetQueueType = 'resolution';
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot reject ticket from support queue'
                    });
            }

            // Get target queue ID
            const [targetQueue] = await connection.execute(
                'SELECT id, name FROM ticket_queues WHERE queue_type = ? AND is_active = TRUE LIMIT 1',
                [targetQueueType]
            );

            if (targetQueue.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `Target queue (${targetQueueType}) not found`
                });
            }

            targetQueueId = targetQueue[0].id;

            // Move ticket to previous queue
            await connection.execute(
                'UPDATE tickets SET queue_id = ?, updated_by = ? WHERE id = ?',
                [targetQueueId, rejectedBy, id]
            );

            // Add rejection note
            await connection.execute(
                `INSERT INTO ticket_notes (
                        ticket_id, note_type, title, content, is_internal, created_by
                    ) VALUES (?, 'rejection', ?, ?, TRUE, ?)`,
                [id, `Rejected from ${ticket[0].current_queue_name}`,
                    `Rejection Reason: ${rejectionReason}\n\nNotes: ${rejectionNotes || 'No additional notes'}`,
                    rejectedBy]
            );

            await connection.commit();

            res.json({
                success: true,
                message: `Ticket rejected and moved back to ${targetQueue[0].name}`,
                data: {
                    ticket_number: ticket[0].ticket_number,
                    from_queue: ticket[0].current_queue_name,
                    to_queue: targetQueue[0].name,
                    rejection_reason: rejectionReason
                }
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error rejecting ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Error rejecting ticket',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }
}

module.exports = new TicketController();
