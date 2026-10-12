import { Router } from 'express';
import { getPatients } from './users.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/patients', requireAuth, requireRole('RECEPTIONIST', 'ADMIN'), getPatients);

export default router;
