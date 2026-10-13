import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Calendar, FileText } from 'lucide-react';
import api from '../services/api';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const isMedicalRecordsActive = location.pathname.startsWith('/medical-records');
  const isAppointmentsActive =
    (user?.role === 'PATIENT' && location.pathname === '/patient') ||
    (user?.role === 'DOCTOR' && location.pathname === '/doctor') ||
    (user?.role === 'RECEPTIONIST' && location.pathname === '/receptionist') ||
    (user?.role === 'ADMIN' && location.pathname === '/admin');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-white text-blue-600 p-1 rounded font-bold text-xl">SHMS</div>
              <span className="font-semibold text-lg hidden sm:block">Smart Hospital Management System</span>
            </Link>

            {/* Role-based Navigation Bar */}
            <nav className="hidden md:flex items-center gap-2">
              {user?.role === 'PATIENT' && (
                <>
                  <Link
                    to="/patient"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isAppointmentsActive ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-700/50'
                    }`}
                  >
                    <Calendar size={16} /> Appointments
                  </Link>
                  <Link
                    to="/medical-records"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isMedicalRecordsActive ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-700/50'
                    }`}
                  >
                    <FileText size={16} /> Medical Records (EHR)
                  </Link>
                </>
              )}

              {user?.role === 'DOCTOR' && (
                <>
                  <Link
                    to="/doctor"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isAppointmentsActive ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-700/50'
                    }`}
                  >
                    <Calendar size={16} /> Appointments & Schedule
                  </Link>
                  <Link
                    to="/medical-records"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isMedicalRecordsActive ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-700/50'
                    }`}
                  >
                    <FileText size={16} /> Medical Records (EHR)
                  </Link>
                </>
              )}

              {user?.role === 'RECEPTIONIST' && (
                <Link
                  to="/receptionist"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-700 text-white"
                >
                  <Calendar size={16} /> Reception Desk
                </Link>
              )}

              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-700 text-white"
                >
                  <User size={16} /> User & Role Management
                </Link>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User size={20} />
              <span className="text-sm font-medium">{user?.name} ({user?.role})</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded transition"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
