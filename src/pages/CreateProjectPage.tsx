
import React from 'react';
import ProjectForm from '../components/projects/ProjectForm.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { Navigate } from 'react-router-dom';

const CreateProjectPage: React.FC = () => {
  const { user, isResearchLead, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user || !isResearchLead) {
    // Redirect non-research leads or unauthenticated users
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <ProjectForm />
    </div>
  );
};

export default CreateProjectPage;