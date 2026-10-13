import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MedicalRecordsList from './pages/MedicalRecordsList';
import MedicalRecordDetail from './pages/MedicalRecordDetail';
import CreateMedicalRecord from './pages/CreateMedicalRecord';
import EditMedicalRecord from './pages/EditMedicalRecord';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div className="flex h-screen items-center justify-center text-red-600 font-semibold">Access Denied: You do not have permission to view this page.</div>;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={
            <RoleRedirect />
          } />
          <Route path="patient" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientDashboard /></ProtectedRoute>} />
          <Route path="doctor" element={<ProtectedRoute allowedRoles={['DOCTOR']}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="receptionist" element={<ProtectedRoute allowedRoles={['RECEPTIONIST']}><ReceptionistDashboard /></ProtectedRoute>} />
          <Route path="admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
          
          {/* Module 3: Patient Medical Records Management (EHR) */}
          <Route path="medical-records" element={<ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR']}><MedicalRecordsList /></ProtectedRoute>} />
          <Route path="medical-records/new" element={<ProtectedRoute allowedRoles={['DOCTOR']}><CreateMedicalRecord /></ProtectedRoute>} />
          <Route path="medical-records/:id" element={<ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR']}><MedicalRecordDetail /></ProtectedRoute>} />
          <Route path="medical-records/:id/edit" element={<ProtectedRoute allowedRoles={['DOCTOR']}><EditMedicalRecord /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Router>
  );
}

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  switch (user.role) {
    case 'PATIENT': return <Navigate to="/patient" />;
    case 'DOCTOR': return <Navigate to="/doctor" />;
    case 'RECEPTIONIST': return <Navigate to="/receptionist" />;
    case 'ADMIN': return <Navigate to="/admin" />;
    default: return <Navigate to="/login" />;
  }
};

export default App;
