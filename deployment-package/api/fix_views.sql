-- Create monthly sales summary view (simpler version)
CREATE OR REPLACE VIEW v_monthly_sales_summary AS
SELECT 
    YEAR(COALESCE(i.invoice_date, CURDATE())) as `year`,
    MONTH(COALESCE(i.invoice_date, CURDATE())) as `month`,
    DATE_FORMAT(COALESCE(i.invoice_date, CURDATE()), '%Y-%m') as year_month,
    COUNT(i.id) as total_invoices,
    COALESCE(SUM(i.subtotal), 0) as total_subtotal,
    COALESCE(SUM(i.tax_amount), 0) as total_tax,
    COALESCE(SUM(i.total_amount), 0) as total_amount,
    0 as total_collected,
    COALESCE(SUM(i.total_amount), 0) as total_outstanding,
    0.00 as collection_percentage
FROM invoices i
WHERE i.status != 'cancelled' OR i.id IS NULL
GROUP BY YEAR(COALESCE(i.invoice_date, CURDATE())), MONTH(COALESCE(i.invoice_date, CURDATE()))
HAVING total_invoices > 0
ORDER BY `year` DESC, `month` DESC;

-- Create GST summary view (simpler version)
CREATE OR REPLACE VIEW v_gst_summary AS
SELECT 
    YEAR(COALESCE(i.invoice_date, CURDATE())) as `year`,
    MONTH(COALESCE(i.invoice_date, CURDATE())) as `month`,
    DATE_FORMAT(COALESCE(i.invoice_date, CURDATE()), '%Y-%m') as year_month,
    COALESCE(SUM(i.subtotal), 0) as taxable_value,
    0 as total_cgst,
    0 as total_sgst, 
    0 as total_igst,
    0 as total_cess,
    COALESCE(SUM(i.tax_amount), 0) as total_gst,
    COUNT(i.id) as total_invoices
FROM invoices i
WHERE i.status != 'cancelled' OR i.id IS NULL
GROUP BY YEAR(COALESCE(i.invoice_date, CURDATE())), MONTH(COALESCE(i.invoice_date, CURDATE()))
HAVING total_invoices > 0
ORDER BY `year` DESC, `month` DESC;