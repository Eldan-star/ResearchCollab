// App.tsx
import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { useAuth } from './hooks/useAuth.ts';
import { NotificationProvider } from './contexts/NotificationContext.tsx'; // For Toasts
import { NotificationCenterProvider } from './contexts/NotificationCenterContext.tsx'; // For In-App DB Notifications
import Navbar from './components/layout/Navbar.tsx';
import Spinner from './components/ui/Spinner.tsx';

// Lazy load pages based on your actual file structure
const HomePage = React.lazy(() => import('./pages/HomePage.tsx'));
const LoginPage = React.lazy(() => import('./pages/LoginPage.tsx'));
const SignupPage = React.lazy(() => import('./pages/SignupPage.tsx'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage.tsx'));
const CreateProjectPage = React.lazy(() => import('./pages/CreateProjectPage.tsx'));
const ProjectDetailsViewerPage = React.lazy(() => import('./pages/ProjectDetailsViewerPage.tsx'));
const ProjectListPage = React.lazy(() => import('./pages/ProjectListPage.tsx'));
const MyApplicationsPage = React.lazy(() => import('./pages/MyApplicationsPage.tsx')); 
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage.tsx'));
const EditProjectPage = React.lazy(() => import('./pages/EditProjectPage.tsx'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage.tsx')); 
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage.tsx'));
const UpdatePasswordPage = React.lazy(() => import('./pages/UpdatePasswordPage.tsx'));// Assuming this page will exist

interface ProtectedRouteProps {
  children: JSX.Element;
  roles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user, loading, session } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; 
  }

  return children;
};

const AppContent: React.FC = () => {
  return (
    <HashRouter>
      <Navbar />
      <main className="flex-grow">
        <Suspense fallback={<div className="flex justify-center items-center h-[calc(100vh-4rem)]"><Spinner size="lg" /></div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/projects/create" element={<ProtectedRoute roles={['research_lead']}><CreateProjectPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProjectDetailsViewerPage />} />
            <Route path="/projects/:projectId/apply" element={<ProtectedRoute roles={['contributor']}><ProjectDetailsViewerPage /></ProtectedRoute>} /> 
            <Route path="/projects/:projectId/manage" element={<ProtectedRoute roles={['research_lead']}><ProjectDetailsViewerPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/edit" element={<ProtectedRoute roles={['research_lead']}><EditProjectPage /></ProtectedRoute>} />
            
            <Route path="/my-applications" element={<ProtectedRoute roles={['contributor']}><MyApplicationsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} /> 
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <NotificationProvider> {/* For Toasts */}
      <AuthProvider>
        <NotificationCenterProvider> {/* For In-App DB Notifications */}
          <AppContent />
        </NotificationCenterProvider>
      </AuthProvider>
    </NotificationProvider>
  );
};

export default App;