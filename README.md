# Smart Hospital Management System (SHMS)

## Overview

The Smart Hospital Management System (SHMS) is a web-based application prototype designed to simplify hospital operations by providing secure access to hospital services and managing patient appointments.

The system follows a three-tier architecture consisting of a presentation layer, an application layer, and a database layer.

## Project Scope

This prototype focuses on implementing and testing two core modules:

1. **Authentication and Role-Based Access Control (RBAC)** — provides user login, secure authentication, and access to features based on user roles.
2. **Appointment and Scheduling** — allows users to view doctors, check availability, book appointments, view scheduled appointments, and cancel bookings.

Other modules described in the broader hospital management system requirements are outside the scope of this prototype.

## User Roles

The prototype is planned to support the following roles:

* **Patient:** View available doctors, book appointments, and manage personal appointments.
* **Doctor:** View appointments and manage availability.
* **Receptionist:** Assist patients with appointment booking.
* **Administrator:** Manage users and access administrative functions.

## Planned Technology Stack

| Component        | Technology                   |
| ---------------- | ---------------------------- |
| Frontend         | React with TypeScript        |
| Styling          | Tailwind CSS                 |
| Backend          | Node.js and Express          |
| Database         | PostgreSQL                   |
| ORM              | Prisma                       |
| Authentication   | JSON Web Tokens (JWT)        |
| Password Hashing | bcrypt                       |
| Validation       | Zod                          |
| Testing          | Jest, Supertest, and Postman |
| Version Control  | Git and GitHub               |

## Key Features

### Authentication and RBAC

* User login and authentication.
* Password hashing.
* Role-based authorization.
* Protected routes and endpoints.
* Appropriate responses for unauthorized access.

### Appointment and Scheduling

* View available doctors.
* Check doctor availability.
* Book appointments.
* View scheduled appointments.
* Cancel appointments.
* Prevent duplicate bookings for the same doctor and time slot.

## Testing Plan

The implemented modules will be tested through:

* Unit testing of authentication, authorization, and appointment logic.
* API testing of login, doctor availability, and appointment endpoints.
* Integration testing of the appointment booking workflow.
* Negative testing for invalid credentials, unauthorized access, and double booking.

## Project Structure

The planned project structure is:

```text
SmartHospitalManagementSystem/
├── frontend/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── appointments/
│   │   └── doctors/
│   ├── prisma/
│   └── tests/
├── .gitignore
└── README.md
```

The structure may evolve during implementation.

## Getting Started

Setup and execution instructions will be added as the frontend, backend, and database are implemented.

## Project Status

**Status:** In development.

This project is an academic prototype. The planned features and technologies may be adjusted during implementation and testing.

## Contributors

Add the names of the project team members here.

## License

Add the selected project license here.
