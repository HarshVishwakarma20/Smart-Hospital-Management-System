import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Module 3: Patient Medical Records Management (EHR) Integration Tests', () => {
  let patient1Token: string;
  let patient1Id: string;
  let patient2Token: string;
  let patient2Id: string;
  let doctor1Token: string;
  let doctor1Id: string;
  let doctor2Token: string;
  let doctor2Id: string;
  let receptionistToken: string;
  let adminToken: string;

  let testAppointmentId: string;
  let createdRecordId: string;

  beforeAll(async () => {
    // 1. Authenticate all test roles
    const p1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient1@shms.local', password: 'password123' });
    patient1Token = p1Res.body.token;
    patient1Id = p1Res.body.user.id;

    const p2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient2@shms.local', password: 'password123' });
    patient2Token = p2Res.body.token;
    patient2Id = p2Res.body.user.id;

    const d1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor1@shms.local', password: 'password123' });
    doctor1Token = d1Res.body.token;
    doctor1Id = d1Res.body.user.id;

    const d2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor2@shms.local', password: 'password123' });
    doctor2Token = d2Res.body.token;
    doctor2Id = d2Res.body.user.id;

    const recRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'receptionist@shms.local', password: 'password123' });
    receptionistToken = recRes.body.token;

    const admRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@shms.local', password: 'password123' });
    adminToken = admRes.body.token;

    // 2. Ensure an active treatment relationship appointment exists for doctor1 and patient1
    const appointmentDate = new Date('2026-11-01T00:00:00.000Z');
    const appointment = await prisma.appointment.create({
      data: {
        doctorId: doctor1Id,
        patientId: patient1Id,
        date: appointmentDate,
        startTime: '11:00',
        endTime: '11:30',
        status: 'BOOKED',
      },
    });
    testAppointmentId = appointment.id;
  });

  afterAll(async () => {
    // Clean up created test appointment and any created records
    if (createdRecordId) {
      await prisma.medicalRecord.deleteMany({
        where: { id: createdRecordId },
      });
    }
    if (testAppointmentId) {
      await prisma.medicalRecord.deleteMany({
        where: { appointmentId: testAppointmentId },
      });
      await prisma.appointment.deleteMany({
        where: { id: testAppointmentId },
      });
    }
    await prisma.$disconnect();
  });

  describe('Medical record functionality', () => {
    it('1. Authorized doctor successfully creates a valid record', async () => {
      const payload = {
        patientId: patient1Id,
        recordDate: '2026-11-01',
        symptoms: 'Throat irritation, dry cough for 3 days',
        diagnosis: 'Pharyngitis',
        treatmentNotes: 'Advised rest and hydration. Warm saline gargles.',
        prescription: 'Amoxicillin 500mg TDS for 5 days, Paracetamol 500mg SOS',
        followUpDate: '2026-11-08',
        appointmentId: testAppointmentId,
      };

      const res = await request(app)
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.patientId).toBe(patient1Id);
      expect(res.body.doctorId).toBe(doctor1Id);
      expect(res.body.symptoms).toBe(payload.symptoms);
      expect(res.body.diagnosis).toBe(payload.diagnosis);
      expect(res.body.treatmentNotes).toBe(payload.treatmentNotes);
      expect(res.body.prescription).toBe(payload.prescription);
      expect(res.body.isArchived).toBe(false);

      createdRecordId = res.body.id;
    });

    it('2. A record contains the correct patient and doctor relationships', async () => {
      const res = await request(app)
        .get(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.patient).toBeDefined();
      expect(res.body.patient.id).toBe(patient1Id);
      expect(res.body.patient.name).toBe('John Doe');
      expect(res.body.doctor).toBeDefined();
      expect(res.body.doctor.id).toBe(doctor1Id);
      expect(res.body.doctor.name).toBe('Dr. Alice Brown');
    });

    it('3. An authorized user (patient) can retrieve a permitted record', async () => {
      const res = await request(app)
        .get(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdRecordId);
      expect(res.body.patientId).toBe(patient1Id);
    });

    it('4. A patient can retrieve their own medical history', async () => {
      const res = await request(app)
        .get(`/api/medical-records/patient/${patient1Id}`)
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const found = res.body.some((r: any) => r.id === createdRecordId);
      expect(found).toBe(true);
    });

    it('5. An authorized doctor can update a permitted record', async () => {
      const updatePayload = {
        diagnosis: 'Acute Pharyngitis with mild tonsillitis',
        treatmentNotes: 'Increased warm saline gargles to 4 times a day.',
        prescription: 'Amoxicillin 500mg TDS for 7 days, Paracetamol 650mg SOS',
        followUpDate: '2026-11-10',
      };

      const res = await request(app)
        .put(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.diagnosis).toBe(updatePayload.diagnosis);
      expect(res.body.treatmentNotes).toBe(updatePayload.treatmentNotes);
      expect(res.body.prescription).toBe(updatePayload.prescription);
    });

    it('6. A nonexistent record returns the expected 404 response', async () => {
      const nonexistentId = '00000000-0000-4000-8000-999999999999';
      const res = await request(app)
        .get(`/api/medical-records/${nonexistentId}`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('7. Missing required fields are rejected with 400', async () => {
      const incompletePayload = {
        patientId: patient1Id,
        recordDate: '2026-11-01',
        // missing symptoms, diagnosis, treatmentNotes, prescription
      };

      const res = await request(app)
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send(incompletePayload);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Validation Error/i);
      expect(res.body.errors).toBeDefined();
    });

    it('8. Invalid IDs, malformed dates, and invalid input types are rejected', async () => {
      // Invalid UUID
      const res1 = await request(app)
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({
          patientId: 'not-a-valid-uuid',
          recordDate: '2026-11-01',
          symptoms: 'Cough',
          diagnosis: 'Cold',
          treatmentNotes: 'Rest',
          prescription: 'Vitamins',
        });
      expect(res1.status).toBe(400);

      // Malformed date
      const res2 = await request(app)
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({
          patientId: patient1Id,
          recordDate: '01-11-2026', // wrong format
          symptoms: 'Cough',
          diagnosis: 'Cold',
          treatmentNotes: 'Rest',
          prescription: 'Vitamins',
        });
      expect(res2.status).toBe(400);

      // Invalid GET param ID
      const res3 = await request(app)
        .get('/api/medical-records/invalid-id')
        .set('Authorization', `Bearer ${doctor1Token}`);
      expect(res3.status).toBe(400);
    });

    it('9. An invalid follow-up date (earlier than record date) is rejected', async () => {
      const payload = {
        patientId: patient1Id,
        recordDate: '2026-11-10',
        followUpDate: '2026-11-05', // earlier than record date
        symptoms: 'Cough',
        diagnosis: 'Cold',
        treatmentNotes: 'Rest',
        prescription: 'Vitamins',
      };

      const res = await request(app)
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Follow-up date cannot be earlier than record date/i);
    });
  });

  describe('Authorization and privacy', () => {
    it('10. An unauthenticated request is rejected with 401', async () => {
      const res1 = await request(app).get('/api/medical-records');
      expect(res1.status).toBe(401);

      const res2 = await request(app).post('/api/medical-records').send({});
      expect(res2.status).toBe(401);
    });

    it('11. A patient cannot read another patient\'s record (403)', async () => {
      // Patient 2 attempts to access Patient 1's record
      const res = await request(app)
        .get(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${patient2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('12. A patient cannot create a record for themselves or another patient (403)', async () => {
      const payload = {
        patientId: patient1Id,
        recordDate: '2026-11-01',
        symptoms: 'Self diagnosis',
        diagnosis: 'Self diagnosis',
        treatmentNotes: 'None',
        prescription: 'None',
      };

      const res = await request(app)
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Only authorized doctors can create medical records/i);
    });

    it('13. A patient cannot modify another patient\'s record or their own (403)', async () => {
      const res1 = await request(app)
        .put(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({ symptoms: 'Attempted patient edit' });

      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .put(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({ symptoms: 'Cross-patient edit attempt' });

      expect(res2.status).toBe(403);
    });

    it('14. A receptionist cannot retrieve medical record contents (403)', async () => {
      const res1 = await request(app)
        .get('/api/medical-records')
        .set('Authorization', `Bearer ${receptionistToken}`);
      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .get(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${receptionistToken}`);
      expect(res2.status).toBe(403);

      const res3 = await request(app)
        .get(`/api/medical-records/patient/${patient1Id}`)
        .set('Authorization', `Bearer ${receptionistToken}`);
      expect(res3.status).toBe(403);
    });

    it('15. A doctor cannot modify a record they are not authorized to manage (403)', async () => {
      // Doctor 2 attempts to edit Doctor 1's record
      const res = await request(app)
        .put(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${doctor2Token}`)
        .send({ diagnosis: 'Tampered diagnosis by other doctor' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only modify medical records that you created/i);
    });

    it('16. Manipulating record IDs or patient IDs cannot bypass authorization', async () => {
      // Patient 1 tries to query history specifying patient 2's ID
      const res1 = await request(app)
        .get(`/api/medical-records/patient/${patient2Id}`)
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(res1.status).toBe(403);

      // Patient 1 tries to filter /api/medical-records with patient 2's ID
      const res2 = await request(app)
        .get(`/api/medical-records?patientId=${patient2Id}`)
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(res2.status).toBe(403);
    });

    it('17. Restricted users cannot delete or archive records (403)', async () => {
      // Patient attempts deletion/archival
      const resPatient = await request(app)
        .delete(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(resPatient.status).toBe(403);

      // Receptionist attempts deletion/archival
      const resRec = await request(app)
        .delete(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${receptionistToken}`);
      expect(resRec.status).toBe(403);

      // Another doctor attempts deletion/archival
      const resDoc2 = await request(app)
        .delete(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${doctor2Token}`);
      expect(resDoc2.status).toBe(403);
    });

    it('18. Responses do not leak sensitive database details or stack traces', async () => {
      const res = await request(app)
        .post('/api/medical-records')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({
          patientId: patient1Id,
          recordDate: 'invalid-date',
          symptoms: '',
          diagnosis: '',
          treatmentNotes: '',
          prescription: '',
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).not.toContain('prisma');
      expect(JSON.stringify(res.body)).not.toContain('stack');
      expect(JSON.stringify(res.body)).not.toContain('SELECT');
    });

    it('19. Authorized doctor can safely archive record, which prevents subsequent fetch', async () => {
      // Doctor 1 archives the record
      const resArchive = await request(app)
        .delete(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(resArchive.status).toBe(200);
      expect(resArchive.body.message).toMatch(/safely archived/i);

      // Subsequent fetch returns 404
      const resFetch = await request(app)
        .get(`/api/medical-records/${createdRecordId}`)
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(resFetch.status).toBe(404);
    });
  });
});
