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

export const getMyAvailability = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'DOCTOR') {
      return res.status(403).json({ message: 'Only doctors can access their own availability schedule' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayUtc = new Date(todayStr + 'T00:00:00.000Z');

    const availabilities = await prisma.doctorAvailability.findMany({
      where: {
        doctorId: user.id,
        date: {
          gte: todayUtc,
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    res.json(availabilities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const createDoctorAvailability = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only doctors and admins can configure availability' });
    }

    const { doctorId: reqDoctorId, date, startTime, endTime, slots } = req.body;
    const doctorId = (user.role === 'ADMIN' && reqDoctorId) ? reqDoctorId : user.id;

    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Valid date parameter (YYYY-MM-DD) is required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) {
      return res.status(400).json({ message: 'Cannot add availability for a past date' });
    }

    const targetDate = new Date(date + 'T00:00:00.000Z');

    // Batch creation
    if (Array.isArray(slots) && slots.length > 0) {
      const created = [];
      for (const slot of slots) {
        const sTime = typeof slot === 'string' ? slot : slot.startTime;
        if (!sTime || !/^\d{2}:\d{2}$/.test(sTime)) continue;

        let eTime = (typeof slot === 'object' && slot.endTime) ? slot.endTime : undefined;
        if (!eTime) {
          const [h, m] = sTime.split(':');
          let endM = parseInt(m) + 30;
          let endH = parseInt(h);
          if (endM >= 60) {
            endH += 1;
            endM -= 60;
          }
          eTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
        }

        const record = await prisma.doctorAvailability.upsert({
          where: {
            doctorId_date_startTime: {
              doctorId,
              date: targetDate,
              startTime: sTime,
            },
          },
          update: { endTime: eTime },
          create: {
            doctorId,
            date: targetDate,
            startTime: sTime,
            endTime: eTime,
          },
        });
        created.push(record);
      }
      return res.status(201).json({ message: `Successfully configured ${created.length} availability slots`, slots: created });
    }

    // Single slot
    if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
      return res.status(400).json({ message: 'Valid startTime (HH:MM) is required' });
    }

    let eTime = endTime;
    if (!eTime) {
      const [h, m] = startTime.split(':');
      let endM = parseInt(m) + 30;
      let endH = parseInt(h);
      if (endM >= 60) {
        endH += 1;
        endM -= 60;
      }
      eTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }

    const record = await prisma.doctorAvailability.upsert({
      where: {
        doctorId_date_startTime: {
          doctorId,
          date: targetDate,
          startTime,
        },
      },
      update: { endTime: eTime },
      create: {
        doctorId,
        date: targetDate,
        startTime,
        endTime: eTime,
      },
    });

    res.status(201).json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteDoctorAvailability = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only doctors and admins can delete availability slots' });
    }

    const { id } = req.params;
    const slot = await prisma.doctorAvailability.findUnique({ where: { id } });
    if (!slot) {
      return res.status(404).json({ message: 'Availability slot not found' });
    }

    if (user.role === 'DOCTOR' && slot.doctorId !== user.id) {
      return res.status(403).json({ message: 'You can only delete your own availability slots' });
    }

    // Check if slot has active booking
    const activeBooking = await prisma.appointment.findFirst({
      where: {
        doctorId: slot.doctorId,
        date: slot.date,
        startTime: slot.startTime,
        status: 'BOOKED',
      },
    });

    if (activeBooking) {
      return res.status(400).json({ message: 'Cannot delete a slot with an active booked appointment' });
    }

    await prisma.doctorAvailability.delete({ where: { id } });
    res.json({ message: 'Slot deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
