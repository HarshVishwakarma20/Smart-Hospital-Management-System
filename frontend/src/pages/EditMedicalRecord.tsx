import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
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

const EditMedicalRecord = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [recordDate, setRecordDate] = useState<string>('');
  const [symptoms, setSymptoms] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [treatmentNotes, setTreatmentNotes] = useState<string>('');
  const [prescription, setPrescription] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>('');

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    setLoading(true);
    setServerError('');
    try {
      const res = await api.get(`/medical-records/${id}`);
      const data = res.data;

      // Access check
      if (user?.role === 'DOCTOR' && data.doctorId !== user.id) {
        setServerError('You are not authorized to edit records created by another doctor.');
        setLoading(false);
        return;
      }

      setPatientName(data.patient?.name || 'Patient');
      setRecordDate(data.recordDate ? data.recordDate.split('T')[0] : '');
      setSymptoms(data.symptoms || '');
      setDiagnosis(data.diagnosis || '');
      setTreatmentNotes(data.treatmentNotes || '');
      setPrescription(data.prescription || '');
      setFollowUpDate(data.followUpDate ? data.followUpDate.split('T')[0] : '');
    } catch (err: any) {
      console.error(err);
      setServerError(err.response?.data?.message || 'Failed to retrieve medical record');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!recordDate.trim()) errors.recordDate = 'Visit date is required';
    if (!symptoms.trim()) errors.symptoms = 'Chief complaint / symptoms is required';
    if (!diagnosis.trim()) errors.diagnosis = 'Diagnosis is required';
    if (!treatmentNotes.trim()) errors.treatmentNotes = 'Treatment notes are required';
    if (!prescription.trim()) errors.prescription = 'Prescription is required';

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
        recordDate,
        symptoms: symptoms.trim(),
        diagnosis: diagnosis.trim(),
        treatmentNotes: treatmentNotes.trim(),
        prescription: prescription.trim(),
        followUpDate: followUpDate || null,
      };

      await api.put(`/medical-records/${id}`, payload);
      navigate(`/medical-records/${id}`);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const zodErrs: Record<string, string> = {};
        for (const item of err.response.data.errors) {
          zodErrs[item.path[0]] = item.message;
        }
        setValidationErrors(zodErrs);
      }
      setServerError(err.response?.data?.message || 'Failed to update medical record');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        Loading medical record...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/medical-records/${id}`)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft size={16} /> Back to Record Details
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="bg-blue-600 text-white p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText size={22} /> Edit Clinical Medical Record
          </h1>
          <p className="text-blue-100 text-sm mt-1">
            Updating consultation record for patient: <span className="font-semibold">{patientName}</span>
          </p>
        </div>

        {serverError && (
          <div className="m-6 mb-0 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Patient context badge */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center gap-2 text-sm text-gray-700">
            <User size={16} className="text-blue-600" />
            <span>
              Patient: <strong className="text-gray-900">{patientName}</strong> (Patient identity cannot be modified on existing clinical record)
            </span>
          </div>

          {/* Dates */}
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
              onClick={() => navigate(`/medical-records/${id}`)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm shadow-sm transition disabled:opacity-50"
            >
              <Save size={16} />
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMedicalRecord;
