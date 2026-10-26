import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  Clock,
  Users,
  XCircle,
  FileText,
  PlusCircle,
  ChevronRight,
  Stethoscope,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Appointment {
  id: string;
  patientId: string;
  date: string;
  startTime: string;
  endTime?: string;
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

interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<MedicalRecordSummary[]>([]);

  // Availability state
  const [mySlots, setMySlots] = useState<AvailabilitySlot[]>([]);
  const [availabilityDate, setAvailabilityDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [newSlotTime, setNewSlotTime] = useState('09:00');
  const [availLoading, setAvailLoading] = useState(false);
  const [availMessage, setAvailMessage] = useState('');
  const [availError, setAvailError] = useState('');

  useEffect(() => {
    fetchAppointments();
    fetchRecentRecords();
    fetchMyAvailability();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data);
    } catch (e) {
      console.error('Failed to load appointments:', e);
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

  const fetchMyAvailability = async () => {
    try {
      const res = await api.get('/doctors/my/availability');
      setMySlots(res.data);
    } catch (e) {
      console.error('Failed to load availability:', e);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.put(`/appointments/${id}/cancel`);
      fetchAppointments();
      fetchMyAvailability();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  // Add a single slot
  const handleAddSingleSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!availabilityDate || !newSlotTime) return;
    setAvailLoading(true);
    setAvailMessage('');
    setAvailError('');
    try {
      await api.post('/doctors/availability', {
        date: availabilityDate,
        startTime: newSlotTime,
      });
      setAvailMessage(`Slot ${newSlotTime} added for ${availabilityDate}`);
      fetchMyAvailability();
    } catch (err: any) {
      setAvailError(err.response?.data?.message || 'Failed to add availability slot');
    } finally {
      setAvailLoading(false);
    }
  };

  // Quick batch add full day slots (09:00 - 17:00)
  const handleAddFullDaySlots = async () => {
    if (!availabilityDate) return;
    setAvailLoading(true);
    setAvailMessage('');
    setAvailError('');
    const fullDaySlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];
    try {
      const res = await api.post('/doctors/availability', {
        date: availabilityDate,
        slots: fullDaySlots,
      });
      setAvailMessage(res.data.message || `Full day consultation slots added for ${availabilityDate}`);
      fetchMyAvailability();
    } catch (err: any) {
      setAvailError(err.response?.data?.message || 'Failed to generate full day slots');
    } finally {
      setAvailLoading(false);
    }
  };

  // Delete an availability slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Remove this availability slot?')) return;
    setAvailLoading(true);
    setAvailMessage('');
    setAvailError('');
    try {
      await api.delete(`/doctors/availability/${slotId}`);
      setAvailMessage('Slot removed successfully');
      fetchMyAvailability();
    } catch (err: any) {
      setAvailError(err.response?.data?.message || 'Failed to delete slot');
    } finally {
      setAvailLoading(false);
    }
  };

  // Dates categorization
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLocal = new Date().toDateString();

  const isAppointmentToday = (a: Appointment) => {
    const dateStr = a.date.split('T')[0];
    return dateStr === todayStr || new Date(a.date).toDateString() === todayLocal;
  };

  const isAppointmentFuture = (a: Appointment) => {
    const dateStr = a.date.split('T')[0];
    return dateStr > todayStr || new Date(a.date) > new Date();
  };

  const todaysAppointments = appointments
    .filter(a => isAppointmentToday(a))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingAppointments = appointments
    .filter(a => !isAppointmentToday(a) && isAppointmentFuture(a) && a.status === 'BOOKED')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.startTime.localeCompare(b.startTime));

  // Filter slots for selected date
  const slotsForSelectedDate = mySlots.filter(s => s.date.split('T')[0] === availabilityDate);

  const formatDisplayDate = (dateStr: string) => {
    const datePart = dateStr.split('T')[0];
    const d = new Date(datePart + 'T00:00:00.000Z');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-500">Manage your consultation schedule, available slots ahead, and patient EHR records</p>
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

      {/* Appointment Schedules: Today & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Schedule */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="text-blue-600" /> Today's Schedule
            </h2>
            <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2.5 py-0.5 rounded-full">
              {todaysAppointments.length} appointment{todaysAppointments.length !== 1 ? 's' : ''}
            </span>
          </div>

          {todaysAppointments.length > 0 ? (
            <div className="space-y-4">
              {todaysAppointments.map(app => (
                <div key={app.id} className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded shadow-sm flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-800 text-lg">{app.startTime} {app.endTime ? `- ${app.endTime}` : ''}</div>
                    <div className="text-gray-700 font-medium flex items-center gap-1 mt-1">
                      <Users size={16} className="text-blue-600" /> {app.patient.name}
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded inline-block ${
                        app.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
                        app.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/medical-records/new?patientId=${app.patientId || app.patient.id}&appointmentId=${app.id}`}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded font-medium flex items-center gap-1 transition"
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

        {/* Upcoming Appointments Ahead */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="text-green-600" /> Upcoming Appointments Ahead
            </h2>
            <span className="text-xs bg-green-100 text-green-800 font-medium px-2.5 py-0.5 rounded-full">
              {upcomingAppointments.length} scheduled
            </span>
          </div>

          {upcomingAppointments.length > 0 ? (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {upcomingAppointments.map(app => (
                <div key={app.id} className="border border-gray-200 p-3.5 rounded-lg bg-gray-50/50 hover:bg-gray-50 flex justify-between items-center transition">
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                      <Users size={15} className="text-green-600" /> {app.patient.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                      <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {formatDisplayDate(app.date)}
                      </span>
                      <span>at <strong>{app.startTime}</strong> {app.endTime ? `(${app.endTime})` : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/medical-records/new?patientId=${app.patientId || app.patient.id}&appointmentId=${app.id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2.5 py-1.5 rounded font-medium flex items-center gap-1 transition"
                    >
                      <FileText size={12} /> Record EHR
                    </Link>
                    <button
                      onClick={() => handleCancel(app.id)}
                      className="text-red-500 hover:text-red-700 text-xs bg-white border border-red-200 px-2.5 py-1.5 rounded transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No upcoming appointments scheduled.</p>
          )}
        </div>
      </div>

      {/* Doctor Availability Manager Ahead */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-2">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
              <Calendar className="text-indigo-600" /> My Availability Schedule & Slot Manager Ahead
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Review and configure available consultation slots ahead for patients and receptionists to book.
            </p>
          </div>
          <div className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 self-start sm:self-auto">
            Total active slots ahead: <strong>{mySlots.length}</strong>
          </div>
        </div>

        {availMessage && (
          <div className="mt-4 p-3 rounded-lg text-xs bg-green-50 text-green-800 border border-green-200 flex items-center gap-2">
            <CheckCircle2 size={16} /> {availMessage}
          </div>
        )}
        {availError && (
          <div className="mt-4 p-3 rounded-lg text-xs bg-red-50 text-red-800 border border-red-200 flex items-center gap-2">
            <AlertCircle size={16} /> {availError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Controls: Pick Date & Add Slots */}
          <div className="space-y-4 md:border-r md:pr-6 border-gray-200">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Select Date Ahead
              </label>
              <input
                type="date"
                min={todayStr}
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                className="w-full border-gray-300 rounded-lg p-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {[1, 2, 3, 5, 7].map((offset) => {
                  const d = new Date();
                  d.setDate(d.getDate() + offset);
                  const str = d.toISOString().split('T')[0];
                  return (
                    <button
                      key={offset}
                      type="button"
                      onClick={() => setAvailabilityDate(str)}
                      className={`text-xs px-2 py-0.5 rounded border transition ${
                        availabilityDate === str
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                      }`}
                    >
                      +{offset}d
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Batch Add */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddFullDaySlots}
                disabled={availLoading || !availabilityDate}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-300 font-medium py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Plus size={14} /> Quick Add Full-Day Slots (09:00 - 17:00)
              </button>
              <p className="text-[11px] text-gray-500 mt-1">
                Adds 12 standard 30-min consultation slots for the chosen date.
              </p>
            </div>

            {/* Add Custom Slot */}
            <form onSubmit={handleAddSingleSlot} className="pt-2 border-t border-gray-100 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Add Custom Slot
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="flex-1 border-gray-300 rounded-lg p-1.5 text-sm border"
                  required
                />
                <button
                  type="submit"
                  disabled={availLoading || !availabilityDate}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 disabled:opacity-50 transition"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </form>
          </div>

          {/* Slots for Selected Date */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">
                Configured Slots for {formatDisplayDate(availabilityDate)}
              </h3>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                {slotsForSelectedDate.length} slot{slotsForSelectedDate.length !== 1 ? 's' : ''}
              </span>
            </div>

            {slotsForSelectedDate.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                {slotsForSelectedDate.map((slot) => (
                  <div
                    key={slot.id}
                    className="border border-indigo-200 bg-indigo-50/50 p-2.5 rounded-lg flex items-center justify-between hover:bg-indigo-50 transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-indigo-900">{slot.startTime}</div>
                      <div className="text-[10px] text-indigo-600">to {slot.endTime}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id)}
                      disabled={availLoading}
                      title="Remove this slot"
                      className="text-gray-400 hover:text-red-600 p-1 rounded transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Calendar className="mx-auto h-7 w-7 text-gray-400 mb-1.5" />
                <p className="text-xs text-gray-500 font-medium">No slots configured for this date.</p>
                <button
                  type="button"
                  onClick={handleAddFullDaySlots}
                  className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                >
                  Click to add full day slots now
                </button>
              </div>
            )}
          </div>
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
