-- MySQL dump 10.13  Distrib 8.0.32, for Linux (x86_64)
--
-- Host: localhost    Database: ewyjapml_Attendance_System
-- ------------------------------------------------------
-- Server version	8.0.32-cll-lve

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
-- Current Database: `ewyjapml_Attendance_System`
--


--
-- Table structure for table `AttendanceLogs`
--

DROP TABLE IF EXISTS `AttendanceLogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AttendanceLogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_uid` varchar(255) NOT NULL,
  `check_in_time` datetime DEFAULT NULL,
  `check_out_time` datetime DEFAULT NULL,
  `log_date` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `rfid_uid` (`rfid_uid`)
) ENGINE=MyISAM AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AttendanceLogs`
--

LOCK TABLES `AttendanceLogs` WRITE;
/*!40000 ALTER TABLE `AttendanceLogs` DISABLE KEYS */;
INSERT INTO `AttendanceLogs` (`id`, `rfid_uid`, `check_in_time`, `check_out_time`, `log_date`) VALUES (6,'53573013','2024-12-28 17:03:33',NULL,'2024-12-28'),(2,'43BFBB0F',NULL,'2024-12-28 12:29:18','2024-12-28'),(3,'43BFBB0F','2024-12-28 12:29:29',NULL,'2024-12-28'),(5,'43BFBB0F','2024-12-28 17:03:18',NULL,'2024-12-28'),(7,'5E9DD531','2024-12-28 17:05:37',NULL,'2024-12-28'),(8,'5E9DD531',NULL,'2024-12-28 17:07:05','2024-12-28'),(9,'32C89A93','2024-12-28 17:08:15',NULL,'2024-12-28'),(10,'80FB8F33','2024-12-28 17:08:24',NULL,'2024-12-28'),(11,'43BFBB0F',NULL,'2024-12-28 17:08:43','2024-12-28'),(12,'069DF529','2024-12-28 17:10:10',NULL,'2024-12-28'),(13,'32C89A93',NULL,'2024-12-28 19:17:18','2024-12-28'),(14,'53573013',NULL,'2024-12-28 20:05:27','2024-12-28');
/*!40000 ALTER TABLE `AttendanceLogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `EmployeeAttendanceReports`
--

DROP TABLE IF EXISTS `EmployeeAttendanceReports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EmployeeAttendanceReports` (
  `report_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `rfid_uid` varchar(50) NOT NULL,
  `Full_name` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `check_in_time` time DEFAULT NULL,
  `check_out_time` time DEFAULT NULL,
  `io` tinyint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `vacation_balance` tinyint NOT NULL,
  PRIMARY KEY (`report_id`),
  KEY `employee_id` (`employee_id`)
) ENGINE=MyISAM AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `EmployeeAttendanceReports`
--

LOCK TABLES `EmployeeAttendanceReports` WRITE;
/*!40000 ALTER TABLE `EmployeeAttendanceReports` DISABLE KEYS */;
INSERT INTO `EmployeeAttendanceReports` (`report_id`, `employee_id`, `rfid_uid`, `Full_name`, `date`, `check_in_time`, `check_out_time`, `io`, `created_at`, `vacation_balance`) VALUES (1,111,'53573013','رضا سرملی','2024-10-01','17:03:33','20:05:27',0,'2024-10-11 10:00:23',8),(2,222,'43BFBB0F','محمدجواد مختاری','2024-10-02','17:03:18','17:08:43',0,'2024-10-11 10:02:16',8),(3,333,'5E9DD531','علی رشیدی','2024-10-03','17:05:37','17:07:05',0,'2024-10-11 10:03:51',8),(4,444,'32C89A93','علی مهربانی','2024-10-04','17:08:15','19:17:18',0,'2024-10-11 10:05:51',8),(5,555,'80FB8F33','علی مرادی فر','2024-10-05','17:08:24','14:16:38',1,'2024-10-11 10:07:11',0);
/*!40000 ALTER TABLE `EmployeeAttendanceReports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Employees`
--

DROP TABLE IF EXISTS `Employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Employees` (
  `employee_id` int NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `employee_code` varchar(50) NOT NULL,
  `national_number` varchar(50) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `birth_date` date DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `marital_status` enum('متاهل','مجرد','متارکه') DEFAULT 'مجرد',
  `profile_picture` varchar(255) DEFAULT NULL,
  `hire_source` enum('آگهی','معرفی','سایت') DEFAULT 'آگهی',
  `emergency_contact_name` varchar(100) DEFAULT NULL,
  `emergency_contact_phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `national_number` (`national_number`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=112 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Employees`
--

LOCK TABLES `Employees` WRITE;
/*!40000 ALTER TABLE `Employees` DISABLE KEYS */;
INSERT INTO `Employees` (`employee_id`, `full_name`, `employee_code`, `national_number`, `username`, `password`, `birth_date`, `hire_date`, `job_title`, `department`, `phone_number`, `email`, `address`, `marital_status`, `profile_picture`, `hire_source`, `emergency_contact_name`, `emergency_contact_phone`, `created_at`, `updated_at`) VALUES (111,'رضا سرملی','1','1274567898','reza','reza','2001-12-10','2024-10-03','Developer','Manager','09204963846','reza@reza.com','Esfahan','مجرد',NULL,'آگهی','','09130000000','2024-10-11 13:12:53','2024-12-28 08:03:22'),(222,'محمدجواد مختاری','2','123131','mokh','mokh','2001-12-10','2024-10-03','','Manager','','mokh@mokh.com','Esfahan','مجرد',NULL,'معرفی','','09130000000','2024-10-11 13:12:53','2024-12-28 08:04:32'),(333,'علی رشیدی','3','1231312','rashidi','rashidi','2001-12-10','2024-10-03','IOT','Manager','','rashidi@rashidi.com','Esfahan','مجرد',NULL,'معرفی','Fader','09130000000','2024-10-11 13:12:53','2024-12-28 08:05:22'),(444,'علی مهربانی','4','4141413','kind','kind','2001-12-10','2024-10-03','','Manager','','kind@kind.com','Esfahan','مجرد',NULL,'معرفی','','09130000000','2024-10-11 13:12:53','2024-12-28 08:06:06'),(555,'علی مرادی فر','5','45245425','moradi','moradi','2001-12-10','2024-10-03','','Manager','','moradi@moradi.com','Esfahan','مجرد',NULL,'معرفی','','09130000000','2024-10-11 13:12:53','2024-12-28 08:07:02');
/*!40000 ALTER TABLE `Employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `OvertimeRequests`
--

DROP TABLE IF EXISTS `OvertimeRequests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `OvertimeRequests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `overtime_date` date DEFAULT NULL,
  `overtime_hours` int DEFAULT NULL,
  `reason` text,
  `approval_status` enum('منتظر تایید','تایید شده','رد شده') DEFAULT 'منتظر تایید',
  `approved_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `OvertimeRequests`
--

LOCK TABLES `OvertimeRequests` WRITE;
/*!40000 ALTER TABLE `OvertimeRequests` DISABLE KEYS */;
INSERT INTO `OvertimeRequests` (`id`, `employee_id`, `overtime_date`, `overtime_hours`, `reason`, `approval_status`, `approved_by`) VALUES (1,111,'1403-10-07',4,'سسس','منتظر تایید',NULL);
/*!40000 ALTER TABLE `OvertimeRequests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SystemManagers`
--

DROP TABLE IF EXISTS `SystemManagers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SystemManagers` (
  `manager_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`manager_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SystemManagers`
--

LOCK TABLES `SystemManagers` WRITE;
/*!40000 ALTER TABLE `SystemManagers` DISABLE KEYS */;
INSERT INTO `SystemManagers` (`manager_id`, `username`, `password`, `full_name`, `email`, `created_at`, `updated_at`) VALUES (1,'m','m','m','m@m.com','2024-10-11 13:15:36','2024-10-11 14:13:40');
/*!40000 ALTER TABLE `SystemManagers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `User_table`
--

DROP TABLE IF EXISTS `User_table`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `User_table` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'شناسه کارمند',
  `Frist_Name` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT 'نام کارمند',
  `Last_Name` varchar(63) NOT NULL COMMENT 'نام خانوادگی کارمند',
  `National number` bigint NOT NULL COMMENT 'شماره ملی',
  `job_title` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT 'عنوان شغلی',
  `department` varchar(63) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT 'بخش کار کارمند',
  `employment_date` date NOT NULL COMMENT 'تاریخ استخدام',
  `entry_time` datetime NOT NULL,
  `exit_time` datetime NOT NULL,
  `rfid_uid` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT 'شناسه کارت',
  `io` tinyint NOT NULL DEFAULT '0' COMMENT 'وضعیت',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `User_table`
--

LOCK TABLES `User_table` WRITE;
/*!40000 ALTER TABLE `User_table` DISABLE KEYS */;
INSERT INTO `User_table` (`id`, `Frist_Name`, `Last_Name`, `National number`, `job_title`, `department`, `employment_date`, `entry_time`, `exit_time`, `rfid_uid`, `io`) VALUES (1,'رضا','سرملی',1223456788,'Game Developer','technical','2024-10-01','2024-10-10 22:12:39','2024-10-10 22:12:43','53573013',0),(2,'محمدجواد','مختاری',1335465877,'Flutter Developer','technical','2024-10-02','2024-10-10 22:31:17','2024-10-10 22:35:15','43BFBB0F',0),(3,'علی','رشیدی',1273424565,'IOT Developer','Manager','2024-09-30','2024-10-10 22:20:44','2024-10-10 22:35:06','5E9DD531',0),(4,'','',0,'','','0000-00-00','2024-10-10 22:33:25','2024-10-10 22:34:16','32C89A93',0),(5,'','',0,'','','0000-00-00','2024-10-10 22:33:41','2024-10-10 22:33:46','80FB8F33',0);
/*!40000 ALTER TABLE `User_table` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vacation_reports`
--

DROP TABLE IF EXISTS `vacation_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vacation_reports` (
  `vacation_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `vacation_date` date NOT NULL,
  `vacation_type` enum('استحقاقی','استعلاجی','بدون حقوق') NOT NULL,
  `approval_status` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `request_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reason` text,
  `approved_by` varchar(63) DEFAULT NULL,
  PRIMARY KEY (`vacation_id`)
) ENGINE=MyISAM AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vacation_reports`
--

LOCK TABLES `vacation_reports` WRITE;
/*!40000 ALTER TABLE `vacation_reports` DISABLE KEYS */;
INSERT INTO `vacation_reports` (`vacation_id`, `employee_id`, `vacation_date`, `vacation_type`, `approval_status`, `start_date`, `end_date`, `request_date`, `reason`, `approved_by`) VALUES (1,111,'1403-10-07','استحقاقی','تایید شده','1403-10-08 00:00:00','1403-10-11 00:00:00','2024-12-27 13:36:30','xccsaca','مدیر'),(2,222,'1403-10-06','استحقاقی','تایید شده','1403-10-12 00:00:00','1403-10-25 00:00:00','2024-12-27 14:24:57','زسزطس','مدیر'),(17,0,'1403-10-07','بدون حقوق','منتظر تایید','1403-10-22 00:00:00','1403-10-28 00:00:00','2024-12-28 13:47:43','wfdsdasfasffs',NULL);
/*!40000 ALTER TABLE `vacation_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'ewyjapml_Attendance_System'
--

--
-- Dumping routines for database 'ewyjapml_Attendance_System'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-16 16:59:46
