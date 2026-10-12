import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

const bookSchema = z.object({
  doctorId: z.string().uuid(),
  patientId: z.string().uuid().optional(), // Provided by receptionist
  date: z.string(), // YYYY-MM-DD
  startTime: z.string(), // HH:MM
});

export const bookAppointment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const body = bookSchema.parse(req.body);

    let patientId = user.id;
    if (user.role === 'RECEPTIONIST') {
      if (!body.patientId) return res.status(400).json({ message: 'patientId is required for receptionist booking' });
      patientId = body.patientId;
    } else if (user.role !== 'PATIENT') {
      return res.status(403).json({ message: 'Only patients and receptionists can book appointments' });
    }

    const targetDate = new Date(body.date);
    const now = new Date();
    
    if (targetDate < new Date(now.setHours(0,0,0,0))) {
      return res.status(400).json({ message: 'Cannot book an appointment in the past' });
    }

    if (now.toDateString() === targetDate.toDateString()) {
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTime = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
      if (body.startTime <= currentTime) {
         return res.status(400).json({ message: 'Cannot book an appointment in the past' });
      }
    }

    // Use a transaction to check and book
    const result = await prisma.$transaction(async (tx) => {
      // Validate doctor and availability slot
      const doctor = await tx.user.findUnique({ where: { id: body.doctorId, role: 'DOCTOR' } });
      if (!doctor) throw new Error('DOCTOR_NOT_FOUND');

      const slot = await tx.doctorAvailability.findUnique({
        where: {
          doctorId_date_startTime: {
            doctorId: body.doctorId,
            date: targetDate,
            startTime: body.startTime
          }
        }
      });

      if (!slot) throw new Error('SLOT_NOT_AVAILABLE');

      // Check for double booking
      const existing = await tx.appointment.findFirst({
        where: {
          doctorId: body.doctorId,
          date: targetDate,
          startTime: body.startTime,
          status: 'BOOKED'
        }
      });

      if (existing) throw new Error('SLOT_ALREADY_BOOKED');
      
      // Also ensure patient doesn't have an active appointment at the exact same time
      const patientClash = await tx.appointment.findFirst({
         where: {
           patientId,
           date: targetDate,
           startTime: body.startTime,
           status: 'BOOKED'
         }
      });
      if (patientClash) throw new Error('PATIENT_ALREADY_BOOKED_AT_THIS_TIME');

      const appointment = await tx.appointment.create({
        data: {
          patientId,
          doctorId: body.doctorId,
          date: targetDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: 'BOOKED'
        },
        include: {
          doctor: { select: { name: true } },
          patient: { select: { name: true } }
        }
      });

      return appointment;
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    if (error.message === 'DOCTOR_NOT_FOUND') return res.status(400).json({ message: 'Doctor not found' });
    if (error.message === 'SLOT_NOT_AVAILABLE') return res.status(400).json({ message: 'Doctor is not available at this time' });
    if (error.message === 'SLOT_ALREADY_BOOKED') return res.status(409).json({ message: 'This slot is already booked' });
    if (error.message === 'PATIENT_ALREADY_BOOKED_AT_THIS_TIME') return res.status(409).json({ message: 'Patient already has an appointment at this time' });

    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getAppointments = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let whereClause: any = {};

    if (user.role === 'PATIENT') {
      whereClause.patientId = user.id;
    } else if (user.role === 'DOCTOR') {
      whereClause.doctorId = user.id;
    }
    // RECEPTIONIST and ADMIN can see all appointments

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        doctor: { select: { id: true, name: true, email: true } },
        patient: { select: { id: true, name: true, email: true } }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (appointment.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Appointment is already cancelled' });
    }

    if (user.role === 'PATIENT' && appointment.patientId !== user.id) {
      return res.status(403).json({ message: 'You can only cancel your own appointments' });
    }

    if (user.role === 'DOCTOR' && appointment.doctorId !== user.id) {
      return res.status(403).json({ message: 'You can only cancel appointments assigned to you' });
    }

    // Admin and Receptionist can cancel any appointment

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
