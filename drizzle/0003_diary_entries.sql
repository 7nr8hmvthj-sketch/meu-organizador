-- Migration: Add diary_entries table
-- Description: Creates table for storing personal diary entries with markdown support and tags

CREATE TABLE IF NOT EXISTS `diary_entries` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `userId` INT NOT NULL,
    `date` DATE NOT NULL,
    `title` VARCHAR(255),
    `content` TEXT,
    `tags` VARCHAR(500),
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    UNIQUE KEY `unique_user_date` (`userId`, `date`),
    INDEX `idx_user_id` (`userId`),
    INDEX `idx_date` (`date`),
    INDEX `idx_user_date` (`userId`, `date`)
);
