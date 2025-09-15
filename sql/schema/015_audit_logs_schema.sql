-- Audit logs table for tracking all system activities
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'ASSIGN', 'EXPORT', 'PRINT') NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Add audit trail triggers for critical tables
DELIMITER //

-- Trigger for sales_enquiries
CREATE TRIGGER audit_sales_enquiries_update
    AFTER UPDATE ON sales_enquiries
    FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, created_at)
    VALUES (
        NEW.updated_by,
        'UPDATE',
        'SALES_ENQUIRY',
        NEW.id,
        JSON_OBJECT(
            'status', OLD.status,
            'assigned_to', OLD.assigned_to,
            'updated_at', OLD.updated_at
        ),
        JSON_OBJECT(
            'status', NEW.status,
            'assigned_to', NEW.assigned_to,
            'updated_at', NEW.updated_at
        ),
        NOW()
    );
END//

-- Trigger for estimations
CREATE TRIGGER audit_estimations_update
    AFTER UPDATE ON estimations
    FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, created_at)
    VALUES (
        NEW.updated_by,
        'UPDATE',
        'ESTIMATION',
        NEW.id,
        JSON_OBJECT(
            'status', OLD.status,
            'total_final_price', OLD.total_final_price,
            'approved_by', OLD.approved_by
        ),
        JSON_OBJECT(
            'status', NEW.status,
            'total_final_price', NEW.total_final_price,
            'approved_by', NEW.approved_by
        ),
        NOW()
    );
END//

DELIMITER ;

-- Add updated_by column to tables that need audit tracking
ALTER TABLE sales_enquiries ADD COLUMN updated_by INT AFTER updated_at;
ALTER TABLE estimations ADD COLUMN updated_by INT AFTER updated_at;
ALTER TABLE quotations ADD COLUMN updated_by INT AFTER updated_at;
ALTER TABLE purchase_orders ADD COLUMN updated_by INT AFTER updated_at;

-- Add foreign key constraints for updated_by
ALTER TABLE sales_enquiries ADD FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE estimations ADD FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE quotations ADD FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE purchase_orders ADD FOREIGN KEY (updated_by) REFERENCES users(id);