import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Clock, Users, XCircle, FileText, PlusCircle, ChevronRight, Stethoscope, Calendar } from 'lucide-react';

interface Appointment {
  id: string;
  patientId: string;
  date: string;
  startTime: string;
  status: string;
  patient: {
    id: string;
    name: string;
  };
}

interface MedicalRecordSummary {
  id: string;
  recordDate: string;
  diagnosis: string;
  symptoms: string;
  patient?: {
    name: string;
  };
}

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<MedicalRecordSummary[]>([]);

  useEffect(() => {
    fetchAppointments();
    fetchRecentRecords();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecentRecords = async () => {
    try {
      const res = await api.get('/medical-records');
      setRecords(res.data.slice(0, 3));
    } catch (e) {
      console.error('Failed to load doctor records:', e);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.put(`/appointments/${id}/cancel`);
      fetchAppointments();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const today = new Date().toDateString();
  const todaysAppointments = appointments.filter(a => new Date(a.date).toDateString() === today);
  const upcomingAppointments = appointments.filter(a => new Date(a.date).toDateString() !== today && a.status === 'BOOKED');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-500">Manage your schedule, appointments, and patient medical records</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/medical-records/new"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-sm transition"
          >
            <PlusCircle size={16} /> New Medical Record
          </Link>
          <Link
            to="/medical-records"
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-3.5 py-2 rounded-lg text-sm transition"
          >
            <FileText size={16} className="text-blue-600" /> View EHR Records
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="text-blue-600" /> Today's Schedule
          </h2>
          
          {todaysAppointments.length > 0 ? (
            <div className="space-y-4">
              {todaysAppointments.map(app => (
                <div key={app.id} className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded shadow-sm flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-800 text-lg">{app.startTime}</div>
                    <div className="text-gray-600 flex items-center gap-1 mt-1">
                      <Users size={16} /> {app.patient.name}
                    </div>
                    <div className="mt-2 text-xs font-medium px-2 py-1 bg-gray-200 text-gray-700 rounded inline-block">
                      {app.status}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/medical-records/new?patientId=${app.patientId || app.patient.id}&appointmentId=${app.id}`}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded font-medium flex items-center gap-1"
                      title="Record Clinical EHR for this appointment"
                    >
                      <FileText size={13} /> Record EHR
                    </Link>
                    {app.status === 'BOOKED' && (
                      <button 
                        onClick={() => handleCancel(app.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Cancel Appointment"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No appointments scheduled for today.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="text-green-600" /> Upcoming Appointments
          </h2>
          
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.map(app => (
                <div key={app.id} className="border border-gray-200 p-3 rounded bg-white flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-800">{app.patient.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(app.date).toDateString()} at {app.startTime}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/medical-records/new?patientId=${app.patientId || app.patient.id}&appointmentId=${app.id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded"
                    >
                      EHR Record
                    </Link>
                    <button 
                      onClick={() => handleCancel(app.id)}
                      className="text-red-500 hover:text-red-700 text-sm border border-red-200 px-2 py-1 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No upcoming appointments.</p>
          )}
        </div>

      </div>

      {/* Recent Medical Records (EHR) Section */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="text-blue-600" /> Recent Authored Medical Records (EHR)
          </h2>
          <Link
            to="/medical-records"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View All Records <ChevronRight size={16} />
          </Link>
        </div>

        {records.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {records.map((rec) => (
              <Link
                key={rec.id}
                to={`/medical-records/${rec.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition bg-gray-50"
              >
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {new Date(rec.recordDate).toLocaleDateString()}
                  </span>
                  {rec.patient && <span className="font-medium text-gray-700">Patient: {rec.patient.name}</span>}
                </div>
                <h4 className="font-semibold text-gray-900 text-base mb-1 truncate">{rec.diagnosis}</h4>
                <p className="text-xs text-gray-600 line-clamp-2">{rec.symptoms}</p>
                <span className="text-xs text-blue-600 font-medium inline-flex items-center gap-1 mt-2">
                  View Full Details <ChevronRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            <Stethoscope className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            No medical records authored recently. Click "New Medical Record" to record a consultation.
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;
