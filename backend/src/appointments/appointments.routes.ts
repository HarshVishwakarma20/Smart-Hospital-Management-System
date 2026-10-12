import { Router } from 'express';
import { bookAppointment, getAppointments, cancelAppointment } from './appointments.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/', requireAuth, bookAppointment);
router.get('/', requireAuth, getAppointments);
router.put('/:id/cancel', requireAuth, cancelAppointment);

export default router;
