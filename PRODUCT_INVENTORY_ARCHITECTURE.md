# VTRIA ERP: Product & Inventory Architecture

## Enterprise Architecture Overview

This document explains the proper separation between **Product Master Data** and **Inventory/Stock Management** in the VTRIA ERP system, designed following enterprise-grade best practices.

## Architecture Principles

### 1. Separation of Concerns
- **Product Master**: Static reference data that doesn't change with stock levels
- **Inventory Management**: Dynamic transactional data that changes with business operations

### 2. Data Normalization
- Eliminates data redundancy
- Ensures data consistency
- Supports multiple locations and complex warehouse operations

### 3. Scalability
- Supports unlimited products, locations, and serial numbers
- Handles high-volume transactions
- Proper indexing for performance

## Database Schema Structure

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Product Master │    │   Inventory     │    │ Serial Numbers  │
│   (Reference)   │◄──►│  (Transactional)│◄──►│   (Tracking)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 1. Product Master Data (Static Information)

### Tables:
- **`products`** - Main product information
- **`product_categories`** - Hierarchical categorization
- **`manufacturers`** - Brand/manufacturer information
- **`units_of_measurement`** - Units (kg, L, nos, etc.)

### Product Table Fields:

#### Basic Information
- `name` - Product name
- `product_code` - VTRIA's internal code (unique)
- `manufacturer_part_code` - Manufacturer's part number

#### Classification
- `category_id` - Main category (Control Panels, Motors, etc.)
- `subcategory_id` - Sub-category
- `manufacturer_id` - Brand/Manufacturer

#### Pricing & Tax
- `mrp` - Maximum Retail Price
- `last_purchase_price` - Last purchased price
- `vendor_discount_percentage` - Standard vendor discount
- `hsn_code` - HSN/SAC code for GST
- `gst_rate` - GST percentage

#### Warranty (Template)
- `has_warranty` - Boolean flag
- `warranty_period_months` - Standard warranty period
- `warranty_type` - Type of warranty

#### Physical Properties
- `unit_id` - Unit of measurement
- `weight` - Product weight
- `dimensions` - L×W×H format

#### Configuration
- `is_serialized` - Whether product requires serial tracking
- `min_stock_level` - Minimum stock threshold
- `reorder_point` - Reorder trigger level

## 2. Inventory Management (Dynamic Information)

### Tables:
- **`inventory_stock`** - Stock quantities per location
- **`inventory_serial_numbers`** - Individual serial number tracking
- **`inventory_movements`** - All stock transactions
- **`inventory_product_costing`** - Costing methods and valuations

### Inventory Stock Fields:

#### Quantities
- `available_quantity` - Available for sale/use
- `reserved_quantity` - Reserved for orders
- `damaged_quantity` - Damaged stock
- `total_quantity` - Computed total

#### Costing
- `average_cost` - Weighted average cost
- `last_cost` - Last purchase cost
- Stock valuation using FIFO/LIFO/Average methods

### Serial Number Tracking:

For products where `is_serialized = true`:

#### Instance-Specific Warranty
- `warranty_start_date` - When warranty begins
- `warranty_end_date` - When warranty expires
- `warranty_status` - active/expired/void

#### Status Tracking
- `status` - available/reserved/sold/damaged/returned/under_repair
- `condition_status` - new/used/refurbished/damaged

#### Purchase/Sales Information
- `purchase_date`, `purchase_price`, `supplier_id`
- `sale_date`, `sales_order_id`, `customer_id`

## 3. Data Flow Examples

### Example 1: Adding a New Product

```sql
-- 1. Add to Product Master (once)
INSERT INTO products (
    name, product_code, manufacturer_part_code, 
    category_id, unit_id, mrp, hsn_code, gst_rate,
    has_warranty, warranty_period_months, is_serialized
) VALUES (
    'Schneider Contactors LC1D18M7', 'VTRIA-SC-LC1D18M7', 'LC1D18M7',
    1, 8, 2500.00, '8536', 18.00,
    true, 24, false
);
```

### Example 2: Receiving Stock

```sql
-- 2. Record stock receipt (creates inventory record)
INSERT INTO inventory_movements (
    movement_type, product_id, to_location_id, 
    quantity, unit_cost, reference_type, reference_id
) VALUES (
    'inward', 1, 1, 10, 2000.00, 'purchase', 123
);

-- Stock automatically updated via trigger
-- inventory_stock table updated: available_quantity += 10
```

### Example 3: Serialized Item Receipt

```sql
-- For serialized items, also record individual serial numbers
INSERT INTO inventory_serial_numbers (
    product_id, location_id, serial_number, 
    warranty_start_date, warranty_end_date, 
    purchase_date, purchase_price, supplier_id
) VALUES (
    1, 1, 'SN123456789', 
    '2024-01-15', '2026-01-15',
    '2024-01-15', 2000.00, 5
);
```

## 4. Key Benefits of This Architecture

### ✅ **Data Integrity**
- Product specifications never mix with stock quantities
- Warranty information properly tracked per individual item
- Consistent pricing and tax information

### ✅ **Multi-Location Support** 
- Same product can have different stock levels at different locations
- Location-specific costing and valuation
- Inter-location transfers properly tracked

### ✅ **Serial Number Management**
- Individual warranty tracking for each item
- Complete lifecycle tracking (purchase → sale → service)
- Compliance with regulatory requirements

### ✅ **Cost Management**
- Multiple costing methods (FIFO, LIFO, Average)
- Location-specific cost tracking
- Proper inventory valuation

### ✅ **Performance**
- Proper indexing for fast queries
- Efficient stock lookups
- Optimized for reporting

## 5. Common Queries & Views

### Stock Summary View
```sql
SELECT 
    p.name as product_name,
    p.product_code,
    l.name as location_name,
    ist.available_quantity,
    ist.reserved_quantity,
    (ist.available_quantity * ist.average_cost) as stock_value,
    CASE 
        WHEN ist.available_quantity <= p.reorder_point THEN 'REORDER'
        WHEN ist.available_quantity <= p.min_stock_level THEN 'LOW_STOCK'
        ELSE 'OK'
    END as stock_status
FROM products p
LEFT JOIN inventory_stock ist ON p.id = ist.product_id
LEFT JOIN locations l ON ist.location_id = l.id;
```

### Serial Number Tracking
```sql
SELECT 
    p.name, sn.serial_number, sn.warranty_end_date,
    sn.status, sn.condition_status
FROM inventory_serial_numbers sn
JOIN products p ON sn.product_id = p.id
WHERE sn.warranty_end_date > CURDATE()
AND sn.status = 'sold';
```

### Low Stock Alert
```sql
SELECT 
    p.name, p.product_code, l.name as location,
    ist.available_quantity, p.reorder_point
FROM products p
JOIN inventory_stock ist ON p.id = ist.product_id
JOIN locations l ON ist.location_id = l.id
WHERE ist.available_quantity <= p.reorder_point
AND p.is_active = TRUE;
```

## 6. Migration Strategy

### From Current Schema:
1. **Export existing data** from current `products` and `stock` tables
2. **Run the new schema** (016_proper_product_inventory_schema.sql)
3. **Import product master data** into new `products` table
4. **Import stock data** into `inventory_stock` table
5. **Update application code** to use new table structure
6. **Test all functionality** before going live

### API Changes Required:
- Update product creation/update endpoints
- Separate stock management endpoints
- Add serial number management endpoints
- Update inventory movement tracking

## 7. Frontend Implications

### Product Management Pages:
- **Product Master** - Edit product specifications, warranty templates
- **Stock Management** - View/manage quantities per location
- **Serial Number Tracking** - Individual item management
- **Stock Movements** - Transaction history

### Dashboard Updates:
- Stock alerts based on proper thresholds
- Inventory valuation reports
- Warranty expiry notifications
- Multi-location stock visibility

This architecture ensures your VTRIA ERP system can handle complex inventory scenarios while maintaining data integrity and supporting future growth.