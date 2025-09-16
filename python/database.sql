CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `hashed_password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL COMMENT 'admin, mitarbeiter, kunde',
  `is_active` tinyint(1) DEFAULT '1',
  `balance` float DEFAULT '0',
  `customer_since` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `dogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `breed` varchar(255) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `dogs_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `type` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `amount` float NOT NULL,
  `balance_after` float NOT NULL,
  `booked_by_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `booked_by_id` (`booked_by_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`booked_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `achievements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `requirement_id` varchar(255) NOT NULL,
  `date_achieved` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `transaction_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id_requirement_id` (`user_id`,`requirement_id`),
  KEY `user_id` (`user_id`),
  KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `achievements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `achievements_ibfk_2` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_type` varchar(100) NOT NULL,
  `upload_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `file_path` varchar(512) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Fügen Sie hier einige Beispieldaten ein, damit die App nicht leer ist --
INSERT INTO `users` (`name`, `email`, `hashed_password`, `role`, `is_active`, `balance`) VALUES
('Admin Account', 'admin@pfotencard.de', '$2b$12$EixZaYVK1gSo9vS.D.rZa.9.DxV2a.2iHnsy.j5wZ.kZ3c8.r9h3S', 'admin', 1, 0),
('Mitarbeiter Max', 'max@pfotencard.de', '$2b$12$EixZaYVK1gSo9vS.D.rZa.9.DxV2a.2iHnsy.j5wZ.kZ3c8.r9h3S', 'mitarbeiter', 1, 0),
('Sabine Mustermann', 'sabine@email.com', '$2b$12$EixZaYVK1gSo9vS.D.rZa.9.DxV2a.2iHnsy.j5wZ.kZ3c8.r9h3S', 'kunde', 1, 150),
('Jörg Schmidt', 'joerg@email.com', '$2b$12$EixZaYVK1gSo9vS.D.rZa.9.DxV2a.2iHnsy.j5wZ.kZ3c8.r9h3S', 'kunde', 1, 55.5);

INSERT INTO `dogs` (`owner_id`, `name`, `breed`, `birth_date`) VALUES
(3, 'Bello', 'Golden Retriever', '2022-05-10'),
(4, 'Hasso', 'Schäferhund-Mix', '2021-01-20');

-- Das Passwort für alle ist 'passwort' --
