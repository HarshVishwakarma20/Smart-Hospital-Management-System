import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashPassword = async (password: string) => bcrypt.hash(password, 10);
  const commonPassword = await hashPassword('password123');

  console.log('Seeding users...');
  
  const p1 = await prisma.user.upsert({
    where: { email: 'patient1@shms.local' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'patient1@shms.local',
      passwordHash: commonPassword,
      role: 'PATIENT',
    },
  });

  const p2 = await prisma.user.upsert({
    where: { email: 'patient2@shms.local' },
    update: {},
    create: {
      name: 'Jane Smith',
      email: 'patient2@shms.local',
      passwordHash: commonPassword,
      role: 'PATIENT',
    },
  });

  const d1 = await prisma.user.upsert({
    where: { email: 'doctor1@shms.local' },
    update: {},
    create: {
      name: 'Dr. Alice Brown',
      email: 'doctor1@shms.local',
      passwordHash: commonPassword,
      role: 'DOCTOR',
    },
  });

  const d2 = await prisma.user.upsert({
    where: { email: 'doctor2@shms.local' },
    update: {},
    create: {
      name: 'Dr. Robert Clark',
      email: 'doctor2@shms.local',
      passwordHash: commonPassword,
      role: 'DOCTOR',
    },
  });

  const r1 = await prisma.user.upsert({
    where: { email: 'receptionist@shms.local' },
    update: {},
    create: {
      name: 'Sarah Connor',
      email: 'receptionist@shms.local',
      passwordHash: commonPassword,
      role: 'RECEPTIONIST',
    },
  });

  const a1 = await prisma.user.upsert({
    where: { email: 'admin@shms.local' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@shms.local',
      passwordHash: commonPassword,
      role: 'ADMIN',
    },
  });

  console.log('Seeding availability...');
  // Create slots for the next 7 days for Dr. Alice
  const dates = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  for (const date of dates) {
    const slots = ['09:00', '09:30', '10:00', '10:30', '11:00'];
    for (const slot of slots) {
      const [h, m] = slot.split(':');
      let endM = parseInt(m) + 30;
      let endH = parseInt(h);
      if (endM >= 60) {
         endH += 1;
         endM -= 60;
      }
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
      
      await prisma.doctorAvailability.upsert({
        where: { doctorId_date_startTime: { doctorId: d1.id, date, startTime: slot } },
        update: {},
        create: {
          doctorId: d1.id,
          date,
          startTime: slot,
          endTime,
        },
      });

      await prisma.doctorAvailability.upsert({
        where: { doctorId_date_startTime: { doctorId: d2.id, date, startTime: slot } },
        update: {},
        create: {
          doctorId: d2.id,
          date,
          startTime: slot,
          endTime,
        },
      });
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
