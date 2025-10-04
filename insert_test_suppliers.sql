-- Insert test suppliers for competitive bidding
INSERT IGNORE INTO suppliers (id, company_name, contact_person, email, phone, address, city, state, gstin, payment_terms, credit_limit, rating, is_active) VALUES
(1, 'Electrical Components Ltd', 'Rajesh Kumar', 'rajesh@ecl.com', '+91-9876543210', 'Electronics City', 'Bangalore', 'Karnataka', '29ABCDE1234F1Z5', 'Net 30', 500000.00, 4, true),
(2, 'Industrial Supplies Inc', 'Priya Sharma', 'priya@industrial.com', '+91-9876543211', 'Industrial Area', 'Mumbai', 'Maharashtra', '27FGHIJ5678K2A6', 'Net 15', 750000.00, 5, true),
(3, 'Tech Components Co', 'Amit Patel', 'amit@techcomp.com', '+91-9876543212', 'Tech Park', 'Pune', 'Maharashtra', '27KLMNO9012L3B7', 'Net 45', 300000.00, 3, true),
(4, 'Quality Parts Pvt Ltd', 'Sneha Reddy', 'sneha@qualityparts.com', '+91-9876543213', 'HITEC City', 'Hyderabad', 'Telangana', '36PQRST3456M4C8', 'Net 30', 600000.00, 4, true),
(5, 'Precision Manufacturing', 'Ravi Kumar', 'ravi@precision.com', '+91-9876543214', 'Industrial Estate', 'Chennai', 'Tamil Nadu', '33UVWXY7890N5D9', 'Net 60', 1000000.00, 5, true);