-- Migration: 001 - Initial Schema Validation
-- This migration ensures the base schema is consistent
-- Run Date: 2025-10-04

-- Verify core tables exist
SELECT 'Checking core tables...' as message;

-- Users table validation
SELECT COUNT(*) as users_table_exists FROM information_schema.tables 
WHERE table_schema = 'vtria_erp' AND table_name = 'users';

-- Estimations table validation  
SELECT COUNT(*) as estimations_table_exists FROM information_schema.tables 
WHERE table_schema = 'vtria_erp' AND table_name = 'estimations';

-- Quotations table validation
SELECT COUNT(*) as quotations_table_exists FROM information_schema.tables 
WHERE table_schema = 'vtria_erp' AND table_name = 'quotations';

-- Add any missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimations_status ON estimations(status);
CREATE INDEX IF NOT EXISTS idx_estimations_approved_at ON estimations(approved_at);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at);

SELECT 'Migration 001 completed successfully' as result;