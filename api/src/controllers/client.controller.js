const db = require('../config/database');

class ClientController {
    // Get all clients
    async getAllClients(req, res) {
        try {
            const query = `
                SELECT * FROM clients 
                WHERE status = 'active' 
                ORDER BY company_name ASC
            `;
            
            const [clients] = await db.execute(query);
            
            res.json({
                success: true,
                data: clients,
                count: clients.length
            });
        } catch (error) {
            console.error('Error fetching clients:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching clients',
                error: error.message
            });
        }
    }

    // Get single client by ID
    async getClientById(req, res) {
        try {
            const { id } = req.params;
            
            const query = 'SELECT * FROM clients WHERE id = ? AND status = "active"';
            const [clients] = await db.execute(query, [id]);
            
            if (clients.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Client not found'
                });
            }
            
            res.json({
                success: true,
                data: clients[0]
            });
        } catch (error) {
            console.error('Error fetching client:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching client',
                error: error.message
            });
        }
    }

    // Create new client
    async createClient(req, res) {
        try {
            const {
                company_name,
                contact_person,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                gstin
            } = req.body;

            // Validate required fields
            if (!company_name || !contact_person || !phone) {
                return res.status(400).json({
                    success: false,
                    message: 'Company name, contact person, and phone are required'
                });
            }

            const query = `
                INSERT INTO clients 
                (company_name, contact_person, email, phone, address, city, state, pincode, gstin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [result] = await db.execute(query, [
                company_name,
                contact_person,
                email || null,
                phone,
                address || null,
                city || null,
                state || null,
                pincode || null,
                gstin || null
            ]);

            res.status(201).json({
                success: true,
                message: 'Client created successfully',
                data: {
                    id: result.insertId
                }
            });
        } catch (error) {
            console.error('Error creating client:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating client',
                error: error.message
            });
        }
    }

    // Update client
    async updateClient(req, res) {
        try {
            const { id } = req.params;
            const {
                company_name,
                contact_person,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                gstin
            } = req.body;

            const query = `
                UPDATE clients 
                SET company_name = ?, contact_person = ?, email = ?, phone = ?, 
                    address = ?, city = ?, state = ?, pincode = ?, gstin = ?
                WHERE id = ?
            `;

            const [result] = await db.execute(query, [
                company_name,
                contact_person,
                email || null,
                phone,
                address || null,
                city || null,
                state || null,
                pincode || null,
                gstin || null,
                id
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Client not found'
                });
            }

            res.json({
                success: true,
                message: 'Client updated successfully'
            });
        } catch (error) {
            console.error('Error updating client:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating client',
                error: error.message
            });
        }
    }

    // Delete client (soft delete by setting status to inactive)
    async deleteClient(req, res) {
        try {
            const { id } = req.params;

            const [result] = await db.execute(
                'UPDATE clients SET status = "inactive" WHERE id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Client not found'
                });
            }

            res.json({
                success: true,
                message: 'Client deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting client:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting client',
                error: error.message
            });
        }
    }
}

module.exports = new ClientController();
