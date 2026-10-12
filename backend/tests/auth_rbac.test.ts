import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Module 1: Authentication and RBAC Integration Tests', () => {
  let patientToken: string;
  let patientId: string;
  let patient2Token: string;
  let patient2Id: string;
  let doctorToken: string;
  let doctorId: string;
  let doctor2Token: string;
  let doctor2Id: string;
  let receptionistToken: string;
  let receptionistId: string;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    // Authenticate users to retrieve valid tokens for role-based tests
    const p1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient1@shms.local', password: 'password123' });
    patientToken = p1Res.body.token;
    patientId = p1Res.body.user.id;

    const p2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient2@shms.local', password: 'password123' });
    patient2Token = p2Res.body.token;
    patient2Id = p2Res.body.user.id;

    const d1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor1@shms.local', password: 'password123' });
    doctorToken = d1Res.body.token;
    doctorId = d1Res.body.user.id;

    const d2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor2@shms.local', password: 'password123' });
    doctor2Token = d2Res.body.token;
    doctor2Id = d2Res.body.user.id;

    const rRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'receptionist@shms.local', password: 'password123' });
    receptionistToken = rRes.body.token;
    receptionistId = rRes.body.user.id;

    const aRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@shms.local', password: 'password123' });
    adminToken = aRes.body.token;
    adminId = aRes.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Authentication Scenarios
  test('1. Valid email and password: login succeeds and returns the expected authentication response', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient1@shms.local', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('patient1@shms.local');
    expect(res.body.user.role).toBe('PATIENT');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  test('2. Correct email with an incorrect password: login is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient1@shms.local', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  test('3. Unknown email: login is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@shms.local', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  test('4. Missing or malformed credentials: validation fails appropriately', async () => {
    const missingRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient1@shms.local' }); // missing password
    expect(missingRes.status).toBe(400);

    const malformedRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '123' });
    expect(malformedRes.status).toBe(400);
  });

  test('5. Protected endpoint without a token: access is denied', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('6. Invalid or expired token: access is denied', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.value');
    expect(res.status).toBe(401);
  });

  test('7. Valid token: access is granted only when the user is authorized', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('patient1@shms.local');
    expect(res.body.role).toBe('PATIENT');
  });

  test('8. Passwords are hashed in the database and are never returned in API responses', async () => {
    const userInDb = await prisma.user.findUnique({
      where: { email: 'patient1@shms.local' },
    });
    expect(userInDb).not.toBeNull();
    expect(userInDb!.passwordHash).not.toBe('password123');
    expect(userInDb!.passwordHash.startsWith('$2')).toBe(true);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('password');
  });

  // Role-Based Authorization Scenarios
  test('9. A patient attempts to access an admin/receptionist-only endpoint: access is denied', async () => {
    const res = await request(app)
      .get('/api/users/patients')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Insufficient permissions');
  });

  test('10. An admin accesses the same endpoint: access succeeds if authorized', async () => {
    const res = await request(app)
      .get('/api/users/patients')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('11. A user attempts an operation outside their permitted role: access is denied', async () => {
    // Doctors are not permitted to access patient management endpoint
    const res = await request(app)
      .get('/api/users/patients')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.status).toBe(403);
  });

  test("12. A patient attempts to view or cancel another patient's appointment: access is denied", async () => {
    // Find or create an appointment for patient 2
    // First, let's create a future date appointment for patient 2
    const targetDate = '2026-10-18';
    const startTime = '09:00';

    // Ensure slot availability exists
    await prisma.doctorAvailability.upsert({
      where: {
        doctorId_date_startTime: {
          doctorId: doctorId,
          date: new Date(targetDate + 'T00:00:00.000Z'),
          startTime: startTime,
        },
      },
      update: {},
      create: {
        doctorId: doctorId,
        date: new Date(targetDate + 'T00:00:00.000Z'),
        startTime: startTime,
        endTime: '09:30',
      },
    });

    // Clean previous appointments for this slot
    await prisma.appointment.deleteMany({
      where: {
        doctorId: doctorId,
        date: new Date(targetDate + 'T00:00:00.000Z'),
        startTime: startTime,
      },
    });

    // Patient 2 books the appointment
    const p2Booking = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        doctorId: doctorId,
        date: targetDate,
        startTime: startTime,
      });
    expect(p2Booking.status).toBe(201);
    const appointmentId = p2Booking.body.id;

    // Patient 1 attempts to cancel Patient 2's appointment
    const cancelRes = await request(app)
      .put(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.message).toBe('You can only cancel your own appointments');

    // Patient 1 requests all appointments; must only see patient 1's appointments
    const p1ListRes = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(p1ListRes.status).toBe(200);
    const foundOtherPatientApp = p1ListRes.body.some(
      (a: any) => a.id === appointmentId
    );
    expect(foundOtherPatientApp).toBe(false);
  });

  test('13. A doctor cannot access or modify appointments outside their assignment', async () => {
    // Target appointment is assigned to doctor 1 (created in previous test)
    const targetDate = '2026-10-18';
    const appRecord = await prisma.appointment.findFirst({
      where: {
        doctorId: doctorId,
        date: new Date(targetDate + 'T00:00:00.000Z'),
        status: 'BOOKED',
      },
    });
    expect(appRecord).not.toBeNull();

    // Doctor 2 tries to cancel Doctor 1's appointment
    const cancelRes = await request(app)
      .put(`/api/appointments/${appRecord!.id}/cancel`)
      .set('Authorization', `Bearer ${doctor2Token}`);

    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.message).toBe('You can only cancel appointments assigned to you');

    // Doctor 2 requests appointments; Doctor 1's appointment must not appear
    const d2ListRes = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${doctor2Token}`);

    expect(d2ListRes.status).toBe(200);
    const foundDoc1App = d2ListRes.body.some(
      (a: any) => a.id === appRecord!.id
    );
    expect(foundDoc1App).toBe(false);
  });
});
