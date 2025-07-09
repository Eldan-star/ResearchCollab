// pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import { Project, Application, UserRole } from '../types.ts'; // UserRole already imported
import { getProjects, getApplicationsForUser } from '../services/apiService.ts';
import ProjectCard from '../components/projects/ProjectCard.tsx';
import Spinner from '../components/ui/Spinner.tsx';
import Button from '../components/ui/Button.tsx';
import { Link } from 'react-router-dom';
import { PlusCircle, Briefcase, Settings as AdminIcon, Search as BrowseIcon } from 'lucide-react'; // Renamed for clarity

const DashboardPage: React.FC = () => {
  const { user, isResearchLead, isContributor, isAdmin, loading: authLoading } = useAuth(); // Added authLoading

  const [projects, setProjects] = useState<Project[]>([]); // For "Recent Open Projects"
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [myPostedProjects, setMyPostedProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || !user) { // Wait for auth to settle
        if (!authLoading) setIsLoading(false); // If auth is done and no user, stop loading
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        // Fetch a few open projects for general display
        const projectResponse = await getProjects(1, { status: 'open' }); // Fetch 1st page of open projects
        if (projectResponse.error && projectResponse.status !== 406) { // 406 is "Not Acceptable", often if no rows found with .single() but here it's for array
          console.warn(`Warning loading open projects: ${projectResponse.error.message}`);
        }
        setProjects(projectResponse.data?.slice(0, 3) || []); // Show first 3

        if (isContributor) {
          const appResponse = await getApplicationsForUser();
          if (appResponse.error) throw new Error(`Failed to load your applications: ${appResponse.error.message}`);
          setMyApplications(appResponse.data || []);
        }
        if (isResearchLead) {
          const postedResponse = await getProjects(1, { user_id: user.id }); // Fetch user's projects
          if (postedResponse.error && postedResponse.status !== 406) {
             console.warn(`Warning loading your posted projects: ${postedResponse.error.message}`);
          }
          setMyPostedProjects(postedResponse.data || []);
        }
        // Admin specific data can be fetched here
      } catch (err: any) {
        console.error("Dashboard fetchData error:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isContributor, isResearchLead, authLoading]); // Add authLoading

  if (authLoading || isLoading) { // Combined loading states
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">Error loading dashboard: {error}</div>;
  }
  
  if (!user) {
    return <div className="text-center p-8">Please log in to view your dashboard.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8 p-6 bg-white shadow-lg rounded-lg border border-gray-200">
        <h1 className="text-3xl font-bold text-primary mb-2">Welcome back, {user.name}!</h1>
        <p className="text-gray-600">Manage your research collaborations and discover new opportunities.</p>
      </div>

      {/* Role-specific Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <Link to="/projects" className="block p-6 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-colors">
          <BrowseIcon size={32} className="mb-2" />
          <h3 className="text-xl font-semibold">Browse All Projects</h3>
          <p className="text-sm opacity-90">Find ongoing research opportunities.</p>
        </Link>
        {isResearchLead && (
          <Link to="/projects/create" className="block p-6 bg-primary text-white rounded-lg shadow-md hover:bg-primary-dark transition-colors">
            <PlusCircle size={32} className="mb-2" />
            <h3 className="text-xl font-semibold">Post New Project</h3>
            <p className="text-sm opacity-90">Share your research needs.</p>
          </Link>
        )}
        {isContributor && (
          <Link to="/my-applications" className="block p-6 bg-secondary text-neutral-dark rounded-lg shadow-md hover:bg-secondary-dark transition-colors">
            <Briefcase size={32} className="mb-2" />
            <h3 className="text-xl font-semibold">My Applications</h3>
            <p className="text-sm opacity-90">Track your applications.</p>
          </Link>
        )}
        {isAdmin && (
           <Link to="/admin" className="block p-6 bg-neutral-dark text-white rounded-lg shadow-md hover:bg-gray-800 transition-colors">
            <AdminIcon size={32} className="mb-2" />
            <h3 className="text-xl font-semibold">Admin Panel</h3>
            <p className="text-sm opacity-90">Manage platform settings.</p>
          </Link>
        )}
      </div>

      {/* Sections for different roles */}
      {isResearchLead && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Posted Projects</h2>
          {myPostedProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {myPostedProjects.map(p => <ProjectCard key={p.id} project={p} showApplyButton={false}/>)}
            </div>
          ) : (
            <div className="p-6 bg-white rounded-lg shadow border text-center">
              <p className="text-gray-500 mb-3">You haven't posted any projects yet.</p>
              <Link to="/projects/create"><Button variant="primary">Post Your First Project</Button></Link>
            </div>
          )}
        </section>
      )}

      {isContributor && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Recent Applications</h2>
          {myApplications.length > 0 ? (
            <div className="bg-white shadow rounded-lg p-1"> {/* Reduced padding for list items to fill better */}
              {myApplications.slice(0, 5).map(app => ( // Show first 5
                <div key={app.id} className="p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                  <Link to={`/projects/${app.project_id}`} className="font-semibold text-primary hover:underline">{app.project?.title || 'Project Details'}</Link>
                  <span className={`ml-3 px-2.5 py-1 text-xs font-medium rounded-full ${
                    app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    app.status === 'shortlisted' ? 'bg-blue-100 text-blue-700' :
                    app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{app.status.replace('_', ' ')}</span>
                  <p className="text-sm text-gray-500 mt-1">Applied on: {new Date(app.created_at!).toLocaleDateString()}</p>
                </div>
              ))}
               {myApplications.length > 5 && (
                  <div className="text-center py-3">
                      <Link to="/my-applications">
                          <Button variant="ghost" size="sm">View All My Applications</Button>
                      </Link>
                  </div>
              )}
            </div>
          ) : (
             <div className="p-6 bg-white rounded-lg shadow border text-center">
                <p className="text-gray-500 mb-3">You haven't applied to any projects yet.</p>
                <Link to="/projects"><Button variant="primary">Browse Open Projects</Button></Link>
              </div>
          )}
        </section>
      )}
      
      {projects.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Recently Opened Projects</h2>
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}
      

    </div>
  );
};

export default DashboardPage;