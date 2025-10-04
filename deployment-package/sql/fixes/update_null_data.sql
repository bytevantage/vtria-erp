-- Fix null data in database tables
-- Update products with null values
UPDATE products SET 
    name = COALESCE(name, CONCAT('Product ', id)),
    product_code = COALESCE(product_code, CONCAT('PROD-', LPAD(id, 4, '0'))),
    description = COALESCE(description, 'Product description not provided'),
    category = COALESCE(category, 'General'),
    unit = COALESCE(unit, 'nos'),
    mrp = COALESCE(mrp, 0.00),
    cost_price = COALESCE(cost_price, 0.00)
WHERE name IS NULL OR product_code IS NULL;

-- Update sales enquiries with null enquiry_number
UPDATE sales_enquiries SET 
    enquiry_number = CONCAT('VESPL/EQ/2526/', LPAD(id, 3, '0'))
WHERE enquiry_number IS NULL OR enquiry_number = '';

-- Update employees with null values
UPDATE employees SET 
    name = COALESCE(name, CONCAT('Employee ', id)),
    email = COALESCE(email, CONCAT('employee', id, '@vtria.com')),
    phone = COALESCE(phone, '1234567890'),
    department = COALESCE(department, 'General'),
    position = COALESCE(position, 'Staff')
WHERE name IS NULL OR email IS NULL;

-- Update clients with null values  
UPDATE clients SET 
    company_name = COALESCE(company_name, CONCAT('Company ', id)),
    contact_person = COALESCE(contact_person, 'Contact Person'),
    email = COALESCE(email, CONCAT('contact', id, '@company.com')),
    phone = COALESCE(phone, '1234567890'),
    city = COALESCE(city, 'City'),
    state = COALESCE(state, 'State')
WHERE company_name IS NULL OR contact_person IS NULL;