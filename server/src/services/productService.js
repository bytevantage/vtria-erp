/**
 * Product Management Service for VTRIA ERP
 * Handles CRUD operations for products, categories, batches, suppliers, and manufacturers
 */

const { Op } = require('sequelize');
const { 
  Product, 
  ProductCategory,
  ProductBatch,
  Manufacturer,
  Supplier,
  StockItem,
  sequelize
} = require('../models');

/**
 * Product Management Service
 */
class ProductService {
  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} Created product
   */
  async createProduct(productData) {
    return Product.create(productData);
  }
  
  /**
   * Get product by ID with associations
   * @param {string} id - Product ID
   * @returns {Promise<Object>} Product with associations
   */
  async getProductById(id) {
    return Product.findByPk(id, {
      include: [
        { model: ProductCategory, as: 'category' },
        { model: Manufacturer, as: 'manufacturer' },
        { 
          model: ProductBatch, 
          as: 'batches',
          include: [
            { model: Supplier, as: 'supplier' }
          ]
        }
      ]
    });
  }
  
  /**
   * Update a product
   * @param {string} id - Product ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated product
   */
  async updateProduct(id, updateData) {
    const product = await Product.findByPk(id);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    await product.update(updateData);
    
    return this.getProductById(id);
  }
  
  /**
   * Delete a product (soft delete)
   * @param {string} id - Product ID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteProduct(id, userId) {
    const product = await Product.findByPk(id);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Check if product has associated stock items
    const stockItemCount = await StockItem.count({
      where: { 
        product_id: id,
        status: { [Op.ne]: 'DELETED' }
      }
    });
    
    if (stockItemCount > 0) {
      throw new Error('Cannot delete product with existing stock items');
    }
    
    // Soft delete by marking as inactive
    await product.update({
      is_active: false,
      updated_by: userId
    });
    
    return true;
  }
  
  /**
   * Search products with filters
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Matching products
   */
  async searchProducts(filters) {
    const {
      name,
      code,
      categoryId,
      manufacturerId,
      isActive,
      limit = 100,
      offset = 0
    } = filters;
    
    const whereClause = {};
    
    if (name) whereClause.name = { [Op.iLike]: `%${name}%` };
    if (code) whereClause.code = { [Op.iLike]: `%${code}%` };
    if (categoryId) whereClause.category_id = categoryId;
    if (manufacturerId) whereClause.manufacturer_id = manufacturerId;
    if (isActive !== undefined) whereClause.is_active = isActive;
    
    return Product.findAndCountAll({
      where: whereClause,
      include: [
        { model: ProductCategory, as: 'category' },
        { model: Manufacturer, as: 'manufacturer' }
      ],
      limit,
      offset,
      order: [['name', 'ASC']]
    });
  }
  
  /**
   * Create a new product category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} Created category
   */
  async createProductCategory(categoryData) {
    return ProductCategory.create(categoryData);
  }
  
  /**
   * Get product category by ID with associations
   * @param {string} id - Category ID
   * @returns {Promise<Object>} Category with associations
   */
  async getProductCategoryById(id) {
    return ProductCategory.findByPk(id, {
      include: [
        { model: ProductCategory, as: 'parentCategory' },
        { model: ProductCategory, as: 'childCategories' },
        { model: Product, as: 'products' }
      ]
    });
  }
  
  /**
   * Update a product category
   * @param {string} id - Category ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated category
   */
  async updateProductCategory(id, updateData) {
    const category = await ProductCategory.findByPk(id);
    
    if (!category) {
      throw new Error('Product category not found');
    }
    
    await category.update(updateData);
    
    return this.getProductCategoryById(id);
  }
  
  /**
   * Delete a product category
   * @param {string} id - Category ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProductCategory(id) {
    const category = await ProductCategory.findByPk(id);
    
    if (!category) {
      throw new Error('Product category not found');
    }
    
    // Check if category has products
    const productCount = await Product.count({
      where: { category_id: id }
    });
    
    if (productCount > 0) {
      throw new Error('Cannot delete category with associated products');
    }
    
    // Check if category has child categories
    const childCount = await ProductCategory.count({
      where: { parent_id: id }
    });
    
    if (childCount > 0) {
      throw new Error('Cannot delete category with child categories');
    }
    
    await category.destroy();
    
    return true;
  }
  
  /**
   * Get product category tree
   * @returns {Promise<Array>} Category tree
   */
  async getProductCategoryTree() {
    // Get all categories
    const categories = await ProductCategory.findAll({
      include: [
        { model: ProductCategory, as: 'parentCategory' }
      ]
    });
    
    // Build tree structure
    const categoryMap = {};
    const rootCategories = [];
    
    // First pass: create map of id -> category
    categories.forEach(category => {
      categoryMap[category.id] = {
        ...category.toJSON(),
        children: []
      };
    });
    
    // Second pass: build tree structure
    categories.forEach(category => {
      if (category.parent_id) {
        // This is a child category, add to parent's children
        if (categoryMap[category.parent_id]) {
          categoryMap[category.parent_id].children.push(categoryMap[category.id]);
        }
      } else {
        // This is a root category
        rootCategories.push(categoryMap[category.id]);
      }
    });
    
    return rootCategories;
  }
  
  /**
   * Create a new product batch
   * @param {Object} batchData - Batch data
   * @returns {Promise<Object>} Created batch
   */
  async createProductBatch(batchData) {
    return ProductBatch.create(batchData);
  }
  
  /**
   * Get product batch by ID with associations
   * @param {string} id - Batch ID
   * @returns {Promise<Object>} Batch with associations
   */
  async getProductBatchById(id) {
    return ProductBatch.findByPk(id, {
      include: [
        { model: Product, as: 'product' },
        { model: Supplier, as: 'supplier' }
      ]
    });
  }
  
  /**
   * Update a product batch
   * @param {string} id - Batch ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated batch
   */
  async updateProductBatch(id, updateData) {
    const batch = await ProductBatch.findByPk(id);
    
    if (!batch) {
      throw new Error('Product batch not found');
    }
    
    await batch.update(updateData);
    
    return this.getProductBatchById(id);
  }
  
  /**
   * Search product batches with filters
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Matching batches
   */
  async searchProductBatches(filters) {
    const {
      productId,
      batchNumber,
      supplierId,
      purchaseDateStart,
      purchaseDateEnd,
      expiryDateStart,
      expiryDateEnd,
      limit = 100,
      offset = 0
    } = filters;
    
    const whereClause = {};
    
    if (productId) whereClause.product_id = productId;
    if (batchNumber) whereClause.batch_number = { [Op.iLike]: `%${batchNumber}%` };
    if (supplierId) whereClause.supplier_id = supplierId;
    
    if (purchaseDateStart || purchaseDateEnd) {
      whereClause.purchase_date = {};
      if (purchaseDateStart) whereClause.purchase_date[Op.gte] = purchaseDateStart;
      if (purchaseDateEnd) whereClause.purchase_date[Op.lte] = purchaseDateEnd;
    }
    
    if (expiryDateStart || expiryDateEnd) {
      whereClause.expiry_date = {};
      if (expiryDateStart) whereClause.expiry_date[Op.gte] = expiryDateStart;
      if (expiryDateEnd) whereClause.expiry_date[Op.lte] = expiryDateEnd;
    }
    
    return ProductBatch.findAndCountAll({
      where: whereClause,
      include: [
        { model: Product, as: 'product' },
        { model: Supplier, as: 'supplier' }
      ],
      limit,
      offset,
      order: [['purchase_date', 'DESC']]
    });
  }
  
  /**
   * Create a new manufacturer
   * @param {Object} manufacturerData - Manufacturer data
   * @returns {Promise<Object>} Created manufacturer
   */
  async createManufacturer(manufacturerData) {
    return Manufacturer.create(manufacturerData);
  }
  
  /**
   * Get manufacturer by ID with associations
   * @param {string} id - Manufacturer ID
   * @returns {Promise<Object>} Manufacturer with associations
   */
  async getManufacturerById(id) {
    return Manufacturer.findByPk(id, {
      include: [
        { model: Product, as: 'products' }
      ]
    });
  }
  
  /**
   * Update a manufacturer
   * @param {string} id - Manufacturer ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated manufacturer
   */
  async updateManufacturer(id, updateData) {
    const manufacturer = await Manufacturer.findByPk(id);
    
    if (!manufacturer) {
      throw new Error('Manufacturer not found');
    }
    
    await manufacturer.update(updateData);
    
    return this.getManufacturerById(id);
  }
  
  /**
   * Delete a manufacturer (soft delete)
   * @param {string} id - Manufacturer ID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteManufacturer(id, userId) {
    const manufacturer = await Manufacturer.findByPk(id);
    
    if (!manufacturer) {
      throw new Error('Manufacturer not found');
    }
    
    // Check if manufacturer has associated products
    const productCount = await Product.count({
      where: { manufacturer_id: id }
    });
    
    if (productCount > 0) {
      throw new Error('Cannot delete manufacturer with associated products');
    }
    
    // Soft delete by marking as inactive
    await manufacturer.update({
      is_active: false,
      updated_by: userId
    });
    
    return true;
  }
  
  /**
   * Search manufacturers with filters
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Matching manufacturers
   */
  async searchManufacturers(filters) {
    const {
      name,
      code,
      country,
      isActive,
      limit = 100,
      offset = 0
    } = filters;
    
    const whereClause = {};
    
    if (name) whereClause.name = { [Op.iLike]: `%${name}%` };
    if (code) whereClause.code = { [Op.iLike]: `%${code}%` };
    if (country) whereClause.country = { [Op.iLike]: `%${country}%` };
    if (isActive !== undefined) whereClause.is_active = isActive;
    
    return Manufacturer.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['name', 'ASC']]
    });
  }
}

module.exports = new ProductService();
