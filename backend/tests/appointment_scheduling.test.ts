import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Module 2: Appointment and Scheduling Integration Tests', () => {
  let patientToken: string;
  let patientId: string;
  let patient2Token: string;
  let patient2Id: string;
  let doctorToken: string;
  let doctorId: string;
  let doctor2Id: string;

  const testDate = '2026-10-19'; // Future date for clean test isolation

  beforeAll(async () => {
    // 1. Log in users
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
    doctor2Id = d2Res.body.user.id;

    // 2. Prepare test doctor availability slots for testDate
    const dTarget = new Date(testDate + 'T00:00:00.000Z');
    
    // Clean any prior appointments for this date
    await prisma.appointment.deleteMany({
      where: { date: dTarget },
    });

    // Create availability slots: 09:00, 09:30, 10:00
    const slots = ['09:00', '09:30', '10:00', '10:30'];
    for (const s of slots) {
      await prisma.doctorAvailability.upsert({
        where: {
          doctorId_date_startTime: {
            doctorId,
            date: dTarget,
            startTime: s,
          },
        },
        update: {},
        create: {
          doctorId,
          date: dTarget,
          startTime: s,
          endTime: s === '09:00' ? '09:30' : s === '09:30' ? '10:00' : s === '10:00' ? '10:30' : '11:00',
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('1. Retrieve doctors or available appointment slots using the actual API', async () => {
    // Retrieve doctors
    const doctorsRes = await request(app).get('/api/doctors');
    expect(doctorsRes.status).toBe(200);
    expect(Array.isArray(doctorsRes.body)).toBe(true);
    expect(doctorsRes.body.some((d: any) => d.id === doctorId)).toBe(true);

    // Retrieve doctor availability slots
    const slotsRes = await request(app).get(`/api/doctors/${doctorId}/availability?date=${testDate}`);
    expect(slotsRes.status).toBe(200);
    expect(Array.isArray(slotsRes.body)).toBe(true);
    expect(slotsRes.body.some((s: any) => s.startTime === '09:00')).toBe(true);
  });

  test('2. Book an available slot successfully', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId,
        date: testDate,
        startTime: '09:00',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.doctorId).toBe(doctorId);
    expect(res.body.patientId).toBe(patientId);
    expect(res.body.startTime).toBe('09:00');
    expect(res.body.status).toBe('BOOKED');
  });

  test('3. Reject booking when required fields are missing or invalid', async () => {
    // Missing doctorId
    const resMissing = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        date: testDate,
        startTime: '09:30',
      });
    expect(resMissing.status).toBe(400);

    // Invalid date format
    const resInvalidDate = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId,
        date: 'not-a-date',
        startTime: '09:30',
      });
    expect(resInvalidDate.status).toBe(400);
  });

  test('4. Reject booking for a nonexistent doctor or unavailable/invalid slot', async () => {
    // Non-existent doctor UUID
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const resNoDoctor = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: fakeUuid,
        date: testDate,
        startTime: '09:30',
      });
    expect(resNoDoctor.status).toBe(400);
    expect(resNoDoctor.body.message).toBe('Doctor not found');

    // Slot that is not on doctor availability (e.g. 03:00)
    const resNoSlot = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId,
        date: testDate,
        startTime: '03:00',
      });
    expect(resNoSlot.status).toBe(400);
    expect(resNoSlot.body.message).toBe('Doctor is not available at this time');
  });

  test('5. Prevent a patient from booking the same slot twice / clashing active appointment', async () => {
    // Patient 1 already has 09:00 booked. Attempting to book 09:00 again with doctor 2 or same doctor:
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId,
        date: testDate,
        startTime: '09:00',
      });

    // Should return 409 conflict
    expect(res.status).toBe(409);
  });

  test('6. Attempt to book the same doctor and time slot as two different patients; verify no more than one succeeds concurrently', async () => {
    // Slot 09:30 is currently free for doctor 1.
    // Patient 1 and Patient 2 both send concurrent booking requests for slot 09:30.
    const [req1, req2] = await Promise.all([
      request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ doctorId, date: testDate, startTime: '09:30' }),
      request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({ doctorId, date: testDate, startTime: '09:30' }),
    ]);

    const statuses = [req1.status, req2.status].sort();
    // Exactly one must succeed (201) and one must be rejected with 409 Conflict
    expect(statuses).toEqual([201, 409]);
  });

  test('7. Verify that a booking conflict returns the status code and error response defined by the API (HTTP 409)', async () => {
    // 09:00 is already booked from test 2. Patient 2 attempts to book it.
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        doctorId,
        date: testDate,
        startTime: '09:00',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('This slot is already booked');
  });

  test('8. Retrieve appointments and verify that the newly booked appointment appears correctly', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const bookedApp = res.body.find((a: any) => a.startTime === '09:00' && a.doctorId === doctorId);
    expect(bookedApp).toBeDefined();
    expect(bookedApp.status).toBe('BOOKED');
    expect(bookedApp.doctor.name).toBeDefined();
  });

  test('9. Cancel an eligible appointment and verify the status is updated', async () => {
    // Find patient 1's 09:00 appointment
    const listRes = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`);
    const bookedApp = listRes.body.find((a: any) => a.startTime === '09:00' && a.doctorId === doctorId);
    expect(bookedApp).toBeDefined();

    const cancelRes = await request(app)
      .put(`/api/appointments/${bookedApp.id}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('CANCELLED');

    // Cancelling again should be rejected with 400
    const doubleCancel = await request(app)
      .put(`/api/appointments/${bookedApp.id}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(doubleCancel.status).toBe(400);
    expect(doubleCancel.body.message).toBe('Appointment is already cancelled');
  });

  test('10. Verify that cancellation releases or restores the slot', async () => {
    // Since 09:00 was cancelled in test 9, it should now appear again in available slots for doctor 1
    const slotsRes = await request(app).get(`/api/doctors/${doctorId}/availability?date=${testDate}`);
    expect(slotsRes.status).toBe(200);
    const hasSlot0900 = slotsRes.body.some((s: any) => s.startTime === '09:00');
    expect(hasSlot0900).toBe(true);

    // Patient 2 should now be able to book 09:00
    const rebookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        doctorId,
        date: testDate,
        startTime: '09:00',
      });
    expect(rebookRes.status).toBe(201);
    expect(rebookRes.body.status).toBe('BOOKED');
  });

  test("11. Reject cancellation of another patient's appointment", async () => {
    // Patient 2 holds the newly booked 09:00 appointment
    const dApp = await prisma.appointment.findFirst({
      where: {
        doctorId,
        date: new Date(testDate + 'T00:00:00.000Z'),
        startTime: '09:00',
        status: 'BOOKED',
      },
    });
    expect(dApp).not.toBeNull();

    // Patient 1 tries to cancel Patient 2's appointment
    const cancelRes = await request(app)
      .put(`/api/appointments/${dApp!.id}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.message).toBe('You can only cancel your own appointments');
  });

  test('12. Verify that invalid IDs, invalid dates, and invalid booking requests are handled safely', async () => {
    // Invalid UUID for cancellation
    const cancelInvalidUuid = await request(app)
      .put('/api/appointments/not-a-uuid/cancel')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(cancelInvalidUuid.status).toBe(400);

    // Non-existent appointment UUID
    const cancelNonExistent = await request(app)
      .put('/api/appointments/11111111-1111-1111-1111-111111111111/cancel')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(cancelNonExistent.status).toBe(404);

    // Invalid date in doctor availability
    const invalidDateAvailability = await request(app)
      .get(`/api/doctors/${doctorId}/availability?date=invalid-date-format`);
    expect(invalidDateAvailability.status).toBe(400);

    // Booking past date
    const pastBookingRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId,
        date: '2020-01-01',
        startTime: '09:00',
      });
    expect(pastBookingRes.status).toBe(400);
    expect(pastBookingRes.body.message).toBe('Cannot book an appointment in the past');
  });
});
