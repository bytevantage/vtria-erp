/**
 * Warranty Helper Utility for VTRIA ERP
 * Handles warranty tracking, expiry calculations, and display formatting
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class WarrantyHelper {
  /**
   * Get comprehensive warranty details for a serial number
   */
  static async getWarrantyDetails(serialNumber) {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          si.id as stock_item_id,
          si.serial_number,
          si.vendor_warranty_expiry,
          si.customer_warranty_expiry,
          si.warranty_status,
          si.purchase_date,
          si.installation_date,
          si.warranty_terms,
          p.id as product_id,
          p.name as product_name,
          p.model_number,
          p.brand,
          p.category_id,
          pc.name as category_name,
          s.id as supplier_id,
          s.name as supplier_name,
          s.contact_email as supplier_email,
          s.contact_phone as supplier_phone,
          l.id as location_id,
          l.name as location_name,
          l.code as location_code
        FROM stock_items si
        LEFT JOIN products p ON si.product_id = p.id
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        LEFT JOIN suppliers s ON si.supplier_id = s.id
        LEFT JOIN locations l ON si.location_id = l.id
        WHERE si.serial_number = :serialNumber
      `, {
        replacements: { serialNumber }
      });

      if (results.length === 0) {
        return {
          found: false,
          message: 'No product found with this serial number'
        };
      }

      const item = results[0];
      const now = new Date();
      
      // Calculate warranty details
      const warrantyInfo = this.calculateWarrantyStatus(
        item.vendor_warranty_expiry,
        item.customer_warranty_expiry,
        now
      );

      // Get warranty history from tickets
      const warrantyHistory = await this.getWarrantyHistory(serialNumber);

      return {
        found: true,
        stock_item: {
          id: item.stock_item_id,
          serial_number: item.serial_number,
          purchase_date: item.purchase_date,
          installation_date: item.installation_date,
          warranty_terms: item.warranty_terms
        },
        product: {
          id: item.product_id,
          name: item.product_name,
          model_number: item.model_number,
          brand: item.brand,
          category: item.category_name
        },
        supplier: {
          id: item.supplier_id,
          name: item.supplier_name,
          email: item.supplier_email,
          phone: item.supplier_phone
        },
        location: {
          id: item.location_id,
          name: item.location_name,
          code: item.location_code
        },
        warranty: {
          ...warrantyInfo,
          vendor_warranty_expiry: item.vendor_warranty_expiry,
          customer_warranty_expiry: item.customer_warranty_expiry,
          warranty_terms: item.warranty_terms
        },
        history: warrantyHistory
      };
    } catch (error) {
      console.error('Error getting warranty details:', error);
      throw new Error('Failed to retrieve warranty information');
    }
  }

  /**
   * Calculate warranty status and remaining time
   */
  static calculateWarrantyStatus(vendorExpiry, customerExpiry, currentDate = new Date()) {
    const now = currentDate;
    
    // Determine which warranty applies (customer warranty takes precedence)
    let primaryExpiry = customerExpiry || vendorExpiry;
    let warrantyType = customerExpiry ? 'customer' : vendorExpiry ? 'vendor' : null;
    
    if (!primaryExpiry) {
      return {
        status: 'not_applicable',
        type: 'none',
        remaining_days: 0,
        remaining_months: 0,
        expiry_date: null,
        is_expired: false,
        is_expiring_soon: false,
        coverage_details: {
          vendor_coverage: false,
          customer_coverage: false,
          extended_coverage: false
        }
      };
    }

    const expiryDate = new Date(primaryExpiry);
    const diffTime = expiryDate - now;
    const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const remainingMonths = Math.ceil(remainingDays / 30);
    
    let status = 'not_applicable';
    let isExpired = false;
    let isExpiringSoon = false;
    
    if (remainingDays <= 0) {
      status = 'expired';
      isExpired = true;
    } else if (remainingDays <= 30) {
      status = 'expiring_soon';
      isExpiringSoon = true;
    } else {
      status = 'active';
    }

    // Check coverage details
    const vendorCoverage = vendorExpiry && new Date(vendorExpiry) > now;
    const customerCoverage = customerExpiry && new Date(customerExpiry) > now;
    
    return {
      status,
      type: warrantyType,
      remaining_days: Math.max(0, remainingDays),
      remaining_months: Math.max(0, remainingMonths),
      expiry_date: primaryExpiry,
      is_expired: isExpired,
      is_expiring_soon: isExpiringSoon,
      coverage_details: {
        vendor_coverage: vendorCoverage,
        customer_coverage: customerCoverage,
        extended_coverage: customerCoverage && vendorCoverage,
        primary_coverage: warrantyType
      }
    };
  }

  /**
   * Get warranty-related ticket history for a serial number
   */
  static async getWarrantyHistory(serialNumber) {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          t.id,
          t.ticket_number,
          t.title,
          t.status,
          t.warranty_status,
          t.created_at,
          t.actual_resolution_date,
          u.first_name,
          u.last_name
        FROM tickets t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.serial_number = :serialNumber
        ORDER BY t.created_at DESC
        LIMIT 10
      `, {
        replacements: { serialNumber }
      });

      return results.map(ticket => ({
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        title: ticket.title,
        status: ticket.status,
        warranty_status: ticket.warranty_status,
        created_at: ticket.created_at,
        resolution_date: ticket.actual_resolution_date,
        created_by: `${ticket.first_name} ${ticket.last_name}`
      }));
    } catch (error) {
      console.error('Error getting warranty history:', error);
      return [];
    }
  }

  /**
   * Get items with expiring warranties
   */
  static async getExpiringWarranties(days = 30, locationId = null) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      let locationFilter = '';
      let replacements = { currentDate: new Date(), futureDate };
      
      if (locationId) {
        locationFilter = 'AND si.location_id = :locationId';
        replacements.locationId = locationId;
      }

      const [results] = await sequelize.query(`
        SELECT 
          si.id as stock_item_id,
          si.serial_number,
          si.vendor_warranty_expiry,
          si.customer_warranty_expiry,
          si.warranty_status,
          p.name as product_name,
          p.model_number,
          p.brand,
          s.name as supplier_name,
          l.name as location_name,
          l.code as location_code,
          CASE 
            WHEN si.customer_warranty_expiry IS NOT NULL THEN si.customer_warranty_expiry
            ELSE si.vendor_warranty_expiry
          END as primary_expiry,
          CASE 
            WHEN si.customer_warranty_expiry IS NOT NULL THEN 'customer'
            ELSE 'vendor'
          END as warranty_type
        FROM stock_items si
        LEFT JOIN products p ON si.product_id = p.id
        LEFT JOIN suppliers s ON si.supplier_id = s.id
        LEFT JOIN locations l ON si.location_id = l.id
        WHERE (
          (si.customer_warranty_expiry BETWEEN :currentDate AND :futureDate)
          OR 
          (si.vendor_warranty_expiry BETWEEN :currentDate AND :futureDate AND si.customer_warranty_expiry IS NULL)
        )
        ${locationFilter}
        ORDER BY 
          CASE 
            WHEN si.customer_warranty_expiry IS NOT NULL THEN si.customer_warranty_expiry
            ELSE si.vendor_warranty_expiry
          END ASC
      `, {
        replacements
      });

      return results.map(item => {
        const warrantyInfo = this.calculateWarrantyStatus(
          item.vendor_warranty_expiry,
          item.customer_warranty_expiry
        );
        
        return {
          stock_item_id: item.stock_item_id,
          serial_number: item.serial_number,
          product_name: item.product_name,
          model_number: item.model_number,
          brand: item.brand,
          supplier_name: item.supplier_name,
          location_name: item.location_name,
          location_code: item.location_code,
          warranty_type: item.warranty_type,
          expiry_date: item.primary_expiry,
          ...warrantyInfo
        };
      });
    } catch (error) {
      console.error('Error getting expiring warranties:', error);
      throw new Error('Failed to retrieve expiring warranties');
    }
  }

  /**
   * Format warranty display information
   */
  static formatWarrantyDisplay(warrantyInfo) {
    if (!warrantyInfo.found) {
      return {
        status_text: 'Not Found',
        status_color: 'gray',
        display_text: 'No warranty information available'
      };
    }

    const { warranty } = warrantyInfo;
    let statusText = '';
    let statusColor = '';
    let displayText = '';

    switch (warranty.status) {
      case 'active':
        statusText = 'Active';
        statusColor = 'green';
        displayText = `${warranty.remaining_days} days remaining (expires ${new Date(warranty.expiry_date).toLocaleDateString()})`;
        break;
      case 'expiring_soon':
        statusText = 'Expiring Soon';
        statusColor = 'orange';
        displayText = `${warranty.remaining_days} days remaining (expires ${new Date(warranty.expiry_date).toLocaleDateString()})`;
        break;
      case 'expired':
        statusText = 'Expired';
        statusColor = 'red';
        displayText = `Expired on ${new Date(warranty.expiry_date).toLocaleDateString()}`;
        break;
      default:
        statusText = 'Not Applicable';
        statusColor = 'gray';
        displayText = 'No warranty coverage';
    }

    return {
      status_text: statusText,
      status_color: statusColor,
      display_text: displayText,
      coverage_type: warranty.type,
      vendor_coverage: warranty.coverage_details.vendor_coverage,
      customer_coverage: warranty.coverage_details.customer_coverage,
      extended_coverage: warranty.coverage_details.extended_coverage
    };
  }

  /**
   * Get warranty summary statistics
   */
  static async getWarrantySummary(locationId = null) {
    try {
      let locationFilter = '';
      let replacements = { currentDate: new Date() };
      
      if (locationId) {
        locationFilter = 'AND si.location_id = :locationId';
        replacements.locationId = locationId;
      }

      const [results] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE 
            WHEN (si.customer_warranty_expiry > :currentDate OR si.vendor_warranty_expiry > :currentDate) 
            THEN 1 
          END) as active_warranties,
          COUNT(CASE 
            WHEN (si.customer_warranty_expiry <= :currentDate AND si.vendor_warranty_expiry <= :currentDate)
            OR (si.customer_warranty_expiry IS NULL AND si.vendor_warranty_expiry IS NULL)
            THEN 1 
          END) as expired_warranties,
          COUNT(CASE 
            WHEN (
              (si.customer_warranty_expiry BETWEEN :currentDate AND :currentDate + INTERVAL '30 days')
              OR 
              (si.vendor_warranty_expiry BETWEEN :currentDate AND :currentDate + INTERVAL '30 days' AND si.customer_warranty_expiry IS NULL)
            )
            THEN 1 
          END) as expiring_soon
        FROM stock_items si
        WHERE si.serial_number IS NOT NULL
        ${locationFilter}
      `, {
        replacements
      });

      const summary = results[0];
      
      return {
        total_items: parseInt(summary.total_items),
        active_warranties: parseInt(summary.active_warranties),
        expired_warranties: parseInt(summary.expired_warranties),
        expiring_soon: parseInt(summary.expiring_soon),
        coverage_percentage: summary.total_items > 0 
          ? Math.round((summary.active_warranties / summary.total_items) * 100)
          : 0
      };
    } catch (error) {
      console.error('Error getting warranty summary:', error);
      throw new Error('Failed to retrieve warranty summary');
    }
  }
}

module.exports = WarrantyHelper;
