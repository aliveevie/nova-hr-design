# Simple HR System Requirements

## Management-Level Functional & Technical Specification

Version: 1.0\
Status: Implementation Ready

------------------------------------------------------------------------

# 1. System Overview

## 1.1 Purpose

The Simple HR System is a web-based Human Resource Management System
designed to automate and manage employee lifecycle processes including
recruitment, attendance, payroll, performance tracking, and reporting.

## 1.2 Target Users

-   HR Administrators\
-   Managers / Department Heads\
-   Employees

## 1.3 System Type

-   Web-based application\
-   Role-based access control\
-   Secure and auditable

------------------------------------------------------------------------

# 2. Core Modules & Functional Requirements

------------------------------------------------------------------------

# 2.1 Employee Records Management

## Objective

Centralized storage and management of all employee information.

## Functional Requirements

-   Create, update, deactivate employee profiles
-   Store:
    -   Full name
    -   Date of birth
    -   Gender
    -   Phone and email
    -   Address
    -   Employment status
    -   Job title
    -   Department
    -   Grade/Level
    -   Date of employment
-   Upload and store documents:
    -   Government ID
    -   Certificates
    -   Employment contract
-   Store next-of-kin details:
    -   Name
    -   Relationship
    -   Phone number
    -   Address

## Implementation Notes

-   Use relational database structure
-   Support file upload with secure storage
-   Include soft-delete (do not permanently delete employee data)

------------------------------------------------------------------------

# 2.2 Recruitment & Onboarding

## Objective

Digitize recruitment workflow and new employee onboarding.

## Functional Requirements

-   Applicant registration
-   Track application status:
    -   Applied
    -   Shortlisted
    -   Interviewed
    -   Offered
    -   Hired
    -   Rejected
-   Store interview notes
-   Generate offer letters (PDF export)
-   Onboarding checklist:
    -   Document submission
    -   Account creation
    -   Equipment assignment
    -   Orientation completion

## Implementation Notes

-   Applicant table separate from Employee table
-   Convert applicant to employee upon hiring
-   Use template-based offer letter generation

------------------------------------------------------------------------

# 2.3 Attendance & Leave Management

## Objective

Track daily attendance and manage employee leave.

## Attendance Requirements

-   Daily attendance logging:
    -   Check-in time
    -   Check-out time
    -   Late status
    -   Absent status
-   Monthly attendance summary
-   Manual override by HR

## Leave Requirements

-   Leave types:
    -   Annual leave
    -   Sick leave
    -   Maternity leave
    -   Casual leave
-   Leave application submission
-   Manager approval workflow
-   Leave balance auto-calculation
-   Exclude holidays from leave calculation

------------------------------------------------------------------------

# 2.4 Payroll Management

## Objective

Automate salary computation and payroll reporting.

## Functional Requirements

-   Salary structure:
    -   Basic salary
    -   Allowances
-   Deductions:
    -   Tax
    -   Pension
    -   NHIA
    -   Loans
-   Automatic payroll calculation
-   Payslip generation (PDF)
-   Bank payment export (CSV/Excel)

## Implementation Notes

-   Monthly payroll cycle
-   Payroll locking after approval
-   Maintain payroll history

------------------------------------------------------------------------

# 2.5 Performance Management

## Functional Requirements

-   Appraisal form creation
-   KPI assignment
-   Performance review records
-   Promotion tracking
-   Salary increment tracking

------------------------------------------------------------------------

# 2.6 Training & Development

## Functional Requirements

-   Training history per employee
-   Certification tracking
-   Training completion status

------------------------------------------------------------------------

# 2.7 Disciplinary & Compliance

## Functional Requirements

-   Warning letters
-   Query issuance
-   Disciplinary records
-   Policy compliance tracking

------------------------------------------------------------------------

# 2.8 Reports

## Standard Reports

-   Staff list
-   Attendance report
-   Payroll report
-   Leave report
-   Performance report

## Export Options

-   PDF
-   Excel (XLSX)
-   CSV

------------------------------------------------------------------------

# 2.9 Holiday & Notification Management

## Functional Requirements

-   Public holiday calendar
-   Company holiday calendar
-   Automatic employee notifications
-   Exclude holidays from attendance and leave calculations
-   HR can add, edit, or delete holidays

------------------------------------------------------------------------

# 2.10 User Roles & Security

## Roles

-   HR Admin
-   Manager
-   Employee

## Security Requirements

-   Role-based access control
-   Password authentication
-   Data encryption
-   Audit trail logging
-   Scheduled data backup

------------------------------------------------------------------------

# 2.11 Employee Self-Service Portal

## Features

-   View payslips
-   Apply for leave
-   View attendance records
-   Update profile (subject to HR approval)

------------------------------------------------------------------------

# 3. Technical Requirements

## Architecture

-   Backend: RESTful API
-   Frontend: Web UI (responsive)
-   Database: Relational (PostgreSQL/MySQL)
-   File Storage: Secure document storage

## Non-Functional Requirements

-   Secure authentication
-   Scalable architecture
-   Data integrity validation
-   High availability
-   Backup & disaster recovery

------------------------------------------------------------------------

# 4. Implementation Guidance for LLM

When implementing: 1. Build modular architecture per section. 2. Create
separate database tables for each module. 3. Implement role-based
authorization middleware. 4. Ensure audit logs for sensitive operations.
5. Validate all inputs. 6. Support export functionality. 7. Design UI
per module separation. 8. Write unit tests for payroll and leave
calculations.

------------------------------------------------------------------------

End of Document
