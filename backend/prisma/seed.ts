import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function getDayDate(daysOffset: number): { dateObj: Date; dateStr: string } {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const dateObj = new Date(dateStr + 'T00:00:00.000Z');
  return { dateObj, dateStr };
}

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

  console.log('Seeding doctor availability for the next 30 days ahead...');
  // Standard full-day consultation slots: morning & afternoon
  const slots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  for (let offset = 0; offset <= 30; offset++) {
    const { dateObj } = getDayDate(offset);

    for (const slot of slots) {
      const [h, m] = slot.split(':');
      let endM = parseInt(m) + 30;
      let endH = parseInt(h);
      if (endM >= 60) {
        endH += 1;
        endM -= 60;
      }
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
      
      // Upsert availability for Dr. Alice Brown (d1)
      await prisma.doctorAvailability.upsert({
        where: { doctorId_date_startTime: { doctorId: d1.id, date: dateObj, startTime: slot } },
        update: { endTime },
        create: {
          doctorId: d1.id,
          date: dateObj,
          startTime: slot,
          endTime,
        },
      });

      // Upsert availability for Dr. Robert Clark (d2)
      await prisma.doctorAvailability.upsert({
        where: { doctorId_date_startTime: { doctorId: d2.id, date: dateObj, startTime: slot } },
        update: { endTime },
        create: {
          doctorId: d2.id,
          date: dateObj,
          startTime: slot,
          endTime,
        },
      });
    }
  }

  console.log('Seeding visible booked appointments ahead for doctors and patients...');
  // 1. Today's Appointments (Visible in Doctor "Today's Schedule" and Patient "My Appointments")
  const todayDate = getDayDate(0).dateObj;
  
  const appToday1Id = '00000000-0000-4000-8000-000000000010';
  await prisma.appointment.upsert({
    where: { id: appToday1Id },
    update: {
      patientId: p1.id,
      doctorId: d1.id,
      date: todayDate,
      startTime: '11:00',
      endTime: '11:30',
      status: 'BOOKED',
    },
    create: {
      id: appToday1Id,
      patientId: p1.id,
      doctorId: d1.id,
      date: todayDate,
      startTime: '11:00',
      endTime: '11:30',
      status: 'BOOKED',
    },
  });

  const appToday2Id = '00000000-0000-4000-8000-000000000011';
  await prisma.appointment.upsert({
    where: { id: appToday2Id },
    update: {
      patientId: p2.id,
      doctorId: d2.id,
      date: todayDate,
      startTime: '16:00',
      endTime: '16:30',
      status: 'BOOKED',
    },
    create: {
      id: appToday2Id,
      patientId: p2.id,
      doctorId: d2.id,
      date: todayDate,
      startTime: '16:00',
      endTime: '16:30',
      status: 'BOOKED',
    },
  });

  // 2. Tomorrow's Appointments (Day +1)
  const tomorrowDate = getDayDate(1).dateObj;
  
  const appTom1Id = '00000000-0000-4000-8000-000000000012';
  await prisma.appointment.upsert({
    where: { id: appTom1Id },
    update: {
      patientId: p2.id,
      doctorId: d1.id,
      date: tomorrowDate,
      startTime: '09:30',
      endTime: '10:00',
      status: 'BOOKED',
    },
    create: {
      id: appTom1Id,
      patientId: p2.id,
      doctorId: d1.id,
      date: tomorrowDate,
      startTime: '09:30',
      endTime: '10:00',
      status: 'BOOKED',
    },
  });

  const appTom2Id = '00000000-0000-4000-8000-000000000013';
  await prisma.appointment.upsert({
    where: { id: appTom2Id },
    update: {
      patientId: p1.id,
      doctorId: d2.id,
      date: tomorrowDate,
      startTime: '10:30',
      endTime: '11:00',
      status: 'BOOKED',
    },
    create: {
      id: appTom2Id,
      patientId: p1.id,
      doctorId: d2.id,
      date: tomorrowDate,
      startTime: '10:30',
      endTime: '11:00',
      status: 'BOOKED',
    },
  });

  // 3. Day +2 Appointments
  const day2Date = getDayDate(2).dateObj;
  const appDay2Id = '00000000-0000-4000-8000-000000000014';
  await prisma.appointment.upsert({
    where: { id: appDay2Id },
    update: {
      patientId: p1.id,
      doctorId: d1.id,
      date: day2Date,
      startTime: '14:00',
      endTime: '14:30',
      status: 'BOOKED',
    },
    create: {
      id: appDay2Id,
      patientId: p1.id,
      doctorId: d1.id,
      date: day2Date,
      startTime: '14:00',
      endTime: '14:30',
      status: 'BOOKED',
    },
  });

  // 4. Day +3 Appointments
  const day3Date = getDayDate(3).dateObj;
  const appDay3Id = '00000000-0000-4000-8000-000000000015';
  await prisma.appointment.upsert({
    where: { id: appDay3Id },
    update: {
      patientId: p2.id,
      doctorId: d2.id,
      date: day3Date,
      startTime: '11:30',
      endTime: '12:00',
      status: 'BOOKED',
    },
    create: {
      id: appDay3Id,
      patientId: p2.id,
      doctorId: d2.id,
      date: day3Date,
      startTime: '11:30',
      endTime: '12:00',
      status: 'BOOKED',
    },
  });

  // 5. Day +5 Appointments
  const day5Date = getDayDate(5).dateObj;
  const appDay5Id = '00000000-0000-4000-8000-000000000016';
  await prisma.appointment.upsert({
    where: { id: appDay5Id },
    update: {
      patientId: p2.id,
      doctorId: d1.id,
      date: day5Date,
      startTime: '15:30',
      endTime: '16:00',
      status: 'BOOKED',
    },
    create: {
      id: appDay5Id,
      patientId: p2.id,
      doctorId: d1.id,
      date: day5Date,
      startTime: '15:30',
      endTime: '16:00',
      status: 'BOOKED',
    },
  });

  // 6. Day +7 Appointments
  const day7Date = getDayDate(7).dateObj;
  const appDay7Id = '00000000-0000-4000-8000-000000000017';
  await prisma.appointment.upsert({
    where: { id: appDay7Id },
    update: {
      patientId: p1.id,
      doctorId: d2.id,
      date: day7Date,
      startTime: '14:00',
      endTime: '14:30',
      status: 'BOOKED',
    },
    create: {
      id: appDay7Id,
      patientId: p1.id,
      doctorId: d2.id,
      date: day7Date,
      startTime: '14:00',
      endTime: '14:30',
      status: 'BOOKED',
    },
  });

  // 7. Day +10 Appointments
  const day10Date = getDayDate(10).dateObj;
  const appDay10Id = '00000000-0000-4000-8000-000000000018';
  await prisma.appointment.upsert({
    where: { id: appDay10Id },
    update: {
      patientId: p1.id,
      doctorId: d1.id,
      date: day10Date,
      startTime: '10:00',
      endTime: '10:30',
      status: 'BOOKED',
    },
    create: {
      id: appDay10Id,
      patientId: p1.id,
      doctorId: d1.id,
      date: day10Date,
      startTime: '10:00',
      endTime: '10:30',
      status: 'BOOKED',
    },
  });

  console.log('Seeding past demo appointments and clinical records (EHR)...');
  const pastDate1 = getDayDate(-3).dateObj;
  const pastDate2 = getDayDate(-1).dateObj;
  const futureFollowUp = getDayDate(7).dateObj;

  // Demo Appointment 1: Doctor Alice with Patient John
  const demoApp1Id = '00000000-0000-4000-8000-000000000001';
  await prisma.appointment.upsert({
    where: { id: demoApp1Id },
    update: {
      patientId: p1.id,
      doctorId: d1.id,
      date: pastDate1,
      startTime: '15:00',
      endTime: '15:30',
      status: 'COMPLETED',
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
    update: {
      recordDate: pastDate1,
      followUpDate: futureFollowUp,
    },
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
      patientId: p2.id,
      doctorId: d2.id,
      date: pastDate2,
      startTime: '15:30',
      endTime: '16:00',
      status: 'COMPLETED',
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
    update: {
      recordDate: pastDate2,
    },
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

  console.log('Seed completed successfully! Generated 30 days of availability and upcoming booked appointments.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
