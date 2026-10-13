import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Calendar,
  User,
  Clock,
  ArrowLeft,
  Edit,
  Archive,
  AlertCircle,
  Pill,
  Stethoscope,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';

interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  recordDate: string;
  symptoms: string;
  diagnosis: string;
  treatmentNotes: string;
  prescription: string;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    name: string;
    email: string;
  };
  doctor: {
    id: string;
    name: string;
    email: string;
  };
  appointment?: {
    id: string;
    date: string;
    startTime: string;
    status: string;
  } | null;
}

const MedicalRecordDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/medical-records/${id}`);
      setRecord(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to retrieve medical record');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this medical record? It will be marked inactive in the system while retaining the permanent clinical audit log.')) {
      return;
    }
    try {
      await api.delete(`/medical-records/${id}`);
      navigate('/medical-records');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to archive record');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        Loading clinical record details...
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/medical-records')}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowLeft size={16} /> Back to Records
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          <span>{error || 'Record not found or access denied'}</span>
        </div>
      </div>
    );
  }

  const isAuthorDoctor = user?.role === 'DOCTOR' && record.doctorId === user.id;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Navigation & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/medical-records')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft size={16} /> Back to Medical Records
        </button>

        {isAuthorDoctor && (
          <div className="flex items-center gap-2">
            <Link
              to={`/medical-records/${record.id}/edit`}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3.5 py-2 rounded-md shadow-sm transition"
            >
              <Edit size={16} className="text-blue-600" />
              Edit Record
            </Link>
            <button
              onClick={handleArchive}
              className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-medium px-3.5 py-2 rounded-md transition"
            >
              <Archive size={16} />
              Archive Record
            </button>
          </div>
        )}
      </div>

      {/* Main Clinical Document Card */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        {/* Document Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold tracking-wider uppercase mb-1">
                <ShieldCheck size={14} /> Official Medical Record / EHR
              </div>
              <h1 className="text-2xl font-bold">{record.diagnosis}</h1>
              <p className="text-blue-100 text-sm mt-1">
                Record ID: <span className="font-mono text-xs">{record.id}</span>
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg text-sm">
              <div className="text-blue-200 text-xs">Consultation Date</div>
              <div className="font-semibold text-base">
                {new Date(record.recordDate).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Stakeholder Details Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 bg-gray-50 border-b border-gray-200 p-4 text-sm">
          <div className="flex items-center gap-3 p-2">
            <div className="bg-blue-100 text-blue-700 p-2 rounded-full">
              <User size={18} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Patient Details</div>
              <div className="font-semibold text-gray-800">{record.patient.name}</div>
              <div className="text-xs text-gray-600">{record.patient.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <div className="bg-green-100 text-green-700 p-2 rounded-full">
              <Stethoscope size={18} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Attending Physician</div>
              <div className="font-semibold text-gray-800">{record.doctor.name}</div>
              <div className="text-xs text-gray-600">{record.doctor.email}</div>
            </div>
          </div>
        </div>

        {/* Clinical Document Body */}
        <div className="p-6 space-y-6">
          {/* Symptoms */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-2">
              <ClipboardList size={16} className="text-blue-600" /> Chief Complaint & Symptoms
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">
              {record.symptoms}
            </div>
          </div>

          {/* Clinical Diagnosis */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-2">
              <Stethoscope size={16} className="text-blue-600" /> Clinical Diagnosis
            </h3>
            <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 text-gray-900 font-medium text-sm leading-relaxed">
              {record.diagnosis}
            </div>
          </div>

          {/* Treatment Notes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-2">
              <FileText size={16} className="text-blue-600" /> Treatment Notes & Clinical Observations
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
              {record.treatmentNotes}
            </div>
          </div>

          {/* Prescription */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-2">
              <Pill size={16} className="text-emerald-600" /> Prescription & Medication Instructions
            </h3>
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-4 text-emerald-950 font-medium text-sm leading-relaxed whitespace-pre-wrap">
              {record.prescription}
            </div>
          </div>

          {/* Follow-up & Appointment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-amber-600" /> Recommended Follow-up
              </div>
              {record.followUpDate ? (
                <div className="text-gray-900 font-medium text-sm">
                  {new Date(record.followUpDate).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">No follow-up visit scheduled.</div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock size={14} className="text-blue-600" /> Associated Appointment
              </div>
              {record.appointment ? (
                <div className="text-gray-900 font-medium text-sm">
                  {new Date(record.appointment.date).toLocaleDateString()} at {record.appointment.startTime}
                  <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                    {record.appointment.status}
                  </span>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Independent consultation entry</div>
              )}
            </div>
          </div>
        </div>

        {/* Audit Trail Metadata Footer */}
        <div className="bg-gray-100 px-6 py-3 border-t border-gray-200 text-xs text-gray-500 flex flex-col sm:flex-row justify-between gap-1">
          <span>Created: {new Date(record.createdAt).toLocaleString()}</span>
          <span>Last modified: {new Date(record.updatedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordDetail;
