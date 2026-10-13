import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  PlusCircle,
  Calendar,
  User,
  Clock,
  Search,
  AlertCircle,
  Archive,
  ChevronRight,
  Eye,
  Edit,
  Pill,
  Stethoscope,
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
  patient?: {
    id: string;
    name: string;
    email: string;
  };
  doctor?: {
    id: string;
    name: string;
    email: string;
  };
  appointment?: {
    id: string;
    date: string;
    startTime: string;
  } | null;
}

interface TreatedPatient {
  patient: {
    id: string;
    name: string;
    email: string;
  };
}

const MedicalRecordsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patients, setPatients] = useState<TreatedPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    fetchRecords();
    if (user?.role === 'DOCTOR') {
      fetchTreatedPatients();
    }
  }, [selectedPatientId]);

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/medical-records';
      if (user?.role === 'DOCTOR' && selectedPatientId) {
        url += `?patientId=${selectedPatientId}`;
      }
      const res = await api.get(url);
      setRecords(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load medical records');
    } finally {
      setLoading(false);
    }
  };

  const fetchTreatedPatients = async () => {
    try {
      const res = await api.get('/medical-records/my-patients');
      setPatients(res.data);
    } catch (err) {
      console.error('Failed to load treated patients:', err);
    }
  };

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to archive this medical record? This action marks the record as inactive while preserving the clinical audit trail.')) {
      return;
    }
    try {
      await api.delete(`/medical-records/${id}`);
      setSuccessMsg('Medical record successfully archived.');
      fetchRecords();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to archive record');
    }
  };

  const filteredRecords = records.filter((rec) => {
    const q = searchTerm.toLowerCase();
    const diagMatch = rec.diagnosis.toLowerCase().includes(q);
    const symMatch = rec.symptoms.toLowerCase().includes(q);
    const patientMatch = rec.patient?.name?.toLowerCase().includes(q) || false;
    const doctorMatch = rec.doctor?.name?.toLowerCase().includes(q) || false;
    return diagMatch || symMatch || patientMatch || doctorMatch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-blue-600" />
            {user?.role === 'DOCTOR' ? 'Patient Medical Records (EHR)' : 'My Medical Records (EHR)'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {user?.role === 'DOCTOR'
              ? 'Access, create, and manage comprehensive longitudinal clinical consultation records'
              : 'Review your clinical history, diagnoses, prescriptions, and follow-up schedules'}
          </p>
        </div>

        {user?.role === 'DOCTOR' && (
          <Link
            to="/medical-records/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <PlusCircle size={18} />
            Create Medical Record
          </Link>
        )}
      </div>

      {/* Notification Banners */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={
              user?.role === 'DOCTOR'
                ? 'Search by diagnosis, symptoms, or patient name...'
                : 'Search by diagnosis, symptoms, or doctor name...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {user?.role === 'DOCTOR' && (
          <div className="md:w-64">
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Treated Patients</option>
              {patients.map((p) => (
                <option key={p.patient.id} value={p.patient.id}>
                  {p.patient.name} ({p.patient.email})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Records Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          Loading medical records...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No medical records found</h3>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm || selectedPatientId
              ? 'Try adjusting your search query or patient filter.'
              : user?.role === 'DOCTOR'
              ? 'No clinical records have been authored yet. Click "Create Medical Record" to add one.'
              : 'You have no recorded consultations or medical records at this time.'}
          </p>
          {user?.role === 'DOCTOR' && !searchTerm && !selectedPatientId && (
            <div className="mt-4">
              <Link
                to="/medical-records/new"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm"
              >
                <PlusCircle size={16} />
                Create First Record
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRecords.map((rec) => (
            <div
              key={rec.id}
              onClick={() => navigate(`/medical-records/${rec.id}`)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition p-5 cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 text-blue-700 p-2.5 rounded-lg">
                    <Stethoscope size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                      {rec.diagnosis}
                    </h3>
                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        Visit Date: {new Date(rec.recordDate).toLocaleDateString()}
                      </span>
                      {rec.patient && (
                        <span className="flex items-center gap-1 font-medium text-gray-700">
                          <User size={14} /> Patient: {rec.patient.name}
                        </span>
                      )}
                      {rec.doctor && (
                        <span className="flex items-center gap-1 text-gray-600">
                          Dr. {rec.doctor.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/medical-records/${rec.id}`);
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="View Full Details"
                  >
                    <Eye size={18} />
                  </button>
                  {user?.role === 'DOCTOR' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/medical-records/${rec.id}/edit`);
                        }}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Edit Record"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={(e) => handleArchive(rec.id, e)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Archive Record"
                      >
                        <Archive size={18} />
                      </button>
                    </>
                  )}
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </div>

              {/* Record Summary Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700 block mb-0.5">Symptoms / Chief Complaint:</span>
                  <p className="text-gray-600 line-clamp-2">{rec.symptoms}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 block mb-0.5 flex items-center gap-1">
                    <Pill size={14} className="text-green-600" /> Prescription & Instructions:
                  </span>
                  <p className="text-gray-600 line-clamp-2">{rec.prescription}</p>
                </div>
              </div>

              {/* Follow-up & Appointment Info Footer */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500">
                <div>
                  {rec.appointment ? (
                    <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                      <Clock size={12} /> Linked Appointment Slot: {rec.appointment.startTime}
                    </span>
                  ) : (
                    <span className="text-gray-400">Direct Consultation Record</span>
                  )}
                </div>

                <div>
                  {rec.followUpDate ? (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                      <Calendar size={12} /> Next Follow-up: {new Date(rec.followUpDate).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-gray-400">No follow-up scheduled</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicalRecordsList;
