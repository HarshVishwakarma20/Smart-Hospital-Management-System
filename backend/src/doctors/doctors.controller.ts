import { Request, Response } from 'express';
import prisma from '../config/db';

export const getDoctors = async (req: Request, res: Response) => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'DOCTOR' },
      select: {
        id: true,
        name: true,
        email: true,
      }
    });
    res.json(doctors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getDoctorAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // Expecting YYYY-MM-DD

    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Valid date parameter (YYYY-MM-DD) is required' });
    }

    const doctor = await prisma.user.findUnique({
      where: { id, role: 'DOCTOR' }
    });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const targetDate = new Date(date + 'T00:00:00.000Z');
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date parameter' });
    }
    
    // Get base availability for that date
    const availabilities = await prisma.doctorAvailability.findMany({
      where: {
        doctorId: id,
        date: targetDate,
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Get active bookings for that doctor and date
    const bookings = await prisma.appointment.findMany({
      where: {
        doctorId: id,
        date: targetDate,
        status: 'BOOKED'
      }
    });

    const bookedSlots = bookings.map(b => b.startTime);

    // Assuming we break the availability into fixed slots, but since the model stores specific slots,
    // we can just filter the available slots directly.
    const availableSlots = availabilities.filter(
      a => !bookedSlots.includes(a.startTime)
    );

    // Wait, the SRS mentions slots must be in the future. We can check current time.
    const now = new Date();
    let finalSlots = availableSlots.map(a => ({
      id: a.id,
      startTime: a.startTime,
      endTime: a.endTime,
    }));

    const todayStr = new Date().toISOString().split('T')[0];
    if (date === todayStr) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTime = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
      finalSlots = finalSlots.filter(s => s.startTime > currentTime);
    } else if (date < todayStr) {
      finalSlots = [];
    }

    res.json(finalSlots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
