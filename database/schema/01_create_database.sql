-- VTRIA ERP Database Schema
-- PostgreSQL Database Creation Script
-- Compatible with WAMP Server Environment

-- Create database (run as postgres superuser)
-- CREATE DATABASE vtria_erp_dev;
-- CREATE USER vtria_user WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE vtria_erp_dev TO vtria_user;

-- Connect to vtria_erp_dev database before running the following scripts

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB GIN indexing
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types for better data integrity
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE case_status AS ENUM ('new', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'closed', 'cancelled');
CREATE TYPE case_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_parts', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE stock_status AS ENUM ('available', 'reserved', 'sold', 'damaged', 'returned');
CREATE TYPE warranty_status AS ENUM ('active', 'expired', 'claimed', 'void');
CREATE TYPE document_type AS ENUM ('manual', 'specification', 'certificate', 'invoice', 'warranty', 'report', 'other');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
CREATE TYPE notification_channel AS ENUM ('email', 'in_app', 'sms');
CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout');

-- Set timezone
SET timezone = 'Asia/Kolkata';
