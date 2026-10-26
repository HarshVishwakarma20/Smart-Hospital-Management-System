import { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Users, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface User {
  id: string;
  name: string;
}

interface Slot {
  id: string;
  startTime: string;
  endTime?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: string;
  doctor: {
    id: string;
    name: string;
  };
  patient: {
    id: string;
    name: string;
  };
}

const ReceptionistDashboard = () => {
  const [patients, setPatients] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
    fetchAllAppointments();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/users/patients');
      setPatients(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      setDoctors(res.data);
      if (res.data.length > 0 && !selectedDoctor) {
        setSelectedDoctor(res.data[0].id);
        fetchSlots(res.data[0].id, selectedDate);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAllAppointments(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSlots = async (doctorId: string, date: string) => {
    if (!doctorId || !date) return;
    try {
      const res = await api.get(`/doctors/${doctorId}/availability?date=${date}`);
      setAvailableSlots(res.data);
    } catch (e) {
      setAvailableSlots([]);
    }
  };

  const handleDateOrDoctorChange = (docId: string, dateStr: string) => {
    fetchSlots(docId, dateStr);
  };

  const handleBook = async (slot: Slot) => {
    if (!selectedPatient) {
      setError('Please select a patient first');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await api.post('/appointments', {
        patientId: selectedPatient,
        doctorId: selectedDoctor,
        date: selectedDate,
        startTime: slot.startTime,
      });
      setMessage(`Appointment booked successfully for ${slot.startTime} on ${selectedDate}!`);
      fetchSlots(selectedDoctor, selectedDate); // refresh slots
      fetchAllAppointments(); // refresh appointment list
    } catch (e: any) {
      setError(e.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await api.put(`/appointments/${id}/cancel`);
      fetchAllAppointments();
      if (selectedDoctor && selectedDate) {
        fetchSlots(selectedDoctor, selectedDate);
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const formatDisplayDate = (dateStr: string) => {
    const datePart = dateStr.split('T')[0];
    const d = new Date(datePart + 'T00:00:00.000Z');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const upcomingBookings = allAppointments
    .filter(a => a.status === 'BOOKED' && a.date.split('T')[0] >= todayStr)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.startTime.localeCompare(b.startTime));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receptionist Dashboard</h1>
        <p className="text-gray-500">Assisted appointment scheduling and hospital schedule overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assisted Booking Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900">
            <Calendar className="text-blue-600" /> Assisted Booking
          </h2>

          {message && (
            <div className="p-3 rounded-lg mb-4 text-xs bg-green-50 text-green-800 border border-green-200 flex items-center gap-2">
              <CheckCircle2 size={16} /> {message}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg mb-4 text-xs bg-red-50 text-red-800 border border-red-200 flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Users size={16} className="text-blue-600" /> Select Patient
              </label>
              <select 
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                value={selectedPatient}
                onChange={(e) => {
                  setSelectedPatient(e.target.value);
                  setError('');
                }}
              >
                <option value="">-- Choose Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
              <select 
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                value={selectedDoctor}
                onChange={(e) => {
                  setSelectedDoctor(e.target.value);
                  handleDateOrDoctorChange(e.target.value, selectedDate);
                }}
              >
                <option value="">-- Choose Doctor --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Select Date Ahead</label>
                <span className="text-xs text-gray-500">{formatDisplayDate(selectedDate)}</span>
              </div>
              <input 
                type="date"
                min={todayStr}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  handleDateOrDoctorChange(selectedDoctor, e.target.value);
                }}
              />
              {/* Quick Date Pills */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { label: 'Today', offset: 0 },
                  { label: 'Tomorrow', offset: 1 },
                  { label: '+2 Days', offset: 2 },
                  { label: '+3 Days', offset: 3 },
                  { label: '+7 Days', offset: 7 },
                  { label: '+14 Days', offset: 14 }
                ].map(({ label, offset }) => {
                  const d = new Date();
                  d.setDate(d.getDate() + offset);
                  const str = d.toISOString().split('T')[0];
                  return (
                    <button
                      key={offset}
                      type="button"
                      onClick={() => {
                        setSelectedDate(str);
                        handleDateOrDoctorChange(selectedDoctor, str);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-md border font-medium transition ${
                        selectedDate === str
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDoctor && selectedDate && (
              <div className="pt-4 border-t border-gray-200 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-800">Available Slots Ahead</label>
                  <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded">
                    {availableSlots.length} slot{availableSlots.length !== 1 ? 's' : ''} available
                  </span>
                </div>

                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {availableSlots.map(slot => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => handleBook(slot)}
                        disabled={loading || !selectedPatient}
                        className="border border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100 py-2 px-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition text-center shadow-sm"
                        title={!selectedPatient ? 'Select a patient first' : `Book ${slot.startTime}`}
                      >
                        <div>{slot.startTime}</div>
                        {slot.endTime && <div className="text-[10px] text-blue-500 font-normal">{slot.endTime}</div>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center">
                    No slots available for this date.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* System Upcoming Appointments Overview */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold flex items-center gap-1.5 text-gray-900">
              <Clock size={18} className="text-blue-600" /> Upcoming Bookings Ahead
            </h2>
            <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded-full">
              {upcomingBookings.length}
            </span>
          </div>

          {upcomingBookings.length > 0 ? (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {upcomingBookings.map(app => (
                <div key={app.id} className="border border-gray-200 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold text-xs text-gray-900">{app.patient.name}</div>
                    <button
                      onClick={() => handleCancel(app.id)}
                      className="text-[11px] text-red-500 hover:text-red-700 transition"
                      title="Cancel appointment"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    With <strong>{app.doctor.name}</strong>
                  </div>
                  <div className="text-[11px] text-blue-700 font-medium mt-1 bg-blue-50 px-2 py-0.5 rounded inline-block">
                    {formatDisplayDate(app.date)} at {app.startTime}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-8">No upcoming bookings in system.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
