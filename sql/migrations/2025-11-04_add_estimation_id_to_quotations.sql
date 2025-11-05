-- Migration: Fix quotations table schema
-- Date: 2025-11-04
-- Purpose: Add missing columns to quotations table for proper integration with 
--          estimations, cases, and workflow management

-- Add estimation_id column to link quotations with estimations
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS estimation_id INT NULL AFTER enquiry_id,
ADD KEY IF NOT EXISTS idx_estimation_id (estimation_id);

-- Add case_id column to link quotations with cases
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS case_id INT NULL AFTER estimation_id,
ADD KEY IF NOT EXISTS idx_case_id (case_id);

-- Add approved_by column for workflow approval tracking
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS approved_by INT NULL AFTER created_by,
ADD KEY IF NOT EXISTS idx_approved_by (approved_by);

-- Add deleted_at column for soft deletes
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL AFTER updated_at;

-- Optional: Add foreign key constraints (uncomment if all referenced tables exist)
-- ALTER TABLE quotations 
-- ADD CONSTRAINT fk_quotations_estimation 
-- FOREIGN KEY (estimation_id) REFERENCES estimations(id) ON DELETE SET NULL,
-- ADD CONSTRAINT fk_quotations_case 
-- FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
-- ADD CONSTRAINT fk_quotations_approved_by 
-- FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Verify the changes
DESCRIBE quotations;
