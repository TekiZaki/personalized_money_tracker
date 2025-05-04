-- db.sql (Updated CREATE TABLE)
DROP DATABASE IF EXISTS money_tracker;
CREATE DATABASE IF NOT EXISTS money_tracker;
USE money_tracker;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    amount INT NOT NULL,
    title VARCHAR(100) NULL DEFAULT NULL,       -- Added: Optional title
    description TEXT NULL DEFAULT NULL,       -- Added: Optional description (TEXT for longer content)
    tags VARCHAR(255) NULL DEFAULT NULL,      -- Added: Optional tags (comma-separated?)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Added: Useful for sorting
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);