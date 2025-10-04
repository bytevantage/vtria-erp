CREATE OR REPLACE VIEW v_gst_summary AS
SELECT 
    YEAR(invoice_date) as year,
    MONTH(invoice_date) as month,
    CONCAT(YEAR(invoice_date), '-', LPAD(MONTH(invoice_date), 2, '0')) as month_year,
    SUM(cgst_amount) as total_cgst,
    SUM(sgst_amount) as total_sgst,
    SUM(igst_amount) as total_igst,
    SUM(cess_amount) as total_cess,
    SUM(cgst_amount + sgst_amount + igst_amount + cess_amount) as total_gst
FROM invoices 
WHERE invoice_type = 'sales' AND status != 'cancelled'
GROUP BY YEAR(invoice_date), MONTH(invoice_date);