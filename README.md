# Smart Hospital Management System (SHMS) - Academic Prototype

This project is a functional, well-structured academic prototype of a Smart Hospital Management System. It implements a core subset of the features defined in the SRS (Module 1: Authentication & RBAC, Module 2: Appointment & Scheduling).

## 🚀 Implemented Modules

### Module 1: Authentication and Role-Based Access Control (RBAC)
- Secure JWT-based authentication.
- Passwords hashed via `bcrypt`.
- Role-specific dashboards (Patient, Doctor, Receptionist, Admin).
- Protected API routes enforcing role validation.
- Endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.

### Module 2: Appointment and Scheduling
- Display available doctors.
- Fetch and view doctor availability slots for a given date.
- Book appointments (Patient self-booking, Receptionist assisted booking).
- Cancellation with access checks.
- Dashboards for viewing own/assigned appointments.
- Endpoints: `GET /api/doctors`, `GET /api/doctors/:id/availability`, `GET /api/appointments`, `POST /api/appointments`, `PUT /api/appointments/:id/cancel`.

### Module 3: Patient Medical Records Management (Electronic Health Records — EHR)
- Fully functional, HIPAA/SRS-compliant digital medical records management module.
- Longitudinal medical record history capturing symptoms/chief complaint, diagnosis, treatment notes, prescriptions, and follow-up schedules.
- Strict server-side RBAC and medical privacy:
  - **Doctors**: Can create records for treated patients, update records they authored, archive records, and access patients with an established treatment relationship.
  - **Patients**: Can read-only view their own longitudinal medical records history and consultation details. Cross-patient access attempts are strictly blocked.
  - **Receptionists & Admins**: Strictly prohibited from accessing confidential medical record contents (403 Forbidden).
- Permanent audit retention (SRS Section 5.2 Safety Requirement): Physical deletion is disabled; records are safely archived/marked inactive (`isArchived: true`).
- Endpoints:
  - `POST /api/medical-records` — Create a new clinical medical record (Doctor only).
  - `GET /api/medical-records` — List accessible medical records (filtered by role & authorized treatment relationships).
  - `GET /api/medical-records/:id` — Get specific medical record details (authorized Patient/Doctor).
  - `GET /api/medical-records/patient/:patientId` — View a patient's complete medical history (Doctor treating patient, or Patient viewing self).
  - `GET /api/medical-records/my-patients` — List patients with active treatment relationships (Doctor only).
  - `PUT /api/medical-records/:id` — Update medical record (authoring Doctor only).
  - `PUT /api/medical-records/:id/archive` & `DELETE /api/medical-records/:id` — Safely archive a medical record (authoring Doctor only).

## 🛠️ Technology Stack
- **Frontend**: React, TypeScript, Vite, React Router, Tailwind CSS, Axios, Lucide React (Icons).
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Zod, JWT, bcrypt.

## 📂 Repository Structure
```
Smart-Hospital-Management-System/
├── doc/
│   └── 2024300269_SRS_EXP1_D3.pdf
├── frontend/ (React UI)
│   ├── src/ (pages, components, layouts, context, services)
│   ├── tailwind.config.js
│   ├── .env.example
│   └── package.json
├── backend/ (Express API)
│   ├── src/ (auth, appointments, doctors, users, middleware, config)
│   ├── prisma/ (schema.prisma, seed.ts)
│   ├── .env.example
│   └── package.json
├── README.md
└── .gitignore
```

## ⚙️ Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running locally.
- A running PostgreSQL database (default assumed connection string: `postgresql://postgres:postgres@localhost:5432/shms?schema=public`).

If you do not have PostgreSQL installed, download it from [PostgreSQL Official Website](https://www.postgresql.org/download/). On Windows, ensure the service is running and you have created a database named `shms`.

## 🛠️ Dependency Installation & Setup

1. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

## 🔒 Environment Variable Setup

Copy the `.env.example` templates to `.env` in both folders.

**Backend (`backend/.env`)**
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/shms?schema=public"
JWT_SECRET="super-secret-jwt-key-replace-in-production"
JWT_EXPIRES_IN="1d"
FRONTEND_URL="http://localhost:5173"
```
*Make sure to change `DATABASE_URL` credentials if your local PostgreSQL uses a different user/password.*

**Frontend (`frontend/.env`)**
```env
VITE_API_URL=http://localhost:5000/api
```

## 🗄️ PostgreSQL Configuration, Migration & Seeding

Ensure your PostgreSQL instance is running and the database matches your `DATABASE_URL`.
```bash
cd backend
# 1. Generate Prisma Client
npx prisma generate

# 2. Run Database Migrations
npx prisma migrate dev --name init

# 3. Seed Sample Data
npm run prisma:seed
```

### 🧑‍💻 Development-only Sample Credentials
After seeding, you can log in using these accounts (password for all is `password123`):
- **Patient**: `patient1@shms.local` / `patient2@shms.local`
- **Doctor**: `doctor1@shms.local` / `doctor2@shms.local`
- **Receptionist**: `receptionist@shms.local`
- **Admin**: `admin@shms.local`

## ▶️ Starting the Application

**Start the Backend (API Server)**
```bash
cd backend
npm run dev
```

**Start the Frontend (UI)**
```bash
cd frontend
npm run dev
```

The frontend will be available at [http://localhost:5173](http://localhost:5173).

## ⚠️ Known Limitations
- Stateless JWT is used. Real token invalidation (logout) relies on client-side token deletion.
- Pharmacy inventory, Billing/Payments, and Bed/Ward allocation remain out of scope for this release.
- Double-booking prevention uses sequential transaction checks; an advanced enterprise system might use stronger database-level locks (e.g. `SELECT ... FOR UPDATE`).
- Notification services (Email/SMS) are mocked/omitted.

## ✅ Automated Testing
The system includes automated integration test suites with Jest and Supertest covering:
- **Module 1**: Authentication & RBAC (13 tests)
- **Module 2**: Appointment & Scheduling (12 tests)
- **Module 3**: Patient Medical Records Management (EHR) (19 tests)
Total: **44 tests passing**.

Run the test suite with:
```bash
cd backend
npm test
```

## 📋 Manual Demonstration Sequence
1. **Login as Doctor**: Log in with `doctor1@shms.local` / `password123`.
2. **Access EHR Module**: Click on **Medical Records (EHR)** in the header navigation or the dashboard card.
3. **Create Medical Record**: Click **Create Medical Record**, select patient `John Doe`, enter diagnosis (e.g., `Acute Bronchitis`), symptoms, treatment notes, prescription, and submit.
4. **View & Update Record**: View the created clinical record details. Click **Edit Record**, amend treatment notes, and verify changes persist.
5. **Verify Patient Access**: Log out and log in as `patient1@shms.local` / `password123`. Open **Medical Records (EHR)** and verify Patient 1 sees their consultation history and detailed notes (read-only).
6. **Verify Cross-Patient Isolation**: Log out and log in as `patient2@shms.local` / `password123`. Verify Patient 2 cannot see Patient 1's records. Attempting direct API request to `/api/medical-records/:id` returns `403 Forbidden`.
7. **Verify Receptionist Restriction**: Log in as `receptionist@shms.local` / `password123`. Notice that the header contains no Medical Records link. Directly browsing to `http://localhost:5173/medical-records` shows `Access Denied`.
8. **Verify Core Regressions**: Test appointment booking for Patient 1 with Doctor 2; verify appointment scheduling and cancellation continue to work seamlessly.
