/**
 * Supplier and Customer Management Service for VTRIA ERP
 * Handles CRUD operations for suppliers and customers
 */

const { Op } = require('sequelize');
const { 
  Supplier, 
  Customer,
  ProductBatch,
  StockItem,
  sequelize
} = require('../models');

/**
 * Supplier and Customer Management Service
 */
class SupplierCustomerService {
  /**
   * Create a new supplier
   * @param {Object} supplierData - Supplier data
   * @returns {Promise<Object>} Created supplier
   */
  async createSupplier(supplierData) {
    return Supplier.create(supplierData);
  }
  
  /**
   * Get supplier by ID with associations
   * @param {string} id - Supplier ID
   * @returns {Promise<Object>} Supplier with associations
   */
  async getSupplierById(id) {
    return Supplier.findByPk(id, {
      include: [
        { model: ProductBatch, as: 'productBatches' },
        { model: StockItem, as: 'stockItems' }
      ]
    });
  }
  
  /**
   * Update a supplier
   * @param {string} id - Supplier ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated supplier
   */
  async updateSupplier(id, updateData) {
    const supplier = await Supplier.findByPk(id);
    
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    
    await supplier.update(updateData);
    
    return this.getSupplierById(id);
  }
  
  /**
   * Delete a supplier (soft delete)
   * @param {string} id - Supplier ID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteSupplier(id, userId) {
    const supplier = await Supplier.findByPk(id);
    
    if (!supplier) {
      throw new Error('Supplier not found');
    }
    
    // Check if supplier has associated product batches
    const batchCount = await ProductBatch.count({
      where: { supplier_id: id }
    });
    
    // Check if supplier has associated stock items
    const stockItemCount = await StockItem.count({
      where: { 
        supplier_id: id,
        status: { [Op.ne]: 'DELETED' }
      }
    });
    
    if (batchCount > 0 || stockItemCount > 0) {
      throw new Error('Cannot delete supplier with associated product batches or stock items');
    }
    
    // Soft delete by marking as inactive
    await supplier.update({
      is_active: false,
      updated_by: userId
    });
    
    return true;
  }
  
  /**
   * Search suppliers with filters
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Matching suppliers
   */
  async searchSuppliers(filters) {
    const {
      name,
      code,
      contactPerson,
      email,
      phone,
      country,
      isActive,
      limit = 100,
      offset = 0
    } = filters;
    
    const whereClause = {};
    
    if (name) whereClause.name = { [Op.iLike]: `%${name}%` };
    if (code) whereClause.code = { [Op.iLike]: `%${code}%` };
    if (contactPerson) whereClause.contact_person = { [Op.iLike]: `%${contactPerson}%` };
    if (email) whereClause.email = { [Op.iLike]: `%${email}%` };
    if (phone) whereClause.phone = { [Op.iLike]: `%${phone}%` };
    if (country) whereClause.country = { [Op.iLike]: `%${country}%` };
    if (isActive !== undefined) whereClause.is_active = isActive;
    
    return Supplier.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['name', 'ASC']]
    });
  }
  
  /**
   * Create a new customer
   * @param {Object} customerData - Customer data
   * @returns {Promise<Object>} Created customer
   */
  async createCustomer(customerData) {
    return Customer.create(customerData);
  }
  
  /**
   * Get customer by ID with associations
   * @param {string} id - Customer ID
   * @returns {Promise<Object>} Customer with associations
   */
  async getCustomerById(id) {
    return Customer.findByPk(id, {
      include: [
        { model: StockItem, as: 'stockItems' }
      ]
    });
  }
  
  /**
   * Update a customer
   * @param {string} id - Customer ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated customer
   */
  async updateCustomer(id, updateData) {
    const customer = await Customer.findByPk(id);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    await customer.update(updateData);
    
    return this.getCustomerById(id);
  }
  
  /**
   * Delete a customer (soft delete)
   * @param {string} id - Customer ID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteCustomer(id, userId) {
    const customer = await Customer.findByPk(id);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Check if customer has associated stock items
    const stockItemCount = await StockItem.count({
      where: { 
        customer_id: id,
        status: { [Op.ne]: 'DELETED' }
      }
    });
    
    if (stockItemCount > 0) {
      throw new Error('Cannot delete customer with associated stock items');
    }
    
    // Soft delete by marking as inactive
    await customer.update({
      is_active: false,
      updated_by: userId
    });
    
    return true;
  }
  
  /**
   * Search customers with filters
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Matching customers
   */
  async searchCustomers(filters) {
    const {
      name,
      code,
      contactPerson,
      email,
      phone,
      country,
      isActive,
      limit = 100,
      offset = 0
    } = filters;
    
    const whereClause = {};
    
    if (name) whereClause.name = { [Op.iLike]: `%${name}%` };
    if (code) whereClause.code = { [Op.iLike]: `%${code}%` };
    if (contactPerson) whereClause.contact_person = { [Op.iLike]: `%${contactPerson}%` };
    if (email) whereClause.email = { [Op.iLike]: `%${email}%` };
    if (phone) whereClause.phone = { [Op.iLike]: `%${phone}%` };
    if (country) whereClause.country = { [Op.iLike]: `%${country}%` };
    if (isActive !== undefined) whereClause.is_active = isActive;
    
    return Customer.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['name', 'ASC']]
    });
  }
  
  /**
   * Get customer warranty information
   * @param {string} customerId - Customer ID
   * @returns {Promise<Array>} Customer warranty information
   */
  async getCustomerWarrantyInfo(customerId) {
    const customer = await Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Get all stock items assigned to this customer with warranty information
    const stockItems = await StockItem.findAll({
      where: { 
        customer_id: customerId,
        status: { [Op.ne]: 'DELETED' }
      },
      include: [
        { model: Product, as: 'product' }
      ]
    });
    
    const today = new Date();
    
    // Process warranty information
    const warrantyInfo = stockItems.map(item => {
      const isWarrantyValid = item.warranty_expiry_date && item.warranty_expiry_date > today;
      const daysRemaining = item.warranty_expiry_date 
        ? Math.ceil((item.warranty_expiry_date - today) / (1000 * 60 * 60 * 24))
        : 0;
      
      return {
        stock_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product.name,
        serial_number: item.serial_number,
        purchase_date: item.purchase_date,
        warranty_start_date: item.warranty_start_date,
        warranty_expiry_date: item.warranty_expiry_date,
        warranty_valid: isWarrantyValid,
        days_remaining: isWarrantyValid ? daysRemaining : 0,
        warranty_expired: item.warranty_expiry_date && item.warranty_expiry_date <= today,
        status: item.status
      };
    });
    
    return {
      customer,
      warranty_items: warrantyInfo
    };
  }
}

module.exports = new SupplierCustomerService();
