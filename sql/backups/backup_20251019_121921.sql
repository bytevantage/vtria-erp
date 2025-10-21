-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: localhost    Database: vtria_erp
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `access_audit_logs`
--

DROP TABLE IF EXISTS `access_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `access_audit_logs`
--

LOCK TABLES `access_audit_logs` WRITE;
/*!40000 ALTER TABLE `access_audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `access_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_exceptions`
--

DROP TABLE IF EXISTS `attendance_exceptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_exceptions`
--

LOCK TABLES `attendance_exceptions` WRITE;
/*!40000 ALTER TABLE `attendance_exceptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance_exceptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_records`
--

DROP TABLE IF EXISTS `attendance_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_records`
--

LOCK TABLES `attendance_records` WRITE;
/*!40000 ALTER TABLE `attendance_records` DISABLE KEYS */;
INSERT INTO `attendance_records` VALUES (3,1,'2025-10-12','2025-10-12 08:55:00','Head Office, Mangalore',12.91410000,74.85600000,'mobile_gps',NULL,NULL,NULL,NULL,0.00,0.00,0.00,'present',0,0,NULL,3,'2025-10-12 18:36:38','2025-10-12 18:36:38'),(4,2,'2025-10-12','2025-10-12 09:45:00','Head Office, Mangalore',12.91410000,74.85600000,'mobile_gps',NULL,NULL,NULL,NULL,0.00,0.00,0.00,'late',1,30,NULL,3,'2025-10-12 18:36:38','2025-10-12 18:36:38'),(5,3,'2025-10-12','2025-10-12 09:00:00','Head Office, Mangalore',12.91410000,74.85600000,'mobile_gps','2025-10-12 18:30:00','Head Office, Mangalore',12.91410000,74.85600000,9.50,9.00,0.50,'present',0,0,NULL,3,'2025-10-12 18:36:38','2025-10-12 18:36:38'),(6,1,'2025-10-11','2025-10-11 09:10:00','Head Office, Mangalore',12.91410000,74.85600000,'manual','2025-10-11 18:00:00','Head Office, Mangalore',12.91410000,74.85600000,8.83,8.83,0.00,'present',0,0,NULL,3,'2025-10-12 18:36:38','2025-10-12 18:36:38'),(7,2,'2025-10-11','2025-10-11 08:45:00','Head Office, Mangalore',12.91410000,74.85600000,'manual','2025-10-11 17:45:00','Head Office, Mangalore',12.91410000,74.85600000,9.00,9.00,0.00,'present',0,0,NULL,3,'2025-10-12 18:36:38','2025-10-12 18:36:38'),(8,3,'2025-10-11','2025-10-11 09:25:00','Head Office, Mangalore',12.91410000,74.85600000,'manual','2025-10-11 18:15:00','Head Office, Mangalore',12.91410000,74.85600000,8.83,8.83,0.00,'late',1,10,NULL,3,'2025-10-12 18:36:38','2025-10-12 18:36:38'),(9,1,'2025-10-10','2025-10-10 08:50:00','Head Office, Mangalore',12.91410000,74.85600000,'manual','2025-10-10 19:00:00','Head Office, Mangalore',12.91410000,74.85600000,10.17,9.00,1.17,'present',0,0,NULL,3,'2025-10-12 18:36:38','2025-10-12 18:36:38'),(10,2,'2025-10-10','2025-10-10 09:30:00','Head Office, Mangalore',12.91410000,74.85600000,'manual','2025-10-10 18:30:00','Head Office, Mangalore',12.91410000,74.85600000,9.00,9.00,0.00,'late',1,15,NULL,3,'2025-10-12 18:36:38','2025-10-12 18:36:38');
/*!40000 ALTER TABLE `attendance_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_records_enhanced`
--

DROP TABLE IF EXISTS `attendance_records_enhanced`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_records_enhanced`
--

LOCK TABLES `attendance_records_enhanced` WRITE;
/*!40000 ALTER TABLE `attendance_records_enhanced` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance_records_enhanced` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_validation_rules`
--

DROP TABLE IF EXISTS `attendance_validation_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_validation_rules`
--

LOCK TABLES `attendance_validation_rules` WRITE;
/*!40000 ALTER TABLE `attendance_validation_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance_validation_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_trail`
--

DROP TABLE IF EXISTS `audit_trail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_trail`
--

LOCK TABLES `audit_trail` WRITE;
/*!40000 ALTER TABLE `audit_trail` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_trail` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_reconciliation`
--

DROP TABLE IF EXISTS `bank_reconciliation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_reconciliation`
--

LOCK TABLES `bank_reconciliation` WRITE;
/*!40000 ALTER TABLE `bank_reconciliation` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_reconciliation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_reconciliation_items`
--

DROP TABLE IF EXISTS `bank_reconciliation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_reconciliation_items`
--

LOCK TABLES `bank_reconciliation_items` WRITE;
/*!40000 ALTER TABLE `bank_reconciliation_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_reconciliation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bill_of_materials`
--

DROP TABLE IF EXISTS `bill_of_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bill_of_materials`
--

LOCK TABLES `bill_of_materials` WRITE;
/*!40000 ALTER TABLE `bill_of_materials` DISABLE KEYS */;
/*!40000 ALTER TABLE `bill_of_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bom_components`
--

DROP TABLE IF EXISTS `bom_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bom_components`
--

LOCK TABLES `bom_components` WRITE;
/*!40000 ALTER TABLE `bom_components` DISABLE KEYS */;
/*!40000 ALTER TABLE `bom_components` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bom_headers`
--

DROP TABLE IF EXISTS `bom_headers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bom_headers`
--

LOCK TABLES `bom_headers` WRITE;
/*!40000 ALTER TABLE `bom_headers` DISABLE KEYS */;
/*!40000 ALTER TABLE `bom_headers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bom_items`
--

DROP TABLE IF EXISTS `bom_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bom_items`
--

LOCK TABLES `bom_items` WRITE;
/*!40000 ALTER TABLE `bom_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `bom_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bom_operations`
--

DROP TABLE IF EXISTS `bom_operations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bom_operations`
--

LOCK TABLES `bom_operations` WRITE;
/*!40000 ALTER TABLE `bom_operations` DISABLE KEYS */;
/*!40000 ALTER TABLE `bom_operations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `case_documents`
--

DROP TABLE IF EXISTS `case_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `case_documents`
--

LOCK TABLES `case_documents` WRITE;
/*!40000 ALTER TABLE `case_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `case_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `case_history`
--

DROP TABLE IF EXISTS `case_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `case_history`
--

LOCK TABLES `case_history` WRITE;
/*!40000 ALTER TABLE `case_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `case_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `case_state_transitions`
--

DROP TABLE IF EXISTS `case_state_transitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `case_state_transitions`
--

LOCK TABLES `case_state_transitions` WRITE;
/*!40000 ALTER TABLE `case_state_transitions` DISABLE KEYS */;
INSERT INTO `case_state_transitions` VALUES (1,1,NULL,'enquiry',NULL,'Case created from sales enquiry',NULL,NULL,3,'2025-10-12 19:34:30'),(2,1,'enquiry','estimation',NULL,'Estimation approved - case moved to estimation stage',NULL,NULL,3,'2025-10-12 19:39:27'),(3,1,'estimation','quotation',NULL,'Quotation created automatically',NULL,1,3,'2025-10-12 19:39:37');
/*!40000 ALTER TABLE `case_state_transitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cases`
--

DROP TABLE IF EXISTS `cases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cases`
--

LOCK TABLES `cases` WRITE;
/*!40000 ALTER TABLE `cases` DISABLE KEYS */;
INSERT INTO `cases` VALUES (1,'VESPL/C/2526/002',1,'order','medium',1,'proj-1','test-1',NULL,NULL,NULL,3,'active',NULL,NULL,NULL,'2025-10-12 19:34:30','2025-10-12 20:34:36');
/*!40000 ALTER TABLE `cases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chart_of_accounts`
--

DROP TABLE IF EXISTS `chart_of_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chart_of_accounts`
--

LOCK TABLES `chart_of_accounts` WRITE;
/*!40000 ALTER TABLE `chart_of_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `chart_of_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (1,'CLIENT COMPANY 1','Client Company -1','cc1@company.com','9632594411','Mangalore','Mangalore','Karnataka','574313',NULL,'active','2025-09-29 05:02:21','2025-09-29 05:02:21'),(2,'CLIENT COMPANY -2','Client company 2 Contact','cc2@gmail.com','9632594499','Bangalore','Bangalore','Karnataka','560025','29aagfe6726n2zu','active','2025-09-29 05:03:57','2025-09-29 05:03:57'),(3,'CLIENT COMPANY -3','Client COmpany -3 Contact','cc3@gmail.com','9632594455','Managlore','Mangalore','Karnataka','574606','29vhsbgshg13xu','active','2025-09-29 05:05:19','2025-09-29 05:05:19'),(4,'CLIENT COMPANY 4','client company 4 Contact','cc4@gmail.com','96436875532','Pune','Pune','Maharastra','456523','34hhmsdbvdw35n6xy','active','2025-09-29 05:06:39','2025-09-29 05:06:39'),(5,'CLIENT COMPANY -5','Client Contact -5','cc5@gmail.com','97535764365','CC5 TN','Madurai','Tamilnadu','6546785','65hhfbs8935k4nw','active','2025-09-29 05:16:23','2025-09-29 05:16:23');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_config`
--

DROP TABLE IF EXISTS `company_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_config`
--

LOCK TABLES `company_config` WRITE;
/*!40000 ALTER TABLE `company_config` DISABLE KEYS */;
INSERT INTO `company_config` VALUES (1,'company_name','VTRIA ENGINEERING SOLUTIONS PVT LTD',NULL,'general',0,1,NULL,'2025-09-28 17:14:32','2025-09-29 05:00:04'),(2,'motto','Engineering for a Better Tomorrow',NULL,'general',0,1,NULL,'2025-09-28 17:14:32','2025-09-29 05:00:04'),(3,'address','',NULL,'general',0,1,NULL,'2025-09-28 17:14:32','2025-09-29 05:00:04'),(4,'city','Mangalore',NULL,'general',0,1,NULL,'2025-09-28 17:14:32','2025-09-29 05:00:04'),(5,'state','Karnataka',NULL,'general',0,1,NULL,'2025-09-28 17:14:32','2025-09-29 05:00:04'),(6,'pincode','574313',NULL,'general',0,1,NULL,'2025-09-28 17:14:32','2025-09-29 05:00:04'),(7,'phone','',NULL,'general',0,1,NULL,'2025-09-28 17:14:32','2025-09-29 05:00:04'),(8,'email','',NULL,'general',0,1,NULL,'2025-09-28 17:14:32','2025-09-29 05:00:04'),(9,'website','https://www.vtria.in',NULL,'general',0,1,NULL,'2025-09-28 17:14:32','2025-09-29 05:00:04'),(10,'gstin','',NULL,'general',0,1,NULL,'2025-09-28 17:14:33','2025-09-29 05:00:04'),(11,'pan','',NULL,'general',0,1,NULL,'2025-09-28 17:14:33','2025-09-29 05:00:04'),(12,'cin','',NULL,'general',0,1,NULL,'2025-09-28 17:14:33','2025-09-29 05:00:04'),(13,'download_folder_path','/downloads',NULL,'general',0,1,NULL,'2025-09-28 17:14:33','2025-09-29 05:00:04'),(14,'company.home_state','Karnataka','Company home state for tax calculation','general',0,1,NULL,'2025-09-28 17:17:15','2025-09-29 05:00:04');
/*!40000 ALTER TABLE `company_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_locations`
--

DROP TABLE IF EXISTS `company_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_locations`
--

LOCK TABLES `company_locations` WRITE;
/*!40000 ALTER TABLE `company_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `company_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_policy_config`
--

DROP TABLE IF EXISTS `company_policy_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_policy_config`
--

LOCK TABLES `company_policy_config` WRITE;
/*!40000 ALTER TABLE `company_policy_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `company_policy_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `competencies`
--

DROP TABLE IF EXISTS `competencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `competencies`
--

LOCK TABLES `competencies` WRITE;
/*!40000 ALTER TABLE `competencies` DISABLE KEYS */;
INSERT INTO `competencies` VALUES (1,'COM_COMM','Communication','core','Ability to clearly convey information and ideas through written and verbal communication',1,NULL,1,1,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(2,'COM_TEAM','Teamwork & Collaboration','core','Works effectively with others to achieve common goals',1,NULL,1,2,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(3,'COM_PROB','Problem Solving','core','Identifies issues and develops effective solutions',1,NULL,1,3,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(4,'COM_INIT','Initiative','core','Takes proactive action without being asked',1,NULL,1,4,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(5,'COM_ADAPT','Adaptability','core','Adjusts to changing circumstances and priorities',1,NULL,1,5,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(6,'COM_TIME','Time Management','core','Effectively manages time and priorities',1,NULL,1,6,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(7,'COM_QUAL','Quality of Work','core','Produces accurate and thorough work',1,NULL,1,7,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(8,'COM_CUST','Customer Focus','core','Prioritizes customer satisfaction and service',1,NULL,1,8,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(9,'TEC_SKILL','Technical Skills','technical','Demonstrates required technical expertise for the role',1,NULL,1,9,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(10,'TEC_INNOV','Innovation','technical','Develops creative solutions and new approaches',1,NULL,1,10,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(11,'TEC_LEARN','Continuous Learning','technical','Actively seeks to improve skills and knowledge',1,NULL,1,11,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(12,'LEAD_VIS','Vision & Strategy','leadership','Sets clear direction and strategic vision',1,NULL,1,12,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(13,'LEAD_DEC','Decision Making','leadership','Makes sound decisions in a timely manner',1,NULL,1,13,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(14,'LEAD_DEV','People Development','leadership','Develops and mentors team members',1,NULL,1,14,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(15,'LEAD_ACC','Accountability','leadership','Takes ownership of results and outcomes',1,NULL,1,15,'2025-10-12 13:22:20','2025-10-12 13:22:20');
/*!40000 ALTER TABLE `competencies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credit_debit_notes`
--

DROP TABLE IF EXISTS `credit_debit_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credit_debit_notes`
--

LOCK TABLES `credit_debit_notes` WRITE;
/*!40000 ALTER TABLE `credit_debit_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `credit_debit_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments_enhanced`
--

DROP TABLE IF EXISTS `departments_enhanced`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments_enhanced`
--

LOCK TABLES `departments_enhanced` WRITE;
/*!40000 ALTER TABLE `departments_enhanced` DISABLE KEYS */;
/*!40000 ALTER TABLE `departments_enhanced` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `designations`
--

DROP TABLE IF EXISTS `designations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `designations`
--

LOCK TABLES `designations` WRITE;
/*!40000 ALTER TABLE `designations` DISABLE KEYS */;
/*!40000 ALTER TABLE `designations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `development_plan_actions`
--

DROP TABLE IF EXISTS `development_plan_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `development_plan_actions`
--

LOCK TABLES `development_plan_actions` WRITE;
/*!40000 ALTER TABLE `development_plan_actions` DISABLE KEYS */;
/*!40000 ALTER TABLE `development_plan_actions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `development_plans`
--

DROP TABLE IF EXISTS `development_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `development_plans`
--

LOCK TABLES `development_plans` WRITE;
/*!40000 ALTER TABLE `development_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `development_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_sequences`
--

DROP TABLE IF EXISTS `document_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_sequences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_type` varchar(10) NOT NULL,
  `financial_year` varchar(10) NOT NULL,
  `last_sequence` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_doc_year` (`document_type`,`financial_year`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_sequences`
--

LOCK TABLES `document_sequences` WRITE;
/*!40000 ALTER TABLE `document_sequences` DISABLE KEYS */;
INSERT INTO `document_sequences` VALUES (1,'C','2526',2,'2025-10-12 19:34:30','2025-10-12 19:34:30'),(2,'ET','2526',1,'2025-10-12 19:35:07','2025-10-12 19:35:07'),(3,'Q','2526',1,'2025-10-12 19:39:37','2025-10-12 19:39:37'),(4,'PR','2526',1,'2025-10-12 19:41:40','2025-10-12 19:41:40');
/*!40000 ALTER TABLE `document_sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_notifications`
--

DROP TABLE IF EXISTS `email_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_notifications`
--

LOCK TABLES `email_notifications` WRITE;
/*!40000 ALTER TABLE `email_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_group_memberships`
--

DROP TABLE IF EXISTS `employee_group_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_group_memberships`
--

LOCK TABLES `employee_group_memberships` WRITE;
/*!40000 ALTER TABLE `employee_group_memberships` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_group_memberships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_leave_entitlements`
--

DROP TABLE IF EXISTS `employee_leave_entitlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_leave_entitlements`
--

LOCK TABLES `employee_leave_entitlements` WRITE;
/*!40000 ALTER TABLE `employee_leave_entitlements` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_leave_entitlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_loans`
--

DROP TABLE IF EXISTS `employee_loans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_loans`
--

LOCK TABLES `employee_loans` WRITE;
/*!40000 ALTER TABLE `employee_loans` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_loans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_location_permissions`
--

DROP TABLE IF EXISTS `employee_location_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_location_permissions`
--

LOCK TABLES `employee_location_permissions` WRITE;
/*!40000 ALTER TABLE `employee_location_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_location_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_profiles`
--

DROP TABLE IF EXISTS `employee_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_profiles`
--

LOCK TABLES `employee_profiles` WRITE;
/*!40000 ALTER TABLE `employee_profiles` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_role_assignments`
--

DROP TABLE IF EXISTS `employee_role_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_role_assignments`
--

LOCK TABLES `employee_role_assignments` WRITE;
/*!40000 ALTER TABLE `employee_role_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_role_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_salary_structure`
--

DROP TABLE IF EXISTS `employee_salary_structure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_salary_structure`
--

LOCK TABLES `employee_salary_structure` WRITE;
/*!40000 ALTER TABLE `employee_salary_structure` DISABLE KEYS */;
INSERT INTO `employee_salary_structure` VALUES (1,1,1,30000.00,'2025-01-01',NULL,1,'Basic salary',6,'2025-10-12 12:57:44','2025-10-12 12:57:44'),(2,1,2,15000.00,'2025-01-01',NULL,1,'HRA - 50% of basic',6,'2025-10-12 12:57:44','2025-10-12 12:57:44'),(3,1,3,1600.00,'2025-01-01',NULL,1,'Conveyance allowance',6,'2025-10-12 12:57:44','2025-10-12 12:57:44'),(4,1,4,1250.00,'2025-01-01',NULL,1,'Medical allowance',6,'2025-10-12 12:57:44','2025-10-12 12:57:44'),(5,1,5,5000.00,'2025-01-01',NULL,1,'Special allowance',6,'2025-10-12 12:57:44','2025-10-12 12:57:44');
/*!40000 ALTER TABLE `employee_salary_structure` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_tax_declarations`
--

DROP TABLE IF EXISTS `employee_tax_declarations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_tax_declarations`
--

LOCK TABLES `employee_tax_declarations` WRITE;
/*!40000 ALTER TABLE `employee_tax_declarations` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_tax_declarations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (1,'EMP/2025/001','System','Administrator','admin@vtria.com','9999999999','full_time','active',NULL,NULL,NULL,NULL,NULL,'2025-10-08',NULL,'IT','System Administrator',NULL,NULL,NULL,1,NULL,'2025-10-08 14:06:26','2025-10-08 14:06:26',NULL),(2,'EMP/2025/002','VTRIA','Director','director@vtria.com','9999999999','full_time','active',NULL,NULL,NULL,NULL,NULL,'2025-10-08',NULL,'Management','Director',NULL,NULL,NULL,1,NULL,'2025-10-08 14:07:22','2025-10-08 14:43:24',NULL),(3,'EMP/2025/003','Production','Manager','manager@vtria.com','9999999999','full_time','active',NULL,NULL,NULL,NULL,NULL,'2025-10-08',NULL,'Production','Production Manager',NULL,NULL,NULL,1,NULL,'2025-10-08 14:07:22','2025-10-08 14:43:24',NULL);
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enterprise_departments`
--

DROP TABLE IF EXISTS `enterprise_departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enterprise_departments`
--

LOCK TABLES `enterprise_departments` WRITE;
/*!40000 ALTER TABLE `enterprise_departments` DISABLE KEYS */;
/*!40000 ALTER TABLE `enterprise_departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enterprise_employees`
--

DROP TABLE IF EXISTS `enterprise_employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enterprise_employees`
--

LOCK TABLES `enterprise_employees` WRITE;
/*!40000 ALTER TABLE `enterprise_employees` DISABLE KEYS */;
/*!40000 ALTER TABLE `enterprise_employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estimation_items`
--

DROP TABLE IF EXISTS `estimation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estimation_items`
--

LOCK TABLES `estimation_items` WRITE;
/*!40000 ALTER TABLE `estimation_items` DISABLE KEYS */;
INSERT INTO `estimation_items` VALUES (1,1,1,1,1,1.00,110.00,2.00,107.80,107.80,'2025-10-12 19:38:28',0.00,0.00,0.00),(2,1,1,1,2,5.00,55.00,1.00,54.45,272.25,'2025-10-12 19:38:53',0.00,0.00,0.00);
/*!40000 ALTER TABLE `estimation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estimation_sections`
--

DROP TABLE IF EXISTS `estimation_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estimation_sections`
--

LOCK TABLES `estimation_sections` WRITE;
/*!40000 ALTER TABLE `estimation_sections` DISABLE KEYS */;
INSERT INTO `estimation_sections` VALUES (1,1,'Main Panel',NULL,1,'2025-10-12 19:35:07');
/*!40000 ALTER TABLE `estimation_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estimation_subsections`
--

DROP TABLE IF EXISTS `estimation_subsections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estimation_subsections`
--

LOCK TABLES `estimation_subsections` WRITE;
/*!40000 ALTER TABLE `estimation_subsections` DISABLE KEYS */;
INSERT INTO `estimation_subsections` VALUES (1,1,'Section -1',1,'2025-10-12 19:35:29','2025-10-12 19:35:29');
/*!40000 ALTER TABLE `estimation_subsections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estimations`
--

DROP TABLE IF EXISTS `estimations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estimations`
--

LOCK TABLES `estimations` WRITE;
/*!40000 ALTER TABLE `estimations` DISABLE KEYS */;
INSERT INTO `estimations` VALUES (1,'VESPL/ET/2526/001',1,1,'2025-10-12','approved',385.00,4.95,380.05,'Rejected',3,3,'2025-10-12 19:39:27','2025-10-12 19:35:07','2025-10-12 19:39:27',NULL,NULL);
/*!40000 ALTER TABLE `estimations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_approvals`
--

DROP TABLE IF EXISTS `expense_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_approvals`
--

LOCK TABLES `expense_approvals` WRITE;
/*!40000 ALTER TABLE `expense_approvals` DISABLE KEYS */;
/*!40000 ALTER TABLE `expense_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_categories`
--

DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_categories`
--

LOCK TABLES `expense_categories` WRITE;
/*!40000 ALTER TABLE `expense_categories` DISABLE KEYS */;
INSERT INTO `expense_categories` VALUES (1,'SAL','Salaries & Wages',NULL,'Employee salaries, wages, and bonuses',1,1,0.00,'2025-10-12 12:01:54','2025-10-12 12:01:54'),(2,'RENT','Rent & Utilities',NULL,'Office rent, electricity, water, internet',1,1,50000.00,'2025-10-12 12:01:54','2025-10-12 12:01:54'),(3,'TRVL','Travel & Conveyance',NULL,'Business travel, fuel, vehicle maintenance',1,1,20000.00,'2025-10-12 12:01:54','2025-10-12 12:01:54'),(4,'OFFC','Office Supplies',NULL,'Stationery, equipment, consumables',1,1,10000.00,'2025-10-12 12:01:54','2025-10-12 12:01:54'),(5,'MARK','Marketing & Advertising',NULL,'Promotional activities, advertising costs',1,1,50000.00,'2025-10-12 12:01:54','2025-10-12 12:01:54'),(6,'TECH','Technology & Software',NULL,'Software licenses, IT infrastructure',1,1,30000.00,'2025-10-12 12:01:54','2025-10-12 12:01:54'),(7,'PROF','Professional Fees',NULL,'Legal, accounting, consulting fees',1,1,25000.00,'2025-10-12 12:01:54','2025-10-12 12:01:54'),(8,'MAIN','Maintenance & Repairs',NULL,'Equipment maintenance, repairs',1,1,15000.00,'2025-10-12 12:01:54','2025-10-12 12:01:54'),(9,'INSUR','Insurance',NULL,'Business insurance premiums',1,1,0.00,'2025-10-12 12:01:54','2025-10-12 12:01:54'),(10,'TAX','Taxes & Licenses',NULL,'Business taxes, licenses, permits',1,1,0.00,'2025-10-12 12:01:54','2025-10-12 12:01:54'),(11,'MISC','Miscellaneous',NULL,'Other business expenses',1,1,5000.00,'2025-10-12 12:01:54','2025-10-12 12:01:54');
/*!40000 ALTER TABLE `expense_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expense_items`
--

DROP TABLE IF EXISTS `expense_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expense_items`
--

LOCK TABLES `expense_items` WRITE;
/*!40000 ALTER TABLE `expense_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `expense_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financial_transaction_details`
--

DROP TABLE IF EXISTS `financial_transaction_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financial_transaction_details`
--

LOCK TABLES `financial_transaction_details` WRITE;
/*!40000 ALTER TABLE `financial_transaction_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `financial_transaction_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financial_transactions`
--

DROP TABLE IF EXISTS `financial_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financial_transactions`
--

LOCK TABLES `financial_transactions` WRITE;
/*!40000 ALTER TABLE `financial_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `financial_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `goal_key_results`
--

DROP TABLE IF EXISTS `goal_key_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `goal_key_results`
--

LOCK TABLES `goal_key_results` WRITE;
/*!40000 ALTER TABLE `goal_key_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `goal_key_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `goals`
--

DROP TABLE IF EXISTS `goals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `goals`
--

LOCK TABLES `goals` WRITE;
/*!40000 ALTER TABLE `goals` DISABLE KEYS */;
/*!40000 ALTER TABLE `goals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `goods_received_notes`
--

DROP TABLE IF EXISTS `goods_received_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `goods_received_notes`
--

LOCK TABLES `goods_received_notes` WRITE;
/*!40000 ALTER TABLE `goods_received_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `goods_received_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grn_items`
--

DROP TABLE IF EXISTS `grn_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grn_items`
--

LOCK TABLES `grn_items` WRITE;
/*!40000 ALTER TABLE `grn_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `grn_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_roles`
--

DROP TABLE IF EXISTS `group_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_roles`
--

LOCK TABLES `group_roles` WRITE;
/*!40000 ALTER TABLE `group_roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `group_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_categories`
--

DROP TABLE IF EXISTS `inventory_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_categories`
--

LOCK TABLES `inventory_categories` WRITE;
/*!40000 ALTER TABLE `inventory_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_items`
--

DROP TABLE IF EXISTS `inventory_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_items`
--

LOCK TABLES `inventory_items` WRITE;
/*!40000 ALTER TABLE `inventory_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_items_enhanced`
--

DROP TABLE IF EXISTS `inventory_items_enhanced`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_items_enhanced`
--

LOCK TABLES `inventory_items_enhanced` WRITE;
/*!40000 ALTER TABLE `inventory_items_enhanced` DISABLE KEYS */;
INSERT INTO `inventory_items_enhanced` VALUES (1,'Code-1','Item-1',NULL,1,NULL,'Siemens','SIE-1','SIE-P1','Siemens AG','{}',NULL,NULL,0,0,NULL,10,0,NULL,5,NULL,0,0,100.00,0.00,0.00,110.00,18.00,'NOS',NULL,1.0000,'active',NULL,NULL,3,'2025-10-12 19:36:31','2025-10-12 19:37:46',0.00),(2,'Code-2','Item-2',NULL,2,NULL,'ABB','Cab-1','Cab-Par-1','ABB Ltd','{}',NULL,NULL,0,0,NULL,200,0,NULL,100,NULL,0,0,50.00,0.00,0.00,55.00,12.00,'METER',NULL,1.0000,'active',NULL,NULL,3,'2025-10-12 19:37:35','2025-10-12 19:37:55',0.00);
/*!40000 ALTER TABLE `inventory_items_enhanced` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_main_categories`
--

DROP TABLE IF EXISTS `inventory_main_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_main_categories`
--

LOCK TABLES `inventory_main_categories` WRITE;
/*!40000 ALTER TABLE `inventory_main_categories` DISABLE KEYS */;
INSERT INTO `inventory_main_categories` VALUES (1,'SWITCHES','Switches','Electrical switches and controls',0,0,12,1,'2025-09-29 05:43:50','2025-09-29 05:43:50'),(2,'CABLES','Cables','Electrical cables and wires',0,0,12,1,'2025-09-29 05:49:43','2025-09-29 05:49:43');
/*!40000 ALTER TABLE `inventory_main_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_purchase_history`
--

DROP TABLE IF EXISTS `inventory_purchase_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_purchase_history`
--

LOCK TABLES `inventory_purchase_history` WRITE;
/*!40000 ALTER TABLE `inventory_purchase_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_purchase_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_serial_numbers`
--

DROP TABLE IF EXISTS `inventory_serial_numbers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_serial_numbers`
--

LOCK TABLES `inventory_serial_numbers` WRITE;
/*!40000 ALTER TABLE `inventory_serial_numbers` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_serial_numbers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_sub_categories`
--

DROP TABLE IF EXISTS `inventory_sub_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_sub_categories`
--

LOCK TABLES `inventory_sub_categories` WRITE;
/*!40000 ALTER TABLE `inventory_sub_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_sub_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_substitute_items`
--

DROP TABLE IF EXISTS `inventory_substitute_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_substitute_items`
--

LOCK TABLES `inventory_substitute_items` WRITE;
/*!40000 ALTER TABLE `inventory_substitute_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_substitute_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_transactions`
--

DROP TABLE IF EXISTS `inventory_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_transactions`
--

LOCK TABLES `inventory_transactions` WRITE;
/*!40000 ALTER TABLE `inventory_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_transactions_enhanced`
--

DROP TABLE IF EXISTS `inventory_transactions_enhanced`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_transactions_enhanced`
--

LOCK TABLES `inventory_transactions_enhanced` WRITE;
/*!40000 ALTER TABLE `inventory_transactions_enhanced` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_transactions_enhanced` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_units`
--

DROP TABLE IF EXISTS `inventory_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_units`
--

LOCK TABLES `inventory_units` WRITE;
/*!40000 ALTER TABLE `inventory_units` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_vendor_items`
--

DROP TABLE IF EXISTS `inventory_vendor_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_vendor_items`
--

LOCK TABLES `inventory_vendor_items` WRITE;
/*!40000 ALTER TABLE `inventory_vendor_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_vendor_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_vendors`
--

DROP TABLE IF EXISTS `inventory_vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_vendors`
--

LOCK TABLES `inventory_vendors` WRITE;
/*!40000 ALTER TABLE `inventory_vendors` DISABLE KEYS */;
INSERT INTO `inventory_vendors` VALUES (1,'VESPL/VEN/2025/4892','Vendor -1','VC-1','v1@gmail.com','786554986742','Bangalore','Bangalore','Karnataka','575435','29jjtnbsdf76bsdg7yt',NULL,NULL,0.00,'B','REGISTERED','DOMESTIC',1,'2025-09-29 05:18:22','2025-09-29 05:18:22'),(2,'VESPL/VEN/2025/5148','Vendor -2','vc -2','vc2@gmail.com','87645532','vendor 2','Mysore','Karnataka','575473','29aagjyh53n7xu',NULL,NULL,0.00,'A','REGISTERED','DOMESTIC',1,'2025-09-29 05:20:08','2025-09-29 05:20:08'),(3,'VESPL/VEN/2025/7500','Vendor -3','vc 3','vc3@gmail.com','98653690876','v3 Chennai','Chennai','Tamilnadu','654385','54ndfjbg6734n3xu',NULL,NULL,0.00,'B','REGISTERED','DOMESTIC',1,'2025-09-29 05:22:21','2025-09-29 05:22:21'),(4,'VESPL/VEN/2025/7128','Vendor -4','vc 4','v4@gmail.com','876423864','v4 Pune','Pune','Maharastra','3487452','34hhsvf65nsdf2vy',NULL,NULL,0.00,'B','REGISTERED','DOMESTIC',1,'2025-09-29 05:24:03','2025-09-29 05:24:03'),(5,'VESPL/VEN/2025/1904','Vendor -5','Vc 5','v5@gmail.com','345287634','vendor 5 Gujrath','Ahmedabad','Gujrat','4566345','65bdgdfthdfbgff4ft',NULL,NULL,0.00,'B','REGISTERED','DOMESTIC',1,'2025-09-29 05:25:33','2025-09-29 05:25:33');
/*!40000 ALTER TABLE `inventory_vendors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_warehouse_stock`
--

DROP TABLE IF EXISTS `inventory_warehouse_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_warehouse_stock`
--

LOCK TABLES `inventory_warehouse_stock` WRITE;
/*!40000 ALTER TABLE `inventory_warehouse_stock` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_warehouse_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ip_access_controls`
--

DROP TABLE IF EXISTS `ip_access_controls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ip_access_controls`
--

LOCK TABLES `ip_access_controls` WRITE;
/*!40000 ALTER TABLE `ip_access_controls` DISABLE KEYS */;
/*!40000 ALTER TABLE `ip_access_controls` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_positions`
--

DROP TABLE IF EXISTS `job_positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_positions`
--

LOCK TABLES `job_positions` WRITE;
/*!40000 ALTER TABLE `job_positions` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_positions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_applications_enhanced`
--

DROP TABLE IF EXISTS `leave_applications_enhanced`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_applications_enhanced`
--

LOCK TABLES `leave_applications_enhanced` WRITE;
/*!40000 ALTER TABLE `leave_applications_enhanced` DISABLE KEYS */;
/*!40000 ALTER TABLE `leave_applications_enhanced` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_policies`
--

DROP TABLE IF EXISTS `leave_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_policies`
--

LOCK TABLES `leave_policies` WRITE;
/*!40000 ALTER TABLE `leave_policies` DISABLE KEYS */;
/*!40000 ALTER TABLE `leave_policies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_types_enhanced`
--

DROP TABLE IF EXISTS `leave_types_enhanced`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_types_enhanced`
--

LOCK TABLES `leave_types_enhanced` WRITE;
/*!40000 ALTER TABLE `leave_types_enhanced` DISABLE KEYS */;
/*!40000 ALTER TABLE `leave_types_enhanced` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_repayments`
--

DROP TABLE IF EXISTS `loan_repayments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_repayments`
--

LOCK TABLES `loan_repayments` WRITE;
/*!40000 ALTER TABLE `loan_repayments` DISABLE KEYS */;
/*!40000 ALTER TABLE `loan_repayments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locations`
--

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_attempt_logs`
--

DROP TABLE IF EXISTS `login_attempt_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_attempt_logs`
--

LOCK TABLES `login_attempt_logs` WRITE;
/*!40000 ALTER TABLE `login_attempt_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_attempt_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine_maintenance`
--

DROP TABLE IF EXISTS `machine_maintenance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine_maintenance`
--

LOCK TABLES `machine_maintenance` WRITE;
/*!40000 ALTER TABLE `machine_maintenance` DISABLE KEYS */;
/*!40000 ALTER TABLE `machine_maintenance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine_utilization_log`
--

DROP TABLE IF EXISTS `machine_utilization_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine_utilization_log`
--

LOCK TABLES `machine_utilization_log` WRITE;
/*!40000 ALTER TABLE `machine_utilization_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `machine_utilization_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `manufacturing_cases`
--

DROP TABLE IF EXISTS `manufacturing_cases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `manufacturing_cases`
--

LOCK TABLES `manufacturing_cases` WRITE;
/*!40000 ALTER TABLE `manufacturing_cases` DISABLE KEYS */;
/*!40000 ALTER TABLE `manufacturing_cases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `manufacturing_units`
--

DROP TABLE IF EXISTS `manufacturing_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `manufacturing_units`
--

LOCK TABLES `manufacturing_units` WRITE;
/*!40000 ALTER TABLE `manufacturing_units` DISABLE KEYS */;
/*!40000 ALTER TABLE `manufacturing_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `manufacturing_work_orders`
--

DROP TABLE IF EXISTS `manufacturing_work_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `manufacturing_work_orders`
--

LOCK TABLES `manufacturing_work_orders` WRITE;
/*!40000 ALTER TABLE `manufacturing_work_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `manufacturing_work_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_templates`
--

DROP TABLE IF EXISTS `notification_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_templates`
--

LOCK TABLES `notification_templates` WRITE;
/*!40000 ALTER TABLE `notification_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `office_locations`
--

DROP TABLE IF EXISTS `office_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `office_locations`
--

LOCK TABLES `office_locations` WRITE;
/*!40000 ALTER TABLE `office_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `office_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `page_access`
--

DROP TABLE IF EXISTS `page_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `page_access`
--

LOCK TABLES `page_access` WRITE;
/*!40000 ALTER TABLE `page_access` DISABLE KEYS */;
INSERT INTO `page_access` VALUES (1,'/dashboard','Dashboard','general',NULL,0,1,'2025-10-12 05:11:38'),(2,'/sales-enquiry','Sales Enquiries','sales','sales_enquiry:read',0,10,'2025-10-12 05:11:38'),(3,'/quotations','Quotations','sales','quotation:read',0,12,'2025-10-12 05:11:38'),(4,'/employee-management','Employee Management','admin','users:read',0,50,'2025-10-12 05:11:38'),(5,'/manufacturing','Manufacturing','production','manufacturing:read',0,30,'2025-10-12 05:11:38'),(6,'/inventory','Inventory','inventory','inventory:read',0,40,'2025-10-12 05:11:38'),(7,'/reports','Reports','analytics','reports:read',0,70,'2025-10-12 05:11:38');
/*!40000 ALTER TABLE `page_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_cycles`
--

DROP TABLE IF EXISTS `payroll_cycles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_cycles`
--

LOCK TABLES `payroll_cycles` WRITE;
/*!40000 ALTER TABLE `payroll_cycles` DISABLE KEYS */;
INSERT INTO `payroll_cycles` VALUES (1,'Test Payroll October 2025','2025-10-01','2025-10-31','2025-11-05','draft',0,0.00,0.00,0.00,NULL,NULL,NULL,NULL,'Test payroll cycle','2025-10-12 12:56:09','2025-10-12 12:56:09'),(2,'Test Payroll October 2025','2025-10-01','2025-10-31','2025-11-05','draft',0,0.00,0.00,0.00,NULL,NULL,NULL,NULL,'Test payroll cycle','2025-10-12 12:57:44','2025-10-12 12:57:44'),(3,'Manual Test October 2025','2025-10-01','2025-10-31','2025-11-05','processing',1,52850.00,2008.33,50841.67,6,'2025-10-12 13:12:20',6,'2025-10-12 12:58:41','Manual test cycle','2025-10-12 12:58:41','2025-10-12 13:12:20'),(4,'Manual Test October 2025','2025-10-01','2025-10-31','2025-11-05','approved',1,52850.00,2008.33,50841.67,6,'2025-10-12 13:12:36',6,'2025-10-12 13:12:36','Manual test cycle','2025-10-12 13:12:36','2025-10-12 13:12:36'),(5,'Manual Test October 2025','2025-10-01','2025-10-31','2025-11-05','approved',1,52850.00,2008.33,50841.67,6,'2025-10-12 13:14:45',6,'2025-10-12 13:14:45','Manual test cycle','2025-10-12 13:14:44','2025-10-12 13:14:45');
/*!40000 ALTER TABLE `payroll_cycles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_transaction_details`
--

DROP TABLE IF EXISTS `payroll_transaction_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_transaction_details`
--

LOCK TABLES `payroll_transaction_details` WRITE;
/*!40000 ALTER TABLE `payroll_transaction_details` DISABLE KEYS */;
INSERT INTO `payroll_transaction_details` VALUES (1,1,1,'earning',30000.00,NULL,NULL),(2,1,2,'earning',15000.00,NULL,NULL),(3,1,3,'earning',1600.00,NULL,NULL),(4,1,4,'earning',1250.00,NULL,NULL),(5,1,5,'earning',5000.00,NULL,NULL),(6,2,1,'earning',30000.00,NULL,NULL),(7,2,2,'earning',15000.00,NULL,NULL),(8,2,3,'earning',1600.00,NULL,NULL),(9,2,4,'earning',1250.00,NULL,NULL),(10,2,5,'earning',5000.00,NULL,NULL),(11,3,1,'earning',30000.00,NULL,NULL),(12,3,2,'earning',15000.00,NULL,NULL),(13,3,3,'earning',1600.00,NULL,NULL),(14,3,4,'earning',1250.00,NULL,NULL),(15,3,5,'earning',5000.00,NULL,NULL);
/*!40000 ALTER TABLE `payroll_transaction_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_transactions`
--

DROP TABLE IF EXISTS `payroll_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_transactions`
--

LOCK TABLES `payroll_transactions` WRITE;
/*!40000 ALTER TABLE `payroll_transactions` DISABLE KEYS */;
INSERT INTO `payroll_transactions` VALUES (1,3,1,'2025-10-01','2025-10-31','2025-11-05',31.00,0.00,31.00,0.00,0.00,0.00,30000.00,15000.00,1600.00,1250.00,5000.00,0.00,52850.00,1800.00,1800.00,0.00,0.00,208.33,0.00,0.00,0.00,0.00,2008.33,50841.67,0.00,50841.67,'draft','bank_transfer',NULL,NULL,NULL,0,0,NULL,6,'2025-10-12 13:12:20','2025-10-12 13:12:20'),(2,4,1,'2025-10-01','2025-10-31','2025-11-05',31.00,0.00,31.00,0.00,0.00,0.00,30000.00,15000.00,1600.00,1250.00,5000.00,0.00,52850.00,1800.00,1800.00,0.00,0.00,208.33,0.00,0.00,0.00,0.00,2008.33,50841.67,0.00,50841.67,'approved','bank_transfer',NULL,NULL,NULL,0,0,NULL,6,'2025-10-12 13:12:36','2025-10-12 13:12:36'),(3,5,1,'2025-10-01','2025-10-31','2025-11-05',31.00,0.00,31.00,0.00,0.00,0.00,30000.00,15000.00,1600.00,1250.00,5000.00,0.00,52850.00,1800.00,1800.00,0.00,0.00,208.33,0.00,0.00,0.00,0.00,2008.33,50841.67,0.00,50841.67,'approved','bank_transfer',NULL,NULL,NULL,0,0,NULL,6,'2025-10-12 13:14:45','2025-10-12 13:14:45');
/*!40000 ALTER TABLE `payroll_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `performance_improvement_plans`
--

DROP TABLE IF EXISTS `performance_improvement_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `performance_improvement_plans`
--

LOCK TABLES `performance_improvement_plans` WRITE;
/*!40000 ALTER TABLE `performance_improvement_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `performance_improvement_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `performance_reviews`
--

DROP TABLE IF EXISTS `performance_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `performance_reviews`
--

LOCK TABLES `performance_reviews` WRITE;
/*!40000 ALTER TABLE `performance_reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `performance_reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'sales_enquiry:create','sales_enquiry','create','Create Sales Enquiry','Can create sales enquiries','2025-10-12 05:11:38'),(2,'sales_enquiry:read','sales_enquiry','read','View Sales Enquiry','Can view sales enquiries','2025-10-12 05:11:38'),(3,'sales_enquiry:update','sales_enquiry','update','Edit Sales Enquiry','Can edit sales enquiries','2025-10-12 05:11:38'),(4,'sales_enquiry:delete','sales_enquiry','delete','Delete Sales Enquiry','Can delete sales enquiries','2025-10-12 05:11:38'),(5,'sales_enquiry:approve','sales_enquiry','approve','Approve Sales Enquiry','Can approve sales enquiries','2025-10-12 05:11:38'),(6,'quotation:create','quotation','create','Create Quotation','Can create quotations','2025-10-12 05:11:38'),(7,'quotation:read','quotation','read','View Quotation','Can view quotations','2025-10-12 05:11:38'),(8,'quotation:update','quotation','update','Edit Quotation','Can edit quotations','2025-10-12 05:11:38'),(9,'quotation:delete','quotation','delete','Delete Quotation','Can delete quotations','2025-10-12 05:11:38'),(10,'quotation:approve','quotation','approve','Approve Quotation','Can approve quotations','2025-10-12 05:11:38'),(11,'users:create','users','create','Create User','Can create users','2025-10-12 05:11:38'),(12,'users:read','users','read','View Users','Can view users','2025-10-12 05:11:38'),(13,'users:update','users','update','Edit User','Can edit users','2025-10-12 05:11:38'),(14,'users:delete','users','delete','Delete User','Can delete users','2025-10-12 05:11:38'),(15,'manufacturing:create','manufacturing','create','Create Manufacturing','Can create manufacturing jobs','2025-10-12 05:11:38'),(16,'manufacturing:read','manufacturing','read','View Manufacturing','Can view manufacturing','2025-10-12 05:11:38'),(17,'manufacturing:update','manufacturing','update','Update Manufacturing','Can update manufacturing','2025-10-12 05:11:38'),(18,'manufacturing:delete','manufacturing','delete','Delete Manufacturing','Can delete manufacturing','2025-10-12 05:11:38'),(19,'inventory:create','inventory','create','Add Inventory','Can add inventory','2025-10-12 05:11:38'),(20,'inventory:read','inventory','read','View Inventory','Can view inventory','2025-10-12 05:11:38'),(21,'inventory:update','inventory','update','Update Inventory','Can update inventory','2025-10-12 05:11:38'),(22,'inventory:delete','inventory','delete','Delete Inventory','Can delete inventory','2025-10-12 05:11:38'),(23,'reports:read','reports','read','View Reports','Can view reports','2025-10-12 05:11:38'),(24,'reports:export','reports','export','Export Reports','Can export reports','2025-10-12 05:11:38');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `price_comparison_analysis`
--

DROP TABLE IF EXISTS `price_comparison_analysis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `price_comparison_analysis`
--

LOCK TABLES `price_comparison_analysis` WRITE;
/*!40000 ALTER TABLE `price_comparison_analysis` DISABLE KEYS */;
/*!40000 ALTER TABLE `price_comparison_analysis` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_categories`
--

DROP TABLE IF EXISTS `production_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_categories`
--

LOCK TABLES `production_categories` WRITE;
/*!40000 ALTER TABLE `production_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_items`
--

DROP TABLE IF EXISTS `production_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_items`
--

LOCK TABLES `production_items` WRITE;
/*!40000 ALTER TABLE `production_items` DISABLE KEYS */;
INSERT INTO `production_items` VALUES (1,'CASE-1','proj-1 Assembly','Production item for case VESPL/C/2526/002',NULL,'PCS',380.05,0.00,1,0.000,0,1,3,'2025-10-12 19:40:17','2025-10-12 19:40:17','active');
/*!40000 ALTER TABLE `production_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_machines`
--

DROP TABLE IF EXISTS `production_machines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_machines`
--

LOCK TABLES `production_machines` WRITE;
/*!40000 ALTER TABLE `production_machines` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_machines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_metrics`
--

DROP TABLE IF EXISTS `production_metrics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_metrics`
--

LOCK TABLES `production_metrics` WRITE;
/*!40000 ALTER TABLE `production_metrics` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_metrics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_oee_records`
--

DROP TABLE IF EXISTS `production_oee_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_oee_records`
--

LOCK TABLES `production_oee_records` WRITE;
/*!40000 ALTER TABLE `production_oee_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_oee_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_operations`
--

DROP TABLE IF EXISTS `production_operations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_operations`
--

LOCK TABLES `production_operations` WRITE;
/*!40000 ALTER TABLE `production_operations` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_operations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_route_operations`
--

DROP TABLE IF EXISTS `production_route_operations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_route_operations`
--

LOCK TABLES `production_route_operations` WRITE;
/*!40000 ALTER TABLE `production_route_operations` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_route_operations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_routes`
--

DROP TABLE IF EXISTS `production_routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_routes`
--

LOCK TABLES `production_routes` WRITE;
/*!40000 ALTER TABLE `production_routes` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_routes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_schedule`
--

DROP TABLE IF EXISTS `production_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_schedule`
--

LOCK TABLES `production_schedule` WRITE;
/*!40000 ALTER TABLE `production_schedule` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_schedule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_schedule_items`
--

DROP TABLE IF EXISTS `production_schedule_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_schedule_items`
--

LOCK TABLES `production_schedule_items` WRITE;
/*!40000 ALTER TABLE `production_schedule_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_schedule_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_tasks`
--

DROP TABLE IF EXISTS `production_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_tasks`
--

LOCK TABLES `production_tasks` WRITE;
/*!40000 ALTER TABLE `production_tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_waste_records`
--

DROP TABLE IF EXISTS `production_waste_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_waste_records`
--

LOCK TABLES `production_waste_records` WRITE;
/*!40000 ALTER TABLE `production_waste_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_waste_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_work_orders`
--

DROP TABLE IF EXISTS `production_work_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_work_orders`
--

LOCK TABLES `production_work_orders` WRITE;
/*!40000 ALTER TABLE `production_work_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_work_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Item-1',NULL,NULL,NULL,'NOS',100.00,0.00,'active','2025-10-12 19:38:28','2025-10-12 19:38:28',NULL,NULL,NULL,'Code-1',0.00,0.00,0.00,NULL,NULL,18.00,0,12,'months',NULL,0,100,5,1,NULL,NULL),(2,'Item-2',NULL,NULL,NULL,'METER',50.00,0.00,'active','2025-10-12 19:38:53','2025-10-12 19:38:53',NULL,NULL,NULL,'Code-2',0.00,0.00,0.00,NULL,NULL,18.00,0,12,'months',NULL,0,100,5,1,NULL,NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
INSERT INTO `purchase_order_items` VALUES (1,1,NULL,1.00,'Nos',107.80,9.00,107.80,'2025-10-12 20:36:14',0.00,0.00,0.00),(2,1,NULL,5.00,'Nos',272.25,9.00,1361.25,'2025-10-12 20:36:14',0.00,0.00,0.00),(3,1,NULL,0.00,'Set',380.05,9.00,0.00,'2025-10-12 20:36:14',0.00,0.00,0.00);
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
INSERT INTO `purchase_orders` VALUES (1,'VESPL/PO/2526/001','VESPL/PO/2526/001',1,'2025-10-12',NULL,'2025-11-11',1469.05,1601.26,'pending',3,'2025-10-12 20:36:14','2025-10-12 20:36:14','2025-10-12',132.21,1);
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_requisition_items`
--

DROP TABLE IF EXISTS `purchase_requisition_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_requisition_items`
--

LOCK TABLES `purchase_requisition_items` WRITE;
/*!40000 ALTER TABLE `purchase_requisition_items` DISABLE KEYS */;
INSERT INTO `purchase_requisition_items` VALUES (1,1,NULL,'Item-1','','','Nos',1.00,107.80,'','2025-10-12 19:41:40'),(2,1,NULL,'Item-2','','','Nos',5.00,272.25,'','2025-10-12 19:41:40'),(3,1,NULL,'Main Panel','Main Panel','85371000','Set',0.00,380.05,'','2025-10-12 19:41:40');
/*!40000 ALTER TABLE `purchase_requisition_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_requisitions`
--

DROP TABLE IF EXISTS `purchase_requisitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_requisitions`
--

LOCK TABLES `purchase_requisitions` WRITE;
/*!40000 ALTER TABLE `purchase_requisitions` DISABLE KEYS */;
INSERT INTO `purchase_requisitions` VALUES (1,'VESPL/PR/2526/001',1,1,'2025-10-12','Test-PR-1','closed',1,1,1,'2025-10-12 19:41:40','2025-10-12 20:36:14',NULL);
/*!40000 ALTER TABLE `purchase_requisitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_checkpoints`
--

DROP TABLE IF EXISTS `quality_checkpoints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_checkpoints`
--

LOCK TABLES `quality_checkpoints` WRITE;
/*!40000 ALTER TABLE `quality_checkpoints` DISABLE KEYS */;
INSERT INTO `quality_checkpoints` VALUES (6,'IQC-001','Incoming Material Inspection','incoming',NULL,1,1,NULL,1,3,'2025-10-12 13:48:47','2025-10-12 13:48:47'),(7,'IPC-001','First Piece Inspection','in_process',NULL,1,2,NULL,1,3,'2025-10-12 13:48:47','2025-10-12 13:48:47'),(8,'IPC-002','In-Process Quality Check','in_process',NULL,1,3,NULL,1,3,'2025-10-12 13:48:47','2025-10-12 13:48:47'),(9,'FQC-001','Final Assembly Inspection','final',NULL,1,4,NULL,1,3,'2025-10-12 13:48:47','2025-10-12 13:48:47'),(10,'FQC-002','Pre-Delivery Inspection','pre_delivery',NULL,1,5,NULL,1,3,'2025-10-12 13:48:47','2025-10-12 13:48:47');
/*!40000 ALTER TABLE `quality_checkpoints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_control_parameters`
--

DROP TABLE IF EXISTS `quality_control_parameters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_control_parameters`
--

LOCK TABLES `quality_control_parameters` WRITE;
/*!40000 ALTER TABLE `quality_control_parameters` DISABLE KEYS */;
/*!40000 ALTER TABLE `quality_control_parameters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_control_standards`
--

DROP TABLE IF EXISTS `quality_control_standards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_control_standards`
--

LOCK TABLES `quality_control_standards` WRITE;
/*!40000 ALTER TABLE `quality_control_standards` DISABLE KEYS */;
/*!40000 ALTER TABLE `quality_control_standards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_control_templates`
--

DROP TABLE IF EXISTS `quality_control_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_control_templates`
--

LOCK TABLES `quality_control_templates` WRITE;
/*!40000 ALTER TABLE `quality_control_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `quality_control_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_control_tests`
--

DROP TABLE IF EXISTS `quality_control_tests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_control_tests`
--

LOCK TABLES `quality_control_tests` WRITE;
/*!40000 ALTER TABLE `quality_control_tests` DISABLE KEYS */;
/*!40000 ALTER TABLE `quality_control_tests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_defect_records`
--

DROP TABLE IF EXISTS `quality_defect_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_defect_records`
--

LOCK TABLES `quality_defect_records` WRITE;
/*!40000 ALTER TABLE `quality_defect_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `quality_defect_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_defect_types`
--

DROP TABLE IF EXISTS `quality_defect_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_defect_types`
--

LOCK TABLES `quality_defect_types` WRITE;
/*!40000 ALTER TABLE `quality_defect_types` DISABLE KEYS */;
INSERT INTO `quality_defect_types` VALUES (1,'DEF-DIM-001','Dimensional Deviation','major',NULL,'Process',0,1,'2025-10-12 13:48:47'),(2,'DEF-VIS-001','Surface Scratch','minor',NULL,'Material',0,1,'2025-10-12 13:48:47'),(3,'DEF-WLD-001','Weld Defect','critical',NULL,'Process',0,1,'2025-10-12 13:48:47'),(4,'DEF-ASM-001','Assembly Misalignment','major',NULL,'Human',0,1,'2025-10-12 13:48:47'),(5,'DEF-FIN-001','Finish Quality Issue','cosmetic',NULL,'Material',0,1,'2025-10-12 13:48:47'),(6,'DEF-FNC-001','Functional Failure','critical',NULL,'Equipment',0,1,'2025-10-12 13:48:47'),(7,'DEF-PKG-001','Packaging Damage','minor',NULL,'Human',0,1,'2025-10-12 13:48:47');
/*!40000 ALTER TABLE `quality_defect_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_inspection_results`
--

DROP TABLE IF EXISTS `quality_inspection_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_inspection_results`
--

LOCK TABLES `quality_inspection_results` WRITE;
/*!40000 ALTER TABLE `quality_inspection_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `quality_inspection_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_inspections`
--

DROP TABLE IF EXISTS `quality_inspections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_inspections`
--

LOCK TABLES `quality_inspections` WRITE;
/*!40000 ALTER TABLE `quality_inspections` DISABLE KEYS */;
/*!40000 ALTER TABLE `quality_inspections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quality_inspections_enhanced`
--

DROP TABLE IF EXISTS `quality_inspections_enhanced`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quality_inspections_enhanced`
--

LOCK TABLES `quality_inspections_enhanced` WRITE;
/*!40000 ALTER TABLE `quality_inspections_enhanced` DISABLE KEYS */;
/*!40000 ALTER TABLE `quality_inspections_enhanced` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_items`
--

DROP TABLE IF EXISTS `quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_items`
--

LOCK TABLES `quotation_items` WRITE;
/*!40000 ALTER TABLE `quotation_items` DISABLE KEYS */;
INSERT INTO `quotation_items` VALUES (2,1,'Main Panel','Main Panel','85371000',1.00,'Set',380.05,380.05,9.00,9.00,0.00,'2025-10-12 19:39:53');
/*!40000 ALTER TABLE `quotation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotations`
--

DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotations`
--

LOCK TABLES `quotations` WRITE;
/*!40000 ALTER TABLE `quotations` DISABLE KEYS */;
INSERT INTO `quotations` VALUES (1,'VESPL/Q/2526/001',1,1,'2025-10-12','2025-11-11','Standard terms and conditions apply','4-6 weeks from approval','30% advance, 70% on delivery','12 months warranty from date of installation',380.05,0.00,0.00,0.00,'accepted',3,NULL,NULL,'2025-10-12 19:39:37','2025-10-12 20:33:20',NULL);
/*!40000 ALTER TABLE `quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rating_scales`
--

DROP TABLE IF EXISTS `rating_scales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rating_scales`
--

LOCK TABLES `rating_scales` WRITE;
/*!40000 ALTER TABLE `rating_scales` DISABLE KEYS */;
INSERT INTO `rating_scales` VALUES (1,'5-Point Scale','numeric',1.00,5.00,'[{\"label\": \"Poor\", \"value\": 1.0, \"description\": \"Performance consistently falls below expectations\"}, {\"label\": \"Needs Improvement\", \"value\": 2.0, \"description\": \"Performance occasionally meets expectations\"}, {\"label\": \"Meets Expectations\", \"value\": 3.0, \"description\": \"Performance consistently meets expectations\"}, {\"label\": \"Exceeds Expectations\", \"value\": 4.0, \"description\": \"Performance frequently exceeds expectations\"}, {\"label\": \"Outstanding\", \"value\": 5.0, \"description\": \"Performance consistently exceeds expectations\"}]',1,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(2,'Letter Grade','grade',1.00,5.00,'[{\"label\": \"D\", \"value\": 1.0, \"description\": \"Below expectations\"}, {\"label\": \"C\", \"value\": 2.0, \"description\": \"Meets some expectations\"}, {\"label\": \"B\", \"value\": 3.0, \"description\": \"Meets expectations\"}, {\"label\": \"A\", \"value\": 4.0, \"description\": \"Exceeds expectations\"}, {\"label\": \"A+\", \"value\": 5.0, \"description\": \"Outstanding performance\"}]',1,'2025-10-12 13:22:20','2025-10-12 13:22:20'),(3,'Percentage Scale','numeric',0.00,5.00,'[{\"label\": \"0-49%\", \"value\": 0.0, \"description\": \"Unacceptable\"}, {\"label\": \"50-64%\", \"value\": 2.5, \"description\": \"Needs Improvement\"}, {\"label\": \"65-74%\", \"value\": 3.5, \"description\": \"Satisfactory\"}, {\"label\": \"75-89%\", \"value\": 4.0, \"description\": \"Good\"}, {\"label\": \"90-100%\", \"value\": 5.0, \"description\": \"Excellent\"}]',1,'2025-10-12 13:22:20','2025-10-12 13:22:20');
/*!40000 ALTER TABLE `rating_scales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reimbursement_requests`
--

DROP TABLE IF EXISTS `reimbursement_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reimbursement_requests`
--

LOCK TABLES `reimbursement_requests` WRITE;
/*!40000 ALTER TABLE `reimbursement_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `reimbursement_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `report_definitions`
--

DROP TABLE IF EXISTS `report_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `report_definitions`
--

LOCK TABLES `report_definitions` WRITE;
/*!40000 ALTER TABLE `report_definitions` DISABLE KEYS */;
/*!40000 ALTER TABLE `report_definitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `review_competency_ratings`
--

DROP TABLE IF EXISTS `review_competency_ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `review_competency_ratings`
--

LOCK TABLES `review_competency_ratings` WRITE;
/*!40000 ALTER TABLE `review_competency_ratings` DISABLE KEYS */;
/*!40000 ALTER TABLE `review_competency_ratings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `review_cycles`
--

DROP TABLE IF EXISTS `review_cycles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `review_cycles`
--

LOCK TABLES `review_cycles` WRITE;
/*!40000 ALTER TABLE `review_cycles` DISABLE KEYS */;
/*!40000 ALTER TABLE `review_cycles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `review_feedback`
--

DROP TABLE IF EXISTS `review_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `review_feedback`
--

LOCK TABLES `review_feedback` WRITE;
/*!40000 ALTER TABLE `review_feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `review_feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `review_goal_assessments`
--

DROP TABLE IF EXISTS `review_goal_assessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `review_goal_assessments`
--

LOCK TABLES `review_goal_assessments` WRITE;
/*!40000 ALTER TABLE `review_goal_assessments` DISABLE KEYS */;
/*!40000 ALTER TABLE `review_goal_assessments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rfq_campaigns`
--

DROP TABLE IF EXISTS `rfq_campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rfq_campaigns`
--

LOCK TABLES `rfq_campaigns` WRITE;
/*!40000 ALTER TABLE `rfq_campaigns` DISABLE KEYS */;
/*!40000 ALTER TABLE `rfq_campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rfq_suppliers`
--

DROP TABLE IF EXISTS `rfq_suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rfq_suppliers`
--

LOCK TABLES `rfq_suppliers` WRITE;
/*!40000 ALTER TABLE `rfq_suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `rfq_suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_change_history`
--

DROP TABLE IF EXISTS `role_change_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_change_history`
--

LOCK TABLES `role_change_history` WRITE;
/*!40000 ALTER TABLE `role_change_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_change_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (4,1,19,1,'2025-10-12 05:13:23',1,NULL),(5,1,22,1,'2025-10-12 05:13:23',1,NULL),(6,1,20,1,'2025-10-12 05:13:23',1,NULL),(7,1,21,1,'2025-10-12 05:13:23',1,NULL),(8,1,15,1,'2025-10-12 05:13:23',1,NULL),(9,1,18,1,'2025-10-12 05:13:23',1,NULL),(10,1,16,1,'2025-10-12 05:13:23',1,NULL),(11,1,17,1,'2025-10-12 05:13:23',1,NULL),(12,1,10,1,'2025-10-12 05:13:23',1,NULL),(13,1,6,1,'2025-10-12 05:13:23',1,NULL),(14,1,9,1,'2025-10-12 05:13:23',1,NULL),(15,1,7,1,'2025-10-12 05:13:23',1,NULL),(16,1,8,1,'2025-10-12 05:13:23',1,NULL),(17,1,24,1,'2025-10-12 05:13:23',1,NULL),(18,1,23,1,'2025-10-12 05:13:23',1,NULL),(19,1,5,1,'2025-10-12 05:13:23',1,NULL),(20,1,1,1,'2025-10-12 05:13:23',1,NULL),(21,1,4,1,'2025-10-12 05:13:23',1,NULL),(22,1,2,1,'2025-10-12 05:13:23',1,NULL),(23,1,3,1,'2025-10-12 05:13:23',1,NULL),(24,1,11,1,'2025-10-12 05:13:23',1,NULL),(25,1,14,1,'2025-10-12 05:13:23',1,NULL),(26,1,12,1,'2025-10-12 05:13:23',1,NULL),(27,1,13,1,'2025-10-12 05:13:23',1,NULL);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'director','Director','Full system access',1,1,'2025-10-12 05:11:38','2025-10-12 05:11:38'),(2,'admin','Administrator','System administrator',1,1,'2025-10-12 05:11:38','2025-10-12 05:11:38'),(3,'sales-admin','Sales Admin','Sales department admin',1,1,'2025-10-12 05:11:38','2025-10-12 05:11:38'),(4,'designer','Designer','Product designer',1,1,'2025-10-12 05:11:38','2025-10-12 05:11:38'),(5,'accounts','Accounts','Finance team',1,1,'2025-10-12 05:11:38','2025-10-12 05:11:38'),(6,'technician','Technician','Production technician',1,1,'2025-10-12 05:11:38','2025-10-12 05:11:38');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_components`
--

DROP TABLE IF EXISTS `salary_components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_components`
--

LOCK TABLES `salary_components` WRITE;
/*!40000 ALTER TABLE `salary_components` DISABLE KEYS */;
INSERT INTO `salary_components` VALUES (1,'BASIC','Basic Salary','earning','fixed',NULL,NULL,1,0,1,1,1,1,'Basic salary component - typically 40-50% of CTC','2025-10-12 12:32:02','2025-10-12 12:32:02'),(2,'HRA','House Rent Allowance','earning','percentage',NULL,NULL,1,0,1,1,1,2,'House Rent Allowance - typically 40-50% of basic','2025-10-12 12:32:02','2025-10-12 12:32:02'),(3,'CONV','Conveyance Allowance','earning','fixed',NULL,NULL,1,0,1,1,1,3,'Conveyance/Transport Allowance - Rs.1600 exempt','2025-10-12 12:32:02','2025-10-12 12:32:02'),(4,'MED','Medical Allowance','earning','fixed',NULL,NULL,1,0,1,1,1,4,'Medical Allowance - Rs.1250 exempt','2025-10-12 12:32:02','2025-10-12 12:32:02'),(5,'SPECIAL','Special Allowance','earning','fixed',NULL,NULL,1,0,1,1,1,5,'Special Allowance - balancing component','2025-10-12 12:32:02','2025-10-12 12:32:02'),(6,'DA','Dearness Allowance','earning','percentage',NULL,NULL,1,0,1,1,1,6,'Dearness Allowance','2025-10-12 12:32:02','2025-10-12 12:32:02'),(7,'LTA','Leave Travel Allowance','earning','fixed',NULL,NULL,1,0,1,1,1,7,'Leave Travel Allowance','2025-10-12 12:32:02','2025-10-12 12:32:02'),(8,'BONUS','Bonus','earning','fixed',NULL,NULL,1,0,1,0,1,8,'Annual/Performance Bonus','2025-10-12 12:32:02','2025-10-12 12:32:02'),(9,'INCENTIVE','Incentive','earning','fixed',NULL,NULL,1,0,0,0,1,9,'Performance Incentive','2025-10-12 12:32:02','2025-10-12 12:32:02'),(10,'OT','Overtime','earning','fixed',NULL,NULL,1,0,0,0,1,10,'Overtime payment','2025-10-12 12:32:02','2025-10-12 12:32:02'),(11,'PF_EMP','PF - Employee','deduction','percentage',NULL,NULL,0,1,1,0,1,11,'Provident Fund - Employee contribution (12%)','2025-10-12 12:32:02','2025-10-12 12:32:02'),(12,'PF_EMP_VPF','VPF - Voluntary PF','deduction','percentage',NULL,NULL,0,1,1,0,1,12,'Voluntary Provident Fund','2025-10-12 12:32:02','2025-10-12 12:32:02'),(13,'ESI_EMP','ESI - Employee','deduction','percentage',NULL,NULL,0,1,1,0,1,13,'Employee State Insurance - Employee (0.75%)','2025-10-12 12:32:02','2025-10-12 12:32:02'),(14,'PT','Professional Tax','deduction','fixed',NULL,NULL,0,1,1,0,1,14,'Professional Tax - state specific','2025-10-12 12:32:02','2025-10-12 12:32:02'),(15,'TDS','Tax Deducted at Source','deduction','formula',NULL,NULL,0,1,0,0,1,15,'Income Tax TDS','2025-10-12 12:32:02','2025-10-12 12:32:02'),(16,'LOAN','Loan Deduction','deduction','fixed',NULL,NULL,0,0,0,0,1,16,'Loan EMI deduction','2025-10-12 12:32:02','2025-10-12 12:32:02'),(17,'ADVANCE','Advance Deduction','deduction','fixed',NULL,NULL,0,0,0,0,1,17,'Salary advance recovery','2025-10-12 12:32:02','2025-10-12 12:32:02'),(18,'LWP','Loss of Pay','deduction','formula',NULL,NULL,0,0,0,0,1,18,'Leave without pay deduction','2025-10-12 12:32:02','2025-10-12 12:32:02'),(19,'OTHER_DED','Other Deductions','deduction','fixed',NULL,NULL,0,0,0,0,1,19,'Miscellaneous deductions','2025-10-12 12:32:02','2025-10-12 12:32:02'),(20,'TRAVEL_REIMB','Travel Reimbursement','reimbursement','fixed',NULL,NULL,0,0,0,0,1,20,'Travel expense reimbursement','2025-10-12 12:32:02','2025-10-12 12:32:02'),(21,'MEDICAL_REIMB','Medical Reimbursement','reimbursement','fixed',NULL,NULL,0,0,0,0,1,21,'Medical expense reimbursement','2025-10-12 12:32:02','2025-10-12 12:32:02'),(22,'FOOD_REIMB','Food Reimbursement','reimbursement','fixed',NULL,NULL,0,0,0,0,1,22,'Food/Meal reimbursement','2025-10-12 12:32:02','2025-10-12 12:32:02'),(23,'PHONE_REIMB','Telephone Reimbursement','reimbursement','fixed',NULL,NULL,0,0,0,0,1,23,'Phone/Communication reimbursement','2025-10-12 12:32:02','2025-10-12 12:32:02'),(24,'INTERNET_REIMB','Internet Reimbursement','reimbursement','fixed',NULL,NULL,0,0,0,0,1,24,'Internet reimbursement','2025-10-12 12:32:02','2025-10-12 12:32:02'),(25,'FUEL_REIMB','Fuel Reimbursement','reimbursement','fixed',NULL,NULL,0,0,0,0,1,25,'Fuel/Petrol reimbursement','2025-10-12 12:32:02','2025-10-12 12:32:02'),(26,'TEST_BONUS','Test Bonus','earning','fixed',NULL,NULL,1,0,1,1,1,99,'Test bonus component','2025-10-12 12:56:08','2025-10-12 12:56:08');
/*!40000 ALTER TABLE `salary_components` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_revisions`
--

DROP TABLE IF EXISTS `salary_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_revisions`
--

LOCK TABLES `salary_revisions` WRITE;
/*!40000 ALTER TABLE `salary_revisions` DISABLE KEYS */;
/*!40000 ALTER TABLE `salary_revisions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_enquiries`
--

DROP TABLE IF EXISTS `sales_enquiries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_enquiries`
--

LOCK TABLES `sales_enquiries` WRITE;
/*!40000 ALTER TABLE `sales_enquiries` DISABLE KEYS */;
INSERT INTO `sales_enquiries` VALUES (1,'VESPL/EQ/2526/001',1,1,'proj-1','test-1','2025-10-12',3,'estimation',NULL,'2025-10-12 19:34:30','2025-10-12 19:35:07',NULL);
/*!40000 ALTER TABLE `sales_enquiries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_order_items`
--

DROP TABLE IF EXISTS `sales_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_order_items`
--

LOCK TABLES `sales_order_items` WRITE;
/*!40000 ALTER TABLE `sales_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_orders`
--

DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_orders`
--

LOCK TABLES `sales_orders` WRITE;
/*!40000 ALTER TABLE `sales_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `statutory_settings`
--

DROP TABLE IF EXISTS `statutory_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `statutory_settings`
--

LOCK TABLES `statutory_settings` WRITE;
/*!40000 ALTER TABLE `statutory_settings` DISABLE KEYS */;
INSERT INTO `statutory_settings` VALUES (1,'pf','pf_ceiling','15000','2024-04-01',NULL,1,'PF wage ceiling limit','2025-10-12 12:32:02','2025-10-12 12:32:02'),(2,'pf','employee_contribution','12','2024-04-01',NULL,1,'Employee PF contribution percentage','2025-10-12 12:32:02','2025-10-12 12:32:02'),(3,'pf','employer_contribution','12','2024-04-01',NULL,1,'Employer PF contribution percentage','2025-10-12 12:32:02','2025-10-12 12:32:02'),(4,'pf','eps_contribution','8.33','2024-04-01',NULL,1,'EPS contribution percentage','2025-10-12 12:32:02','2025-10-12 12:32:02'),(5,'pf','edli_contribution','0.5','2024-04-01',NULL,1,'EDLI contribution percentage','2025-10-12 12:32:02','2025-10-12 12:32:02'),(6,'pf','admin_charges','0.5','2024-04-01',NULL,1,'PF admin charges percentage','2025-10-12 12:32:02','2025-10-12 12:32:02'),(7,'esi','esi_ceiling','21000','2024-04-01',NULL,1,'ESI wage ceiling limit','2025-10-12 12:32:02','2025-10-12 12:32:02'),(8,'esi','employee_contribution','0.75','2024-04-01',NULL,1,'Employee ESI contribution percentage','2025-10-12 12:32:02','2025-10-12 12:32:02'),(9,'esi','employer_contribution','3.25','2024-04-01',NULL,1,'Employer ESI contribution percentage','2025-10-12 12:32:02','2025-10-12 12:32:02'),(10,'pt','slab_1_limit','15000','2024-04-01',NULL,1,'PT Slab 1: Up to 15000 - Rs.200','2025-10-12 12:32:02','2025-10-12 12:32:02'),(11,'pt','slab_1_amount','200','2024-04-01',NULL,1,'PT amount for slab 1','2025-10-12 12:32:02','2025-10-12 12:32:02'),(12,'pt','slab_2_limit','99999999','2024-04-01',NULL,1,'PT Slab 2: Above 15000 - Rs.208.33','2025-10-12 12:32:02','2025-10-12 12:32:02'),(13,'pt','slab_2_amount','208.33','2024-04-01',NULL,1,'PT amount for slab 2 (monthly)','2025-10-12 12:32:02','2025-10-12 12:32:02'),(14,'pt','max_annual','2500','2024-04-01',NULL,1,'Maximum annual PT','2025-10-12 12:32:02','2025-10-12 12:32:02'),(15,'tds','basic_exemption','250000','2024-04-01',NULL,1,'Basic exemption limit','2025-10-12 12:32:02','2025-10-12 12:32:02'),(16,'tds','slab_1_limit','250000','2024-04-01',NULL,1,'Up to 2.5L - 0%','2025-10-12 12:32:02','2025-10-12 12:32:02'),(17,'tds','slab_2_limit','500000','2024-04-01',NULL,1,'2.5L to 5L - 5%','2025-10-12 12:32:02','2025-10-12 12:32:02'),(18,'tds','slab_3_limit','1000000','2024-04-01',NULL,1,'5L to 10L - 20%','2025-10-12 12:32:02','2025-10-12 12:32:02'),(19,'tds','slab_4_limit','99999999','2024-04-01',NULL,1,'Above 10L - 30%','2025-10-12 12:32:02','2025-10-12 12:32:02');
/*!40000 ALTER TABLE `statutory_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock`
--

DROP TABLE IF EXISTS `stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock`
--

LOCK TABLES `stock` WRITE;
/*!40000 ALTER TABLE `stock` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_bid_items`
--

DROP TABLE IF EXISTS `supplier_bid_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_bid_items`
--

LOCK TABLES `supplier_bid_items` WRITE;
/*!40000 ALTER TABLE `supplier_bid_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_bid_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_bids`
--

DROP TABLE IF EXISTS `supplier_bids`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_bids`
--

LOCK TABLES `supplier_bids` WRITE;
/*!40000 ALTER TABLE `supplier_bids` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_bids` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_quote_items`
--

DROP TABLE IF EXISTS `supplier_quote_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_quote_items`
--

LOCK TABLES `supplier_quote_items` WRITE;
/*!40000 ALTER TABLE `supplier_quote_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_quote_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_quote_request_items`
--

DROP TABLE IF EXISTS `supplier_quote_request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_quote_request_items`
--

LOCK TABLES `supplier_quote_request_items` WRITE;
/*!40000 ALTER TABLE `supplier_quote_request_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_quote_request_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_quote_requests`
--

DROP TABLE IF EXISTS `supplier_quote_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_quote_requests`
--

LOCK TABLES `supplier_quote_requests` WRITE;
/*!40000 ALTER TABLE `supplier_quote_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_quote_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_quotes`
--

DROP TABLE IF EXISTS `supplier_quotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_quotes`
--

LOCK TABLES `supplier_quotes` WRITE;
/*!40000 ALTER TABLE `supplier_quotes` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_quotes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_config`
--

DROP TABLE IF EXISTS `system_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_config`
--

LOCK TABLES `system_config` WRITE;
/*!40000 ALTER TABLE `system_config` DISABLE KEYS */;
INSERT INTO `system_config` VALUES (1,'system_name','VTRIA ERP','System Name','2025-10-08 13:03:24','2025-10-08 13:03:24'),(2,'system_version','1.1.0','System Version','2025-10-08 13:03:24','2025-10-08 13:03:24'),(3,'database_initialized','true','Database Initialization Status','2025-10-08 13:03:24','2025-10-08 13:03:24');
/*!40000 ALTER TABLE `system_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_modules`
--

DROP TABLE IF EXISTS `system_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_modules`
--

LOCK TABLES `system_modules` WRITE;
/*!40000 ALTER TABLE `system_modules` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_permissions`
--

DROP TABLE IF EXISTS `system_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_permissions`
--

LOCK TABLES `system_permissions` WRITE;
/*!40000 ALTER TABLE `system_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_config`
--

DROP TABLE IF EXISTS `tax_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_config`
--

LOCK TABLES `tax_config` WRITE;
/*!40000 ALTER TABLE `tax_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trusted_devices`
--

DROP TABLE IF EXISTS `trusted_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trusted_devices`
--

LOCK TABLES `trusted_devices` WRITE;
/*!40000 ALTER TABLE `trusted_devices` DISABLE KEYS */;
/*!40000 ALTER TABLE `trusted_devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_group_members`
--

DROP TABLE IF EXISTS `user_group_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_group_members`
--

LOCK TABLES `user_group_members` WRITE;
/*!40000 ALTER TABLE `user_group_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_group_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_groups`
--

DROP TABLE IF EXISTS `user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_groups`
--

LOCK TABLES `user_groups` WRITE;
/*!40000 ALTER TABLE `user_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_notifications`
--

DROP TABLE IF EXISTS `user_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_notifications`
--

LOCK TABLES `user_notifications` WRITE;
/*!40000 ALTER TABLE `user_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (3,'admin@vtria.com','$2b$10$UmQF98CfEHBx8SML8Hcef.EgTfUpL5IlY6zQEDYQEjvBQ66OnHG3a','System Administrator','director','active','2025-10-08 14:44:16','2025-10-12 05:11:38',NULL,'EMP0003','System','Administrator',NULL,'2025-10-08',NULL,NULL,'full_time',NULL,NULL,NULL,1,NULL,NULL,NULL),(4,'director@vtria.com','$2b$10$6QUN6QKObXLTjAbt.KKi9ukDhKKQjcq.NoySDcomYlqa5RAfCyU/2','VTRIA Director','director','active','2025-10-08 14:44:16','2025-10-12 05:11:38',NULL,'EMP0004','VTRIA','Director',NULL,'2025-10-08',NULL,NULL,'full_time',NULL,NULL,NULL,1,NULL,NULL,NULL),(5,'manager@vtria.com','$2b$10$pJwF7NWCmZByiqFTgMrtCe8A35/8hE2VYIyAEkpraOxqMIhUTY6Sm','Production Manager','admin','active','2025-10-08 14:44:16','2025-10-12 05:11:38',NULL,'EMP0005','Production','Manager',NULL,'2025-10-08',NULL,NULL,'full_time',NULL,NULL,NULL,1,NULL,NULL,NULL),(6,'test.payroll@vtria.com','$2b$10$541napybEjSQaK7Xmu0VmOUrCeXRdF1HNwzGLPlV.RW3VjziWzMla','Test Payroll User','admin','active','2025-10-12 12:51:26','2025-10-12 12:51:26',NULL,NULL,'Test','Payroll','+91-9876543210',NULL,NULL,NULL,'full_time',NULL,NULL,NULL,1,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_active_development_plans`
--

DROP TABLE IF EXISTS `v_active_development_plans`;
/*!50001 DROP VIEW IF EXISTS `v_active_development_plans`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_active_development_plans` AS SELECT 
 1 AS `plan_id`,
 1 AS `employee_id`,
 1 AS `emp_code`,
 1 AS `employee_name`,
 1 AS `department`,
 1 AS `plan_title`,
 1 AS `plan_type`,
 1 AS `status`,
 1 AS `start_date`,
 1 AS `target_completion_date`,
 1 AS `total_actions`,
 1 AS `completed_actions`,
 1 AS `in_progress_actions`,
 1 AS `completion_percentage`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_active_quality_inspections`
--

DROP TABLE IF EXISTS `v_active_quality_inspections`;
/*!50001 DROP VIEW IF EXISTS `v_active_quality_inspections`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_active_quality_inspections` AS SELECT 
 1 AS `id`,
 1 AS `inspection_number`,
 1 AS `inspection_type`,
 1 AS `inspection_date`,
 1 AS `overall_result`,
 1 AS `status`,
 1 AS `sample_size`,
 1 AS `quantity_inspected`,
 1 AS `quantity_accepted`,
 1 AS `quantity_rejected`,
 1 AS `conformance_percentage`,
 1 AS `work_order_number`,
 1 AS `manufacturing_case_number`,
 1 AS `product_name`,
 1 AS `checkpoint_name`,
 1 AS `inspector_name`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_employee_current_goals`
--

DROP TABLE IF EXISTS `v_employee_current_goals`;
/*!50001 DROP VIEW IF EXISTS `v_employee_current_goals`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_employee_current_goals` AS SELECT 
 1 AS `goal_id`,
 1 AS `employee_id`,
 1 AS `emp_code`,
 1 AS `employee_name`,
 1 AS `department`,
 1 AS `designation`,
 1 AS `goal_type`,
 1 AS `goal_title`,
 1 AS `category`,
 1 AS `priority`,
 1 AS `status`,
 1 AS `progress_percentage`,
 1 AS `target_value`,
 1 AS `current_value`,
 1 AS `weight_percentage`,
 1 AS `start_date`,
 1 AS `target_date`,
 1 AS `days_remaining`,
 1 AS `cycle_name`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_employee_current_salary`
--

DROP TABLE IF EXISTS `v_employee_current_salary`;
/*!50001 DROP VIEW IF EXISTS `v_employee_current_salary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_employee_current_salary` AS SELECT 
 1 AS `employee_id`,
 1 AS `emp_code`,
 1 AS `employee_name`,
 1 AS `department`,
 1 AS `designation`,
 1 AS `total_earnings`,
 1 AS `total_deductions`,
 1 AS `net_salary`,
 1 AS `ctc`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_employee_payroll_history`
--

DROP TABLE IF EXISTS `v_employee_payroll_history`;
/*!50001 DROP VIEW IF EXISTS `v_employee_payroll_history`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_employee_payroll_history` AS SELECT 
 1 AS `employee_id`,
 1 AS `emp_code`,
 1 AS `employee_name`,
 1 AS `pay_period_start`,
 1 AS `pay_period_end`,
 1 AS `payment_date`,
 1 AS `gross_salary`,
 1 AS `total_deductions`,
 1 AS `net_salary`,
 1 AS `status`,
 1 AS `payment_mode`,
 1 AS `paid_on`,
 1 AS `cycle_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_employee_performance_history`
--

DROP TABLE IF EXISTS `v_employee_performance_history`;
/*!50001 DROP VIEW IF EXISTS `v_employee_performance_history`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_employee_performance_history` AS SELECT 
 1 AS `employee_id`,
 1 AS `emp_code`,
 1 AS `employee_name`,
 1 AS `department`,
 1 AS `designation`,
 1 AS `cycle_name`,
 1 AS `cycle_type`,
 1 AS `review_type`,
 1 AS `review_date`,
 1 AS `overall_rating`,
 1 AS `goals_rating`,
 1 AS `competencies_rating`,
 1 AS `promotion_recommended`,
 1 AS `salary_increase_recommended`,
 1 AS `recommended_increase_percentage`,
 1 AS `review_status`,
 1 AS `reviewer_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_machine_utilization_summary`
--

DROP TABLE IF EXISTS `v_machine_utilization_summary`;
/*!50001 DROP VIEW IF EXISTS `v_machine_utilization_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_machine_utilization_summary` AS SELECT 
 1 AS `machine_id`,
 1 AS `machine_code`,
 1 AS `machine_name`,
 1 AS `machine_status`,
 1 AS `manufacturing_unit`,
 1 AS `utilization_records`,
 1 AS `productive_minutes`,
 1 AS `breakdown_minutes`,
 1 AS `maintenance_minutes`,
 1 AS `idle_minutes`,
 1 AS `total_minutes`,
 1 AS `utilization_percentage`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_monthly_payroll_summary`
--

DROP TABLE IF EXISTS `v_monthly_payroll_summary`;
/*!50001 DROP VIEW IF EXISTS `v_monthly_payroll_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_monthly_payroll_summary` AS SELECT 
 1 AS `cycle_id`,
 1 AS `cycle_name`,
 1 AS `pay_period_start`,
 1 AS `pay_period_end`,
 1 AS `payment_date`,
 1 AS `status`,
 1 AS `total_employees`,
 1 AS `total_gross`,
 1 AS `total_deductions`,
 1 AS `total_net`,
 1 AS `total_pf_employee`,
 1 AS `total_pf_employer`,
 1 AS `total_esi_employee`,
 1 AS `total_esi_employer`,
 1 AS `total_pt`,
 1 AS `total_tds`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_pending_loans`
--

DROP TABLE IF EXISTS `v_pending_loans`;
/*!50001 DROP VIEW IF EXISTS `v_pending_loans`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_pending_loans` AS SELECT 
 1 AS `loan_id`,
 1 AS `employee_id`,
 1 AS `emp_code`,
 1 AS `employee_name`,
 1 AS `loan_type`,
 1 AS `loan_amount`,
 1 AS `outstanding_amount`,
 1 AS `emi_amount`,
 1 AS `number_of_installments`,
 1 AS `paid_installments`,
 1 AS `pending_installments`,
 1 AS `start_date`,
 1 AS `status`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_production_schedule_status`
--

DROP TABLE IF EXISTS `v_production_schedule_status`;
/*!50001 DROP VIEW IF EXISTS `v_production_schedule_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_production_schedule_status` AS SELECT 
 1 AS `schedule_id`,
 1 AS `schedule_code`,
 1 AS `schedule_name`,
 1 AS `schedule_date`,
 1 AS `schedule_status`,
 1 AS `unit_name`,
 1 AS `total_work_orders`,
 1 AS `completed_work_orders`,
 1 AS `in_progress_work_orders`,
 1 AS `delayed_work_orders`,
 1 AS `planned_capacity`,
 1 AS `allocated_capacity`,
 1 AS `available_capacity`,
 1 AS `completion_percentage`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_quality_metrics_dashboard`
--

DROP TABLE IF EXISTS `v_quality_metrics_dashboard`;
/*!50001 DROP VIEW IF EXISTS `v_quality_metrics_dashboard`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_quality_metrics_dashboard` AS SELECT 
 1 AS `inspection_date`,
 1 AS `inspection_type`,
 1 AS `total_inspections`,
 1 AS `passed_count`,
 1 AS `failed_count`,
 1 AS `conditional_count`,
 1 AS `total_inspected`,
 1 AS `total_accepted`,
 1 AS `total_rejected`,
 1 AS `acceptance_rate`,
 1 AS `avg_conformance`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_review_cycle_summary`
--

DROP TABLE IF EXISTS `v_review_cycle_summary`;
/*!50001 DROP VIEW IF EXISTS `v_review_cycle_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_review_cycle_summary` AS SELECT 
 1 AS `cycle_id`,
 1 AS `cycle_name`,
 1 AS `cycle_type`,
 1 AS `review_period_start`,
 1 AS `review_period_end`,
 1 AS `status`,
 1 AS `total_employees`,
 1 AS `completed_reviews`,
 1 AS `in_progress_reviews`,
 1 AS `not_started_reviews`,
 1 AS `avg_overall_rating`,
 1 AS `avg_goals_rating`,
 1 AS `avg_competencies_rating`,
 1 AS `promotions_recommended`,
 1 AS `pips_recommended`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `vendor_discount_matrix`
--

DROP TABLE IF EXISTS `vendor_discount_matrix`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_discount_matrix`
--

LOCK TABLES `vendor_discount_matrix` WRITE;
/*!40000 ALTER TABLE `vendor_discount_matrix` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_discount_matrix` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_price_history`
--

DROP TABLE IF EXISTS `vendor_price_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_price_history`
--

LOCK TABLES `vendor_price_history` WRITE;
/*!40000 ALTER TABLE `vendor_price_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_price_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_prices`
--

DROP TABLE IF EXISTS `vendor_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_prices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int DEFAULT NULL,
  `vendor_id` int DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_prices`
--

LOCK TABLES `vendor_prices` WRITE;
/*!40000 ALTER TABLE `vendor_prices` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_prices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `waste_categories`
--

DROP TABLE IF EXISTS `waste_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `waste_categories`
--

LOCK TABLES `waste_categories` WRITE;
/*!40000 ALTER TABLE `waste_categories` DISABLE KEYS */;
INSERT INTO `waste_categories` VALUES (1,'WST-MAT-001','Material Scrap','material',NULL,1,'2025-10-12 13:48:47'),(2,'WST-MAT-002','Excess Material','material',NULL,1,'2025-10-12 13:48:47'),(3,'WST-DEF-001','Defective Units','defect',NULL,1,'2025-10-12 13:48:47'),(4,'WST-TIM-001','Setup Time Waste','time',NULL,1,'2025-10-12 13:48:47'),(5,'WST-TIM-002','Waiting Time','time',NULL,1,'2025-10-12 13:48:47'),(6,'WST-OVP-001','Overproduction','overproduction',NULL,1,'2025-10-12 13:48:47');
/*!40000 ALTER TABLE `waste_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_locations`
--

DROP TABLE IF EXISTS `work_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_locations`
--

LOCK TABLES `work_locations` WRITE;
/*!40000 ALTER TABLE `work_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_order_operation_tracking`
--

DROP TABLE IF EXISTS `work_order_operation_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_order_operation_tracking`
--

LOCK TABLES `work_order_operation_tracking` WRITE;
/*!40000 ALTER TABLE `work_order_operation_tracking` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_order_operation_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_order_operations`
--

DROP TABLE IF EXISTS `work_order_operations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_order_operations`
--

LOCK TABLES `work_order_operations` WRITE;
/*!40000 ALTER TABLE `work_order_operations` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_order_operations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_order_status`
--

DROP TABLE IF EXISTS `work_order_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_order_status`
--

LOCK TABLES `work_order_status` WRITE;
/*!40000 ALTER TABLE `work_order_status` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_order_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_orders`
--

DROP TABLE IF EXISTS `work_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_orders`
--

LOCK TABLES `work_orders` WRITE;
/*!40000 ALTER TABLE `work_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `v_active_development_plans`
--

/*!50001 DROP VIEW IF EXISTS `v_active_development_plans`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_active_development_plans` AS select `dp`.`id` AS `plan_id`,`dp`.`employee_id` AS `employee_id`,`e`.`employee_id` AS `emp_code`,concat(`e`.`first_name`,' ',`e`.`last_name`) AS `employee_name`,`e`.`department` AS `department`,`dp`.`plan_title` AS `plan_title`,`dp`.`plan_type` AS `plan_type`,`dp`.`status` AS `status`,`dp`.`start_date` AS `start_date`,`dp`.`target_completion_date` AS `target_completion_date`,count(`dpa`.`id`) AS `total_actions`,count((case when (`dpa`.`status` = 'completed') then 1 end)) AS `completed_actions`,count((case when (`dpa`.`status` = 'in_progress') then 1 end)) AS `in_progress_actions`,round(((count((case when (`dpa`.`status` = 'completed') then 1 end)) / count(`dpa`.`id`)) * 100),2) AS `completion_percentage` from ((`development_plans` `dp` join `employees` `e` on((`dp`.`employee_id` = `e`.`id`))) left join `development_plan_actions` `dpa` on((`dp`.`id` = `dpa`.`development_plan_id`))) where (`dp`.`status` in ('active','in_progress')) group by `dp`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_active_quality_inspections`
--

/*!50001 DROP VIEW IF EXISTS `v_active_quality_inspections`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_active_quality_inspections` AS select `qi`.`id` AS `id`,`qi`.`inspection_number` AS `inspection_number`,`qi`.`inspection_type` AS `inspection_type`,`qi`.`inspection_date` AS `inspection_date`,`qi`.`overall_result` AS `overall_result`,`qi`.`status` AS `status`,`qi`.`sample_size` AS `sample_size`,`qi`.`quantity_inspected` AS `quantity_inspected`,`qi`.`quantity_accepted` AS `quantity_accepted`,`qi`.`quantity_rejected` AS `quantity_rejected`,`qi`.`conformance_percentage` AS `conformance_percentage`,`wo`.`work_order_number` AS `work_order_number`,`mc`.`manufacturing_case_number` AS `manufacturing_case_number`,`p`.`name` AS `product_name`,`qc`.`checkpoint_name` AS `checkpoint_name`,concat(`inspector`.`first_name`,' ',`inspector`.`last_name`) AS `inspector_name`,`qi`.`created_at` AS `created_at` from (((((`quality_inspections_enhanced` `qi` left join `manufacturing_work_orders` `wo` on((`qi`.`work_order_id` = `wo`.`id`))) left join `manufacturing_cases` `mc` on((`qi`.`manufacturing_case_id` = `mc`.`id`))) left join `products` `p` on((`qi`.`product_id` = `p`.`id`))) left join `quality_checkpoints` `qc` on((`qi`.`checkpoint_id` = `qc`.`id`))) left join `users` `inspector` on((`qi`.`inspector_id` = `inspector`.`id`))) where (`qi`.`status` in ('draft','submitted')) order by `qi`.`inspection_date` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_employee_current_goals`
--

/*!50001 DROP VIEW IF EXISTS `v_employee_current_goals`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_employee_current_goals` AS select `g`.`id` AS `goal_id`,`g`.`employee_id` AS `employee_id`,`e`.`employee_id` AS `emp_code`,concat(`e`.`first_name`,' ',`e`.`last_name`) AS `employee_name`,`e`.`department` AS `department`,`e`.`designation` AS `designation`,`g`.`goal_type` AS `goal_type`,`g`.`goal_title` AS `goal_title`,`g`.`category` AS `category`,`g`.`priority` AS `priority`,`g`.`status` AS `status`,`g`.`progress_percentage` AS `progress_percentage`,`g`.`target_value` AS `target_value`,`g`.`current_value` AS `current_value`,`g`.`weight_percentage` AS `weight_percentage`,`g`.`start_date` AS `start_date`,`g`.`target_date` AS `target_date`,(to_days(`g`.`target_date`) - to_days(curdate())) AS `days_remaining`,`rc`.`cycle_name` AS `cycle_name`,`g`.`created_at` AS `created_at` from ((`goals` `g` join `employees` `e` on((`g`.`employee_id` = `e`.`id`))) left join `review_cycles` `rc` on((`g`.`review_cycle_id` = `rc`.`id`))) where (`g`.`status` in ('active','on_track','at_risk','behind')) order by `g`.`target_date` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_employee_current_salary`
--

/*!50001 DROP VIEW IF EXISTS `v_employee_current_salary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_employee_current_salary` AS select `e`.`id` AS `employee_id`,`e`.`employee_id` AS `emp_code`,concat(`e`.`first_name`,' ',`e`.`last_name`) AS `employee_name`,`e`.`department` AS `department`,`e`.`designation` AS `designation`,sum((case when (`sc`.`component_type` = 'earning') then `ess`.`amount` else 0 end)) AS `total_earnings`,sum((case when (`sc`.`component_type` = 'deduction') then `ess`.`amount` else 0 end)) AS `total_deductions`,(sum((case when (`sc`.`component_type` = 'earning') then `ess`.`amount` else 0 end)) - sum((case when (`sc`.`component_type` = 'deduction') then `ess`.`amount` else 0 end))) AS `net_salary`,sum((case when ((`sc`.`component_type` = 'earning') and (`sc`.`affects_ctc` = true)) then `ess`.`amount` else 0 end)) AS `ctc` from ((`employees` `e` left join `employee_salary_structure` `ess` on(((`e`.`id` = `ess`.`employee_id`) and (`ess`.`is_active` = true)))) left join `salary_components` `sc` on((`ess`.`component_id` = `sc`.`id`))) where (`e`.`status` = 'active') group by `e`.`id`,`e`.`employee_id`,`e`.`first_name`,`e`.`last_name`,`e`.`department`,`e`.`designation` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_employee_payroll_history`
--

/*!50001 DROP VIEW IF EXISTS `v_employee_payroll_history`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_employee_payroll_history` AS select `pt`.`employee_id` AS `employee_id`,`e`.`employee_id` AS `emp_code`,concat(`e`.`first_name`,' ',`e`.`last_name`) AS `employee_name`,`pt`.`pay_period_start` AS `pay_period_start`,`pt`.`pay_period_end` AS `pay_period_end`,`pt`.`payment_date` AS `payment_date`,`pt`.`gross_salary` AS `gross_salary`,`pt`.`total_deductions` AS `total_deductions`,`pt`.`net_salary` AS `net_salary`,`pt`.`status` AS `status`,`pt`.`payment_mode` AS `payment_mode`,`pt`.`paid_on` AS `paid_on`,`pc`.`cycle_name` AS `cycle_name` from ((`payroll_transactions` `pt` join `employees` `e` on((`pt`.`employee_id` = `e`.`id`))) join `payroll_cycles` `pc` on((`pt`.`payroll_cycle_id` = `pc`.`id`))) order by `pt`.`payment_date` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_employee_performance_history`
--

/*!50001 DROP VIEW IF EXISTS `v_employee_performance_history`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_employee_performance_history` AS select `pr`.`employee_id` AS `employee_id`,`e`.`employee_id` AS `emp_code`,concat(`e`.`first_name`,' ',`e`.`last_name`) AS `employee_name`,`e`.`department` AS `department`,`e`.`designation` AS `designation`,`rc`.`cycle_name` AS `cycle_name`,`rc`.`cycle_type` AS `cycle_type`,`pr`.`review_type` AS `review_type`,`pr`.`review_date` AS `review_date`,`pr`.`overall_rating` AS `overall_rating`,`pr`.`goals_rating` AS `goals_rating`,`pr`.`competencies_rating` AS `competencies_rating`,`pr`.`promotion_recommended` AS `promotion_recommended`,`pr`.`salary_increase_recommended` AS `salary_increase_recommended`,`pr`.`recommended_increase_percentage` AS `recommended_increase_percentage`,`pr`.`review_status` AS `review_status`,concat(`reviewer`.`first_name`,' ',`reviewer`.`last_name`) AS `reviewer_name` from (((`performance_reviews` `pr` join `employees` `e` on((`pr`.`employee_id` = `e`.`id`))) join `review_cycles` `rc` on((`pr`.`review_cycle_id` = `rc`.`id`))) join `users` `reviewer` on((`pr`.`reviewer_id` = `reviewer`.`id`))) where (`pr`.`review_status` in ('submitted','acknowledged','completed')) order by `pr`.`review_date` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_machine_utilization_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_machine_utilization_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_machine_utilization_summary` AS select `m`.`id` AS `machine_id`,`m`.`machine_code` AS `machine_code`,`m`.`machine_name` AS `machine_name`,`m`.`status` AS `machine_status`,`mu`.`unit_name` AS `manufacturing_unit`,count(distinct `mul`.`id`) AS `utilization_records`,sum((case when (`mul`.`utilization_type` = 'productive') then `mul`.`duration_minutes` else 0 end)) AS `productive_minutes`,sum((case when (`mul`.`utilization_type` = 'breakdown') then `mul`.`duration_minutes` else 0 end)) AS `breakdown_minutes`,sum((case when (`mul`.`utilization_type` = 'maintenance') then `mul`.`duration_minutes` else 0 end)) AS `maintenance_minutes`,sum((case when (`mul`.`utilization_type` = 'idle') then `mul`.`duration_minutes` else 0 end)) AS `idle_minutes`,sum(`mul`.`duration_minutes`) AS `total_minutes`,round(((sum((case when (`mul`.`utilization_type` = 'productive') then `mul`.`duration_minutes` else 0 end)) / nullif(sum(`mul`.`duration_minutes`),0)) * 100),2) AS `utilization_percentage` from ((`production_machines` `m` left join `manufacturing_units` `mu` on((`m`.`manufacturing_unit_id` = `mu`.`id`))) left join `machine_utilization_log` `mul` on(((`m`.`id` = `mul`.`machine_id`) and (`mul`.`start_time` >= (now() - interval 30 day))))) group by `m`.`id`,`m`.`machine_code`,`m`.`machine_name`,`m`.`status`,`mu`.`unit_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_monthly_payroll_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_monthly_payroll_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_monthly_payroll_summary` AS select `pc`.`id` AS `cycle_id`,`pc`.`cycle_name` AS `cycle_name`,`pc`.`pay_period_start` AS `pay_period_start`,`pc`.`pay_period_end` AS `pay_period_end`,`pc`.`payment_date` AS `payment_date`,`pc`.`status` AS `status`,count(`pt`.`id`) AS `total_employees`,sum(`pt`.`gross_salary`) AS `total_gross`,sum(`pt`.`total_deductions`) AS `total_deductions`,sum(`pt`.`net_salary`) AS `total_net`,sum(`pt`.`pf_employee`) AS `total_pf_employee`,sum(`pt`.`pf_employer`) AS `total_pf_employer`,sum(`pt`.`esi_employee`) AS `total_esi_employee`,sum(`pt`.`esi_employer`) AS `total_esi_employer`,sum(`pt`.`professional_tax`) AS `total_pt`,sum(`pt`.`tds`) AS `total_tds` from (`payroll_cycles` `pc` left join `payroll_transactions` `pt` on((`pc`.`id` = `pt`.`payroll_cycle_id`))) group by `pc`.`id`,`pc`.`cycle_name`,`pc`.`pay_period_start`,`pc`.`pay_period_end`,`pc`.`payment_date`,`pc`.`status` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_pending_loans`
--

/*!50001 DROP VIEW IF EXISTS `v_pending_loans`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_pending_loans` AS select `el`.`id` AS `loan_id`,`el`.`employee_id` AS `employee_id`,`e`.`employee_id` AS `emp_code`,concat(`e`.`first_name`,' ',`e`.`last_name`) AS `employee_name`,`el`.`loan_type` AS `loan_type`,`el`.`loan_amount` AS `loan_amount`,`el`.`outstanding_amount` AS `outstanding_amount`,`el`.`emi_amount` AS `emi_amount`,`el`.`number_of_installments` AS `number_of_installments`,`el`.`paid_installments` AS `paid_installments`,(`el`.`number_of_installments` - `el`.`paid_installments`) AS `pending_installments`,`el`.`start_date` AS `start_date`,`el`.`status` AS `status` from (`employee_loans` `el` join `employees` `e` on((`el`.`employee_id` = `e`.`id`))) where ((`el`.`status` = 'active') and (`el`.`outstanding_amount` > 0)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_production_schedule_status`
--

/*!50001 DROP VIEW IF EXISTS `v_production_schedule_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_production_schedule_status` AS select `ps`.`id` AS `schedule_id`,`ps`.`schedule_code` AS `schedule_code`,`ps`.`schedule_name` AS `schedule_name`,`ps`.`schedule_date` AS `schedule_date`,`ps`.`status` AS `schedule_status`,`mu`.`unit_name` AS `unit_name`,count(`psi`.`id`) AS `total_work_orders`,count((case when (`psi`.`status` = 'completed') then 1 end)) AS `completed_work_orders`,count((case when (`psi`.`status` = 'in_progress') then 1 end)) AS `in_progress_work_orders`,count((case when (`psi`.`status` = 'delayed') then 1 end)) AS `delayed_work_orders`,`ps`.`planned_capacity` AS `planned_capacity`,`ps`.`allocated_capacity` AS `allocated_capacity`,`ps`.`available_capacity` AS `available_capacity`,round(((count((case when (`psi`.`status` = 'completed') then 1 end)) / nullif(count(`psi`.`id`),0)) * 100),2) AS `completion_percentage` from ((`production_schedule` `ps` left join `manufacturing_units` `mu` on((`ps`.`manufacturing_unit_id` = `mu`.`id`))) left join `production_schedule_items` `psi` on((`ps`.`id` = `psi`.`schedule_id`))) group by `ps`.`id`,`ps`.`schedule_code`,`ps`.`schedule_name`,`ps`.`schedule_date`,`ps`.`status`,`mu`.`unit_name`,`ps`.`planned_capacity`,`ps`.`allocated_capacity`,`ps`.`available_capacity` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_quality_metrics_dashboard`
--

/*!50001 DROP VIEW IF EXISTS `v_quality_metrics_dashboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_quality_metrics_dashboard` AS select cast(`qi`.`inspection_date` as date) AS `inspection_date`,`qi`.`inspection_type` AS `inspection_type`,count(`qi`.`id`) AS `total_inspections`,count((case when (`qi`.`overall_result` = 'passed') then 1 end)) AS `passed_count`,count((case when (`qi`.`overall_result` = 'failed') then 1 end)) AS `failed_count`,count((case when (`qi`.`overall_result` = 'conditional') then 1 end)) AS `conditional_count`,sum(`qi`.`quantity_inspected`) AS `total_inspected`,sum(`qi`.`quantity_accepted`) AS `total_accepted`,sum(`qi`.`quantity_rejected`) AS `total_rejected`,round(((sum(`qi`.`quantity_accepted`) / nullif(sum(`qi`.`quantity_inspected`),0)) * 100),2) AS `acceptance_rate`,avg(`qi`.`conformance_percentage`) AS `avg_conformance` from `quality_inspections_enhanced` `qi` where (`qi`.`inspection_date` >= (now() - interval 30 day)) group by cast(`qi`.`inspection_date` as date),`qi`.`inspection_type` order by `inspection_date` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_review_cycle_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_review_cycle_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = latin1 */;
/*!50001 SET character_set_results     = latin1 */;
/*!50001 SET collation_connection      = latin1_swedish_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_review_cycle_summary` AS select `rc`.`id` AS `cycle_id`,`rc`.`cycle_name` AS `cycle_name`,`rc`.`cycle_type` AS `cycle_type`,`rc`.`review_period_start` AS `review_period_start`,`rc`.`review_period_end` AS `review_period_end`,`rc`.`status` AS `status`,count(distinct `pr`.`employee_id`) AS `total_employees`,count(distinct (case when (`pr`.`review_status` = 'completed') then `pr`.`employee_id` end)) AS `completed_reviews`,count(distinct (case when (`pr`.`review_status` = 'in_progress') then `pr`.`employee_id` end)) AS `in_progress_reviews`,count(distinct (case when (`pr`.`review_status` = 'not_started') then `pr`.`employee_id` end)) AS `not_started_reviews`,avg(`pr`.`overall_rating`) AS `avg_overall_rating`,avg(`pr`.`goals_rating`) AS `avg_goals_rating`,avg(`pr`.`competencies_rating`) AS `avg_competencies_rating`,sum((case when (`pr`.`promotion_recommended` = true) then 1 else 0 end)) AS `promotions_recommended`,sum((case when (`pr`.`pip_recommended` = true) then 1 else 0 end)) AS `pips_recommended`,`rc`.`created_at` AS `created_at` from (`review_cycles` `rc` left join `performance_reviews` `pr` on((`rc`.`id` = `pr`.`review_cycle_id`))) group by `rc`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-19  6:49:25
