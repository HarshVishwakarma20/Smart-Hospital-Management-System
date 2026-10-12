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
- Advanced EHR, Pharmacy, Billing, and Bed/Ward management are intentionally not implemented as per the academic prototype scope.
- Double-booking prevention uses sequential transaction checks; an advanced real-world system might use stronger database-level locks (e.g. `SELECT ... FOR UPDATE`).
- Notification services (Email/SMS) are mocked/omitted.

## ✅ Testing Commands for the Next Phase
The test suite scaffolding has been set up with Jest and Supertest in the backend. When you are ready for the formal testing phase, use:
```bash
cd backend
npm run test
```
*(Note: Complete tests should be implemented in the testing phase)*
