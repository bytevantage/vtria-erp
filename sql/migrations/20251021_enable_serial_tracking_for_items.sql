-- Migration: Enable serial tracking for specific items
-- Items: HMI-001, HNMI, HMIO

USE vtria_erp;

-- Update products table if requires_serial_tracking column exists
ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS requires_serial_tracking BOOLEAN DEFAULT FALSE;

UPDATE products
SET requires_serial_tracking = TRUE
WHERE part_code IN ('HMI-001', 'HNMI', 'HMIO');

-- Update inventory items table if present
ALTER TABLE IF EXISTS inventory_items
ADD COLUMN IF NOT EXISTS requires_serial_tracking BOOLEAN DEFAULT FALSE;

UPDATE inventory_items
SET requires_serial_tracking = TRUE
WHERE item_code IN ('HMI-001', 'HNMI', 'HMIO');

SELECT 'Migration completed: serial tracking enabled for specified items' as message;
