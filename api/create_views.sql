-- Create monthly sales summary view
CREATE OR REPLACE VIEW v_monthly_sales_summary AS
SELECT 
    YEAR(i.invoice_date) as `year`,
    MONTH(i.invoice_date) as `month`,
    CONCAT(YEAR(i.invoice_date), '-', LPAD(MONTH(i.invoice_date), 2, '0')) as year_month,
    COUNT(i.id) as total_invoices,
    SUM(i.subtotal) as total_subtotal,
    SUM(i.tax_amount) as total_tax,
    SUM(i.total_amount) as total_amount,
    SUM(COALESCE(pa.allocated_amount, 0)) as total_collected,
    SUM(i.total_amount) - SUM(COALESCE(pa.allocated_amount, 0)) as total_outstanding,
    ROUND((SUM(COALESCE(pa.allocated_amount, 0)) / NULLIF(SUM(i.total_amount), 0)) * 100, 2) as collection_percentage
FROM invoices i
LEFT JOIN (
    SELECT invoice_id, SUM(allocated_amount) as allocated_amount
    FROM payment_allocations 
    GROUP BY invoice_id
) pa ON i.id = pa.invoice_id
WHERE i.status != 'cancelled'
GROUP BY YEAR(i.invoice_date), MONTH(i.invoice_date)
ORDER BY `year` DESC, `month` DESC;

-- Create GST summary view
CREATE OR REPLACE VIEW v_gst_summary AS
SELECT 
    YEAR(i.invoice_date) as `year`,
    MONTH(i.invoice_date) as `month`,
    CONCAT(YEAR(i.invoice_date), '-', LPAD(MONTH(i.invoice_date), 2, '0')) as year_month,
    SUM(i.subtotal) as taxable_value,
    SUM(CASE WHEN ii.cgst_rate > 0 THEN ii.cgst_amount ELSE 0 END) as total_cgst,
    SUM(CASE WHEN ii.sgst_rate > 0 THEN ii.sgst_amount ELSE 0 END) as total_sgst,
    SUM(CASE WHEN ii.igst_rate > 0 THEN ii.igst_amount ELSE 0 END) as total_igst,
    SUM(CASE WHEN ii.cess_rate > 0 THEN ii.cess_amount ELSE 0 END) as total_cess,
    SUM(ii.cgst_amount + ii.sgst_amount + ii.igst_amount + ii.cess_amount) as total_gst,
    COUNT(DISTINCT i.id) as total_invoices
FROM invoices i
JOIN invoice_items ii ON i.id = ii.invoice_id
WHERE i.status != 'cancelled'
GROUP BY YEAR(i.invoice_date), MONTH(i.invoice_date)
ORDER BY `year` DESC, `month` DESC;