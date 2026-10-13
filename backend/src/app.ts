import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './auth/auth.routes';
import doctorRoutes from './doctors/doctors.routes';
import appointmentRoutes from './appointments/appointments.routes';

import userRoutes from './users/users.routes';
import medicalRecordRoutes from './medical-records/medical-records.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);

// Error handling
app.use(errorHandler);

export default app;
