ALTER TABLE `customers` ADD `legal_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `customer_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `customer_legal_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `customer_addressee` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `customer_address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `items` ADD `note` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `customers` SET `legal_name` = `name` WHERE `legal_name` = '';--> statement-breakpoint
UPDATE `invoices` SET
  `customer_name` = (SELECT `name` FROM `customers` WHERE `customers`.`id` = `invoices`.`customer_id`),
  `customer_legal_name` = (SELECT `legal_name` FROM `customers` WHERE `customers`.`id` = `invoices`.`customer_id`),
  `customer_addressee` = (SELECT `addressee` FROM `customers` WHERE `customers`.`id` = `invoices`.`customer_id`),
  `customer_address` = (SELECT `address` FROM `customers` WHERE `customers`.`id` = `invoices`.`customer_id`);