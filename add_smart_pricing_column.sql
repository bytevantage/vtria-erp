-- Add smart pricing suggestions column to estimations table
-- This will store vendor price suggestions to help with competitive pricing

ALTER TABLE estimations 
ADD COLUMN pricing_suggestions JSON NULL COMMENT 'Smart pricing suggestions from vendor price history';

-- Add index for better performance when querying pricing suggestions
ALTER TABLE estimations 
ADD INDEX idx_pricing_suggestions_exist ((pricing_suggestions IS NOT NULL));