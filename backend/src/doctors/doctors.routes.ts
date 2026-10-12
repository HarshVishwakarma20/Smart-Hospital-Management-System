import { Router } from 'express';
import { getDoctors, getDoctorAvailability } from './doctors.controller';

const router = Router();

router.get('/', getDoctors);
router.get('/:id/availability', getDoctorAvailability);

export default router;
