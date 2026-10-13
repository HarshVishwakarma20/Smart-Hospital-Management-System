import { Router } from 'express';
import {
  createMedicalRecord,
  getMedicalRecords,
  getMedicalRecordById,
  getPatientMedicalHistory,
  updateMedicalRecord,
  archiveMedicalRecord,
  getMyTreatedPatients,
} from './medical-records.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Doctor helper: Get patients treated by this doctor
router.get('/my-patients', requireAuth, getMyTreatedPatients);

// Patient medical history: Detailed history for a given patient
router.get('/patient/:patientId', requireAuth, getPatientMedicalHistory);

// List accessible medical records
router.get('/', requireAuth, getMedicalRecords);

// Create a new medical record (Doctor only)
router.post('/', requireAuth, createMedicalRecord);

// Get single medical record by ID
router.get('/:id', requireAuth, getMedicalRecordById);

// Update medical record (Authorized Doctor only)
router.put('/:id', requireAuth, updateMedicalRecord);

// Archive medical record (Authorized Doctor only) - soft delete
router.put('/:id/archive', requireAuth, archiveMedicalRecord);
router.delete('/:id', requireAuth, archiveMedicalRecord);

export default router;
