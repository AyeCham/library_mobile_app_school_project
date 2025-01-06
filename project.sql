-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 19, 2024 at 04:47 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `project`
--

-- --------------------------------------------------------

--
-- Table structure for table `book`
--

CREATE TABLE `book` (
  `id` int(10) UNSIGNED NOT NULL,
  `book_name` varchar(20) NOT NULL,
  `image` varchar(30) NOT NULL,
  `status` enum('available','borrowed','pending','disable') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `book`
--

INSERT INTO `book` (`id`, `book_name`, `image`, `status`) VALUES
(1, 'SQL Basics', '1.jpg', 'pending'),
(2, 'PHP Essentials', '2.jpg', 'pending'),
(3, 'Database Design', '3.jpg', 'borrowed'),
(4, 'Advanced MySQL', '4.jpg', 'disable'),
(5, 'Java Programming', '5.jpg', 'pending'),
(6, 'Python for Data Scie', '6.jpg', 'available'),
(7, 'Machine Learning', '7.jpg', 'borrowed'),
(8, 'Data Structures', '8.jpg', 'pending'),
(9, 'Cloud Computing', '9.jpg', 'available'),
(10, 'Cybersecurity', '10.jpg', 'available');

-- --------------------------------------------------------

--
-- Table structure for table `history`
--

CREATE TABLE `history` (
  `id` int(10) UNSIGNED NOT NULL,
  `book_id` int(10) UNSIGNED NOT NULL,
  `borrower_id` int(10) UNSIGNED NOT NULL,
  `returner_id` int(10) UNSIGNED DEFAULT NULL,
  `approver_id` int(10) UNSIGNED DEFAULT NULL,
  `request_status` enum('approve','disapprove') DEFAULT NULL,
  `request_date` date NOT NULL,
  `borrow_date` date NOT NULL,
  `return_date` date NOT NULL,
  `approve_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `history`
--

INSERT INTO `history` (`id`, `book_id`, `borrower_id`, `returner_id`, `approver_id`, `request_status`, `request_date`, `borrow_date`, `return_date`, `approve_date`) VALUES
(1, 2, 17, NULL, NULL, NULL, '2024-09-30', '2024-10-01', '2024-10-15', NULL),
(2, 3, 17, NULL, 15, 'approve', '2024-09-14', '2024-09-15', '2024-09-30', '2024-09-15'),
(3, 1, 17, 16, 15, 'approve', '2024-07-31', '2024-08-01', '2024-08-15', '2024-08-01'),
(4, 1, 17, NULL, NULL, NULL, '2024-11-19', '2019-11-24', '2026-11-24', NULL),
(5, 5, 17, NULL, NULL, NULL, '2024-11-19', '2019-11-24', '2026-11-24', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `username` varchar(20) NOT NULL,
  `email` varchar(50) NOT NULL,
  `password` varchar(60) NOT NULL,
  `role` enum('student','staff','lender') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`) VALUES
(15, 'LenderTest', 'LenderTest@gmail.com', '$2b$10$ky2TfI0OCzw86mpdDVTU/.cWb6fCCjwmBbY1aZlxFMXygVRkah4dW', 'lender'),
(16, 'StaffTest', 'StaffTest@gmail.com', '$2b$10$eh5KMDgS661hdMHbm3k1meef.Wo1bGDNwHbvcCKpqi/VtsDtfNHnC', 'staff'),
(17, 'StudentTest', 'StudentTest@gmail.com', '$2b$10$OUIsx28J4g2RdhDMIU9JkuDvhYK6QAx.H8cJ.oxFfCrb7UN8xKAf6', 'student');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `book`
--
ALTER TABLE `book`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `history`
--
ALTER TABLE `history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `book_id` (`book_id`),
  ADD KEY `approver_id` (`approver_id`),
  ADD KEY `borrower_id` (`borrower_id`),
  ADD KEY `history_ibfk_4` (`returner_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `book`
--
ALTER TABLE `book`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `history`
--
ALTER TABLE `history`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `history`
--
ALTER TABLE `history`
  ADD CONSTRAINT `history_ibfk_1` FOREIGN KEY (`book_id`) REFERENCES `book` (`id`),
  ADD CONSTRAINT `history_ibfk_2` FOREIGN KEY (`approver_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `history_ibfk_3` FOREIGN KEY (`borrower_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `history_ibfk_4` FOREIGN KEY (`returner_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
