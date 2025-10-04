-- Add additional vendor fields for tax calculations and detailed address
-- Execute this script to enhance the inventory_vendors table

ALTER TABLE inventory_vendors 
ADD COLUMN gstin VARCHAR(15) AFTER address,
ADD COLUMN city VARCHAR(100) AFTER gstin,
ADD COLUMN state VARCHAR(100) AFTER city,
ADD COLUMN pincode VARCHAR(10) AFTER state,
ADD COLUMN pan_number VARCHAR(10) AFTER pincode,
ADD COLUMN tax_category ENUM('REGISTERED', 'UNREGISTERED', 'COMPOSITION') DEFAULT 'REGISTERED' AFTER pan_number,
ADD COLUMN vendor_type ENUM('DOMESTIC', 'IMPORT', 'SEZ') DEFAULT 'DOMESTIC' AFTER tax_category;

-- Add index for GST number for faster lookups
CREATE INDEX idx_vendor_gstin ON inventory_vendors(gstin);
CREATE INDEX idx_vendor_state ON inventory_vendors(state);