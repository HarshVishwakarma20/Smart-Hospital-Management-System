import { Router } from 'express';
import {
  getDoctors,
  getDoctorAvailability,
  getMyAvailability,
  createDoctorAvailability,
  deleteDoctorAvailability,
} from './doctors.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getDoctors);
router.get('/my/availability', requireAuth, requireRole('DOCTOR'), getMyAvailability);
router.get('/:id/availability', getDoctorAvailability);
router.post('/availability', requireAuth, requireRole('DOCTOR', 'ADMIN'), createDoctorAvailability);
router.delete('/availability/:id', requireAuth, requireRole('DOCTOR', 'ADMIN'), deleteDoctorAvailability);

export default router;
