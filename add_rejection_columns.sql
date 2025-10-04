-- Add rejection-related columns to estimations table
ALTER TABLE estimations 
ADD COLUMN rejected_by INT NULL,
ADD COLUMN rejected_at TIMESTAMP NULL,
ADD COLUMN rejection_reason TEXT NULL,
ADD FOREIGN KEY (rejected_by) REFERENCES users(id);