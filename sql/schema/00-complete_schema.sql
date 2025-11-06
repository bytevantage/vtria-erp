-- ============================================================================
-- VTRIA ERP - Complete Database Schema
-- ============================================================================
-- This file contains the complete production database schema with all 181 tables
-- Extracted from working production backup (backup_20251019_122214.sql)
--
-- IMPORTANT: This file creates ALL tables needed for full ERP functionality
-- Including: HR, Inventory, Manufacturing, Sales, Finance, Quality, etc.
--
-- Load order: This is file 00- so it loads BEFORE other schema files
-- Other schema files (01-06) can be safely ignored as this is complete
-- ============================================================================

USE vtria_erp;

-- Disable foreign key checks during table creation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `access_audit_logs`;
CREATE TABLE `access_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `action_type` enum('login','logout','access_granted','access_denied','permission_check') NOT NULL,
  `resource_type` varchar(100) DEFAULT NULL,
  `resource_id` varchar(100) DEFAULT NULL,
  `permission_code` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `session_id` varchar(255) DEFAULT NULL,
  `result` enum('success','failure','partial') NOT NULL,
  `failure_reason` text,
  `additional_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_audit_employee` (`employee_id`),
  KEY `idx_audit_action` (`action_type`),
  KEY `idx_audit_result` (`result`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `access_audit_logs_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `enterprise_employees` (`id`),
  CONSTRAINT `access_audit_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `attendance_exceptions`;
CREATE TABLE `attendance_exceptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attendance_record_id` int NOT NULL,
  `exception_type` enum('location_variance','time_variance','manual_entry','correction') NOT NULL,
  `description` text NOT NULL,
  `requested_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text,
  PRIMARY KEY (`id`),
  KEY `attendance_record_id` (`attendance_record_id`),
  KEY `requested_by` (`requested_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `attendance_exceptions_ibfk_1` FOREIGN KEY (`attendance_record_id`) REFERENCES `attendance_records_enhanced` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attendance_exceptions_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `attendance_exceptions_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `attendance_records`;
CREATE TABLE `attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `attendance_date` date NOT NULL,
  `check_in_time` datetime DEFAULT NULL,
  `check_in_location` varchar(255) DEFAULT NULL,
  `check_in_latitude` decimal(10,8) DEFAULT NULL,
  `check_in_longitude` decimal(11,8) DEFAULT NULL,
  `check_in_method` varchar(50) DEFAULT 'manual',
  `check_out_time` datetime DEFAULT NULL,
  `check_out_location` varchar(255) DEFAULT NULL,
  `check_out_latitude` decimal(10,8) DEFAULT NULL,
  `check_out_longitude` decimal(11,8) DEFAULT NULL,
  `total_hours` decimal(4,2) DEFAULT '0.00',
  `regular_hours` decimal(4,2) DEFAULT '0.00',
  `overtime_hours` decimal(4,2) DEFAULT '0.00',
  `status` enum('present','absent','half_day','late','on_leave') DEFAULT 'present',
  `is_late` tinyint(1) DEFAULT '0',
  `late_minutes` int DEFAULT '0',
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_date` (`employee_id`,`attendance_date`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `attendance_records_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `attendance_records_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `attendance_records_enhanced`;
CREATE TABLE `attendance_records_enhanced` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `attendance_date` date NOT NULL,
  `check_in_time` timestamp NULL DEFAULT NULL,
  `check_out_time` timestamp NULL DEFAULT NULL,
  `check_in_location_id` int DEFAULT NULL,
  `check_out_location_id` int DEFAULT NULL,
  `check_in_latitude` decimal(10,8) DEFAULT NULL,
  `check_in_longitude` decimal(11,8) DEFAULT NULL,
  `check_out_latitude` decimal(10,8) DEFAULT NULL,
  `check_out_longitude` decimal(11,8) DEFAULT NULL,
  `check_in_distance_meters` int DEFAULT NULL,
  `check_out_distance_meters` int DEFAULT NULL,
  `check_in_photo_path` varchar(500) DEFAULT NULL,
  `check_out_photo_path` varchar(500) DEFAULT NULL,
  `total_hours` decimal(5,2) DEFAULT NULL,
  `break_hours` decimal(5,2) DEFAULT '0.00',
  `overtime_hours` decimal(5,2) DEFAULT '0.00',
  `attendance_status` enum('present','absent','partial','on_leave','holiday') DEFAULT 'present',
  `is_late` tinyint(1) DEFAULT '0',
  `late_minutes` int DEFAULT '0',
  `is_early_departure` tinyint(1) DEFAULT '0',
  `early_departure_minutes` int DEFAULT '0',
  `validation_status` enum('valid','suspicious','invalid') DEFAULT 'valid',
  `validation_notes` text,
  `approved_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_date` (`employee_id`,`attendance_date`),
  KEY `check_in_location_id` (`check_in_location_id`),
  KEY `check_out_location_id` (`check_out_location_id`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `attendance_records_enhanced_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attendance_records_enhanced_ibfk_2` FOREIGN KEY (`check_in_location_id`) REFERENCES `office_locations` (`id`),
  CONSTRAINT `attendance_records_enhanced_ibfk_3` FOREIGN KEY (`check_out_location_id`) REFERENCES `office_locations` (`id`),
  CONSTRAINT `attendance_records_enhanced_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `attendance_validation_rules`;
CREATE TABLE `attendance_validation_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(100) NOT NULL,
  `location_id` int NOT NULL,
  `max_distance_meters` int DEFAULT '100',
  `allow_outside_hours` tinyint(1) DEFAULT '0',
  `start_time` time DEFAULT '08:00:00',
  `end_time` time DEFAULT '18:00:00',
  `grace_period_minutes` int DEFAULT '15',
  `require_photo` tinyint(1) DEFAULT '0',
  `require_manager_approval` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `attendance_validation_rules_ibfk_1` FOREIGN KEY (`location_id`) REFERENCES `office_locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `audit_trail`;
CREATE TABLE `audit_trail` (
  `id` int NOT NULL AUTO_INCREMENT,
  `table_name` varchar(64) NOT NULL,
  `record_id` int NOT NULL,
  `action` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_trail_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bank_reconciliation`;
CREATE TABLE `bank_reconciliation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bank_account` varchar(50) NOT NULL,
  `statement_date` date NOT NULL,
  `statement_balance` decimal(15,2) NOT NULL,
  `book_balance` decimal(15,2) NOT NULL,
  `reconciled_balance` decimal(15,2) NOT NULL,
  `difference_amount` decimal(15,2) DEFAULT '0.00',
  `is_reconciled` tinyint(1) DEFAULT '0',
  `reconciliation_notes` text,
  `reconciled_by` int DEFAULT NULL,
  `reconciled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reconciled_by` (`reconciled_by`),
  KEY `idx_bank_account` (`bank_account`),
  KEY `idx_statement_date` (`statement_date`),
  KEY `idx_reconciled` (`is_reconciled`),
  CONSTRAINT `bank_reconciliation_ibfk_1` FOREIGN KEY (`reconciled_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bank statement reconciliation';

DROP TABLE IF EXISTS `bank_reconciliation_items`;
CREATE TABLE `bank_reconciliation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reconciliation_id` int NOT NULL,
  `transaction_date` date NOT NULL,
  `transaction_type` enum('payment','receipt','bank_charge','interest','adjustment') NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `payment_id` int DEFAULT NULL,
  `description` text,
  `debit_amount` decimal(15,2) DEFAULT '0.00',
  `credit_amount` decimal(15,2) DEFAULT '0.00',
  `is_matched` tinyint(1) DEFAULT '0',
  `matched_with` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_id` (`payment_id`),
  KEY `idx_reconciliation_id` (`reconciliation_id`),
  KEY `idx_reference_number` (`reference_number`),
  KEY `idx_matched` (`is_matched`),
  CONSTRAINT `bank_reconciliation_items_ibfk_1` FOREIGN KEY (`reconciliation_id`) REFERENCES `bank_reconciliation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bank_reconciliation_items_ibfk_2` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Bank reconciliation transaction items';

DROP TABLE IF EXISTS `bill_of_materials`;
CREATE TABLE `bill_of_materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bom_number` varchar(50) NOT NULL,
  `product_name` varchar(200) NOT NULL,
  `product_code` varchar(50) DEFAULT NULL,
  `version` varchar(10) DEFAULT '1.0',
  `description` text,
  `total_cost` decimal(12,2) DEFAULT '0.00',
  `labor_hours` decimal(8,2) DEFAULT '0.00',
  `overhead_cost` decimal(10,2) DEFAULT '0.00',
  `status` enum('draft','active','inactive','archived') DEFAULT 'draft',
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bom_number` (`bom_number`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `bill_of_materials_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `bill_of_materials_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bom_components`;
CREATE TABLE `bom_components` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bom_header_id` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `component_code` varchar(100) DEFAULT NULL,
  `component_name` varchar(255) NOT NULL,
  `description` text,
  `quantity` decimal(10,4) NOT NULL DEFAULT '1.0000',
  `unit` varchar(20) DEFAULT 'NOS',
  `unit_cost` decimal(15,4) DEFAULT '0.0000',
  `total_cost` decimal(15,4) DEFAULT '0.0000',
  `selling_price` decimal(15,4) DEFAULT '0.0000',
  `total_selling_price` decimal(15,4) DEFAULT '0.0000',
  `component_type` enum('material','labor','overhead','subcontract') DEFAULT 'material',
  `category` varchar(100) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `specifications` json DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bom_header` (`bom_header_id`),
  KEY `idx_item` (`item_id`),
  KEY `idx_component_type` (`component_type`),
  CONSTRAINT `bom_components_ibfk_1` FOREIGN KEY (`bom_header_id`) REFERENCES `bom_headers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bom_headers`;
CREATE TABLE `bom_headers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bom_number` varchar(50) NOT NULL,
  `production_item_id` int DEFAULT NULL,
  `version` varchar(20) DEFAULT '1.0',
  `description` text,
  `quantity_per_unit` decimal(15,3) DEFAULT '1.000',
  `material_cost` decimal(15,2) DEFAULT '0.00',
  `labor_cost` decimal(15,2) DEFAULT '0.00',
  `overhead_cost` decimal(15,2) DEFAULT '0.00',
  `total_cost` decimal(15,2) GENERATED ALWAYS AS (((`material_cost` + `labor_cost`) + `overhead_cost`)) STORED,
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `status` enum('draft','active','inactive','superseded') DEFAULT 'draft',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bom_number` (`bom_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bom_items`;
CREATE TABLE `bom_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bom_id` int NOT NULL,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(200) NOT NULL,
  `description` text,
  `quantity` decimal(10,4) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `total_cost` decimal(12,2) GENERATED ALWAYS AS ((`quantity` * `unit_cost`)) STORED,
  `wastage_percentage` decimal(5,2) DEFAULT '0.00',
  `supplier_id` int DEFAULT NULL,
  `lead_time_days` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bom_id` (`bom_id`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `bom_items_ibfk_1` FOREIGN KEY (`bom_id`) REFERENCES `bill_of_materials` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bom_items_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `bom_operations`;
CREATE TABLE `bom_operations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bom_header_id` int NOT NULL,
  `operation_sequence` int NOT NULL,
  `operation_name` varchar(255) NOT NULL,
  `description` text,
  `setup_time` decimal(8,2) DEFAULT '0.00',
  `run_time` decimal(8,2) DEFAULT '0.00',
  `labor_cost_per_hour` decimal(10,2) DEFAULT '0.00',
  `machine_cost_per_hour` decimal(10,2) DEFAULT '0.00',
  `department` varchar(100) DEFAULT NULL,
  `work_center` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bom_operations` (`bom_header_id`),
  KEY `idx_operation_sequence` (`operation_sequence`),
  CONSTRAINT `bom_operations_ibfk_1` FOREIGN KEY (`bom_header_id`) REFERENCES `bom_headers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `case_documents`;
CREATE TABLE `case_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `document_type` enum('enquiry','estimation','quotation','sales_order','purchase_order','delivery_challan','invoice') NOT NULL,
  `document_id` int NOT NULL,
  `document_number` varchar(50) NOT NULL,
  `is_current` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_current_doc` (`case_id`,`document_type`,`is_current`),
  KEY `idx_case_documents` (`case_id`,`document_type`),
  KEY `idx_document_reference` (`document_type`,`document_id`),
  CONSTRAINT `case_documents_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Links cases to their related documents across the workflow';

DROP TABLE IF EXISTS `case_history`;
CREATE TABLE `case_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reference_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Type: estimation, quotation, sales_order, etc.',
  `reference_id` int NOT NULL COMMENT 'ID of the referenced record',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'New status of the record',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Additional notes about the status change',
  `created_by` int DEFAULT NULL COMMENT 'User who made the change',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reference` (`reference_type`,`reference_id`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='History of status changes for various entities';

DROP TABLE IF EXISTS `case_state_transitions`;
CREATE TABLE `case_state_transitions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `case_id` int NOT NULL,
  `from_state` enum('enquiry','estimation','quotation','order','production','delivery','closed') DEFAULT NULL,
  `to_state` enum('enquiry','estimation','quotation','order','production','delivery','closed') NOT NULL,
  `transition_reason` varchar(255) DEFAULT NULL,
  `notes` text,
  `reference_type` enum('enquiry','estimation','quotation','sales_order','production_order','delivery') DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_case_transitions` (`case_id`,`created_at`),
  KEY `idx_state_transition` (`from_state`,`to_state`),
  KEY `idx_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `case_state_transitions_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `case_state_transitions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Tracks all state transitions for cases with audit trail';

DROP TABLE IF EXISTS `cases`;
CREATE TABLE `cases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `case_number` varchar(50) NOT NULL,
  `enquiry_id` int DEFAULT NULL,
  `current_state` enum('enquiry','estimation','quotation','order','production','delivery','closed') DEFAULT 'enquiry',
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `client_id` int NOT NULL,
  `project_name` varchar(255) NOT NULL,
  `requirements` text,
  `estimated_value` decimal(15,2) DEFAULT NULL,
  `final_value` decimal(15,2) DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `status` enum('active','on_hold','cancelled','completed') DEFAULT 'active',
  `expected_completion_date` date DEFAULT NULL,
  `actual_completion_date` date DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `case_number` (`case_number`),
  KEY `enquiry_id` (`enquiry_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_case_number` (`case_number`),
  KEY `idx_current_state` (`current_state`),
  KEY `idx_client_id` (`client_id`),
  KEY `idx_assigned_to` (`assigned_to`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `cases_ibfk_1` FOREIGN KEY (`enquiry_id`) REFERENCES `sales_enquiries` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cases_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  CONSTRAINT `cases_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cases_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Main cases table for tracking entire project lifecycle';

DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `parent_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `chart_of_accounts`;
CREATE TABLE `chart_of_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_code` varchar(20) NOT NULL,
  `account_name` varchar(100) NOT NULL,
  `account_type` enum('asset','liability','equity','revenue','expense') NOT NULL,
  `parent_account_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_code` (`account_code`),
  KEY `parent_account_id` (`parent_account_id`),
  CONSTRAINT `chart_of_accounts_ibfk_1` FOREIGN KEY (`parent_account_id`) REFERENCES `chart_of_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL,
  `contact_person` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clients_company_name` (`company_name`),
  KEY `idx_clients_email` (`email`),
  KEY `idx_clients_city_state` (`city`,`state`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `company_config`;
CREATE TABLE `company_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(255) NOT NULL,
  `config_value` text,
  `config_description` text,
  `config_category` enum('general','email','sms','payment','integration','security') DEFAULT 'general',
  `is_encrypted` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `company_locations`;
CREATE TABLE `company_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `is_head_office` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `company_policy_config`;
CREATE TABLE `company_policy_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL,
  `config_value` text NOT NULL,
  `data_type` enum('string','number','boolean','json') DEFAULT 'string',
  `description` text,
  `category` varchar(50) DEFAULT 'general',
  `is_system_config` tinyint(1) DEFAULT '0',
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `company_policy_config_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `competencies`;
CREATE TABLE `competencies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `competency_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `competency_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('technical','behavioral','leadership','core') COLLATE utf8mb4_unicode_ci DEFAULT 'core',
  `description` text COLLATE utf8mb4_unicode_ci,
  `rating_scale_id` int DEFAULT NULL,
  `applies_to` json DEFAULT NULL COMMENT 'Array of roles/departments this applies to',
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `competency_code` (`competency_code`),
  KEY `rating_scale_id` (`rating_scale_id`),
  KEY `idx_category` (`category`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_display_order` (`display_order`),
  CONSTRAINT `competencies_ibfk_1` FOREIGN KEY (`rating_scale_id`) REFERENCES `rating_scales` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `credit_debit_notes`;
CREATE TABLE `credit_debit_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `note_number` varchar(50) NOT NULL,
  `note_type` enum('credit_note','debit_note') NOT NULL,
  `note_date` date NOT NULL,
  `original_invoice_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `reason_code` varchar(50) DEFAULT NULL,
  `reason_description` text,
  `subtotal` decimal(15,2) NOT NULL,
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL,
  `status` enum('draft','issued','applied','cancelled') DEFAULT 'draft',
  `applied_to_invoice_id` int DEFAULT NULL,
  `applied_date` date DEFAULT NULL,
  `notes` text,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `note_number` (`note_number`),
  KEY `applied_to_invoice_id` (`applied_to_invoice_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_note_number` (`note_number`),
  KEY `idx_note_type` (`note_type`),
  KEY `idx_original_invoice` (`original_invoice_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `credit_debit_notes_ibfk_1` FOREIGN KEY (`original_invoice_id`) REFERENCES `invoices` (`id`),
  CONSTRAINT `credit_debit_notes_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `clients` (`id`),
  CONSTRAINT `credit_debit_notes_ibfk_3` FOREIGN KEY (`applied_to_invoice_id`) REFERENCES `invoices` (`id`),
  CONSTRAINT `credit_debit_notes_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Credit and debit notes for invoice adjustments';

DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_name` varchar(255) NOT NULL,
  `department_code` varchar(50) NOT NULL,
  `description` text,
  `head_of_department_id` int DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `department_code` (`department_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `departments_enhanced`;
CREATE TABLE `departments_enhanced` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_code` varchar(20) NOT NULL,
  `department_name` varchar(255) NOT NULL,
  `description` text,
  `parent_department_id` int DEFAULT NULL,
  `head_of_department_id` int DEFAULT NULL,
  `cost_center_code` varchar(50) DEFAULT NULL,
  `budget_allocated` decimal(15,2) DEFAULT '0.00',
  `location` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','merged') DEFAULT 'active',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `department_code` (`department_code`),
  KEY `idx_dept_parent` (`parent_department_id`),
  KEY `idx_dept_head` (`head_of_department_id`),
  KEY `idx_dept_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `designations`;
CREATE TABLE `designations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `designation_code` varchar(20) NOT NULL,
  `designation_name` varchar(100) NOT NULL,
  `description` text,
  `department_id` int DEFAULT NULL,
  `grade_level` varchar(10) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `designation_code` (`designation_code`),
  KEY `department_id` (`department_id`),
  CONSTRAINT `designations_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `development_plan_actions`;
CREATE TABLE `development_plan_actions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `development_plan_id` int NOT NULL,
  `action_title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_description` text COLLATE utf8mb4_unicode_ci,
  `action_type` enum('training','mentoring','project','reading','certification','coaching','other') COLLATE utf8mb4_unicode_ci DEFAULT 'training',
  `resources_required` text COLLATE utf8mb4_unicode_ci,
  `success_criteria` text COLLATE utf8mb4_unicode_ci,
  `target_date` date DEFAULT NULL,
  `completion_date` date DEFAULT NULL,
  `status` enum('not_started','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'not_started',
  `progress_notes` text COLLATE utf8mb4_unicode_ci,
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_plan` (`development_plan_id`),
  KEY `idx_status` (`status`),
  KEY `idx_display_order` (`display_order`),
  CONSTRAINT `development_plan_actions_ibfk_1` FOREIGN KEY (`development_plan_id`) REFERENCES `development_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `development_plans`;
CREATE TABLE `development_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `performance_review_id` int DEFAULT NULL COMMENT 'Link to review that generated this plan',
  `plan_title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan_type` enum('career_growth','skill_development','leadership','technical','behavioral') COLLATE utf8mb4_unicode_ci DEFAULT 'skill_development',
  `focus_areas` text COLLATE utf8mb4_unicode_ci COMMENT 'Key areas of focus',
  `career_aspirations` text COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL,
  `target_completion_date` date DEFAULT NULL,
  `status` enum('draft','active','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `progress_notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_review` (`performance_review_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `development_plans_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `development_plans_ibfk_2` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`id`),
  CONSTRAINT `development_plans_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `development_plans_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `document_sequences`;
CREATE TABLE `document_sequences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_type` varchar(10) NOT NULL,
  `financial_year` varchar(10) NOT NULL,
  `last_sequence` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_doc_year` (`document_type`,`financial_year`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `email_notifications`;
CREATE TABLE `email_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notification_type` enum('invoice','payment_receipt','statement','reminder','alert') NOT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `recipient_name` varchar(255) DEFAULT NULL,
  `subject` varchar(500) NOT NULL,
  `body` text,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `status` enum('pending','sent','failed','bounced') DEFAULT 'pending',
  `sent_at` timestamp NULL DEFAULT NULL,
  `error_message` text,
  `retry_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_recipient` (`recipient_email`),
  KEY `idx_status` (`status`),
  KEY `idx_reference` (`reference_type`,`reference_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Email notification tracking';

DROP TABLE IF EXISTS `employee_group_memberships`;
CREATE TABLE `employee_group_memberships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `group_id` int NOT NULL,
  `membership_type` enum('member','lead','admin','owner') DEFAULT 'member',
  `joined_date` date DEFAULT (curdate()),
  `left_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `approval_status` enum('pending','approved','rejected') DEFAULT 'approved',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_active_membership` (`employee_id`,`group_id`,`is_active`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_emp_group_active` (`employee_id`,`is_active`),
  KEY `idx_group_members` (`group_id`,`is_active`),
  KEY `idx_membership_type` (`membership_type`),
  CONSTRAINT `employee_group_memberships_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `user_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_egm_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_leave_entitlements`;
CREATE TABLE `employee_leave_entitlements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `leave_type_id` int NOT NULL,
  `year` year NOT NULL,
  `allocated_days` decimal(5,2) NOT NULL DEFAULT '0.00',
  `used_days` decimal(5,2) NOT NULL DEFAULT '0.00',
  `pending_days` decimal(5,2) NOT NULL DEFAULT '0.00',
  `carried_forward_days` decimal(5,2) NOT NULL DEFAULT '0.00',
  `remaining_days` decimal(5,2) GENERATED ALWAYS AS ((((`allocated_days` + `carried_forward_days`) - `used_days`) - `pending_days`)) STORED,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_leave_year` (`employee_id`,`leave_type_id`,`year`),
  KEY `leave_type_id` (`leave_type_id`),
  CONSTRAINT `employee_leave_entitlements_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_leave_entitlements_ibfk_2` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types_enhanced` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_loans`;
CREATE TABLE `employee_loans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `loan_type` enum('loan','advance','salary_advance') COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_amount` decimal(12,2) NOT NULL,
  `interest_rate` decimal(5,2) DEFAULT '0.00',
  `emi_amount` decimal(12,2) NOT NULL,
  `number_of_installments` int NOT NULL,
  `paid_installments` int DEFAULT '0',
  `outstanding_amount` decimal(12,2) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','closed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `approved_by` (`approved_by`),
  KEY `created_by` (`created_by`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `employee_loans_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_loans_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `employee_loans_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `employee_location_permissions`;
CREATE TABLE `employee_location_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `location_id` int NOT NULL,
  `permission_type` enum('attendance','login','both') DEFAULT 'both',
  `is_remote_work_authorized` tinyint(1) DEFAULT '0',
  `remote_work_start_date` date DEFAULT NULL,
  `remote_work_end_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_location` (`employee_id`,`location_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `employee_location_permissions_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_location_permissions_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `office_locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_profiles`;
CREATE TABLE `employee_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `employee_code` varchar(20) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `date_of_birth` date DEFAULT NULL,
  `date_of_joining` date NOT NULL,
  `department_id` int DEFAULT NULL,
  `designation_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `employment_type` enum('permanent','contract','temporary','intern') DEFAULT 'permanent',
  `shift_pattern` varchar(50) DEFAULT 'regular',
  `salary_amount` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `email` (`email`),
  KEY `department_id` (`department_id`),
  KEY `designation_id` (`designation_id`),
  KEY `manager_id` (`manager_id`),
  CONSTRAINT `employee_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_profiles_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `employee_profiles_ibfk_3` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`id`),
  CONSTRAINT `employee_profiles_ibfk_4` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_role_assignments`;
CREATE TABLE `employee_role_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `role_id` int NOT NULL,
  `assignment_type` enum('direct','inherited_group','inherited_position') DEFAULT 'direct',
  `source_group_id` int DEFAULT NULL,
  `assigned_by` int DEFAULT NULL,
  `assigned_date` date DEFAULT (curdate()),
  `effective_from` date DEFAULT (curdate()),
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `assignment_reason` text,
  `approval_required` tinyint(1) DEFAULT '0',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_active_assignment` (`employee_id`,`role_id`,`is_active`),
  KEY `source_group_id` (`source_group_id`),
  KEY `assigned_by` (`assigned_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_emp_role_active` (`employee_id`,`is_active`),
  KEY `idx_role_assignments` (`role_id`,`is_active`),
  KEY `idx_assignment_type` (`assignment_type`),
  CONSTRAINT `employee_role_assignments_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `user_roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_role_assignments_ibfk_3` FOREIGN KEY (`source_group_id`) REFERENCES `user_groups` (`id`),
  CONSTRAINT `employee_role_assignments_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `enterprise_employees` (`id`),
  CONSTRAINT `fk_era_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `employee_salary_structure`;
CREATE TABLE `employee_salary_structure` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `component_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_active_component` (`employee_id`,`component_id`,`effective_from`),
  KEY `component_id` (`component_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_effective_dates` (`effective_from`,`effective_to`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `employee_salary_structure_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_salary_structure_ibfk_2` FOREIGN KEY (`component_id`) REFERENCES `salary_components` (`id`),
  CONSTRAINT `employee_salary_structure_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `employee_tax_declarations`;
CREATE TABLE `employee_tax_declarations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `financial_year` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g., 2024-2025',
  `declaration_type` enum('investment','deduction','exemption') COLLATE utf8mb4_unicode_ci NOT NULL,
  `section` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '80C, 80D, HRA, etc.',
  `declared_amount` decimal(12,2) NOT NULL,
  `proof_submitted` tinyint(1) DEFAULT '0',
  `proof_document` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('declared','verified','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'declared',
  `verified_by` int DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_employee_year` (`employee_id`,`financial_year`),
  CONSTRAINT `employee_tax_declarations_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_tax_declarations_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `employees`;
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(50) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `employee_type` enum('full_time','part_time','contract','intern') DEFAULT 'full_time',
  `status` enum('active','inactive','terminated','on_leave') DEFAULT 'active',
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `address` text,
  `emergency_contact_name` varchar(255) DEFAULT NULL,
  `emergency_contact_phone` varchar(50) DEFAULT NULL,
  `hire_date` date NOT NULL,
  `termination_date` date DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `reporting_manager_id` int DEFAULT NULL,
  `work_location` varchar(255) DEFAULT NULL,
  `basic_salary` decimal(15,2) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `department_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_employees_employee_id` (`employee_id`),
  KEY `idx_employees_email` (`email`),
  KEY `idx_employees_department` (`department`),
  KEY `idx_employees_hire_date` (`hire_date`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `enterprise_departments`;
CREATE TABLE `enterprise_departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department_code` varchar(20) NOT NULL,
  `department_name` varchar(255) NOT NULL,
  `description` text,
  `parent_department_id` int DEFAULT NULL,
  `head_of_department_id` int DEFAULT NULL,
  `cost_center_code` varchar(50) DEFAULT NULL,
  `budget_allocated` decimal(15,2) DEFAULT '0.00',
  `location` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','merged') DEFAULT 'active',
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `department_code` (`department_code`),
  KEY `idx_dept_parent` (`parent_department_id`),
  KEY `idx_dept_head` (`head_of_department_id`),
  KEY `idx_dept_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `enterprise_employees`;
CREATE TABLE `enterprise_employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(50) NOT NULL,
  `user_id` int DEFAULT NULL,
  `first_name` varchar(255) NOT NULL,
  `middle_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) NOT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `personal_email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `personal_phone` varchar(50) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other','prefer_not_to_say') DEFAULT NULL,
  `marital_status` enum('single','married','divorced','widowed') DEFAULT NULL,
  `nationality` varchar(100) DEFAULT 'Indian',
  `current_address` text,
  `permanent_address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'India',
  `pincode` varchar(20) DEFAULT NULL,
  `emergency_contact_name` varchar(255) DEFAULT NULL,
  `emergency_contact_relationship` varchar(100) DEFAULT NULL,
  `emergency_contact_phone` varchar(50) DEFAULT NULL,
  `emergency_contact_address` text,
  `employee_type` enum('full_time','part_time','contract','intern','consultant','temporary') DEFAULT 'full_time',
  `employment_status` enum('active','inactive','terminated','on_leave','suspended','resigned') DEFAULT 'active',
  `hire_date` date NOT NULL,
  `confirmation_date` date DEFAULT NULL,
  `probation_period_months` int DEFAULT '6',
  `termination_date` date DEFAULT NULL,
  `termination_reason` text,
  `rehire_eligible` tinyint(1) DEFAULT '1',
  `department_id` int DEFAULT NULL,
  `position_id` int DEFAULT NULL,
  `reporting_manager_id` int DEFAULT NULL,
  `secondary_manager_id` int DEFAULT NULL,
  `work_location_id` int DEFAULT NULL,
  `team_lead_id` int DEFAULT NULL,
  `basic_salary` decimal(15,2) DEFAULT NULL,
  `total_ctc` decimal(15,2) DEFAULT NULL,
  `salary_currency` varchar(10) DEFAULT 'INR',
  `pay_grade` varchar(20) DEFAULT NULL,
  `salary_review_date` date DEFAULT NULL,
  `work_schedule` enum('regular','flexible','shift','remote','hybrid') DEFAULT 'regular',
  `preferred_shift` json DEFAULT NULL,
  `remote_work_eligible` tinyint(1) DEFAULT '0',
  `travel_required` tinyint(1) DEFAULT '0',
  `professional_summary` text,
  `key_skills` text,
  `languages_spoken` json DEFAULT NULL,
  `total_experience_years` decimal(3,1) DEFAULT '0.0',
  `previous_company` varchar(255) DEFAULT NULL,
  `employee_photo_url` varchar(500) DEFAULT NULL,
  `employee_documents` json DEFAULT NULL,
  `notes` text,
  `tags` json DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `secondary_manager_id` (`secondary_manager_id`),
  KEY `team_lead_id` (`team_lead_id`),
  KEY `idx_emp_department` (`department_id`),
  KEY `idx_emp_position` (`position_id`),
  KEY `idx_emp_manager` (`reporting_manager_id`),
  KEY `idx_emp_status` (`employment_status`),
  KEY `idx_emp_location` (`work_location_id`),
  KEY `idx_emp_email` (`email`),
  KEY `idx_emp_hire_date` (`hire_date`),
  CONSTRAINT `enterprise_employees_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `enterprise_employees_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `enterprise_departments` (`id`),
  CONSTRAINT `enterprise_employees_ibfk_3` FOREIGN KEY (`position_id`) REFERENCES `job_positions` (`id`),
  CONSTRAINT `enterprise_employees_ibfk_4` FOREIGN KEY (`reporting_manager_id`) REFERENCES `enterprise_employees` (`id`),
  CONSTRAINT `enterprise_employees_ibfk_5` FOREIGN KEY (`secondary_manager_id`) REFERENCES `enterprise_employees` (`id`),
  CONSTRAINT `enterprise_employees_ibfk_6` FOREIGN KEY (`work_location_id`) REFERENCES `work_locations` (`id`),
  CONSTRAINT `enterprise_employees_ibfk_7` FOREIGN KEY (`team_lead_id`) REFERENCES `enterprise_employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `estimation_items`;
CREATE TABLE `estimation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `estimation_id` int NOT NULL,
  `section_id` int NOT NULL,
  `subsection_id` int DEFAULT NULL,
  `product_id` int NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `mrp` decimal(10,2) NOT NULL,
  `discount_percentage` decimal(5,2) DEFAULT '0.00',
  `discounted_price` decimal(10,2) NOT NULL,
  `final_price` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `cgst_percentage` decimal(5,2) DEFAULT '0.00',
  `sgst_percentage` decimal(5,2) DEFAULT '0.00',
  `igst_percentage` decimal(5,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `estimation_id` (`estimation_id`),
  KEY `section_id` (`section_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `estimation_items_ibfk_1` FOREIGN KEY (`estimation_id`) REFERENCES `estimations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `estimation_items_ibfk_2` FOREIGN KEY (`section_id`) REFERENCES `estimation_sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `estimation_items_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `estimation_sections`;
CREATE TABLE `estimation_sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `estimation_id` int NOT NULL,
  `heading` varchar(255) NOT NULL,
  `parent_id` int DEFAULT NULL,
  `sort_order` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `estimation_id` (`estimation_id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `estimation_sections_ibfk_1` FOREIGN KEY (`estimation_id`) REFERENCES `estimations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `estimation_sections_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `estimation_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `estimation_subsections`;
CREATE TABLE `estimation_subsections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `section_id` int NOT NULL,
  `subsection_name` varchar(255) NOT NULL,
  `subsection_order` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_section_id` (`section_id`),
  KEY `idx_subsection_order` (`subsection_order`),
  CONSTRAINT `estimation_subsections_ibfk_1` FOREIGN KEY (`section_id`) REFERENCES `estimation_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `estimations`;
CREATE TABLE `estimations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `estimation_id` varchar(50) NOT NULL,
  `enquiry_id` int NOT NULL,
  `case_id` int DEFAULT NULL,
  `date` date NOT NULL,
  `status` enum('draft','submitted','approved','rejected') DEFAULT 'draft',
  `total_mrp` decimal(15,2) DEFAULT '0.00',
  `total_discount` decimal(15,2) DEFAULT '0.00',
  `total_final_price` decimal(15,2) DEFAULT '0.00',
  `notes` text,
  `created_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `pricing_suggestions` text COMMENT 'JSON cache of smart pricing suggestions',
  PRIMARY KEY (`id`),
  UNIQUE KEY `estimation_id` (`estimation_id`),
  KEY `enquiry_id` (`enquiry_id`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  KEY `case_id` (`case_id`),
  CONSTRAINT `estimations_ibfk_1` FOREIGN KEY (`enquiry_id`) REFERENCES `sales_enquiries` (`id`),
  CONSTRAINT `estimations_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `estimations_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `estimations_ibfk_4` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `expense_approvals`;
CREATE TABLE `expense_approvals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `expense_id` int NOT NULL,
  `approver_id` int NOT NULL,
  `approval_level` int NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `comments` text,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expense_id` (`expense_id`),
  KEY `idx_approver_id` (`approver_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `expense_approvals_ibfk_1` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `expense_approvals_ibfk_2` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Multi-level expense approval tracking';

DROP TABLE IF EXISTS `expense_categories`;
CREATE TABLE `expense_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_code` varchar(20) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `parent_category_id` int DEFAULT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `requires_approval` tinyint(1) DEFAULT '1',
  `approval_limit` decimal(15,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`),
  KEY `parent_category_id` (`parent_category_id`),
  KEY `idx_category_code` (`category_code`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `expense_categories_ibfk_1` FOREIGN KEY (`parent_category_id`) REFERENCES `expense_categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Expense category hierarchy';

DROP TABLE IF EXISTS `expense_items`;
CREATE TABLE `expense_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `expense_id` int NOT NULL,
  `item_description` varchar(500) NOT NULL,
  `quantity` decimal(10,2) DEFAULT '1.00',
  `unit_price` decimal(15,2) NOT NULL,
  `tax_rate` decimal(5,2) DEFAULT '0.00',
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expense_id` (`expense_id`),
  CONSTRAINT `expense_items_ibfk_1` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Expense item details';

DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `expense_number` varchar(50) NOT NULL,
  `expense_date` date NOT NULL,
  `category_id` int NOT NULL,
  `subcategory_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `employee_id` int DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'INR',
  `payment_method` enum('cash','cheque','bank_transfer','credit_card','upi') NOT NULL,
  `payment_status` enum('pending','paid','partially_paid') DEFAULT 'pending',
  `approval_status` enum('draft','pending_approval','approved','rejected','cancelled') DEFAULT 'draft',
  `description` text,
  `receipt_number` varchar(100) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text,
  `attachment_path` varchar(500) DEFAULT NULL,
  `is_recurring` tinyint(1) DEFAULT '0',
  `recurring_frequency` enum('daily','weekly','monthly','quarterly','yearly') DEFAULT NULL,
  `recurring_until` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `paid_by` int DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_number` (`expense_number`),
  KEY `subcategory_id` (`subcategory_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  KEY `paid_by` (`paid_by`),
  KEY `idx_expense_number` (`expense_number`),
  KEY `idx_expense_date` (`expense_date`),
  KEY `idx_category` (`category_id`),
  KEY `idx_department` (`department_id`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`),
  CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`subcategory_id`) REFERENCES `expense_categories` (`id`),
  CONSTRAINT `expenses_ibfk_3` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `expenses_ibfk_4` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `expenses_ibfk_5` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `expenses_ibfk_6` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `expenses_ibfk_7` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `expenses_ibfk_8` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Expense tracking and management';

DROP TABLE IF EXISTS `financial_transaction_details`;
CREATE TABLE `financial_transaction_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` int NOT NULL,
  `account_id` int NOT NULL,
  `debit_amount` decimal(15,2) DEFAULT '0.00',
  `credit_amount` decimal(15,2) DEFAULT '0.00',
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`),
  KEY `account_id` (`account_id`),
  CONSTRAINT `financial_transaction_details_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `financial_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `financial_transaction_details_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `financial_transactions`;
CREATE TABLE `financial_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_number` varchar(50) NOT NULL,
  `transaction_date` date NOT NULL,
  `reference_type` enum('sales_order','purchase_order','journal_entry','payment','receipt') NOT NULL,
  `reference_id` int DEFAULT NULL,
  `description` text,
  `total_amount` decimal(15,2) NOT NULL,
  `status` enum('draft','posted','cancelled') DEFAULT 'draft',
  `created_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_number` (`transaction_number`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `financial_transactions_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `financial_transactions_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `goal_key_results`;
CREATE TABLE `goal_key_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `goal_id` int NOT NULL,
  `key_result_title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_result_description` text COLLATE utf8mb4_unicode_ci,
  `target_value` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_value` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Unit of measurement (%, count, etc)',
  `progress_percentage` decimal(5,2) DEFAULT '0.00',
  `status` enum('not_started','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'not_started',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_goal` (`goal_id`),
  KEY `idx_display_order` (`display_order`),
  CONSTRAINT `goal_key_results_ibfk_1` FOREIGN KEY (`goal_id`) REFERENCES `goals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `goals`;
CREATE TABLE `goals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `review_cycle_id` int DEFAULT NULL,
  `goal_type` enum('okr','kpi','smart','project','development') COLLATE utf8mb4_unicode_ci DEFAULT 'smart',
  `goal_title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `goal_description` text COLLATE utf8mb4_unicode_ci,
  `category` enum('individual','team','company') COLLATE utf8mb4_unicode_ci DEFAULT 'individual',
  `priority` enum('critical','high','medium','low') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `start_date` date NOT NULL,
  `target_date` date NOT NULL,
  `completion_date` date DEFAULT NULL,
  `status` enum('draft','active','on_track','at_risk','behind','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `progress_percentage` decimal(5,2) DEFAULT '0.00',
  `measurement_criteria` text COLLATE utf8mb4_unicode_ci COMMENT 'How success will be measured',
  `target_value` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Target metric value',
  `current_value` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Current metric value',
  `weight_percentage` decimal(5,2) DEFAULT '0.00' COMMENT 'Weight in overall performance',
  `aligned_with_id` int DEFAULT NULL COMMENT 'Parent goal this aligns with',
  `created_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `aligned_with_id` (`aligned_with_id`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_review_cycle` (`review_cycle_id`),
  KEY `idx_goal_type` (`goal_type`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`start_date`,`target_date`),
  CONSTRAINT `goals_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `goals_ibfk_2` FOREIGN KEY (`review_cycle_id`) REFERENCES `review_cycles` (`id`),
  CONSTRAINT `goals_ibfk_3` FOREIGN KEY (`aligned_with_id`) REFERENCES `goals` (`id`),
  CONSTRAINT `goals_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `goals_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `goods_received_notes`;
CREATE TABLE `goods_received_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grn_number` varchar(50) NOT NULL,
  `purchase_order_id` int DEFAULT NULL,
  `supplier_id` int NOT NULL,
  `grn_date` date NOT NULL,
  `lr_number` varchar(100) DEFAULT NULL,
  `supplier_invoice_number` varchar(100) DEFAULT NULL,
  `supplier_invoice_date` date DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `status` enum('draft','verified','approved','cancelled') DEFAULT 'draft',
  `received_by` int DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grn_number` (`grn_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `grn_items`;
CREATE TABLE `grn_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grn_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `ordered_quantity` decimal(10,2) NOT NULL,
  `received_quantity` decimal(10,2) NOT NULL,
  `accepted_quantity` decimal(10,2) NOT NULL,
  `rejected_quantity` decimal(10,2) DEFAULT '0.00',
  `unit_price` decimal(10,2) DEFAULT NULL,
  `serial_numbers` text,
  `warranty_start_date` date DEFAULT NULL,
  `warranty_end_date` date DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `group_roles`;
CREATE TABLE `group_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `role_id` int NOT NULL,
  `assigned_by` int DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_inherited` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_role` (`group_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `group_roles_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `user_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `user_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_categories`;
CREATE TABLE `inventory_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `parent_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `category_name` varchar(255) DEFAULT NULL,
  `category_code` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `inventory_categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `inventory_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_items`;
CREATE TABLE `inventory_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_code` varchar(100) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `description` text,
  `category` varchar(100) DEFAULT NULL,
  `unit` varchar(20) DEFAULT 'nos',
  `current_stock` decimal(15,3) DEFAULT '0.000',
  `reserved_stock` decimal(15,3) DEFAULT '0.000',
  `available_stock` decimal(15,3) GENERATED ALWAYS AS ((`current_stock` - `reserved_stock`)) STORED,
  `minimum_stock` decimal(15,3) DEFAULT '0.000',
  `maximum_stock` decimal(15,3) DEFAULT NULL,
  `reorder_point` decimal(15,3) DEFAULT '0.000',
  `reorder_quantity` decimal(15,3) DEFAULT '0.000',
  `standard_cost` decimal(10,2) DEFAULT '0.00',
  `average_cost` decimal(10,2) DEFAULT '0.00',
  `last_purchase_cost` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `category_id` int DEFAULT NULL,
  `unit_id` int DEFAULT NULL,
  `item_type` enum('raw_material','component','finished_product','consumable','tool') DEFAULT 'component',
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_code` (`item_code`),
  KEY `category_id` (`category_id`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `inventory_items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `inventory_categories` (`id`),
  CONSTRAINT `inventory_items_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `inventory_units` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_items_enhanced`;
CREATE TABLE `inventory_items_enhanced` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `description` text,
  `main_category_id` int NOT NULL,
  `sub_category_id` int DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `model_number` varchar(100) DEFAULT NULL,
  `part_number` varchar(100) DEFAULT NULL,
  `manufacturer` varchar(100) DEFAULT NULL,
  `specifications` json DEFAULT NULL,
  `datasheet_url` varchar(500) DEFAULT NULL,
  `manual_url` varchar(500) DEFAULT NULL,
  `requires_serial_tracking` tinyint(1) DEFAULT '0',
  `requires_batch_tracking` tinyint(1) DEFAULT '0',
  `shelf_life_days` int DEFAULT NULL,
  `current_stock` int DEFAULT '0',
  `reserved_stock` int DEFAULT '0',
  `available_stock` int DEFAULT NULL,
  `minimum_stock` int DEFAULT '0',
  `maximum_stock` int DEFAULT NULL,
  `reorder_point` int DEFAULT '0',
  `reorder_quantity` int DEFAULT '0',
  `standard_cost` decimal(12,2) DEFAULT '0.00',
  `average_cost` decimal(12,2) DEFAULT '0.00',
  `last_purchase_cost` decimal(12,2) DEFAULT '0.00',
  `selling_price` decimal(12,2) DEFAULT '0.00',
  `gst_rate` decimal(5,2) DEFAULT '18.00',
  `primary_unit` varchar(20) DEFAULT 'NOS',
  `secondary_unit` varchar(20) DEFAULT NULL,
  `conversion_factor` decimal(10,4) DEFAULT '1.0000',
  `item_status` enum('active','inactive','discontinued','obsolete') DEFAULT 'active',
  `location_code` varchar(50) DEFAULT NULL,
  `bin_location` varchar(50) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `vendor_discount` decimal(5,2) DEFAULT '0.00' COMMENT 'Default vendor discount percentage',
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_code` (`item_code`),
  KEY `sub_category_id` (`sub_category_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_item_code` (`item_code`),
  KEY `idx_category` (`main_category_id`,`sub_category_id`),
  KEY `idx_brand_model` (`brand`,`model_number`),
  KEY `idx_stock_levels` (`current_stock`,`minimum_stock`),
  KEY `idx_status` (`item_status`),
  KEY `idx_items_category_brand` (`main_category_id`,`brand`),
  KEY `idx_items_model` (`model_number`),
  KEY `idx_items_part_number` (`part_number`),
  CONSTRAINT `inventory_items_enhanced_ibfk_1` FOREIGN KEY (`main_category_id`) REFERENCES `inventory_main_categories` (`id`),
  CONSTRAINT `inventory_items_enhanced_ibfk_2` FOREIGN KEY (`sub_category_id`) REFERENCES `inventory_sub_categories` (`id`),
  CONSTRAINT `inventory_items_enhanced_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_main_categories`;
CREATE TABLE `inventory_main_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_code` varchar(20) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` text,
  `requires_serial_tracking` tinyint(1) DEFAULT '0',
  `requires_calibration` tinyint(1) DEFAULT '0',
  `default_warranty_months` int DEFAULT '12',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_purchase_history`;
CREATE TABLE `inventory_purchase_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `vendor_id` int DEFAULT NULL,
  `purchase_order_id` int DEFAULT NULL,
  `grn_id` int DEFAULT NULL,
  `purchase_date` date NOT NULL,
  `quantity_purchased` int DEFAULT NULL,
  `unit_cost` decimal(12,2) NOT NULL,
  `discount_percentage` decimal(5,2) DEFAULT '0.00',
  `discount_amount` decimal(12,2) DEFAULT '0.00',
  `tax_percentage` decimal(5,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `total_cost` decimal(12,2) NOT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `quality_status` enum('accepted','rejected','partially_accepted','pending') DEFAULT 'pending',
  `currency` varchar(3) DEFAULT 'INR',
  `exchange_rate` decimal(10,4) DEFAULT '1.0000',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_item_date` (`item_id`,`purchase_date`),
  KEY `idx_vendor` (`vendor_id`),
  KEY `idx_unit_cost` (`unit_cost`),
  KEY `idx_purchase_history_date` (`purchase_date` DESC),
  CONSTRAINT `inventory_purchase_history_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `inventory_items_enhanced` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_serial_numbers`;
CREATE TABLE `inventory_serial_numbers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `serial_number` varchar(100) NOT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `manufacturing_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_cost` decimal(12,2) DEFAULT NULL,
  `vendor_id` int DEFAULT NULL,
  `grn_id` int DEFAULT NULL,
  `status` enum('in_stock','reserved','issued','in_service','under_repair','scrapped') DEFAULT 'in_stock',
  `current_location` varchar(100) DEFAULT NULL,
  `assigned_to` varchar(100) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `warranty_start_date` date DEFAULT NULL,
  `warranty_end_date` date DEFAULT NULL,
  `last_service_date` date DEFAULT NULL,
  `next_service_date` date DEFAULT NULL,
  `calibration_due_date` date DEFAULT NULL,
  `notes` text,
  `purchase_order_id` int DEFAULT NULL,
  `sales_order_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_serial_item` (`item_id`,`serial_number`),
  KEY `idx_serial_number` (`serial_number`),
  KEY `idx_status` (`status`),
  KEY `idx_warranty` (`warranty_end_date`),
  KEY `idx_service` (`next_service_date`),
  KEY `idx_serial_warranty` (`warranty_end_date`),
  CONSTRAINT `inventory_serial_numbers_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `inventory_items_enhanced` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_sub_categories`;
CREATE TABLE `inventory_sub_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `main_category_id` int NOT NULL,
  `subcategory_code` varchar(20) NOT NULL,
  `subcategory_name` varchar(100) NOT NULL,
  `description` text,
  `technical_specifications` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_subcategory` (`main_category_id`,`subcategory_code`),
  CONSTRAINT `inventory_sub_categories_ibfk_1` FOREIGN KEY (`main_category_id`) REFERENCES `inventory_main_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_substitute_items`;
CREATE TABLE `inventory_substitute_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `primary_item_id` int NOT NULL,
  `substitute_item_id` int NOT NULL,
  `substitution_ratio` decimal(8,4) DEFAULT '1.0000',
  `notes` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_substitution` (`primary_item_id`,`substitute_item_id`),
  KEY `substitute_item_id` (`substitute_item_id`),
  CONSTRAINT `inventory_substitute_items_ibfk_1` FOREIGN KEY (`primary_item_id`) REFERENCES `inventory_items_enhanced` (`id`),
  CONSTRAINT `inventory_substitute_items_ibfk_2` FOREIGN KEY (`substitute_item_id`) REFERENCES `inventory_items_enhanced` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_transactions`;
CREATE TABLE `inventory_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_code` varchar(50) NOT NULL,
  `item_id` int NOT NULL,
  `transaction_type` enum('purchase_receipt','sales_issue','production_issue','production_receipt','stock_transfer','stock_adjustment','return_receipt','return_issue','opening_stock','physical_count') NOT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit_cost` decimal(15,2) DEFAULT '0.00',
  `stock_before` decimal(15,3) NOT NULL,
  `stock_after` decimal(15,3) NOT NULL,
  `batch_number` varchar(100) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `from_location` varchar(100) DEFAULT NULL,
  `to_location` varchar(100) DEFAULT NULL,
  `warehouse_location` varchar(100) DEFAULT NULL,
  `remarks` text,
  `status` enum('pending','approved','cancelled') DEFAULT 'pending',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_code` (`transaction_code`),
  KEY `item_id` (`item_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `inventory_transactions_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `inventory_items` (`id`),
  CONSTRAINT `inventory_transactions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_transactions_enhanced`;
CREATE TABLE `inventory_transactions_enhanced` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `transaction_type` enum('receipt','issue','transfer','adjustment','return','scrap') NOT NULL,
  `reference_type` enum('purchase_order','sales_order','production_order','transfer_order','adjustment','grn','return') NOT NULL,
  `reference_id` int DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit_cost` decimal(12,2) DEFAULT NULL,
  `total_value` decimal(15,2) DEFAULT NULL,
  `from_location` varchar(100) DEFAULT NULL,
  `to_location` varchar(100) DEFAULT NULL,
  `from_bin` varchar(50) DEFAULT NULL,
  `to_bin` varchar(50) DEFAULT NULL,
  `serial_numbers` json DEFAULT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `transaction_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_item_type` (`item_id`,`transaction_type`),
  KEY `idx_reference` (`reference_type`,`reference_id`),
  KEY `idx_date` (`transaction_date`),
  CONSTRAINT `inventory_transactions_enhanced_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `inventory_items_enhanced` (`id`),
  CONSTRAINT `inventory_transactions_enhanced_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `inventory_transactions_enhanced_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_units`;
CREATE TABLE `inventory_units` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_name` varchar(50) NOT NULL,
  `unit_symbol` varchar(10) NOT NULL,
  `base_unit_id` int DEFAULT NULL,
  `conversion_factor` decimal(10,4) DEFAULT '1.0000',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_unit_name` (`unit_name`),
  UNIQUE KEY `unique_unit_symbol` (`unit_symbol`),
  KEY `base_unit_id` (`base_unit_id`),
  CONSTRAINT `inventory_units_ibfk_1` FOREIGN KEY (`base_unit_id`) REFERENCES `inventory_units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_vendor_items`;
CREATE TABLE `inventory_vendor_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `vendor_id` int NOT NULL,
  `vendor_item_code` varchar(100) DEFAULT NULL,
  `vendor_item_name` varchar(255) DEFAULT NULL,
  `vendor_part_number` varchar(100) DEFAULT NULL,
  `last_purchase_price` decimal(12,2) DEFAULT NULL,
  `quoted_price` decimal(12,2) DEFAULT NULL,
  `discount_percentage` decimal(5,2) DEFAULT '0.00',
  `lead_time_days` int DEFAULT '0',
  `minimum_order_quantity` decimal(15,3) DEFAULT '1.000',
  `quality_rating` decimal(3,2) DEFAULT '5.00',
  `delivery_rating` decimal(3,2) DEFAULT '5.00',
  `price_rating` decimal(3,2) DEFAULT '5.00',
  `is_preferred_vendor` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `last_purchase_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_vendor_item` (`item_id`,`vendor_id`),
  KEY `idx_vendor_code` (`vendor_id`,`vendor_item_code`),
  CONSTRAINT `inventory_vendor_items_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `inventory_items_enhanced` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_vendors`;
CREATE TABLE `inventory_vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_code` varchar(50) NOT NULL,
  `vendor_name` varchar(255) NOT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `pan_number` varchar(20) DEFAULT NULL,
  `payment_terms` text,
  `credit_limit` decimal(15,2) DEFAULT '0.00',
  `rating` enum('A','B','C','D') DEFAULT 'B',
  `tax_category` enum('REGISTERED','UNREGISTERED','COMPOSITE','EXPORT') DEFAULT 'REGISTERED',
  `vendor_type` enum('DOMESTIC','IMPORT','EXPORT') DEFAULT 'DOMESTIC',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_code` (`vendor_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `inventory_warehouse_stock`;
CREATE TABLE `inventory_warehouse_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `location_id` int NOT NULL,
  `current_stock` decimal(15,3) DEFAULT '0.000',
  `reserved_stock` decimal(15,3) DEFAULT '0.000',
  `available_stock` decimal(15,3) GENERATED ALWAYS AS ((`current_stock` - `reserved_stock`)) STORED,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_item_location` (`item_id`,`location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) NOT NULL,
  `customer_id` int NOT NULL,
  `reference_type` enum('sales_order','direct') NOT NULL,
  `reference_id` int DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `balance_amount` decimal(15,2) DEFAULT '0.00',
  `status` enum('draft','sent','paid','overdue','cancelled') DEFAULT 'draft',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ip_access_controls`;
CREATE TABLE `ip_access_controls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(100) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `subnet_mask` varchar(45) DEFAULT NULL,
  `access_type` enum('allow','deny') DEFAULT 'allow',
  `location_id` int DEFAULT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `ip_access_controls_ibfk_1` FOREIGN KEY (`location_id`) REFERENCES `office_locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `job_positions`;
CREATE TABLE `job_positions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `position_code` varchar(20) NOT NULL,
  `position_title` varchar(255) NOT NULL,
  `department_id` int NOT NULL,
  `level_grade` varchar(10) DEFAULT NULL,
  `min_experience_years` int DEFAULT '0',
  `max_experience_years` int DEFAULT '50',
  `min_salary` decimal(15,2) DEFAULT NULL,
  `max_salary` decimal(15,2) DEFAULT NULL,
  `job_description` text,
  `key_responsibilities` text,
  `required_skills` text,
  `reporting_to_position_id` int DEFAULT NULL,
  `direct_reports_count` int DEFAULT '0',
  `status` enum('active','inactive','deprecated') DEFAULT 'active',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `position_code` (`position_code`),
  KEY `reporting_to_position_id` (`reporting_to_position_id`),
  KEY `idx_position_dept` (`department_id`),
  KEY `idx_position_level` (`level_grade`),
  CONSTRAINT `job_positions_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `enterprise_departments` (`id`),
  CONSTRAINT `job_positions_ibfk_2` FOREIGN KEY (`reporting_to_position_id`) REFERENCES `job_positions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `leave_applications_enhanced`;
CREATE TABLE `leave_applications_enhanced` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `leave_type_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_days` decimal(5,2) NOT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'pending',
  `applied_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_date` timestamp NULL DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `rejection_reason` text,
  `supporting_document_path` varchar(500) DEFAULT NULL,
  `emergency_contact` varchar(100) DEFAULT NULL,
  `handover_notes` text,
  `is_half_day` tinyint(1) DEFAULT '0',
  `half_day_period` enum('first_half','second_half') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  KEY `leave_type_id` (`leave_type_id`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `leave_applications_enhanced_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leave_applications_enhanced_ibfk_2` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types_enhanced` (`id`),
  CONSTRAINT `leave_applications_enhanced_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `leave_policies`;
CREATE TABLE `leave_policies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `policy_name` varchar(100) NOT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `leave_policies_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `leave_types_enhanced`;
CREATE TABLE `leave_types_enhanced` (
  `id` int NOT NULL AUTO_INCREMENT,
  `leave_type_name` varchar(50) NOT NULL,
  `leave_code` varchar(10) NOT NULL,
  `description` text,
  `policy_id` int DEFAULT NULL,
  `is_paid` tinyint(1) DEFAULT '1',
  `is_carryforward` tinyint(1) DEFAULT '0',
  `max_carryforward_days` int DEFAULT '0',
  `advance_notice_days` int DEFAULT '1',
  `max_consecutive_days` int DEFAULT '365',
  `requires_document` tinyint(1) DEFAULT '0',
  `document_required_after_days` int DEFAULT '3',
  `is_weekend_included` tinyint(1) DEFAULT '1',
  `is_holiday_included` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_code` (`leave_code`),
  KEY `policy_id` (`policy_id`),
  CONSTRAINT `leave_types_enhanced_ibfk_1` FOREIGN KEY (`policy_id`) REFERENCES `leave_policies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `loan_repayments`;
CREATE TABLE `loan_repayments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `loan_id` int NOT NULL,
  `payroll_transaction_id` int DEFAULT NULL,
  `installment_number` int NOT NULL,
  `repayment_date` date NOT NULL,
  `principal_amount` decimal(12,2) NOT NULL,
  `interest_amount` decimal(12,2) DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL,
  `outstanding_balance` decimal(12,2) NOT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payroll_transaction_id` (`payroll_transaction_id`),
  KEY `idx_loan` (`loan_id`),
  KEY `idx_repayment_date` (`repayment_date`),
  CONSTRAINT `loan_repayments_ibfk_1` FOREIGN KEY (`loan_id`) REFERENCES `employee_loans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `loan_repayments_ibfk_2` FOREIGN KEY (`payroll_transaction_id`) REFERENCES `payroll_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `locations`;
CREATE TABLE `locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` enum('warehouse','store','production','office') NOT NULL,
  `address` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `login_attempt_logs`;
CREATE TABLE `login_attempt_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text,
  `location_data` json DEFAULT NULL,
  `attempt_result` enum('success','failed','blocked') NOT NULL,
  `failure_reason` varchar(255) DEFAULT NULL,
  `session_token` varchar(255) DEFAULT NULL,
  `login_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `login_attempt_logs_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `machine_maintenance`;
CREATE TABLE `machine_maintenance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `maintenance_number` varchar(50) NOT NULL,
  `machine_id` int DEFAULT NULL,
  `maintenance_type` enum('preventive','corrective','emergency') NOT NULL,
  `scheduled_date` date DEFAULT NULL,
  `actual_date` date DEFAULT NULL,
  `duration_hours` decimal(6,2) DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `description` text,
  `performed_by` int DEFAULT NULL,
  `status` enum('scheduled','in_progress','completed','cancelled') DEFAULT 'scheduled',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `maintenance_number` (`maintenance_number`),
  KEY `performed_by` (`performed_by`),
  KEY `idx_machine_date` (`machine_id`,`scheduled_date`),
  CONSTRAINT `machine_maintenance_ibfk_1` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `machine_utilization_log`;
CREATE TABLE `machine_utilization_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_id` int NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `operation_tracking_id` int DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `utilization_type` enum('productive','setup','maintenance','breakdown','idle') COLLATE utf8mb4_unicode_ci NOT NULL,
  `downtime_reason` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `downtime_category` enum('planned','unplanned') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actual_output` int DEFAULT NULL,
  `target_output` int DEFAULT NULL,
  `efficiency_percentage` decimal(5,2) DEFAULT NULL,
  `operator_id` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `operation_tracking_id` (`operation_tracking_id`),
  KEY `operator_id` (`operator_id`),
  KEY `idx_machine` (`machine_id`),
  KEY `idx_time_range` (`start_time`,`end_time`),
  KEY `idx_utilization_type` (`utilization_type`),
  CONSTRAINT `machine_utilization_log_ibfk_1` FOREIGN KEY (`machine_id`) REFERENCES `production_machines` (`id`),
  CONSTRAINT `machine_utilization_log_ibfk_2` FOREIGN KEY (`work_order_id`) REFERENCES `manufacturing_work_orders` (`id`),
  CONSTRAINT `machine_utilization_log_ibfk_3` FOREIGN KEY (`operation_tracking_id`) REFERENCES `work_order_operation_tracking` (`id`),
  CONSTRAINT `machine_utilization_log_ibfk_4` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `manufacturing_cases`;
CREATE TABLE `manufacturing_cases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `manufacturing_case_number` varchar(50) NOT NULL,
  `case_id` int NOT NULL,
  `planned_start_date` date DEFAULT NULL,
  `planned_end_date` date DEFAULT NULL,
  `actual_start_date` date DEFAULT NULL,
  `actual_end_date` date DEFAULT NULL,
  `status` enum('planning','approved','in_progress','on_hold','completed','cancelled') DEFAULT 'planning',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `progress_percentage` decimal(5,2) DEFAULT '0.00',
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `bom_header_id` int DEFAULT NULL,
  `manufacturing_unit_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `manufacturing_case_number` (`manufacturing_case_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `manufacturing_units`;
CREATE TABLE `manufacturing_units` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_name` varchar(255) NOT NULL,
  `unit_code` varchar(50) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `capacity_per_day` decimal(15,3) DEFAULT '0.000',
  `unit_of_measurement` varchar(50) DEFAULT 'PCS',
  `manager_employee_id` int DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive','maintenance') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unit_code` (`unit_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `manufacturing_work_orders`;
CREATE TABLE `manufacturing_work_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `manufacturing_case_id` int DEFAULT NULL,
  `work_order_number` varchar(50) NOT NULL,
  `operation_name` varchar(255) DEFAULT NULL,
  `sequence_number` int DEFAULT '1',
  `status` enum('pending','in_progress','completed','on_hold') DEFAULT 'pending',
  `assigned_to` int DEFAULT NULL,
  `planned_start_date` date DEFAULT NULL,
  `planned_end_date` date DEFAULT NULL,
  `actual_start_date` date DEFAULT NULL,
  `actual_end_date` date DEFAULT NULL,
  `estimated_hours` decimal(8,2) DEFAULT '0.00',
  `actual_hours` decimal(8,2) DEFAULT '0.00',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_order_number` (`work_order_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `notification_templates`;
CREATE TABLE `notification_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_name` varchar(100) NOT NULL,
  `subject_template` varchar(200) DEFAULT NULL,
  `body_template` text,
  `notification_type` enum('email','sms','system','push') DEFAULT 'system',
  `trigger_event` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_name` (`template_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `office_locations`;
CREATE TABLE `office_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `location_name` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `radius_meters` int NOT NULL DEFAULT '100',
  `location_type` enum('head_office','branch_office','client_site','warehouse','remote_authorized') DEFAULT 'branch_office',
  `timezone` varchar(50) DEFAULT 'Asia/Kolkata',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `page_access`;
CREATE TABLE `page_access` (
  `id` int NOT NULL AUTO_INCREMENT,
  `page_route` varchar(200) NOT NULL,
  `page_name` varchar(100) NOT NULL,
  `module_category` varchar(50) DEFAULT NULL,
  `required_permission` varchar(100) DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT '0',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_route` (`page_route`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_number` varchar(50) NOT NULL,
  `customer_id` int NOT NULL,
  `invoice_id` int DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` enum('cash','cheque','bank_transfer','upi','credit_card') NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','failed','cancelled') DEFAULT 'pending',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_number` (`payment_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `payroll_cycles`;
CREATE TABLE `payroll_cycles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cycle_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pay_period_start` date NOT NULL,
  `pay_period_end` date NOT NULL,
  `payment_date` date NOT NULL,
  `status` enum('draft','processing','approved','paid','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `total_employees` int DEFAULT '0',
  `total_gross` decimal(15,2) DEFAULT '0.00',
  `total_deductions` decimal(15,2) DEFAULT '0.00',
  `total_net` decimal(15,2) DEFAULT '0.00',
  `processed_by` int DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `processed_by` (`processed_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_pay_period` (`pay_period_start`,`pay_period_end`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_date` (`payment_date`),
  CONSTRAINT `payroll_cycles_ibfk_1` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `payroll_cycles_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `payroll_transaction_details`;
CREATE TABLE `payroll_transaction_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payroll_transaction_id` int NOT NULL,
  `component_id` int NOT NULL,
  `component_type` enum('earning','deduction','reimbursement') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `calculation_base` decimal(12,2) DEFAULT NULL COMMENT 'Base amount for percentage calculation',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_transaction` (`payroll_transaction_id`),
  KEY `idx_component` (`component_id`),
  CONSTRAINT `payroll_transaction_details_ibfk_1` FOREIGN KEY (`payroll_transaction_id`) REFERENCES `payroll_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payroll_transaction_details_ibfk_2` FOREIGN KEY (`component_id`) REFERENCES `salary_components` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `payroll_transactions`;
CREATE TABLE `payroll_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payroll_cycle_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `pay_period_start` date NOT NULL,
  `pay_period_end` date NOT NULL,
  `payment_date` date NOT NULL,
  `total_days` decimal(5,2) DEFAULT '0.00',
  `present_days` decimal(5,2) DEFAULT '0.00',
  `absent_days` decimal(5,2) DEFAULT '0.00',
  `leave_days` decimal(5,2) DEFAULT '0.00',
  `holidays` decimal(5,2) DEFAULT '0.00',
  `payable_days` decimal(5,2) DEFAULT '0.00',
  `basic_salary` decimal(12,2) DEFAULT '0.00',
  `hra` decimal(12,2) DEFAULT '0.00',
  `conveyance_allowance` decimal(12,2) DEFAULT '0.00',
  `medical_allowance` decimal(12,2) DEFAULT '0.00',
  `special_allowance` decimal(12,2) DEFAULT '0.00',
  `other_allowances` decimal(12,2) DEFAULT '0.00',
  `gross_salary` decimal(12,2) DEFAULT '0.00',
  `pf_employee` decimal(12,2) DEFAULT '0.00',
  `pf_employer` decimal(12,2) DEFAULT '0.00',
  `esi_employee` decimal(12,2) DEFAULT '0.00',
  `esi_employer` decimal(12,2) DEFAULT '0.00',
  `professional_tax` decimal(12,2) DEFAULT '0.00',
  `tds` decimal(12,2) DEFAULT '0.00',
  `loan_deduction` decimal(12,2) DEFAULT '0.00',
  `advance_deduction` decimal(12,2) DEFAULT '0.00',
  `other_deductions` decimal(12,2) DEFAULT '0.00',
  `total_deductions` decimal(12,2) DEFAULT '0.00',
  `net_salary` decimal(12,2) DEFAULT '0.00',
  `reimbursements` decimal(12,2) DEFAULT '0.00',
  `total_payment` decimal(12,2) DEFAULT '0.00',
  `status` enum('draft','approved','paid','on_hold','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `payment_mode` enum('bank_transfer','cash','cheque') COLLATE utf8mb4_unicode_ci DEFAULT 'bank_transfer',
  `payment_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_on` date DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `payslip_generated` tinyint(1) DEFAULT '0',
  `payslip_sent` tinyint(1) DEFAULT '0',
  `payslip_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_cycle` (`employee_id`,`payroll_cycle_id`),
  KEY `payroll_cycle_id` (`payroll_cycle_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_pay_period` (`pay_period_start`,`pay_period_end`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_date` (`payment_date`),
  CONSTRAINT `payroll_transactions_ibfk_1` FOREIGN KEY (`payroll_cycle_id`) REFERENCES `payroll_cycles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payroll_transactions_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `payroll_transactions_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `performance_improvement_plans`;
CREATE TABLE `performance_improvement_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `performance_review_id` int DEFAULT NULL COMMENT 'Review that triggered the PIP',
  `pip_title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `performance_concerns` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Specific performance issues',
  `impact_of_issues` text COLLATE utf8mb4_unicode_ci COMMENT 'Impact on team/organization',
  `improvement_goals` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Specific goals to achieve',
  `success_criteria` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'How success will be measured',
  `support_provided` text COLLATE utf8mb4_unicode_ci COMMENT 'Support and resources provided',
  `start_date` date NOT NULL,
  `review_date` date NOT NULL COMMENT 'Mid-point review date',
  `end_date` date NOT NULL,
  `status` enum('draft','active','in_progress','successful','unsuccessful','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `outcome_summary` text COLLATE utf8mb4_unicode_ci,
  `final_decision` enum('continued_employment','role_change','termination','extension') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Final decision after PIP',
  `weekly_updates` text COLLATE utf8mb4_unicode_ci,
  `manager_notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `hr_reviewed_by` int DEFAULT NULL,
  `hr_reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  KEY `hr_reviewed_by` (`hr_reviewed_by`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_review` (`performance_review_id`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`start_date`,`end_date`),
  CONSTRAINT `performance_improvement_plans_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `performance_improvement_plans_ibfk_2` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`id`),
  CONSTRAINT `performance_improvement_plans_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `performance_improvement_plans_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `performance_improvement_plans_ibfk_5` FOREIGN KEY (`hr_reviewed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `performance_reviews`;
CREATE TABLE `performance_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `review_cycle_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `reviewer_id` int NOT NULL COMMENT 'Primary reviewer (usually manager)',
  `review_type` enum('self','manager','peer','360','probation','final') COLLATE utf8mb4_unicode_ci DEFAULT 'manager',
  `review_status` enum('not_started','in_progress','submitted','acknowledged','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'not_started',
  `self_review_text` text COLLATE utf8mb4_unicode_ci,
  `self_review_submitted_at` timestamp NULL DEFAULT NULL,
  `manager_review_text` text COLLATE utf8mb4_unicode_ci,
  `manager_strengths` text COLLATE utf8mb4_unicode_ci,
  `manager_areas_for_improvement` text COLLATE utf8mb4_unicode_ci,
  `manager_submitted_at` timestamp NULL DEFAULT NULL,
  `overall_rating` decimal(3,2) DEFAULT NULL COMMENT 'Final overall rating',
  `goals_rating` decimal(3,2) DEFAULT NULL COMMENT 'Goals achievement rating',
  `competencies_rating` decimal(3,2) DEFAULT NULL COMMENT 'Competencies rating',
  `values_rating` decimal(3,2) DEFAULT NULL COMMENT 'Company values rating',
  `calibrated_rating` decimal(3,2) DEFAULT NULL COMMENT 'Rating after calibration',
  `calibration_notes` text COLLATE utf8mb4_unicode_ci,
  `promotion_recommended` tinyint(1) DEFAULT '0',
  `salary_increase_recommended` tinyint(1) DEFAULT '0',
  `recommended_increase_percentage` decimal(5,2) DEFAULT NULL,
  `pip_recommended` tinyint(1) DEFAULT '0' COMMENT 'Performance Improvement Plan',
  `employee_acknowledged_at` timestamp NULL DEFAULT NULL,
  `employee_comments` text COLLATE utf8mb4_unicode_ci,
  `reviewer_signed_at` timestamp NULL DEFAULT NULL,
  `approver_id` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `review_date` date DEFAULT NULL,
  `next_review_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_review` (`review_cycle_id`,`employee_id`,`reviewer_id`,`review_type`),
  KEY `approver_id` (`approver_id`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_reviewer` (`reviewer_id`),
  KEY `idx_review_cycle` (`review_cycle_id`),
  KEY `idx_status` (`review_status`),
  KEY `idx_review_date` (`review_date`),
  CONSTRAINT `performance_reviews_ibfk_1` FOREIGN KEY (`review_cycle_id`) REFERENCES `review_cycles` (`id`),
  CONSTRAINT `performance_reviews_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `performance_reviews_ibfk_3` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `performance_reviews_ibfk_4` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_key` varchar(100) NOT NULL,
  `module` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_key` (`permission_key`),
  UNIQUE KEY `unique_module_action` (`module`,`action`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `price_comparison_analysis`;
CREATE TABLE `price_comparison_analysis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `estimation_id` int NOT NULL,
  `analysis_date` date NOT NULL,
  `total_estimated_cost` decimal(15,2) NOT NULL,
  `total_best_quote_cost` decimal(15,2) DEFAULT NULL,
  `total_potential_savings` decimal(15,2) DEFAULT NULL,
  `average_savings_percent` decimal(5,2) DEFAULT NULL,
  `items_with_quotes` int DEFAULT '0',
  `total_items` int NOT NULL,
  `quote_coverage_percent` decimal(5,2) DEFAULT NULL,
  `best_supplier_id` int DEFAULT NULL,
  `analysis_data` json DEFAULT NULL,
  `generated_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_estimation_date` (`estimation_id`,`analysis_date`),
  KEY `idx_estimation` (`estimation_id`),
  KEY `idx_analysis_date` (`analysis_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `production_categories`;
CREATE TABLE `production_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(255) NOT NULL,
  `category_code` varchar(50) DEFAULT NULL,
  `description` text,
  `parent_category_id` int DEFAULT NULL,
  `default_lead_time_days` int DEFAULT '7',
  `default_batch_size` int DEFAULT '1',
  `requires_quality_check` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `production_items`;
CREATE TABLE `production_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `description` text,
  `category_id` int DEFAULT NULL,
  `unit_of_measurement` varchar(20) DEFAULT 'PCS',
  `standard_cost` decimal(15,2) DEFAULT '0.00',
  `standard_time_hours` decimal(8,2) DEFAULT '0.00',
  `batch_size` int DEFAULT '1',
  `minimum_stock_level` decimal(15,3) DEFAULT '0.000',
  `has_bom` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('active','inactive','discontinued') DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_code` (`item_code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `production_machines`;
CREATE TABLE `production_machines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `machine_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `machine_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manufacturer` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manufacturing_unit_id` int DEFAULT NULL,
  `workstation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capacity_per_hour` decimal(10,2) DEFAULT NULL,
  `capacity_unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hourly_rate` decimal(10,2) DEFAULT NULL,
  `last_maintenance_date` date DEFAULT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `maintenance_interval_days` int DEFAULT '90',
  `status` enum('available','in_use','maintenance','breakdown','retired') COLLATE utf8mb4_unicode_ci DEFAULT 'available',
  `specifications` json DEFAULT NULL COMMENT 'Technical specifications',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `machine_code` (`machine_code`),
  KEY `created_by` (`created_by`),
  KEY `idx_status` (`status`),
  KEY `idx_manufacturing_unit` (`manufacturing_unit_id`),
  CONSTRAINT `production_machines_ibfk_1` FOREIGN KEY (`manufacturing_unit_id`) REFERENCES `manufacturing_units` (`id`),
  CONSTRAINT `production_machines_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `production_metrics`;
CREATE TABLE `production_metrics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `metric_date` date NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `operation_id` int DEFAULT NULL,
  `planned_quantity` int DEFAULT NULL,
  `actual_quantity` int DEFAULT NULL,
  `good_quantity` int DEFAULT NULL,
  `rejected_quantity` int DEFAULT NULL,
  `rework_quantity` int DEFAULT NULL,
  `planned_time_hours` decimal(8,2) DEFAULT NULL,
  `actual_time_hours` decimal(8,2) DEFAULT NULL,
  `downtime_hours` decimal(8,2) DEFAULT NULL,
  `efficiency_percentage` decimal(5,2) DEFAULT NULL,
  `quality_percentage` decimal(5,2) DEFAULT NULL,
  `oee_percentage` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_date_workorder_operation` (`metric_date`,`work_order_id`,`operation_id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `operation_id` (`operation_id`),
  KEY `idx_production_metrics_date` (`metric_date`),
  CONSTRAINT `production_metrics_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `production_metrics_ibfk_2` FOREIGN KEY (`operation_id`) REFERENCES `production_operations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `production_oee_records`;
CREATE TABLE `production_oee_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `machine_id` int DEFAULT NULL,
  `manufacturing_unit_id` int DEFAULT NULL,
  `work_order_id` int DEFAULT NULL,
  `record_date` date NOT NULL,
  `shift` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `planned_production_time_minutes` int NOT NULL,
  `actual_runtime_minutes` int NOT NULL,
  `downtime_minutes` int DEFAULT '0',
  `target_quantity` int NOT NULL,
  `actual_quantity` int NOT NULL,
  `good_quantity` int NOT NULL,
  `rejected_quantity` int DEFAULT '0',
  `availability_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Runtime / Planned time',
  `performance_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Actual / Target',
  `quality_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Good / Actual',
  `oee_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Availability Ã— Performance Ã— Quality',
  `oee_rating` enum('poor','fair','good','excellent','world_class') COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS ((case when (`oee_percentage` >= 85) then _latin1'world_class' when (`oee_percentage` >= 75) then _latin1'excellent' when (`oee_percentage` >= 65) then _latin1'good' when (`oee_percentage` >= 50) then _latin1'fair' else _latin1'poor' end)) STORED,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `manufacturing_unit_id` (`manufacturing_unit_id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `idx_record_date` (`record_date`),
  KEY `idx_machine` (`machine_id`),
  KEY `idx_oee_rating` (`oee_rating`),
  CONSTRAINT `production_oee_records_ibfk_1` FOREIGN KEY (`machine_id`) REFERENCES `production_machines` (`id`),
  CONSTRAINT `production_oee_records_ibfk_2` FOREIGN KEY (`manufacturing_unit_id`) REFERENCES `manufacturing_units` (`id`),
  CONSTRAINT `production_oee_records_ibfk_3` FOREIGN KEY (`work_order_id`) REFERENCES `manufacturing_work_orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `production_operations`;
CREATE TABLE `production_operations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `operation_code` varchar(20) NOT NULL,
  `operation_name` varchar(100) NOT NULL,
  `description` text,
  `category_id` int DEFAULT NULL,
  `standard_time_minutes` decimal(8,2) DEFAULT NULL,
  `labor_cost_per_hour` decimal(10,2) DEFAULT NULL,
  `machine_cost_per_hour` decimal(10,2) DEFAULT NULL,
  `overhead_percentage` decimal(5,2) DEFAULT '0.00',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `operation_code` (`operation_code`),
  KEY `created_by` (`created_by`),
  KEY `idx_production_operations_category` (`category_id`),
  CONSTRAINT `production_operations_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `production_categories` (`id`),
  CONSTRAINT `production_operations_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `production_route_operations`;
CREATE TABLE `production_route_operations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_id` int NOT NULL,
  `operation_id` int NOT NULL,
  `sequence_number` int NOT NULL,
  `setup_time_minutes` decimal(8,2) DEFAULT '0.00',
  `cycle_time_minutes` decimal(8,2) NOT NULL,
  `labor_hours` decimal(8,2) DEFAULT '0.00',
  `machine_hours` decimal(8,2) DEFAULT '0.00',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_route_sequence` (`route_id`,`sequence_number`),
  KEY `operation_id` (`operation_id`),
  CONSTRAINT `production_route_operations_ibfk_1` FOREIGN KEY (`route_id`) REFERENCES `production_routes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_route_operations_ibfk_2` FOREIGN KEY (`operation_id`) REFERENCES `production_operations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `production_routes`;
CREATE TABLE `production_routes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_code` varchar(20) NOT NULL,
  `route_name` varchar(100) NOT NULL,
  `product_id` int DEFAULT NULL,
  `version` varchar(10) DEFAULT '1.0',
  `description` text,
  `total_time_minutes` decimal(8,2) DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `status` enum('draft','active','inactive') DEFAULT 'draft',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `route_code` (`route_code`),
  KEY `created_by` (`created_by`),
  KEY `idx_production_routes_product` (`product_id`),
  CONSTRAINT `production_routes_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `production_routes_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `production_schedule`;
CREATE TABLE `production_schedule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `schedule_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `schedule_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `schedule_type` enum('daily','weekly','monthly') COLLATE utf8mb4_unicode_ci DEFAULT 'daily',
  `schedule_date` date NOT NULL,
  `manufacturing_unit_id` int DEFAULT NULL,
  `planned_capacity` decimal(10,2) DEFAULT NULL,
  `allocated_capacity` decimal(10,2) DEFAULT NULL,
  `available_capacity` decimal(10,2) DEFAULT NULL,
  `status` enum('draft','planned','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `actual_output` decimal(10,2) DEFAULT NULL,
  `efficiency_percentage` decimal(5,2) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `schedule_code` (`schedule_code`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_schedule_date` (`schedule_date`),
  KEY `idx_status` (`status`),
  KEY `idx_manufacturing_unit` (`manufacturing_unit_id`),
  CONSTRAINT `production_schedule_ibfk_1` FOREIGN KEY (`manufacturing_unit_id`) REFERENCES `manufacturing_units` (`id`),
  CONSTRAINT `production_schedule_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `production_schedule_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `production_schedule_items`;
CREATE TABLE `production_schedule_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `schedule_id` int NOT NULL,
  `work_order_id` int NOT NULL,
  `sequence_order` int DEFAULT '0',
  `planned_start_time` datetime DEFAULT NULL,
  `planned_end_time` datetime DEFAULT NULL,
  `estimated_duration_minutes` int DEFAULT NULL,
  `actual_start_time` datetime DEFAULT NULL,
  `actual_end_time` datetime DEFAULT NULL,
  `actual_duration_minutes` int DEFAULT NULL,
  `assigned_machine_id` int DEFAULT NULL,
  `assigned_operator_id` int DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `status` enum('scheduled','in_progress','completed','delayed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'scheduled',
  `delay_reason` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `assigned_machine_id` (`assigned_machine_id`),
  KEY `assigned_operator_id` (`assigned_operator_id`),
  KEY `idx_schedule` (`schedule_id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_time_range` (`planned_start_time`,`planned_end_time`),
  KEY `idx_status` (`status`),
  CONSTRAINT `production_schedule_items_ibfk_1` FOREIGN KEY (`schedule_id`) REFERENCES `production_schedule` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_schedule_items_ibfk_2` FOREIGN KEY (`work_order_id`) REFERENCES `manufacturing_work_orders` (`id`),
  CONSTRAINT `production_schedule_items_ibfk_3` FOREIGN KEY (`assigned_machine_id`) REFERENCES `production_machines` (`id`),
  CONSTRAINT `production_schedule_items_ibfk_4` FOREIGN KEY (`assigned_operator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `production_tasks`;
CREATE TABLE `production_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `task_name` varchar(255) NOT NULL,
  `description` text,
  `sequence_number` int DEFAULT '1',
  `estimated_hours` decimal(8,2) DEFAULT '0.00',
  `actual_hours` decimal(8,2) DEFAULT '0.00',
  `assigned_to` int DEFAULT NULL,
  `status` enum('pending','in_progress','completed','on_hold') DEFAULT 'pending',
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `assigned_to` (`assigned_to`),
  CONSTRAINT `production_tasks_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `production_tasks_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `production_waste_records`;
CREATE TABLE `production_waste_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `waste_category_id` int NOT NULL,
  `waste_quantity` decimal(10,2) NOT NULL,
  `waste_unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_cost` decimal(10,2) DEFAULT NULL,
  `labor_cost` decimal(10,2) DEFAULT NULL,
  `overhead_cost` decimal(10,2) DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT NULL,
  `waste_reason` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `root_cause` text COLLATE utf8mb4_unicode_ci,
  `corrective_action` text COLLATE utf8mb4_unicode_ci,
  `responsible_operator_id` int DEFAULT NULL,
  `reported_by` int DEFAULT NULL,
  `disposal_method` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disposed_at` datetime DEFAULT NULL,
  `waste_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `waste_category_id` (`waste_category_id`),
  KEY `responsible_operator_id` (`responsible_operator_id`),
  KEY `reported_by` (`reported_by`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_waste_date` (`waste_date`),
  CONSTRAINT `production_waste_records_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `manufacturing_work_orders` (`id`),
  CONSTRAINT `production_waste_records_ibfk_2` FOREIGN KEY (`waste_category_id`) REFERENCES `waste_categories` (`id`),
  CONSTRAINT `production_waste_records_ibfk_3` FOREIGN KEY (`responsible_operator_id`) REFERENCES `users` (`id`),
  CONSTRAINT `production_waste_records_ibfk_4` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `production_work_orders`;
CREATE TABLE `production_work_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_number` varchar(50) NOT NULL,
  `sales_order_id` int DEFAULT NULL,
  `bom_id` int DEFAULT NULL,
  `product_name` varchar(200) NOT NULL,
  `quantity_to_produce` int NOT NULL,
  `quantity_produced` int DEFAULT '0',
  `quantity_remaining` int GENERATED ALWAYS AS ((`quantity_to_produce` - `quantity_produced`)) STORED,
  `unit` varchar(20) NOT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `scheduled_start_date` date DEFAULT NULL,
  `scheduled_end_date` date DEFAULT NULL,
  `actual_start_date` date DEFAULT NULL,
  `actual_end_date` date DEFAULT NULL,
  `status` enum('planned','released','in_progress','completed','on_hold','cancelled') DEFAULT 'planned',
  `manufacturing_unit_id` int DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `notes` text,
  `total_estimated_cost` decimal(12,2) DEFAULT '0.00',
  `total_actual_cost` decimal(12,2) DEFAULT '0.00',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_order_number` (`work_order_number`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `bom_id` (`bom_id`),
  KEY `manufacturing_unit_id` (`manufacturing_unit_id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `production_work_orders_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `production_work_orders_ibfk_2` FOREIGN KEY (`bom_id`) REFERENCES `bill_of_materials` (`id`),
  CONSTRAINT `production_work_orders_ibfk_3` FOREIGN KEY (`manufacturing_unit_id`) REFERENCES `manufacturing_units` (`id`),
  CONSTRAINT `production_work_orders_ibfk_4` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`),
  CONSTRAINT `production_work_orders_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `description` text,
  `category` varchar(100) DEFAULT NULL,
  `unit` varchar(20) DEFAULT 'nos',
  `mrp` decimal(10,2) DEFAULT '0.00',
  `cost_price` decimal(10,2) DEFAULT '0.00',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `make` varchar(255) DEFAULT NULL,
  `model` varchar(255) DEFAULT NULL,
  `part_code` varchar(100) DEFAULT NULL,
  `product_code` varchar(100) DEFAULT NULL,
  `vendor_discount` decimal(10,2) DEFAULT '0.00',
  `last_price` decimal(10,2) DEFAULT '0.00',
  `last_purchase_price` decimal(10,2) DEFAULT '0.00',
  `last_purchase_date` date DEFAULT NULL,
  `hsn_code` varchar(20) DEFAULT NULL,
  `gst_rate` decimal(5,2) DEFAULT '18.00',
  `serial_number_required` tinyint(1) DEFAULT '0',
  `warranty_period` int DEFAULT '12',
  `warranty_period_type` enum('months','years') DEFAULT 'months',
  `warranty_upto` date DEFAULT NULL,
  `min_stock_level` int DEFAULT '0',
  `max_stock_level` int DEFAULT '100',
  `reorder_level` int DEFAULT '5',
  `is_active` tinyint(1) DEFAULT '1',
  `category_id` int DEFAULT NULL,
  `sub_category_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_products_category` (`category`),
  KEY `idx_products_product_code` (`product_code`),
  KEY `idx_products_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `purchase_order_items`;
CREATE TABLE `purchase_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `po_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) DEFAULT 'Nos',
  `price` decimal(10,2) NOT NULL,
  `tax_percentage` decimal(5,2) DEFAULT '0.00',
  `amount` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `cgst_percentage` decimal(5,2) DEFAULT '0.00',
  `sgst_percentage` decimal(5,2) DEFAULT '0.00',
  `igst_percentage` decimal(5,2) DEFAULT '0.00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `purchase_orders`;
CREATE TABLE `purchase_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `po_id` varchar(50) NOT NULL,
  `po_number` varchar(50) DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `date` date NOT NULL,
  `delivery_date` date DEFAULT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `grand_total` decimal(15,2) DEFAULT '0.00',
  `status` enum('draft','pending','approved','completed','cancelled') DEFAULT 'draft',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `po_date` date DEFAULT NULL,
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `purchase_request_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_id` (`po_id`),
  KEY `purchase_request_id` (`purchase_request_id`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requisitions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `purchase_requisition_items`;
CREATE TABLE `purchase_requisition_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pr_id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `item_name` varchar(255) DEFAULT NULL,
  `description` text,
  `hsn_code` varchar(20) DEFAULT NULL,
  `unit` varchar(20) DEFAULT 'Nos',
  `quantity` decimal(10,2) NOT NULL,
  `estimated_price` decimal(10,2) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `purchase_requisitions`;
CREATE TABLE `purchase_requisitions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pr_number` varchar(50) NOT NULL,
  `quotation_id` int DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `pr_date` date NOT NULL,
  `notes` text,
  `status` enum('draft','pending_approval','approved','rejected','closed') DEFAULT 'draft',
  `case_id` int DEFAULT NULL,
  `estimation_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `rfq_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pr_number` (`pr_number`),
  KEY `idx_rfq_id` (`rfq_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quality_checkpoints`;
CREATE TABLE `quality_checkpoints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `checkpoint_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checkpoint_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checkpoint_type` enum('incoming','in_process','final','pre_delivery') COLLATE utf8mb4_unicode_ci DEFAULT 'in_process',
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_mandatory` tinyint(1) DEFAULT '1',
  `sequence_order` int DEFAULT '0',
  `applicable_categories` json DEFAULT NULL COMMENT 'Product categories this applies to',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `checkpoint_code` (`checkpoint_code`),
  KEY `created_by` (`created_by`),
  KEY `idx_checkpoint_type` (`checkpoint_type`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `quality_checkpoints_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `quality_control_parameters`;
CREATE TABLE `quality_control_parameters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `parameter_name` varchar(100) NOT NULL,
  `parameter_type` enum('numeric','text','pass_fail','selection') NOT NULL,
  `min_value` decimal(10,4) DEFAULT NULL,
  `max_value` decimal(10,4) DEFAULT NULL,
  `target_value` decimal(10,4) DEFAULT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `is_critical` tinyint(1) DEFAULT '0',
  `sequence_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  CONSTRAINT `quality_control_parameters_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `quality_control_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quality_control_standards`;
CREATE TABLE `quality_control_standards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `standard_code` varchar(20) NOT NULL,
  `standard_name` varchar(100) NOT NULL,
  `description` text,
  `test_method` text,
  `acceptance_criteria` text,
  `measurement_unit` varchar(20) DEFAULT NULL,
  `min_value` decimal(10,4) DEFAULT NULL,
  `max_value` decimal(10,4) DEFAULT NULL,
  `target_value` decimal(10,4) DEFAULT NULL,
  `tolerance` decimal(10,4) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `standard_code` (`standard_code`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `quality_control_standards_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quality_control_templates`;
CREATE TABLE `quality_control_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_name` varchar(100) NOT NULL,
  `description` text,
  `category` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `quality_control_templates_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quality_control_tests`;
CREATE TABLE `quality_control_tests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `test_number` varchar(50) NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `operation_id` int DEFAULT NULL,
  `standard_id` int NOT NULL,
  `test_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `tested_by` int DEFAULT NULL,
  `test_result` decimal(10,4) DEFAULT NULL,
  `result_status` enum('pass','fail','conditional') NOT NULL,
  `notes` text,
  `corrective_action` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `test_number` (`test_number`),
  KEY `operation_id` (`operation_id`),
  KEY `standard_id` (`standard_id`),
  KEY `tested_by` (`tested_by`),
  KEY `idx_quality_tests_workorder` (`work_order_id`),
  KEY `idx_quality_tests_date` (`test_date`),
  CONSTRAINT `quality_control_tests_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `quality_control_tests_ibfk_2` FOREIGN KEY (`operation_id`) REFERENCES `production_operations` (`id`),
  CONSTRAINT `quality_control_tests_ibfk_3` FOREIGN KEY (`standard_id`) REFERENCES `quality_control_standards` (`id`),
  CONSTRAINT `quality_control_tests_ibfk_4` FOREIGN KEY (`tested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quality_defect_records`;
CREATE TABLE `quality_defect_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inspection_id` int NOT NULL,
  `defect_type_id` int NOT NULL,
  `defect_count` int DEFAULT '1',
  `severity` enum('critical','major','minor','cosmetic') COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Where defect was found',
  `description` text COLLATE utf8mb4_unicode_ci,
  `root_cause` text COLLATE utf8mb4_unicode_ci,
  `corrective_action` text COLLATE utf8mb4_unicode_ci,
  `responsible_person_id` int DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `cost_impact` decimal(10,2) DEFAULT NULL COMMENT 'Cost of defect',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `defect_type_id` (`defect_type_id`),
  KEY `responsible_person_id` (`responsible_person_id`),
  KEY `idx_inspection` (`inspection_id`),
  KEY `idx_severity` (`severity`),
  CONSTRAINT `quality_defect_records_ibfk_1` FOREIGN KEY (`inspection_id`) REFERENCES `quality_inspections_enhanced` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quality_defect_records_ibfk_2` FOREIGN KEY (`defect_type_id`) REFERENCES `quality_defect_types` (`id`),
  CONSTRAINT `quality_defect_records_ibfk_3` FOREIGN KEY (`responsible_person_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `quality_defect_types`;
CREATE TABLE `quality_defect_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `defect_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `defect_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('critical','major','minor','cosmetic') COLLATE utf8mb4_unicode_ci DEFAULT 'minor',
  `description` text COLLATE utf8mb4_unicode_ci,
  `root_cause_category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Material, Process, Equipment, Human',
  `corrective_action_required` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `defect_code` (`defect_code`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `quality_inspection_results`;
CREATE TABLE `quality_inspection_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inspection_id` int NOT NULL,
  `parameter_id` int NOT NULL,
  `measured_value` decimal(10,4) DEFAULT NULL,
  `text_value` text,
  `pass_fail_result` enum('pass','fail') DEFAULT NULL,
  `selection_value` varchar(100) DEFAULT NULL,
  `is_within_limits` tinyint(1) DEFAULT '1',
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `inspection_id` (`inspection_id`),
  KEY `parameter_id` (`parameter_id`),
  CONSTRAINT `quality_inspection_results_ibfk_1` FOREIGN KEY (`inspection_id`) REFERENCES `quality_inspections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quality_inspection_results_ibfk_2` FOREIGN KEY (`parameter_id`) REFERENCES `quality_control_parameters` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quality_inspections`;
CREATE TABLE `quality_inspections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inspection_number` varchar(50) NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `template_id` int NOT NULL,
  `inspection_type` enum('incoming','in_process','final','outgoing') NOT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `quantity_inspected` decimal(10,4) DEFAULT NULL,
  `quantity_passed` decimal(10,4) DEFAULT '0.0000',
  `quantity_failed` decimal(10,4) DEFAULT '0.0000',
  `overall_result` enum('pass','fail','conditional_pass') DEFAULT 'pass',
  `inspector_id` int DEFAULT NULL,
  `inspection_date` datetime NOT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inspection_number` (`inspection_number`),
  KEY `work_order_id` (`work_order_id`),
  KEY `template_id` (`template_id`),
  KEY `inspector_id` (`inspector_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `quality_inspections_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `production_work_orders` (`id`),
  CONSTRAINT `quality_inspections_ibfk_2` FOREIGN KEY (`template_id`) REFERENCES `quality_control_templates` (`id`),
  CONSTRAINT `quality_inspections_ibfk_3` FOREIGN KEY (`inspector_id`) REFERENCES `users` (`id`),
  CONSTRAINT `quality_inspections_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quality_inspections_enhanced`;
CREATE TABLE `quality_inspections_enhanced` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inspection_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `manufacturing_case_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `checkpoint_id` int DEFAULT NULL,
  `batch_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lot_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inspection_type` enum('incoming','in_process','final','pre_delivery','audit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `inspection_date` datetime NOT NULL,
  `inspector_id` int NOT NULL,
  `sample_size` int NOT NULL,
  `quantity_inspected` int NOT NULL,
  `quantity_accepted` int DEFAULT '0',
  `quantity_rejected` int DEFAULT '0',
  `quantity_rework` int DEFAULT '0',
  `overall_result` enum('passed','failed','conditional','pending') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `conformance_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Percentage of checks passed',
  `inspection_criteria` json DEFAULT NULL COMMENT 'Criteria and measurements',
  `defects_found` json DEFAULT NULL COMMENT 'Array of defects with details',
  `measurements` json DEFAULT NULL COMMENT 'Dimensional and other measurements',
  `observations` text COLLATE utf8mb4_unicode_ci,
  `inspector_notes` text COLLATE utf8mb4_unicode_ci,
  `action_required` enum('none','rework','scrap','hold','return_to_supplier') COLLATE utf8mb4_unicode_ci DEFAULT 'none',
  `corrective_action` text COLLATE utf8mb4_unicode_ci,
  `preventive_action` text COLLATE utf8mb4_unicode_ci,
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `status` enum('draft','submitted','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `attachments` json DEFAULT NULL COMMENT 'Photos, documents, test reports',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inspection_number` (`inspection_number`),
  KEY `manufacturing_case_id` (`manufacturing_case_id`),
  KEY `product_id` (`product_id`),
  KEY `checkpoint_id` (`checkpoint_id`),
  KEY `inspector_id` (`inspector_id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_inspection_type` (`inspection_type`),
  KEY `idx_inspection_date` (`inspection_date`),
  KEY `idx_overall_result` (`overall_result`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `quality_inspections_enhanced_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `manufacturing_work_orders` (`id`),
  CONSTRAINT `quality_inspections_enhanced_ibfk_2` FOREIGN KEY (`manufacturing_case_id`) REFERENCES `manufacturing_cases` (`id`),
  CONSTRAINT `quality_inspections_enhanced_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `quality_inspections_enhanced_ibfk_4` FOREIGN KEY (`checkpoint_id`) REFERENCES `quality_checkpoints` (`id`),
  CONSTRAINT `quality_inspections_enhanced_ibfk_5` FOREIGN KEY (`inspector_id`) REFERENCES `users` (`id`),
  CONSTRAINT `quality_inspections_enhanced_ibfk_6` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `quotation_items`;
CREATE TABLE `quotation_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_id` int NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `description` text,
  `hsn_code` varchar(20) DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) DEFAULT 'Nos',
  `rate` decimal(10,2) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `cgst_percentage` decimal(5,2) DEFAULT '0.00',
  `sgst_percentage` decimal(5,2) DEFAULT '0.00',
  `igst_percentage` decimal(5,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `quotations`;
CREATE TABLE `quotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_id` varchar(50) NOT NULL,
  `estimation_id` int NOT NULL,
  `case_id` int DEFAULT NULL,
  `date` date NOT NULL,
  `valid_until` date DEFAULT NULL,
  `terms_conditions` text,
  `delivery_terms` text,
  `payment_terms` text,
  `warranty_terms` text,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `total_tax` decimal(15,2) DEFAULT '0.00',
  `final_amount` decimal(15,2) DEFAULT '0.00',
  `grand_total` decimal(15,2) DEFAULT '0.00',
  `status` enum('draft','sent','approved','rejected','revised','accepted') DEFAULT 'draft',
  `created_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quotation_id` (`quotation_id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_quotations_estimation` (`estimation_id`),
  KEY `idx_quotations_case` (`case_id`),
  KEY `idx_quotations_status` (`status`),
  KEY `idx_quotations_created_by` (`created_by`),
  CONSTRAINT `quotations_ibfk_1` FOREIGN KEY (`estimation_id`) REFERENCES `estimations` (`id`),
  CONSTRAINT `quotations_ibfk_2` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`),
  CONSTRAINT `quotations_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `quotations_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `rating_scales`;
CREATE TABLE `rating_scales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `scale_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scale_type` enum('numeric','descriptive','grade') COLLATE utf8mb4_unicode_ci DEFAULT 'numeric',
  `min_value` decimal(3,2) NOT NULL,
  `max_value` decimal(3,2) NOT NULL,
  `scale_labels` json DEFAULT NULL COMMENT 'Array of {value, label, description}',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scale_name` (`scale_name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `reimbursement_requests`;
CREATE TABLE `reimbursement_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `reimbursement_type` enum('travel','medical','food','telephone','internet','fuel','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `bill_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bill_date` date DEFAULT NULL,
  `bill_attachment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected','paid') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `approval_remarks` text COLLATE utf8mb4_unicode_ci,
  `payroll_transaction_id` int DEFAULT NULL COMMENT 'Linked when paid via payroll',
  `paid_on` date DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `approved_by` (`approved_by`),
  KEY `payroll_transaction_id` (`payroll_transaction_id`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_status` (`status`),
  KEY `idx_request_date` (`request_date`),
  CONSTRAINT `reimbursement_requests_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reimbursement_requests_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `reimbursement_requests_ibfk_3` FOREIGN KEY (`payroll_transaction_id`) REFERENCES `payroll_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `report_definitions`;
CREATE TABLE `report_definitions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_name` varchar(100) NOT NULL,
  `report_type` enum('tabular','chart','dashboard') DEFAULT 'tabular',
  `query_template` text,
  `parameters` json DEFAULT NULL,
  `access_roles` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `report_definitions_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `review_competency_ratings`;
CREATE TABLE `review_competency_ratings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `performance_review_id` int NOT NULL,
  `competency_id` int NOT NULL,
  `self_rating` decimal(3,2) DEFAULT NULL,
  `manager_rating` decimal(3,2) DEFAULT NULL,
  `peer_rating_avg` decimal(3,2) DEFAULT NULL COMMENT 'Average rating from peers',
  `final_rating` decimal(3,2) DEFAULT NULL,
  `self_comments` text COLLATE utf8mb4_unicode_ci,
  `manager_comments` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_competency_rating` (`performance_review_id`,`competency_id`),
  KEY `idx_review` (`performance_review_id`),
  KEY `idx_competency` (`competency_id`),
  CONSTRAINT `review_competency_ratings_ibfk_1` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `review_competency_ratings_ibfk_2` FOREIGN KEY (`competency_id`) REFERENCES `competencies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `review_cycles`;
CREATE TABLE `review_cycles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cycle_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cycle_type` enum('annual','semi_annual','quarterly','probation','project') COLLATE utf8mb4_unicode_ci DEFAULT 'annual',
  `review_period_start` date NOT NULL,
  `review_period_end` date NOT NULL,
  `self_review_deadline` date DEFAULT NULL,
  `manager_review_deadline` date DEFAULT NULL,
  `peer_feedback_deadline` date DEFAULT NULL,
  `final_review_deadline` date DEFAULT NULL,
  `status` enum('draft','open','in_progress','completed','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `instructions` text COLLATE utf8mb4_unicode_ci COMMENT 'Instructions for reviewers',
  `rating_scale_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `rating_scale_id` (`rating_scale_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_cycle_type` (`cycle_type`),
  KEY `idx_status` (`status`),
  KEY `idx_review_period` (`review_period_start`,`review_period_end`),
  CONSTRAINT `review_cycles_ibfk_1` FOREIGN KEY (`rating_scale_id`) REFERENCES `rating_scales` (`id`),
  CONSTRAINT `review_cycles_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `review_feedback`;
CREATE TABLE `review_feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `performance_review_id` int NOT NULL,
  `feedback_provider_id` int NOT NULL,
  `provider_relationship` enum('manager','peer','direct_report','customer','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_anonymous` tinyint(1) DEFAULT '0',
  `strengths` text COLLATE utf8mb4_unicode_ci,
  `areas_for_improvement` text COLLATE utf8mb4_unicode_ci,
  `specific_examples` text COLLATE utf8mb4_unicode_ci,
  `additional_comments` text COLLATE utf8mb4_unicode_ci,
  `overall_rating` decimal(3,2) DEFAULT NULL,
  `status` enum('pending','submitted','reviewed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `submitted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_review` (`performance_review_id`),
  KEY `idx_provider` (`feedback_provider_id`),
  KEY `idx_relationship` (`provider_relationship`),
  KEY `idx_status` (`status`),
  CONSTRAINT `review_feedback_ibfk_1` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `review_feedback_ibfk_2` FOREIGN KEY (`feedback_provider_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `review_goal_assessments`;
CREATE TABLE `review_goal_assessments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `performance_review_id` int NOT NULL,
  `goal_id` int NOT NULL,
  `achievement_rating` decimal(3,2) DEFAULT NULL COMMENT 'Rating for this specific goal',
  `achievement_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Percentage of goal achieved',
  `self_assessment_text` text COLLATE utf8mb4_unicode_ci,
  `manager_assessment_text` text COLLATE utf8mb4_unicode_ci,
  `comments` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_goal_assessment` (`performance_review_id`,`goal_id`),
  KEY `idx_review` (`performance_review_id`),
  KEY `idx_goal` (`goal_id`),
  CONSTRAINT `review_goal_assessments_ibfk_1` FOREIGN KEY (`performance_review_id`) REFERENCES `performance_reviews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `review_goal_assessments_ibfk_2` FOREIGN KEY (`goal_id`) REFERENCES `goals` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `rfq_campaigns`;
CREATE TABLE `rfq_campaigns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfq_number` varchar(50) NOT NULL,
  `quotation_id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `deadline` date NOT NULL,
  `terms` text,
  `status` enum('draft','sent','bidding','evaluation','completed','cancelled') DEFAULT 'draft',
  `winner_supplier_id` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfq_number` (`rfq_number`),
  KEY `idx_quotation_id` (`quotation_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `rfq_suppliers`;
CREATE TABLE `rfq_suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfq_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `status` enum('sent','viewed','responded','declined') DEFAULT 'sent',
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `viewed_at` timestamp NULL DEFAULT NULL,
  `responded_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rfq_supplier` (`rfq_id`,`supplier_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  CONSTRAINT `rfq_suppliers_ibfk_1` FOREIGN KEY (`rfq_id`) REFERENCES `rfq_campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `role_change_history`;
CREATE TABLE `role_change_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `change_type` enum('role_assigned','role_revoked','group_joined','group_left','permission_granted','permission_revoked') NOT NULL,
  `old_value` json DEFAULT NULL,
  `new_value` json DEFAULT NULL,
  `changed_by` int DEFAULT NULL,
  `change_reason` text,
  `approval_required` tinyint(1) DEFAULT '0',
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `changed_by` (`changed_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_history_employee` (`employee_id`),
  KEY `idx_history_type` (`change_type`),
  KEY `idx_history_date` (`created_at`),
  CONSTRAINT `fk_rch_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `granted_by` int DEFAULT NULL,
  `granted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_revokable` tinyint(1) DEFAULT '1',
  `conditions` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `description` text,
  `is_system_role` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `salary_components`;
CREATE TABLE `salary_components` (
  `id` int NOT NULL AUTO_INCREMENT,
  `component_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `component_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `component_type` enum('earning','deduction','reimbursement') COLLATE utf8mb4_unicode_ci NOT NULL,
  `calculation_type` enum('fixed','percentage','formula') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed',
  `percentage_of` int DEFAULT NULL COMMENT 'Component ID if percentage-based',
  `formula` text COLLATE utf8mb4_unicode_ci COMMENT 'Formula for calculation',
  `is_taxable` tinyint(1) DEFAULT '1',
  `is_statutory` tinyint(1) DEFAULT '0' COMMENT 'PF, ESI, PT, TDS',
  `affects_ctc` tinyint(1) DEFAULT '1',
  `affects_gross` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `component_code` (`component_code`),
  KEY `idx_component_code` (`component_code`),
  KEY `idx_component_type` (`component_type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `salary_revisions`;
CREATE TABLE `salary_revisions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `revision_type` enum('increment','promotion','correction','adjustment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `effective_date` date NOT NULL,
  `old_ctc` decimal(12,2) NOT NULL,
  `new_ctc` decimal(12,2) NOT NULL,
  `increment_amount` decimal(12,2) NOT NULL,
  `increment_percentage` decimal(5,2) NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `approved_by` (`approved_by`),
  KEY `created_by` (`created_by`),
  KEY `idx_employee` (`employee_id`),
  KEY `idx_effective_date` (`effective_date`),
  CONSTRAINT `salary_revisions_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `salary_revisions_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `salary_revisions_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sales_enquiries`;
CREATE TABLE `sales_enquiries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enquiry_id` varchar(50) NOT NULL,
  `client_id` int DEFAULT NULL,
  `case_id` int DEFAULT NULL,
  `project_name` varchar(255) NOT NULL,
  `description` text,
  `date` date NOT NULL,
  `enquiry_by` int NOT NULL,
  `status` enum('new','assigned','estimation','quotation','approved','rejected','completed') DEFAULT 'new',
  `assigned_to` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `enquiry_id` (`enquiry_id`),
  KEY `assigned_to` (`assigned_to`),
  KEY `case_id` (`case_id`),
  KEY `idx_sales_enquiries_enquiry_id` (`enquiry_id`),
  KEY `idx_sales_enquiries_client_id` (`client_id`),
  KEY `idx_sales_enquiries_status` (`status`),
  KEY `idx_sales_enquiries_date` (`date`),
  KEY `idx_sales_enquiries_enquiry_by` (`enquiry_by`),
  CONSTRAINT `sales_enquiries_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  CONSTRAINT `sales_enquiries_ibfk_2` FOREIGN KEY (`enquiry_by`) REFERENCES `users` (`id`),
  CONSTRAINT `sales_enquiries_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`),
  CONSTRAINT `sales_enquiries_ibfk_4` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `sales_order_items`;
CREATE TABLE `sales_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_order_id` int NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `description` text,
  `hsn_code` varchar(20) DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) DEFAULT 'Nos',
  `rate` decimal(10,2) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `cgst_percentage` decimal(5,2) DEFAULT '0.00',
  `sgst_percentage` decimal(5,2) DEFAULT '0.00',
  `igst_percentage` decimal(5,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `sales_orders`;
CREATE TABLE `sales_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_order_id` varchar(50) NOT NULL,
  `quotation_id` int DEFAULT NULL,
  `case_id` int DEFAULT NULL,
  `order_date` date NOT NULL,
  `delivery_date` date DEFAULT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `client_id` int NOT NULL,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `advance_amount` decimal(15,2) DEFAULT '0.00',
  `balance_amount` decimal(15,2) DEFAULT '0.00',
  `status` enum('pending','confirmed','in_production','ready','delivered','cancelled') DEFAULT 'pending',
  `terms_conditions` text,
  `delivery_terms` text,
  `payment_terms` text,
  `created_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `grand_total` decimal(15,2) DEFAULT '0.00',
  `customer_po_number` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_order_id` (`sales_order_id`),
  KEY `created_by` (`created_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_sales_orders_quotation` (`quotation_id`),
  KEY `idx_sales_orders_case` (`case_id`),
  KEY `idx_sales_orders_client` (`client_id`),
  KEY `idx_sales_orders_status` (`status`),
  CONSTRAINT `sales_orders_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`),
  CONSTRAINT `sales_orders_ibfk_2` FOREIGN KEY (`case_id`) REFERENCES `cases` (`id`),
  CONSTRAINT `sales_orders_ibfk_3` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  CONSTRAINT `sales_orders_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `sales_orders_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `statutory_settings`;
CREATE TABLE `statutory_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_type` enum('pf','esi','pt','tds','gratuity','bonus') COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_setting` (`setting_type`,`setting_key`,`effective_from`),
  KEY `idx_setting_type` (`setting_type`),
  KEY `idx_effective_dates` (`effective_from`,`effective_to`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `stock`;
CREATE TABLE `stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `location_id` int NOT NULL DEFAULT '1',
  `quantity` decimal(15,3) DEFAULT '0.000',
  `reserved_quantity` decimal(15,3) DEFAULT '0.000',
  `available_quantity` decimal(15,3) GENERATED ALWAYS AS ((`quantity` - `reserved_quantity`)) STORED,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_location` (`product_id`,`location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `stock_movements`;
CREATE TABLE `stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `from_location_id` int DEFAULT NULL,
  `to_location_id` int DEFAULT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `movement_type` enum('in','out','transfer','adjustment') NOT NULL,
  `reference_type` varchar(50) NOT NULL,
  `reference_id` varchar(100) NOT NULL,
  `movement_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `total_value` decimal(12,2) GENERATED ALWAYS AS ((`quantity` * ifnull(`unit_cost`,0))) STORED,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `from_location_id` (`from_location_id`),
  KEY `to_location_id` (`to_location_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_product_date` (`product_id`,`movement_date`),
  KEY `idx_reference` (`reference_type`,`reference_id`),
  KEY `idx_movement_type` (`movement_type`),
  KEY `idx_created_date` (`created_at`),
  KEY `idx_stock_movements_product_id` (`product_id`),
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`from_location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `stock_movements_ibfk_3` FOREIGN KEY (`to_location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `stock_movements_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `supplier_bid_items`;
CREATE TABLE `supplier_bid_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bid_id` int NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` decimal(10,3) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(15,2) NOT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `idx_bid_id` (`bid_id`),
  CONSTRAINT `supplier_bid_items_ibfk_1` FOREIGN KEY (`bid_id`) REFERENCES `supplier_bids` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `supplier_bids`;
CREATE TABLE `supplier_bids` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfq_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `total_price` decimal(15,2) NOT NULL,
  `delivery_days` int NOT NULL,
  `payment_terms` varchar(255) DEFAULT NULL,
  `notes` text,
  `status` enum('draft','submitted','under_review','won','lost') DEFAULT 'draft',
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `selected_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rfq_supplier_bid` (`rfq_id`,`supplier_id`),
  KEY `idx_rfq_id` (`rfq_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_total_price` (`total_price`),
  CONSTRAINT `supplier_bids_ibfk_1` FOREIGN KEY (`rfq_id`) REFERENCES `rfq_campaigns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `supplier_quote_items`;
CREATE TABLE `supplier_quote_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quote_id` int NOT NULL,
  `request_item_id` int NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `item_description` text,
  `quantity` decimal(10,3) NOT NULL,
  `unit` varchar(20) NOT NULL DEFAULT 'NOS',
  `unit_price` decimal(15,2) NOT NULL,
  `total_price` decimal(15,2) NOT NULL,
  `tax_rate` decimal(5,2) DEFAULT '0.00',
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  `final_price` decimal(15,2) NOT NULL,
  `specifications` json DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `model_number` varchar(100) DEFAULT NULL,
  `part_number` varchar(100) DEFAULT NULL,
  `delivery_days` int DEFAULT NULL,
  `warranty_months` int DEFAULT '12',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quote` (`quote_id`),
  KEY `idx_request_item` (`request_item_id`),
  KEY `idx_unit_price` (`unit_price`),
  CONSTRAINT `supplier_quote_items_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `supplier_quotes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supplier_quote_items_ibfk_2` FOREIGN KEY (`request_item_id`) REFERENCES `supplier_quote_request_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `supplier_quote_request_items`;
CREATE TABLE `supplier_quote_request_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `estimation_item_id` int NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `item_description` text,
  `quantity` decimal(10,3) NOT NULL,
  `unit` varchar(20) NOT NULL DEFAULT 'NOS',
  `specifications` json DEFAULT NULL,
  `estimated_price` decimal(15,2) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_request` (`request_id`),
  KEY `idx_estimation_item` (`estimation_item_id`),
  CONSTRAINT `supplier_quote_request_items_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `supplier_quote_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `supplier_quote_requests`;
CREATE TABLE `supplier_quote_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_number` varchar(50) NOT NULL,
  `estimation_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `requested_by` int NOT NULL,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date` date NOT NULL,
  `status` enum('draft','sent','responded','expired','cancelled') DEFAULT 'draft',
  `notes` text,
  `terms_conditions` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_number` (`request_number`),
  KEY `idx_estimation` (`estimation_id`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_due_date` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `supplier_quotes`;
CREATE TABLE `supplier_quotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quote_number` varchar(50) NOT NULL,
  `request_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `quote_date` date NOT NULL,
  `valid_until` date NOT NULL,
  `currency` varchar(3) DEFAULT 'INR',
  `subtotal` decimal(15,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` enum('draft','submitted','under_review','approved','rejected','expired') DEFAULT 'draft',
  `payment_terms` varchar(255) DEFAULT NULL,
  `delivery_terms` varchar(255) DEFAULT NULL,
  `warranty_terms` varchar(255) DEFAULT NULL,
  `notes` text,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `review_comments` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quote_number` (`quote_number`),
  KEY `idx_request` (`request_id`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_valid_until` (`valid_until`),
  KEY `idx_quote_date` (`quote_date`),
  CONSTRAINT `supplier_quotes_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `supplier_quote_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplier_name` varchar(255) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(20) DEFAULT NULL,
  `gstin` varchar(20) DEFAULT NULL,
  `pan_number` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `code` varchar(50) DEFAULT NULL,
  `pan` varchar(20) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `credit_limit` decimal(15,2) DEFAULT '0.00',
  `rating` enum('excellent','good','fair','poor') DEFAULT 'good',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL,
  `config_value` text,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_modules`;
CREATE TABLE `system_modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_code` varchar(50) NOT NULL,
  `module_name` varchar(255) NOT NULL,
  `description` text,
  `parent_module_id` int DEFAULT NULL,
  `module_order` int DEFAULT '0',
  `icon` varchar(100) DEFAULT NULL,
  `route_path` varchar(255) DEFAULT NULL,
  `is_menu_item` tinyint(1) DEFAULT '1',
  `status` enum('active','inactive','deprecated') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `module_code` (`module_code`),
  KEY `idx_module_parent` (`parent_module_id`),
  KEY `idx_module_order` (`module_order`),
  CONSTRAINT `system_modules_ibfk_1` FOREIGN KEY (`parent_module_id`) REFERENCES `system_modules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_permissions`;
CREATE TABLE `system_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_code` varchar(100) NOT NULL,
  `permission_name` varchar(255) NOT NULL,
  `description` text,
  `module_id` int NOT NULL,
  `action_type` enum('create','read','update','delete','execute','approve','export','import') NOT NULL,
  `resource_type` varchar(100) DEFAULT NULL,
  `scope_level` enum('global','department','team','own') DEFAULT 'global',
  `is_critical` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_code` (`permission_code`),
  KEY `idx_perm_module` (`module_id`),
  KEY `idx_perm_action` (`action_type`),
  KEY `idx_perm_resource` (`resource_type`),
  CONSTRAINT `system_permissions_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `system_modules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `setting_type` enum('string','number','boolean','json') DEFAULT 'string',
  `description` text,
  `is_editable` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tax_config`;
CREATE TABLE `tax_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `state_name` varchar(100) NOT NULL,
  `state_code` varchar(10) NOT NULL,
  `gst_rate` decimal(5,2) DEFAULT '18.00',
  `cgst_rate` decimal(5,2) DEFAULT '9.00',
  `sgst_rate` decimal(5,2) DEFAULT '9.00',
  `igst_rate` decimal(5,2) DEFAULT '18.00',
  `is_home_state` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_state_code` (`state_code`),
  KEY `idx_state_name` (`state_name`),
  KEY `idx_home_state` (`is_home_state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ticket_assignments`;
CREATE TABLE `ticket_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `assigned_to` int NOT NULL,
  `assigned_by` int NOT NULL,
  `assignment_reason` text COLLATE utf8mb4_unicode_ci,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `unassigned_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_ticket_assignments_ticket` (`ticket_id`),
  KEY `idx_ticket_assignments_assigned_to` (`assigned_to`),
  KEY `idx_ticket_assignments_active` (`is_active`),
  CONSTRAINT `ticket_assignments_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ticket_attachments`;
CREATE TABLE `ticket_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_attachments_ticket` (`ticket_id`),
  CONSTRAINT `ticket_attachments_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ticket_notes`;
CREATE TABLE `ticket_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `note_type` enum('general','internal','customer','system') COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_internal` tinyint(1) DEFAULT '0' COMMENT 'Internal notes not visible to customer',
  `is_system_generated` tinyint(1) DEFAULT '0',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_notes_ticket` (`ticket_id`),
  KEY `idx_ticket_notes_created_by` (`created_by`),
  KEY `idx_ticket_notes_created_at` (`created_at`),
  KEY `idx_ticket_notes_type` (`note_type`),
  CONSTRAINT `ticket_notes_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ticket_parts`;
CREATE TABLE `ticket_parts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `product_id` int NOT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `unit_cost` decimal(12,2) DEFAULT NULL,
  `total_cost` decimal(12,2) DEFAULT NULL,
  `is_warranty_covered` tinyint(1) DEFAULT '0',
  `warranty_claim_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `installed_date` timestamp NULL DEFAULT NULL,
  `installed_by` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_parts_ticket` (`ticket_id`),
  KEY `idx_ticket_parts_product` (`product_id`),
  KEY `idx_ticket_parts_serial` (`serial_number`),
  CONSTRAINT `ticket_parts_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ticket_queues`;
CREATE TABLE `ticket_queues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `queue_type` enum('support','diagnosis','resolution','closure') COLLATE utf8mb4_unicode_ci DEFAULT 'support',
  `location_id` int DEFAULT NULL,
  `default_assignee_id` int DEFAULT NULL,
  `sla_hours` int DEFAULT '24',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_ticket_queues_location` (`location_id`),
  KEY `idx_ticket_queues_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ticket_status_history`;
CREATE TABLE `ticket_status_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `from_status` enum('open','in_progress','waiting_parts','waiting_customer','resolved','closed') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_status` enum('open','in_progress','waiting_parts','waiting_customer','resolved','closed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` int NOT NULL,
  `change_reason` text COLLATE utf8mb4_unicode_ci,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_status_history_ticket` (`ticket_id`),
  KEY `idx_ticket_status_history_changed_at` (`changed_at`),
  CONSTRAINT `ticket_status_history_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `tickets`;
CREATE TABLE `tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Format: VESPL/TK/2526/XXX',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `customer_id` int NOT NULL,
  `contact_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `warranty_status` enum('active','expired','claimed','void') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `vendor_warranty_expiry` date DEFAULT NULL,
  `customer_warranty_expiry` date DEFAULT NULL,
  `queue_id` int DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `assigned_location_id` int DEFAULT NULL,
  `status` enum('open','in_progress','waiting_parts','waiting_customer','resolved','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'installation, repair, maintenance, warranty',
  `issue_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'email, call, whatsapp, direct',
  `resolution_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'repair, replacement, refund, no_action',
  `labor_hours` decimal(5,2) DEFAULT NULL,
  `parts_cost` decimal(12,2) DEFAULT '0.00',
  `labor_cost` decimal(12,2) DEFAULT '0.00',
  `total_cost` decimal(12,2) DEFAULT '0.00',
  `is_warranty_claim` tinyint(1) DEFAULT '0',
  `warranty_claim_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warranty_approved` tinyint(1) DEFAULT NULL,
  `warranty_approval_date` date DEFAULT NULL,
  `linked_case_id` int DEFAULT NULL COMMENT 'Link to original sales case if applicable',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `resolution_summary` text COLLATE utf8mb4_unicode_ci,
  `customer_satisfaction` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_number` (`ticket_number`),
  KEY `idx_tickets_number` (`ticket_number`),
  KEY `idx_tickets_customer` (`customer_id`),
  KEY `idx_tickets_product` (`product_id`),
  KEY `idx_tickets_serial` (`serial_number`),
  KEY `idx_tickets_assigned_to` (`assigned_to`),
  KEY `idx_tickets_queue` (`queue_id`),
  KEY `idx_tickets_status` (`status`),
  KEY `idx_tickets_priority` (`priority`),
  KEY `idx_tickets_warranty_status` (`warranty_status`),
  KEY `idx_tickets_created_by` (`created_by`),
  KEY `idx_tickets_created_at` (`created_at`),
  KEY `idx_tickets_linked_case` (`linked_case_id`),
  CONSTRAINT `tickets_chk_1` CHECK (((`customer_satisfaction` >= 1) and (`customer_satisfaction` <= 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `trusted_devices`;
CREATE TABLE `trusted_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `device_fingerprint` varchar(255) NOT NULL,
  `device_name` varchar(100) DEFAULT NULL,
  `device_type` enum('mobile','desktop','tablet') DEFAULT 'desktop',
  `browser_info` varchar(255) DEFAULT NULL,
  `first_seen` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_used` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_trusted` tinyint(1) DEFAULT '0',
  `trust_expiry` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_device` (`employee_id`,`device_fingerprint`),
  CONSTRAINT `trusted_devices_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_group_members`;
CREATE TABLE `user_group_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `group_id` int NOT NULL,
  `role_in_group` enum('member','leader','admin') DEFAULT 'member',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_group` (`user_id`,`group_id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `user_group_members_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_group_members_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `user_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_groups`;
CREATE TABLE `user_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_code` varchar(50) NOT NULL,
  `group_name` varchar(255) NOT NULL,
  `description` text,
  `group_type` enum('department','project_team','functional_team','committee','temporary') DEFAULT 'functional_team',
  `parent_group_id` int DEFAULT NULL,
  `owner_user_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `max_members` int DEFAULT NULL,
  `auto_approval` tinyint(1) DEFAULT '0',
  `is_public` tinyint(1) DEFAULT '0',
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `status` enum('active','inactive','dissolved') DEFAULT 'active',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_code` (`group_code`),
  KEY `parent_group_id` (`parent_group_id`),
  KEY `idx_group_type` (`group_type`),
  KEY `idx_group_dept` (`department_id`),
  KEY `idx_group_owner` (`owner_user_id`),
  CONSTRAINT `fk_user_groups_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `user_groups_ibfk_1` FOREIGN KEY (`parent_group_id`) REFERENCES `user_groups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_notifications`;
CREATE TABLE `user_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text,
  `notification_type` enum('info','warning','error','success') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT '0',
  `action_url` varchar(500) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE `user_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_code` varchar(50) NOT NULL,
  `role_name` varchar(255) NOT NULL,
  `description` text,
  `role_type` enum('system','functional','positional','project') DEFAULT 'functional',
  `hierarchy_level` int DEFAULT '1',
  `is_assignable` tinyint(1) DEFAULT '1',
  `max_users` int DEFAULT NULL,
  `approval_required` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive','deprecated') DEFAULT 'active',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_code` (`role_code`),
  KEY `idx_role_type` (`role_type`),
  KEY `idx_role_level` (`hierarchy_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `user_role` enum('director','admin','sales-admin','designer','accounts','technician') NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `employee_id` varchar(20) DEFAULT NULL COMMENT 'Employee ID',
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `employee_type` enum('full_time','part_time','contract','intern','consultant') DEFAULT 'full_time',
  `basic_salary` decimal(12,2) DEFAULT NULL,
  `work_location_id` int DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` datetime DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `employee_id` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `vendor_discount_matrix`;
CREATE TABLE `vendor_discount_matrix` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `min_quantity` decimal(10,2) NOT NULL,
  `max_quantity` decimal(10,2) DEFAULT NULL,
  `discount_percentage` decimal(5,2) NOT NULL,
  `effective_date` date NOT NULL,
  `valid_until` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `idx_product_supplier_qty` (`product_id`,`supplier_id`,`min_quantity`),
  CONSTRAINT `vendor_discount_matrix_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `vendor_discount_matrix_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `vendor_price_history`;
CREATE TABLE `vendor_price_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `discount_percentage` decimal(5,2) DEFAULT '0.00',
  `effective_date` date NOT NULL,
  `valid_until` date DEFAULT NULL,
  `currency` varchar(3) DEFAULT 'INR',
  `minimum_quantity` decimal(10,2) DEFAULT '1.00',
  `lead_time_days` int DEFAULT '7',
  `payment_terms` varchar(255) DEFAULT NULL,
  `delivery_terms` varchar(255) DEFAULT NULL,
  `warranty_terms` varchar(255) DEFAULT NULL,
  `notes` text,
  `source` enum('quotation','purchase_order','invoice','manual') DEFAULT 'quotation',
  `status` enum('active','expired','superseded') DEFAULT 'active',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_product_supplier` (`product_id`,`supplier_id`),
  KEY `idx_effective_date` (`effective_date`),
  KEY `idx_status` (`status`),
  CONSTRAINT `vendor_price_history_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `vendor_price_history_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `vendor_price_history_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `vendor_prices`;
CREATE TABLE `vendor_prices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int DEFAULT NULL,
  `vendor_id` int DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `waste_categories`;
CREATE TABLE `waste_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `waste_type` enum('material','time','energy','defect','overproduction') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_code` (`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `work_locations`;
CREATE TABLE `work_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `location_code` varchar(20) NOT NULL,
  `location_name` varchar(255) NOT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'India',
  `pincode` varchar(20) DEFAULT NULL,
  `timezone` varchar(50) DEFAULT 'Asia/Kolkata',
  `is_headquarters` tinyint(1) DEFAULT '0',
  `max_capacity` int DEFAULT '100',
  `facilities` text,
  `status` enum('active','inactive','under_construction') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `location_code` (`location_code`),
  KEY `idx_location_city` (`city`),
  KEY `idx_location_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `work_order_operation_tracking`;
CREATE TABLE `work_order_operation_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_operation_id` int NOT NULL,
  `work_order_id` int NOT NULL,
  `operation_id` int NOT NULL,
  `operator_id` int DEFAULT NULL,
  `machine_id` int DEFAULT NULL,
  `workstation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `paused_at` datetime DEFAULT NULL,
  `resumed_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `actual_duration_minutes` int DEFAULT NULL COMMENT 'Total working time excluding pauses',
  `quantity_planned` int NOT NULL,
  `quantity_completed` int DEFAULT '0',
  `quantity_good` int DEFAULT '0',
  `quantity_rejected` int DEFAULT '0',
  `quantity_rework` int DEFAULT '0',
  `status` enum('not_started','in_progress','paused','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'not_started',
  `pause_reason` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `efficiency_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Actual vs standard time',
  `quality_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Good quantity vs total',
  `operator_notes` text COLLATE utf8mb4_unicode_ci,
  `supervisor_notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_order_operation_id` (`work_order_operation_id`),
  KEY `operation_id` (`operation_id`),
  KEY `idx_work_order` (`work_order_id`),
  KEY `idx_status` (`status`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_dates` (`started_at`,`completed_at`),
  CONSTRAINT `work_order_operation_tracking_ibfk_1` FOREIGN KEY (`work_order_operation_id`) REFERENCES `work_order_operations` (`id`),
  CONSTRAINT `work_order_operation_tracking_ibfk_2` FOREIGN KEY (`work_order_id`) REFERENCES `manufacturing_work_orders` (`id`),
  CONSTRAINT `work_order_operation_tracking_ibfk_3` FOREIGN KEY (`operation_id`) REFERENCES `production_operations` (`id`),
  CONSTRAINT `work_order_operation_tracking_ibfk_4` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `work_order_operations`;
CREATE TABLE `work_order_operations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `operation_id` int NOT NULL,
  `sequence_number` int NOT NULL,
  `estimated_time_minutes` decimal(8,2) DEFAULT NULL,
  `actual_time_minutes` decimal(8,2) DEFAULT '0.00',
  `estimated_cost` decimal(10,2) DEFAULT NULL,
  `actual_cost` decimal(10,2) DEFAULT '0.00',
  `status` enum('pending','in_progress','completed','skipped') DEFAULT 'pending',
  `operator_id` int DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `operation_id` (`operation_id`),
  KEY `operator_id` (`operator_id`),
  KEY `idx_work_order_operations_wo` (`work_order_id`),
  KEY `idx_work_order_operations_status` (`status`),
  CONSTRAINT `work_order_operations_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `production_work_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `work_order_operations_ibfk_2` FOREIGN KEY (`operation_id`) REFERENCES `production_operations` (`id`),
  CONSTRAINT `work_order_operations_ibfk_3` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `work_order_status`;
CREATE TABLE `work_order_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status_code` varchar(20) NOT NULL,
  `status_name` varchar(50) NOT NULL,
  `description` text,
  `color_code` varchar(7) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `status_code` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `work_orders`;
CREATE TABLE `work_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_number` varchar(50) NOT NULL,
  `production_item_id` int DEFAULT NULL,
  `bom_header_id` int DEFAULT NULL,
  `quantity_ordered` decimal(15,3) NOT NULL,
  `quantity_produced` decimal(15,3) DEFAULT '0.000',
  `planned_start_date` date DEFAULT NULL,
  `planned_end_date` date DEFAULT NULL,
  `actual_start_date` date DEFAULT NULL,
  `actual_end_date` date DEFAULT NULL,
  `status` enum('draft','released','in_progress','completed','cancelled','on_hold') DEFAULT 'draft',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `manufacturing_unit_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `assigned_to` int DEFAULT NULL,
  `sales_order_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `estimated_hours` decimal(8,2) DEFAULT '0.00',
  `work_order_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_order_number` (`work_order_number`),
  KEY `assigned_to` (`assigned_to`),
  CONSTRAINT `work_orders_ibfk_1` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Show success message
SELECT 'VTRIA ERP Complete Schema Loaded Successfully - All 181 Tables Created' as Status;


-- ============================================================================
-- DEFAULT ADMIN USERS
-- ============================================================================
-- Insert default admin users with bcryptjs hashed passwords (password: Admin@123)
-- Hash: $2b$10$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce
-- IMPORTANT: admin@vtria.com MUST have ID=1 for foreign key references

-- Delete existing users first (in case of reinstall)
DELETE FROM users WHERE id IN (1, 2, 3);

-- Reset AUTO_INCREMENT to 1
ALTER TABLE users AUTO_INCREMENT = 1;

-- Insert default users with explicit IDs
INSERT INTO users (id, email, password_hash, full_name, user_role, status) VALUES 
(1, 'admin@vtria.com', '$2b$10$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce', 'System Administrator', 'admin', 'active'),
(2, 'director@vtria.com', '$2b$10$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce', 'Director', 'director', 'active'),
(3, 'manager@vtria.com', '$2b$10$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce', 'Manager', 'manager', 'active');

-- Show completion message
SELECT 'Default admin users created successfully (admin@vtria.com = ID 1)' as Status;
