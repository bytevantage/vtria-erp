-- VTRIA ERP Database Schema - Products and Stock Management
-- Multi-location stock tracking with serial numbers and warranties

-- =============================================
-- PRODUCT CATEGORIES TABLE
-- =============================================
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES product_categories(id), -- For hierarchical categories
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE product_categories IS 'Hierarchical product categories';
COMMENT ON COLUMN product_categories.parent_id IS 'Self-referencing FK for category hierarchy';

-- =============================================
-- MANUFACTURERS TABLE
-- =============================================
CREATE TABLE manufacturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) UNIQUE,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE manufacturers IS 'Product manufacturers and brands';

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES product_categories(id),
    manufacturer_id UUID REFERENCES manufacturers(id),
    model VARCHAR(100),
    specifications JSONB DEFAULT '{}', -- Technical specifications
    attributes JSONB DEFAULT '{}', -- Flexible product attributes
    base_price DECIMAL(12,2),
    cost_price DECIMAL(12,2),
    weight DECIMAL(8,3), -- in kg
    dimensions JSONB, -- {length, width, height, unit}
    warranty_period INTEGER, -- in months
    warranty_terms TEXT,
    is_serialized BOOLEAN DEFAULT false, -- Whether product requires serial number tracking
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE products IS 'Master product catalog';
COMMENT ON COLUMN products.specifications IS 'Technical specifications in JSON format';
COMMENT ON COLUMN products.attributes IS 'Flexible product attributes (color, size, etc.)';
COMMENT ON COLUMN products.is_serialized IS 'Whether this product requires serial number tracking';

-- =============================================
-- PRODUCT_BATCHES TABLE
-- =============================================
CREATE TABLE product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    batch_number VARCHAR(50) NOT NULL,
    manufacture_date DATE,
    expiry_date DATE,
    supplier_id UUID, -- References suppliers table (to be created)
    purchase_price DECIMAL(12,2),
    selling_price DECIMAL(12,2),
    quantity_received INTEGER DEFAULT 0,
    quantity_available INTEGER DEFAULT 0,
    batch_attributes JSONB DEFAULT '{}', -- Batch-specific attributes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, batch_number)
);

COMMENT ON TABLE product_batches IS 'Product batches with specific pricing and attributes';
COMMENT ON COLUMN product_batches.batch_attributes IS 'Batch-specific attributes and properties';

-- =============================================
-- STOCK_ITEMS TABLE
-- =============================================
CREATE TABLE stock_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    batch_id UUID REFERENCES product_batches(id),
    location_id UUID NOT NULL REFERENCES locations(id),
    serial_number VARCHAR(100), -- For serialized products
    status stock_status DEFAULT 'available',
    purchase_price DECIMAL(12,2),
    selling_price DECIMAL(12,2),
    vendor_warranty_start DATE,
    vendor_warranty_end DATE,
    customer_warranty_start DATE,
    customer_warranty_end DATE,
    warranty_details JSONB DEFAULT '{}',
    condition_notes TEXT,
    last_audit_date DATE,
    reserved_for UUID, -- References cases or tickets
    reserved_until TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}', -- Additional item-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique serial numbers per product (if serialized)
    UNIQUE(product_id, serial_number)
);

COMMENT ON TABLE stock_items IS 'Individual stock items with location and warranty tracking';
COMMENT ON COLUMN stock_items.serial_number IS 'Unique serial number for serialized products';
COMMENT ON COLUMN stock_items.warranty_details IS 'Detailed warranty information in JSON';
COMMENT ON COLUMN stock_items.reserved_for IS 'UUID of case/ticket this item is reserved for';

-- =============================================
-- STOCK_MOVEMENTS TABLE
-- =============================================
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_item_id UUID NOT NULL REFERENCES stock_items(id),
    movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'transfer', 'adjustment'
    from_location_id UUID REFERENCES locations(id),
    to_location_id UUID REFERENCES locations(id),
    quantity INTEGER DEFAULT 1,
    reference_type VARCHAR(50), -- 'purchase', 'sale', 'transfer', 'adjustment', 'case', 'ticket'
    reference_id UUID, -- ID of the related record
    notes TEXT,
    moved_by UUID NOT NULL REFERENCES users(id),
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE stock_movements IS 'Stock movement history and audit trail';
COMMENT ON COLUMN stock_movements.reference_type IS 'Type of transaction causing the movement';
COMMENT ON COLUMN stock_movements.reference_id IS 'ID of the related transaction record';

-- =============================================
-- SUPPLIERS TABLE
-- =============================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    country VARCHAR(50) DEFAULT 'India',
    postal_code VARCHAR(20),
    tax_id VARCHAR(50), -- GST/VAT number
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(12,2),
    supplier_type VARCHAR(50), -- 'manufacturer', 'distributor', 'retailer'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE suppliers IS 'Supplier and vendor information';
COMMENT ON COLUMN suppliers.supplier_type IS 'Type of supplier relationship';

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code VARCHAR(20) UNIQUE,
    company_name VARCHAR(200),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    country VARCHAR(50) DEFAULT 'India',
    postal_code VARCHAR(20),
    tax_id VARCHAR(50), -- GST number
    customer_type VARCHAR(50), -- 'individual', 'corporate', 'government'
    credit_limit DECIMAL(12,2),
    payment_terms VARCHAR(100),
    assigned_location_id UUID REFERENCES locations(id),
    assigned_user_id UUID REFERENCES users(id), -- Account manager
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customers IS 'Customer information and account details';
COMMENT ON COLUMN customers.assigned_location_id IS 'Primary location serving this customer';
COMMENT ON COLUMN customers.assigned_user_id IS 'Account manager for this customer';

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Product categories indexes
CREATE INDEX idx_product_categories_parent ON product_categories(parent_id);
CREATE INDEX idx_product_categories_active ON product_categories(is_active);

-- Manufacturers indexes
CREATE INDEX idx_manufacturers_code ON manufacturers(code);
CREATE INDEX idx_manufacturers_active ON manufacturers(is_active);

-- Products indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_manufacturer ON products(manufacturer_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_serialized ON products(is_serialized);
CREATE GIN INDEX idx_products_specifications ON products USING gin(specifications);
CREATE GIN INDEX idx_products_attributes ON products USING gin(attributes);

-- Product batches indexes
CREATE INDEX idx_product_batches_product ON product_batches(product_id);
CREATE INDEX idx_product_batches_batch_number ON product_batches(batch_number);
CREATE INDEX idx_product_batches_expiry ON product_batches(expiry_date);
CREATE INDEX idx_product_batches_active ON product_batches(is_active);

-- Stock items indexes
CREATE INDEX idx_stock_items_product ON stock_items(product_id);
CREATE INDEX idx_stock_items_batch ON stock_items(batch_id);
CREATE INDEX idx_stock_items_location ON stock_items(location_id);
CREATE INDEX idx_stock_items_serial ON stock_items(serial_number);
CREATE INDEX idx_stock_items_status ON stock_items(status);
CREATE INDEX idx_stock_items_vendor_warranty ON stock_items(vendor_warranty_end);
CREATE INDEX idx_stock_items_customer_warranty ON stock_items(customer_warranty_end);
CREATE INDEX idx_stock_items_reserved ON stock_items(reserved_for);

-- Stock movements indexes
CREATE INDEX idx_stock_movements_item ON stock_movements(stock_item_id);
CREATE INDEX idx_stock_movements_from_location ON stock_movements(from_location_id);
CREATE INDEX idx_stock_movements_to_location ON stock_movements(to_location_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX idx_stock_movements_moved_by ON stock_movements(moved_by);

-- Suppliers indexes
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_type ON suppliers(supplier_type);

-- Customers indexes
CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_location ON customers(assigned_location_id);
CREATE INDEX idx_customers_user ON customers(assigned_user_id);
CREATE INDEX idx_customers_active ON customers(is_active);
CREATE INDEX idx_customers_type ON customers(customer_type);

-- =============================================
-- TRIGGERS
-- =============================================

-- Apply updated_at triggers
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manufacturers_updated_at BEFORE UPDATE ON manufacturers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_batches_updated_at BEFORE UPDATE ON product_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint for suppliers in product_batches
ALTER TABLE product_batches ADD CONSTRAINT fk_product_batches_supplier 
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
