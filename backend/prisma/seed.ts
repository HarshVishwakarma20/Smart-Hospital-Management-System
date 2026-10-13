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

  console.log('Seeding demo appointments and medical records...');
  const pastDate1 = new Date();
  pastDate1.setDate(pastDate1.getDate() - 3);
  pastDate1.setHours(0, 0, 0, 0);

  const pastDate2 = new Date();
  pastDate2.setDate(pastDate2.getDate() - 1);
  pastDate2.setHours(0, 0, 0, 0);

  const futureFollowUp = new Date();
  futureFollowUp.setDate(futureFollowUp.getDate() + 7);
  futureFollowUp.setHours(0, 0, 0, 0);

  // Demo Appointment 1: Doctor Alice with Patient John
  const demoApp1Id = '00000000-0000-4000-8000-000000000001';
  await prisma.appointment.upsert({
    where: { id: demoApp1Id },
    update: {
      startTime: '15:00',
      endTime: '15:30',
    },
    create: {
      id: demoApp1Id,
      patientId: p1.id,
      doctorId: d1.id,
      date: pastDate1,
      startTime: '15:00',
      endTime: '15:30',
      status: 'COMPLETED',
    },
  });

  // Demo Medical Record 1: Dr. Alice Brown -> John Doe
  const demoRec1Id = '00000000-0000-4000-8000-000000000002';
  await prisma.medicalRecord.upsert({
    where: { id: demoRec1Id },
    update: {},
    create: {
      id: demoRec1Id,
      patientId: p1.id,
      doctorId: d1.id,
      appointmentId: demoApp1Id,
      recordDate: pastDate1,
      symptoms: 'Persistent dry cough, mild sore throat, and low-grade fever for 4 days.',
      diagnosis: 'Acute Upper Respiratory Tract Infection (URTI)',
      treatmentNotes: 'Patient advised warm fluid intake, salt-water gargles 3x daily, and adequate hydration.',
      prescription: 'Tab. Paracetamol 650mg TDS PRN, Tab. Cetirizine 10mg OD HS for 5 days.',
      followUpDate: futureFollowUp,
      isArchived: false,
    },
  });

  // Demo Appointment 2: Doctor Robert with Patient Jane
  const demoApp2Id = '00000000-0000-4000-8000-000000000003';
  await prisma.appointment.upsert({
    where: { id: demoApp2Id },
    update: {
      startTime: '15:30',
      endTime: '16:00',
    },
    create: {
      id: demoApp2Id,
      patientId: p2.id,
      doctorId: d2.id,
      date: pastDate2,
      startTime: '15:30',
      endTime: '16:00',
      status: 'COMPLETED',
    },
  });

  // Demo Medical Record 2: Dr. Robert Clark -> Jane Smith
  const demoRec2Id = '00000000-0000-4000-8000-000000000004';
  await prisma.medicalRecord.upsert({
    where: { id: demoRec2Id },
    update: {},
    create: {
      id: demoRec2Id,
      patientId: p2.id,
      doctorId: d2.id,
      appointmentId: demoApp2Id,
      recordDate: pastDate2,
      symptoms: 'Mild epigastric pain and dyspepsia after meals, aggravated by spicy food.',
      diagnosis: 'Mild Gastritis',
      treatmentNotes: 'Dietary counselling provided: avoid trigger foods and late dinners.',
      prescription: 'Cap. Pantoprazole 40mg OD before breakfast for 14 days, Antacid gel 10ml TDS post-meal.',
      followUpDate: null,
      isArchived: false,
    },
  });

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
