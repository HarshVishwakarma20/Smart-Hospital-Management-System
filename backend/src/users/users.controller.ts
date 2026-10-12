import { Request, Response } from 'express';
import prisma from '../config/db';

export const getPatients = async (req: Request, res: Response) => {
  try {
    const patients = await prisma.user.findMany({
      where: { role: 'PATIENT' },
      select: {
        id: true,
        name: true,
        email: true,
      }
    });
    res.json(patients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
