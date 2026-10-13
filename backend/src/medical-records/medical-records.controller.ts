import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createRecordSchema = z.object({
  patientId: z.string().regex(uuidRegex, 'Invalid patient ID format'),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'recordDate must be in YYYY-MM-DD format'),
  symptoms: z.string().trim().min(1, 'Symptoms / chief complaint is required'),
  diagnosis: z.string().trim().min(1, 'Diagnosis is required'),
  treatmentNotes: z.string().trim().min(1, 'Treatment notes are required'),
  prescription: z.string().trim().min(1, 'Prescription / medication instructions are required'),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'followUpDate must be in YYYY-MM-DD format').optional().nullable(),
  appointmentId: z.string().regex(uuidRegex, 'Invalid appointment ID format').optional().nullable(),
});

const updateRecordSchema = z.object({
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'recordDate must be in YYYY-MM-DD format').optional(),
  symptoms: z.string().trim().min(1, 'Symptoms cannot be empty').optional(),
  diagnosis: z.string().trim().min(1, 'Diagnosis cannot be empty').optional(),
  treatmentNotes: z.string().trim().min(1, 'Treatment notes cannot be empty').optional(),
  prescription: z.string().trim().min(1, 'Prescription cannot be empty').optional(),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'followUpDate must be in YYYY-MM-DD format').optional().nullable(),
});

/**
 * Helper to verify whether a doctor has an established treatment relationship with a patient.
 * A relationship exists if:
 * 1. The patient has had an appointment with this doctor, OR
 * 2. The doctor has already authored a medical record for this patient.
 */
async function checkDoctorPatientRelationship(doctorId: string, patientId: string): Promise<boolean> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      doctorId,
      patientId,
    },
  });
  if (appointment) return true;

  const priorRecord = await prisma.medicalRecord.findFirst({
    where: {
      doctorId,
      patientId,
    },
  });
  return !!priorRecord;
}

/**
 * POST /api/medical-records
 * Create a new medical record (Doctor only).
 */
export const createMedicalRecord = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (user.role !== 'DOCTOR') {
      return res.status(403).json({ message: 'Only authorized doctors can create medical records' });
    }

    const body = createRecordSchema.parse(req.body);

    const recordDateObj = new Date(body.recordDate + 'T00:00:00.000Z');
    if (isNaN(recordDateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid record date' });
    }

    let followUpDateObj: Date | null = null;
    if (body.followUpDate) {
      followUpDateObj = new Date(body.followUpDate + 'T00:00:00.000Z');
      if (isNaN(followUpDateObj.getTime())) {
        return res.status(400).json({ message: 'Invalid follow-up date' });
      }
      if (body.followUpDate < body.recordDate) {
        return res.status(400).json({ message: 'Follow-up date cannot be earlier than record date' });
      }
    }

    // Verify patient exists and is a PATIENT
    const patient = await prisma.user.findUnique({
      where: { id: body.patientId, role: 'PATIENT' },
    });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Validate appointment link if supplied
    if (body.appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: body.appointmentId },
      });
      if (!appointment) {
        return res.status(404).json({ message: 'Referenced appointment not found' });
      }
      if (appointment.doctorId !== user.id) {
        return res.status(403).json({ message: 'You are not the doctor assigned to this appointment' });
      }
      if (appointment.patientId !== body.patientId) {
        return res.status(400).json({ message: 'Referenced appointment does not belong to this patient' });
      }
    } else {
      // If no appointmentId is given, ensure an established treatment relationship exists
      const isAuthorized = await checkDoctorPatientRelationship(user.id, body.patientId);
      if (!isAuthorized) {
        return res.status(403).json({
          message: 'Doctor is not authorized to create records for a patient without an established appointment or treatment relationship',
        });
      }
    }

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: body.patientId,
        doctorId: user.id, // Strictly derived from JWT, never client payload
        recordDate: recordDateObj,
        symptoms: body.symptoms,
        diagnosis: body.diagnosis,
        treatmentNotes: body.treatmentNotes,
        prescription: body.prescription,
        followUpDate: followUpDateObj,
        appointmentId: body.appointmentId || null,
      },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true } },
        appointment: { select: { id: true, date: true, startTime: true, status: true } },
      },
    });

    res.status(201).json(record);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    console.error('Error creating medical record:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * GET /api/medical-records
 * List accessible medical records.
 */
export const getMedicalRecords = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (user.role === 'RECEPTIONIST' || user.role === 'ADMIN') {
      return res.status(403).json({
        message: 'Access denied. Medical records are confidential health information restricted to patients and treating doctors.',
      });
    }

    const patientIdQuery = req.query.patientId as string | undefined;

    if (user.role === 'PATIENT') {
      if (patientIdQuery && patientIdQuery !== user.id) {
        return res.status(403).json({ message: 'You can only view your own medical records' });
      }

      const records = await prisma.medicalRecord.findMany({
        where: {
          patientId: user.id,
          isArchived: false,
        },
        include: {
          doctor: { select: { id: true, name: true, email: true } },
          appointment: { select: { id: true, date: true, startTime: true } },
        },
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
      });
      return res.json(records);
    }

    if (user.role === 'DOCTOR') {
      if (patientIdQuery) {
        if (!uuidRegex.test(patientIdQuery)) {
          return res.status(400).json({ message: 'Invalid patient ID format' });
        }

        const isAuthorized = await checkDoctorPatientRelationship(user.id, patientIdQuery);
        if (!isAuthorized) {
          return res.status(403).json({ message: 'You are not authorized to view records for this patient' });
        }

        const records = await prisma.medicalRecord.findMany({
          where: {
            patientId: patientIdQuery,
            isArchived: false,
          },
          include: {
            patient: { select: { id: true, name: true, email: true } },
            doctor: { select: { id: true, name: true, email: true } },
            appointment: { select: { id: true, date: true, startTime: true } },
          },
          orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
        });
        return res.json(records);
      }

      // Return all active records managed by this doctor
      const records = await prisma.medicalRecord.findMany({
        where: {
          doctorId: user.id,
          isArchived: false,
        },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: { select: { id: true, name: true, email: true } },
          appointment: { select: { id: true, date: true, startTime: true } },
        },
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
      });
      return res.json(records);
    }

    return res.status(403).json({ message: 'Insufficient permissions' });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * GET /api/medical-records/:id
 * Get a specific medical record by ID.
 */
export const getMedicalRecordById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (user.role === 'RECEPTIONIST' || user.role === 'ADMIN') {
      return res.status(403).json({
        message: 'Access denied. Medical records are confidential health information restricted to patients and treating doctors.',
      });
    }

    const { id } = req.params;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ message: 'Invalid medical record ID format' });
    }

    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true } },
        appointment: { select: { id: true, date: true, startTime: true, status: true } },
      },
    });

    if (!record || record.isArchived) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    if (user.role === 'PATIENT') {
      if (record.patientId !== user.id) {
        return res.status(403).json({ message: 'You are not authorized to view another patient\'s medical record' });
      }
    } else if (user.role === 'DOCTOR') {
      if (record.doctorId !== user.id) {
        const isAuthorized = await checkDoctorPatientRelationship(user.id, record.patientId);
        if (!isAuthorized) {
          return res.status(403).json({ message: 'You are not authorized to view this medical record' });
        }
      }
    } else {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    res.json(record);
  } catch (error) {
    console.error('Error fetching medical record by ID:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * GET /api/medical-records/patient/:patientId
 * View a patient's medical record history.
 */
export const getPatientMedicalHistory = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (user.role === 'RECEPTIONIST' || user.role === 'ADMIN') {
      return res.status(403).json({
        message: 'Access denied. Medical records are confidential health information restricted to patients and treating doctors.',
      });
    }

    const { patientId } = req.params;
    if (!uuidRegex.test(patientId)) {
      return res.status(400).json({ message: 'Invalid patient ID format' });
    }

    if (user.role === 'PATIENT') {
      if (patientId !== user.id) {
        return res.status(403).json({ message: 'You can only view your own medical record history' });
      }
    } else if (user.role === 'DOCTOR') {
      const isAuthorized = await checkDoctorPatientRelationship(user.id, patientId);
      if (!isAuthorized) {
        return res.status(403).json({ message: 'You are not authorized to view this patient\'s medical history' });
      }
    } else {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const patient = await prisma.user.findUnique({
      where: { id: patientId, role: 'PATIENT' },
    });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const records = await prisma.medicalRecord.findMany({
      where: {
        patientId,
        isArchived: false,
      },
      include: {
        doctor: { select: { id: true, name: true, email: true } },
        appointment: { select: { id: true, date: true, startTime: true } },
      },
      orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(records);
  } catch (error) {
    console.error('Error fetching patient medical history:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * PUT /api/medical-records/:id
 * Update an existing medical record (Authorized Doctor only).
 */
export const updateMedicalRecord = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (user.role !== 'DOCTOR') {
      return res.status(403).json({ message: 'Only authorized doctors can modify medical records' });
    }

    const { id } = req.params;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ message: 'Invalid medical record ID format' });
    }

    const body = updateRecordSchema.parse(req.body);

    const record = await prisma.medicalRecord.findUnique({
      where: { id },
    });
    if (!record || record.isArchived) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    // Only the doctor who created the record can update it
    if (record.doctorId !== user.id) {
      return res.status(403).json({ message: 'You can only modify medical records that you created' });
    }

    const effectiveRecordDate = body.recordDate
      ? body.recordDate
      : record.recordDate.toISOString().split('T')[0];

    let updateData: any = {};

    if (body.recordDate) {
      const d = new Date(body.recordDate + 'T00:00:00.000Z');
      if (isNaN(d.getTime())) {
        return res.status(400).json({ message: 'Invalid record date' });
      }
      updateData.recordDate = d;
    }

    if (body.followUpDate !== undefined) {
      if (body.followUpDate === null) {
        updateData.followUpDate = null;
      } else {
        const fud = new Date(body.followUpDate + 'T00:00:00.000Z');
        if (isNaN(fud.getTime())) {
          return res.status(400).json({ message: 'Invalid follow-up date' });
        }
        if (body.followUpDate < effectiveRecordDate) {
          return res.status(400).json({ message: 'Follow-up date cannot be earlier than record date' });
        }
        updateData.followUpDate = fud;
      }
    }

    if (body.symptoms !== undefined) updateData.symptoms = body.symptoms;
    if (body.diagnosis !== undefined) updateData.diagnosis = body.diagnosis;
    if (body.treatmentNotes !== undefined) updateData.treatmentNotes = body.treatmentNotes;
    if (body.prescription !== undefined) updateData.prescription = body.prescription;

    const updated = await prisma.medicalRecord.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true } },
        appointment: { select: { id: true, date: true, startTime: true, status: true } },
      },
    });

    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    console.error('Error updating medical record:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/medical-records/:id or PUT /api/medical-records/:id/archive
 * Safely archive a medical record. Hard permanent deletion is forbidden by SRS 5.2.
 */
export const archiveMedicalRecord = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (user.role !== 'DOCTOR') {
      return res.status(403).json({ message: 'Only authorized doctors can archive medical records' });
    }

    const { id } = req.params;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ message: 'Invalid medical record ID format' });
    }

    const record = await prisma.medicalRecord.findUnique({
      where: { id },
    });
    if (!record || record.isArchived) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    if (record.doctorId !== user.id) {
      return res.status(403).json({ message: 'You can only archive medical records that you created' });
    }

    // Soft delete/archive to preserve immutable clinical history
    await prisma.medicalRecord.update({
      where: { id },
      data: { isArchived: true },
    });

    res.json({
      message: 'Medical record safely archived in accordance with hospital data retention policy',
      id,
    });
  } catch (error) {
    console.error('Error archiving medical record:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * GET /api/medical-records/my-patients
 * Helper endpoint for doctors: List patients treated by this doctor (via appointments or past records)
 */
export const getMyTreatedPatients = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (user.role !== 'DOCTOR') {
      return res.status(403).json({ message: 'Only doctors can access their treated patients list' });
    }

    // Find all appointments for this doctor to identify patients
    const appointments = await prisma.appointment.findMany({
      where: { doctorId: user.id },
      include: {
        patient: { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: 'desc' },
    });

    const patientMap = new Map<string, { patient: { id: string; name: string; email: string }; latestAppointment?: any }>();

    for (const app of appointments) {
      if (!patientMap.has(app.patientId)) {
        patientMap.set(app.patientId, {
          patient: app.patient,
          latestAppointment: {
            id: app.id,
            date: app.date,
            startTime: app.startTime,
            status: app.status,
          },
        });
      }
    }

    // Also include patients from existing medical records
    const records = await prisma.medicalRecord.findMany({
      where: { doctorId: user.id, isArchived: false },
      include: {
        patient: { select: { id: true, name: true, email: true } },
      },
    });

    for (const rec of records) {
      if (!patientMap.has(rec.patientId)) {
        patientMap.set(rec.patientId, {
          patient: rec.patient,
        });
      }
    }

    res.json(Array.from(patientMap.values()));
  } catch (error) {
    console.error('Error fetching treated patients:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
