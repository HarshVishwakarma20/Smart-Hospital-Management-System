import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import {
  FileText,
  Calendar,
  User,
  ArrowLeft,
  AlertCircle,
  Save,
  Pill,
  Stethoscope,
  ClipboardList,
} from 'lucide-react';

interface TreatedPatient {
  patient: {
    id: string;
    name: string;
    email: string;
  };
  latestAppointment?: {
    id: string;
    date: string;
    startTime: string;
    status: string;
  };
}

const CreateMedicalRecord = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if initial query params or state are passed (e.g. from an appointment card)
  const queryParams = new URLSearchParams(location.search);
  const initialPatientId = queryParams.get('patientId') || '';
  const initialAppointmentId = queryParams.get('appointmentId') || '';

  const todayStr = new Date().toISOString().split('T')[0];

  const [patients, setPatients] = useState<TreatedPatient[]>([]);
  const [patientId, setPatientId] = useState<string>(initialPatientId);
  const [appointmentId, setAppointmentId] = useState<string>(initialAppointmentId);
  const [recordDate, setRecordDate] = useState<string>(todayStr);
  const [symptoms, setSymptoms] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [treatmentNotes, setTreatmentNotes] = useState<string>('');
  const [prescription, setPrescription] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');

  const [loadingPatients, setLoadingPatients] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/medical-records/my-patients');
      setPatients(res.data);
      if (!patientId && res.data.length > 0) {
        setPatientId(res.data[0].patient.id);
        if (res.data[0].latestAppointment) {
          setAppointmentId(res.data[0].latestAppointment.id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load treated patients:', err);
      setServerError('Failed to load eligible patient list. Ensure you have assigned appointments or patients.');
    } finally {
      setLoadingPatients(false);
    }
  };

  const handlePatientSelect = (selectedId: string) => {
    setPatientId(selectedId);
    const selected = patients.find((p) => p.patient.id === selectedId);
    if (selected?.latestAppointment) {
      setAppointmentId(selected.latestAppointment.id);
    } else {
      setAppointmentId('');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!patientId.trim()) errors.patientId = 'Please select a patient';
    if (!recordDate.trim()) errors.recordDate = 'Visit date is required';
    if (!symptoms.trim()) errors.symptoms = 'Chief complaint / symptoms is required';
    if (!diagnosis.trim()) errors.diagnosis = 'Diagnosis is required';
    if (!treatmentNotes.trim()) errors.treatmentNotes = 'Treatment notes are required';
    if (!prescription.trim()) errors.prescription = 'Prescription and medication instructions are required';

    if (followUpDate && recordDate && followUpDate < recordDate) {
      errors.followUpDate = 'Follow-up date cannot be earlier than visit date';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        patientId,
        recordDate,
        symptoms: symptoms.trim(),
        diagnosis: diagnosis.trim(),
        treatmentNotes: treatmentNotes.trim(),
        prescription: prescription.trim(),
      };

      if (followUpDate) {
        payload.followUpDate = followUpDate;
      }
      if (appointmentId) {
        payload.appointmentId = appointmentId;
      }

      const res = await api.post('/medical-records', payload);
      navigate(`/medical-records/${res.data.id}`);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const zodErrs: Record<string, string> = {};
        for (const item of err.response.data.errors) {
          zodErrs[item.path[0]] = item.message;
        }
        setValidationErrors(zodErrs);
      }
      setServerError(err.response?.data?.message || 'Failed to create medical record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/medical-records')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft size={16} /> Back to Records
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="bg-blue-600 text-white p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText size={22} /> New Clinical Consultation Record
          </h1>
          <p className="text-blue-100 text-sm mt-1">
            Author an authoritative Electronic Health Record entry for an authorized patient
          </p>
        </div>

        {serverError && (
          <div className="m-6 mb-0 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Patient Selection */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <User size={16} className="text-blue-600" /> Patient Selection
            </h3>

            {loadingPatients ? (
              <div className="text-sm text-gray-500 py-2">Loading eligible patients...</div>
            ) : patients.length === 0 ? (
              <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                No patients with existing appointments found. Under hospital RBAC policy, a doctor can author records for patients who have scheduled consultations.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient *</label>
                  <select
                    value={patientId}
                    onChange={(e) => handlePatientSelect(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map((p) => (
                      <option key={p.patient.id} value={p.patient.id}>
                        {p.patient.name} ({p.patient.email})
                      </option>
                    ))}
                  </select>
                  {validationErrors.patientId && (
                    <p className="text-red-600 text-xs mt-1">{validationErrors.patientId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Associated Appointment (Optional)
                  </label>
                  <select
                    value={appointmentId}
                    onChange={(e) => setAppointmentId(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="">-- None (Direct Encounter) --</option>
                    {patients
                      .filter((p) => p.patient.id === patientId && p.latestAppointment)
                      .map((p) => (
                        <option key={p.latestAppointment!.id} value={p.latestAppointment!.id}>
                          {new Date(p.latestAppointment!.date).toLocaleDateString()} at{' '}
                          {p.latestAppointment!.startTime} ({p.latestAppointment!.status})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Visit Date & Follow-up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar size={14} className="text-blue-600" /> Visit / Consultation Date *
              </label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {validationErrors.recordDate && (
                <p className="text-red-600 text-xs mt-1">{validationErrors.recordDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar size={14} className="text-amber-600" /> Follow-up Date (Optional)
              </label>
              <input
                type="date"
                value={followUpDate}
                min={recordDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {validationErrors.followUpDate && (
                <p className="text-red-600 text-xs mt-1">{validationErrors.followUpDate}</p>
              )}
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <ClipboardList size={14} className="text-blue-600" /> Chief Complaint & Symptoms *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Patient presents with high fever, persistent cough, and fatigue for 3 days..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {validationErrors.symptoms && (
              <p className="text-red-600 text-xs mt-1">{validationErrors.symptoms}</p>
            )}
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Stethoscope size={14} className="text-blue-600" /> Clinical Diagnosis *
            </label>
            <input
              type="text"
              placeholder="e.g. Acute Viral Bronchitis / Type 2 Diabetes Mellitus"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {validationErrors.diagnosis && (
              <p className="text-red-600 text-xs mt-1">{validationErrors.diagnosis}</p>
            )}
          </div>

          {/* Treatment Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <FileText size={14} className="text-blue-600" /> Treatment Notes & Recommendations *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Advised complete bed rest, adequate fluid intake (2-3 L/day), and avoiding chilled food..."
              value={treatmentNotes}
              onChange={(e) => setTreatmentNotes(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {validationErrors.treatmentNotes && (
              <p className="text-red-600 text-xs mt-1">{validationErrors.treatmentNotes}</p>
            )}
          </div>

          {/* Prescription */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Pill size={14} className="text-green-600" /> Prescription & Medication Instructions *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Tab. Paracetamol 650mg TDS PRN, Syrup Cough-Relief 10ml BD for 5 days..."
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {validationErrors.prescription && (
              <p className="text-red-600 text-xs mt-1">{validationErrors.prescription}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/medical-records')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || patients.length === 0}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm shadow-sm transition disabled:opacity-50"
            >
              <Save size={16} />
              {submitting ? 'Saving Record...' : 'Save Medical Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMedicalRecord;
