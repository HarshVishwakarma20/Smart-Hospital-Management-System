import { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Clock, User, XCircle } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  status: string;
  doctor: {
    name: string;
  };
}

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
}

const PatientDashboard = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      setDoctors(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    if (selectedDoctor && date) {
      fetchSlots(selectedDoctor, date);
    }
  };

  const handleDoctorChange = async (doctorId: string) => {
    setSelectedDoctor(doctorId);
    if (doctorId && selectedDate) {
      fetchSlots(doctorId, selectedDate);
    }
  };

  const fetchSlots = async (doctorId: string, date: string) => {
    try {
      const res = await api.get(`/doctors/${doctorId}/availability?date=${date}`);
      setAvailableSlots(res.data);
    } catch (e) {
      console.error(e);
      setAvailableSlots([]);
    }
  };

  const handleBook = async (slot: Slot) => {
    setBookingLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/appointments', {
        doctorId: selectedDoctor,
        date: selectedDate,
        startTime: slot.startTime,
      });
      setSuccess('Appointment booked successfully!');
      fetchAppointments();
      fetchSlots(selectedDoctor, selectedDate); // refresh slots
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.put(`/appointments/${id}/cancel`);
      fetchAppointments();
      if (selectedDoctor && selectedDate) {
         fetchSlots(selectedDoctor, selectedDate);
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
        <p className="text-gray-500">Manage your appointments and bookings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Book Appointment Section */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="text-blue-600" /> Book an Appointment
          </h2>
          
          {error && <div className="mb-4 text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
          {success && <div className="mb-4 text-green-600 text-sm bg-green-50 p-2 rounded">{success}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
              <select 
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                value={selectedDoctor}
                onChange={(e) => handleDoctorChange(e.target.value)}
              >
                <option value="">-- Choose a Doctor --</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
              <input 
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>

            {selectedDoctor && selectedDate && (
              <div className="pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots</label>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => handleBook(slot)}
                        disabled={bookingLoading}
                        className="border border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100 py-2 px-3 rounded text-sm font-medium disabled:opacity-50"
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center">No available slots for this date.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* My Appointments Section */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="text-blue-600" /> My Appointments
          </h2>

          {appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map(app => (
                <div key={app.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center bg-gray-50">
                  <div>
                    <div className="font-semibold text-gray-800 flex items-center gap-2">
                      <User size={16} /> {app.doctor.name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {new Date(app.date).toDateString()} at {app.startTime}
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        app.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
                        app.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                  
                  {app.status === 'BOOKED' && (
                    <button 
                      onClick={() => handleCancel(app.id)}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm bg-white border border-red-200 px-3 py-1 rounded"
                    >
                      <XCircle size={16} /> Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">You don't have any appointments.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default PatientDashboard;
