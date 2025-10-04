-- Create missing estimation_subsections table

CREATE TABLE IF NOT EXISTS estimation_subsections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    subsection_name VARCHAR(255) NOT NULL,
    subsection_order INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES estimation_sections(id) ON DELETE CASCADE,
    INDEX idx_section_id (section_id),
    INDEX idx_subsection_order (subsection_order)
);

-- Add sample subsections for existing sections
INSERT IGNORE INTO estimation_subsections (section_id, subsection_name, subsection_order) 
SELECT 
    es.id as section_id,
    'General' as subsection_name,
    1 as subsection_order
FROM estimation_sections es
WHERE NOT EXISTS (
    SELECT 1 FROM estimation_subsections esub WHERE esub.section_id = es.id
);