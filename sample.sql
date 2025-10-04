-- Test SQL File for VTria ERP

CREATE TABLE IF NOT EXISTS `inventory_main_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_code` varchar(50) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` text,
  PRIMARY KEY (`category_id`)
);

INSERT INTO `inventory_main_categories` (`category_code`, `category_name`, `description`) VALUES 
('SWITCHES', 'Switches', 'Network switches and routing equipment'),
('CABLES', 'Cables', 'Various types of cables and connectors');

CREATE TABLE IF NOT EXISTS `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`)
);

INSERT INTO `departments` (`name`, `description`) VALUES 
('IT', 'Information Technology Department'),
('HR', 'Human Resources Department');

CREATE TABLE IF NOT EXISTS `invoices` (
  `invoice_id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  PRIMARY KEY (`invoice_id`)
);

INSERT INTO `invoices` (`invoice_number`, `amount`) VALUES 
('INV-001', 1500.00),
('INV-002', 2500.00);

CREATE TABLE IF NOT EXISTS `company_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL,
  `config_value` text,
  PRIMARY KEY (`id`)
);

INSERT INTO `company_config` (`config_key`, `config_value`) VALUES 
('company_name', 'VTria Technologies'),
('address', '123 Business Street');
