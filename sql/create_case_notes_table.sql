-- ============================================
-- VTRIA ERP - Create Case Notes Table
-- Base table creation before enhancements
-- ============================================

-- Create case_notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS case_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    note_type ENUM('general', 'internal', 'customer', 'system', 'closure') DEFAULT 'general',
    title VARCHAR(200),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE COMMENT 'Internal notes not visible to customer',
    is_system_generated BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_case_notes_case (case_id),
    INDEX idx_case_notes_created_by (created_by),
    INDEX idx_case_notes_created_at (created_at),
    INDEX idx_case_notes_type (note_type),
    
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create case_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS case_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    assigned_to INT NOT NULL,
    assigned_by INT NOT NULL,
    assignment_reason TEXT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_case_assignments_case (case_id),
    INDEX idx_case_assignments_assigned_to (assigned_to),
    INDEX idx_case_assignments_active (is_active),
    
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Success message
SELECT 'Base Case Notes Tables Created Successfully!' as Status;
