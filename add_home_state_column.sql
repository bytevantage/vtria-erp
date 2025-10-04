-- Add missing is_home_state column to tax_config table
ALTER TABLE tax_config ADD COLUMN is_home_state BOOLEAN DEFAULT FALSE;

-- Update Karnataka as the default home state
UPDATE tax_config SET is_home_state = TRUE WHERE state_code = 'KA';

-- Ensure only one state is marked as home state
UPDATE tax_config SET is_home_state = FALSE WHERE state_code != 'KA';