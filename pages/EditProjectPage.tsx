// pages/EditProjectPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import ProjectForm from '../components/projects/ProjectForm.tsx';
import { getProjectById } from '../services/apiService.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { Project, NotificationType } from '../types.ts';
import Spinner from '../components/ui/Spinner.tsx';
import { useNotifications } from '../hooks/useNotifications.ts';

const EditProjectPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for user auth to resolve

    if (!projectId) {
      setError("Project ID is missing.");
      addNotification("Project ID is missing.", NotificationType.ERROR);
      setIsLoading(false);
      navigate("/dashboard"); // Or some error page
      return;
    }

    if (!user) {
      // Should be caught by ProtectedRoute, but defensive check
      addNotification("You must be logged in to edit projects.", NotificationType.ERROR);
      setIsLoading(false);
      navigate("/login");
      return;
    }

    const fetchProject = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await getProjectById(projectId);
        if (fetchError) {
          throw new Error(fetchError.message || "Failed to fetch project details.");
        }
        if (!data) {
          throw new Error("Project not found.");
        }
        if (data.posted_by_user_id !== user.id) {
          throw new Error("You are not authorized to edit this project.");
        }
        setProjectToEdit(data);
      } catch (err: any) {
        setError(err.message);
        addNotification(err.message, NotificationType.ERROR);
        // Consider redirecting if critical error like not found or not authorized
        if (err.message.includes("not found") || err.message.includes("not authorized")) {
            navigate("/dashboard");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();

  }, [projectId, user, authLoading, addNotification, navigate]);

  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">Error: {error}</div>;
  }

  if (!projectToEdit) {
    // This case should ideally be handled by the error state or redirect
    return <div className="text-center p-8">Project data could not be loaded for editing.</div>;
  }
  
  // Ensure the user is the owner (double check after loading project data)
  if (projectToEdit.posted_by_user_id !== user?.id) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <ProjectForm projectToEdit={projectToEdit} />
    </div>
  );
};

export default EditProjectPage;