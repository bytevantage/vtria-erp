const db = require('../config/database');

class VendorController {
  // Get all vendors
  async getAllVendors(req, res) {
    try {
      const query = `
                SELECT * FROM inventory_vendors 
                WHERE is_active = TRUE 
                ORDER BY vendor_name ASC
            `;

      const [vendors] = await db.execute(query);

      res.json({
        success: true,
        data: vendors,
        count: vendors.length
      });
    } catch (error) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vendors',
        error: error.message
      });
    }
  }

  // Get single vendor by ID
  async getVendorById(req, res) {
    try {
      const { id } = req.params;

      const query = 'SELECT * FROM inventory_vendors WHERE id = ? AND is_active = TRUE';
      const [vendors] = await db.execute(query, [id]);

      if (vendors.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.json({
        success: true,
        data: vendors[0]
      });
    } catch (error) {
      console.error('Error fetching vendor:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching vendor',
        error: error.message
      });
    }
  }

  // Create new vendor
  async createVendor(req, res) {
    try {
      const {
        vendor_code,
        vendor_name,
        contact_person,
        email,
        phone,
        address,
        gstin,
        city,
        state,
        pincode,
        pan_number,
        payment_terms,
        credit_limit,
        rating,
        tax_category,
        vendor_type
      } = req.body;

      // Validate required fields
      if (!vendor_code || !vendor_name) {
        return res.status(400).json({
          success: false,
          message: 'Vendor code and vendor name are required'
        });
      }

      const query = `
                INSERT INTO inventory_vendors 
                (vendor_code, vendor_name, contact_person, email, phone, address, gstin, city, state, pincode, pan_number, payment_terms, credit_limit, rating, tax_category, vendor_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

      const [result] = await db.execute(query, [
        vendor_code,
        vendor_name,
        contact_person || null,
        email || null,
        phone || null,
        address || null,
        gstin || null,
        city || null,
        state || null,
        pincode || null,
        pan_number || null,
        payment_terms || null,
        credit_limit || 0.00,
        rating || 'B',
        tax_category || 'REGISTERED',
        vendor_type || 'DOMESTIC'
      ]);

      res.status(201).json({
        success: true,
        message: 'Vendor created successfully',
        data: {
          id: result.insertId
        }
      });
    } catch (error) {
      console.error('Error creating vendor:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({
          success: false,
          message: 'Vendor code already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error creating vendor',
          error: error.message
        });
      }
    }
  }

  // Update vendor
  async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const {
        vendor_code,
        vendor_name,
        contact_person,
        email,
        phone,
        address,
        gstin,
        city,
        state,
        pincode,
        pan_number,
        payment_terms,
        credit_limit,
        rating,
        tax_category,
        vendor_type
      } = req.body;

      const query = `
                UPDATE inventory_vendors 
                SET vendor_code = ?, vendor_name = ?, contact_person = ?, email = ?, phone = ?, 
                    address = ?, gstin = ?, city = ?, state = ?, pincode = ?, pan_number = ?, 
                    payment_terms = ?, credit_limit = ?, rating = ?, tax_category = ?, vendor_type = ?
                WHERE id = ?
            `;

      const [result] = await db.execute(query, [
        vendor_code,
        vendor_name,
        contact_person || null,
        email || null,
        phone || null,
        address || null,
        gstin || null,
        city || null,
        state || null,
        pincode || null,
        pan_number || null,
        payment_terms || null,
        credit_limit || 0.00,
        rating || 'B',
        tax_category || 'REGISTERED',
        vendor_type || 'DOMESTIC',
        id
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.json({
        success: true,
        message: 'Vendor updated successfully'
      });
    } catch (error) {
      console.error('Error updating vendor:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({
          success: false,
          message: 'Vendor code already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error updating vendor',
          error: error.message
        });
      }
    }
  }

  // Delete vendor (soft delete by setting is_active to false)
  async deleteVendor(req, res) {
    try {
      const { id } = req.params;

      const [result] = await db.execute(
        'UPDATE inventory_vendors SET is_active = FALSE WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.json({
        success: true,
        message: 'Vendor deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting vendor:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting vendor',
        error: error.message
      });
    }
  }
}

module.exports = new VendorController();