// pages/MyApplicationsPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.ts';
import { useNotifications } from '../hooks/useNotifications.ts';
import { getApplicationsForUser } from '../services/apiService.ts';
import { Application, ApplicationStatus, NotificationType } from '../types.ts';
import Spinner from '../components/ui/Spinner.tsx';
import Button from '../components/ui/Button.tsx';
import { Briefcase, CalendarDays, ExternalLink, FileText, CheckCircle, XCircle, Clock, ListFilter, DollarSign } from 'lucide-react';

const ApplicationStatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  const statusInfo = {
    [ApplicationStatus.PENDING]: { text: 'Pending', icon: <Clock size={14} className="mr-1.5" />, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    [ApplicationStatus.SHORTLISTED]: { text: 'Shortlisted', icon: <ListFilter size={14} className="mr-1.5" />, color: 'bg-blue-100 text-blue-700 border-blue-300' },
    [ApplicationStatus.ACCEPTED]: { text: 'Accepted', icon: <CheckCircle size={14} className="mr-1.5" />, color: 'bg-green-100 text-green-700 border-green-300' },
    [ApplicationStatus.REJECTED]: { text: 'Rejected', icon: <XCircle size={14} className="mr-1.5" />, color: 'bg-red-100 text-red-700 border-red-300' },
    [ApplicationStatus.WITHDRAWN]: { text: 'Withdrawn', icon: <FileText size={14} className="mr-1.5" />, color: 'bg-gray-100 text-gray-700 border-gray-300' },
  };

  const currentStatus = statusInfo[status] || statusInfo[ApplicationStatus.PENDING];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStatus.color}`}>
      {currentStatus.icon}
      {currentStatus.text}
    </span>
  );
};


const MyApplicationsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { addNotification } = useNotifications();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const notifiedRef = useRef(false); // Prevent repeated notifications

  useEffect(() => {
    console.log('useEffect triggered', { user, authLoading });
    if (authLoading) return; // Wait for auth state to be resolved

    if (!user || user.role !== 'contributor') {
      setIsLoading(false);
      if (!notifiedRef.current) {
        addNotification('Access denied. This page is for contributors.', NotificationType.ERROR);
        notifiedRef.current = true;
      }
      return;
    }

    const fetchApps = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await getApplicationsForUser();
        if (fetchError) {
          throw new Error(fetchError.message || 'Failed to fetch applications.');
        }
        setApplications(data || []);
      } catch (err: any) {
        setError(err.message);
        addNotification(err.message, NotificationType.ERROR);
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]); // Removed addNotification from dependencies

  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center h-[calc(100vh-8rem)]"><Spinner size="lg" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">Error loading your applications: {error}</div>;
  }
  
  if (!user || user.role !== 'contributor') {
     return <div className="text-center p-8">This page is for contributors only.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <Briefcase size={30} className="mr-3 text-primary-dark" /> My Applications
        </h1>
        <p className="text-lg text-gray-600 mt-1">Track the status of all your project applications.</p>
      </header>

      {applications.length === 0 ? (
        <div className="text-center py-12 bg-white shadow-md rounded-lg">
          <FileText size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Applications Yet</h2>
          <p className="text-gray-500 mb-6">You haven't applied to any projects. Start exploring!</p>
          <Link to="/projects">
            <Button variant="primary" size="lg">Browse Projects</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((app) => (
            <div key={app.id} className="bg-white shadow-lg rounded-lg overflow-hidden transition-shadow hover:shadow-xl">
              <div className="p-5 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-3">
                  <h2 className="text-xl font-semibold text-primary hover:text-primary-dark mb-1 sm:mb-0">
                    <Link to={`/projects/${app.project_id}`}>{app.project?.title || 'View Project'}</Link>
                  </h2>
                  <ApplicationStatusBadge status={app.status} />
                </div>
                
                <p className="text-sm text-gray-600 mb-3 leading-relaxed line-clamp-3">
                  <strong>Your Proposal:</strong> {app.proposal_text}
                </p>

                <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mb-4">
                  <span className="flex items-center"><CalendarDays size={14} className="mr-1.5 text-gray-400"/>Applied on: {new Date(app.created_at!).toLocaleDateString()}</span>
                  {app.availability && <span className="flex items-center"><Clock size={14} className="mr-1.5 text-gray-400"/>Availability: {app.availability}</span>}
                  {app.proposed_rate !== undefined && <span className="flex items-center"><DollarSign size={14} className="mr-1.5 text-gray-400"/>Rate: ${app.proposed_rate}</span>}
                </div>
                
                {(app.cv_url || app.linkedin_url) && (
                    <div className="mb-4 text-sm">
                        {app.cv_url && <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center mr-4"><FileText size={15} className="mr-1"/>View CV/Resume</a>}
                        {app.linkedin_url && <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center"><ExternalLink size={15} className="mr-1"/>LinkedIn Profile</a>}
                    </div>
                )}

              </div>
              <div className="bg-gray-50 px-5 py-3 md:px-6 md:py-4 border-t border-gray-200">
                 <Link to={`/projects/${app.project_id}`}>
                    <Button variant="outline" size="sm" leftIcon={<ExternalLink size={16}/>}>
                        View Project Details
                    </Button>
                  </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyApplicationsPage;