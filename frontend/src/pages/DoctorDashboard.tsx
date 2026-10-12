import { useState, useEffect } from 'react';
import api from '../services/api';
import { Clock, Users, XCircle } from 'lucide-react';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  status: string;
  patient: {
    name: string;
  };
}

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data);
    } catch (e) {
      console.error(e);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
        <p className="text-gray-500">Manage your schedule and appointments</p>
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
                  {app.status === 'BOOKED' && (
                    <button 
                      onClick={() => handleCancel(app.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Cancel Appointment"
                    >
                      <XCircle size={20} />
                    </button>
                  )}
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
                  <button 
                    onClick={() => handleCancel(app.id)}
                    className="text-red-500 hover:text-red-700 text-sm border border-red-200 px-2 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No upcoming appointments.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default DoctorDashboard;
