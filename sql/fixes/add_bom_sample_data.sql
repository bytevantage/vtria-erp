-- Add sample BOM data for testing
INSERT INTO bill_of_materials 
(bom_number, product_name, product_code, description, total_cost, labor_hours, overhead_cost, status, created_by) 
VALUES
('BOM-2025-001', 'Control Panel Assembly', 'CP-ASSY-001', 'Complete control panel with PLC and HMI', 15000.00, 8.5, 1500.00, 'active', 7),
('BOM-2025-002', 'Motor Drive Unit', 'MDU-001', 'Variable frequency drive with safety controls', 25000.00, 12.0, 2500.00, 'active', 7),
('BOM-2025-003', 'Automation Cabinet', 'AUTO-CAB-001', 'Industrial automation cabinet 600x800x300', 8500.00, 6.0, 850.00, 'draft', 7);