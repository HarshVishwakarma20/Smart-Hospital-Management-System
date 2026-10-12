import { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Users } from 'lucide-react';

interface User {
  id: string;
  name: string;
}

interface Slot {
  id: string;
  startTime: string;
}

const ReceptionistDashboard = () => {
  const [patients, setPatients] = useState<User[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
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
    } catch (e) {
      console.error(e);
    }
  };

  const handleDateOrDoctorChange = async (doctorId: string, date: string) => {
    if (doctorId && date) {
      try {
        const res = await api.get(`/doctors/${doctorId}/availability?date=${date}`);
        setAvailableSlots(res.data);
      } catch (e) {
        setAvailableSlots([]);
      }
    }
  };

  const handleBook = async (slot: Slot) => {
    if (!selectedPatient) {
      setMessage('Please select a patient first');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await api.post('/appointments', {
        patientId: selectedPatient,
        doctorId: selectedDoctor,
        date: selectedDate,
        startTime: slot.startTime,
      });
      setMessage('Appointment booked successfully!');
      handleDateOrDoctorChange(selectedDoctor, selectedDate); // refresh slots
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receptionist Dashboard</h1>
        <p className="text-gray-500">Book appointments on behalf of patients</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Calendar className="text-blue-600" /> Assisted Booking
        </h2>

        {message && (
          <div className={`p-3 rounded mb-4 ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Users size={16} /> Select Patient
            </label>
            <select 
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
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
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input 
              type="date"
              min={new Date().toISOString().split('T')[0]}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                handleDateOrDoctorChange(selectedDoctor, e.target.value);
              }}
            />
          </div>

          {selectedDoctor && selectedDate && (
            <div className="pt-4 border-t mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">Available Slots</label>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {availableSlots.map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => handleBook(slot)}
                      disabled={loading || !selectedPatient}
                      className="border border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100 py-2 px-3 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No slots available for this date.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
