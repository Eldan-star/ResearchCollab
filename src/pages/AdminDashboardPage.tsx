// pages/AdminDashboardPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import { useNotifications } from '../hooks/useNotifications.ts';
import { UserProfile, Project, UserRole, ProjectStatus, NotificationType } from '../types.ts';
import { getAllUsersAdmin, updateUserRoleAdmin, getAllProjectsAdmin, updateProjectStatusAdmin } from '../services/apiService.ts';
import Spinner from '../components/ui/Spinner.tsx';
import Button from '../components/ui/Button.tsx';
import Modal from '../components/ui/Modal.tsx';
import Select from '../components/ui/Select.tsx';
import Input from '../components/ui/Input.tsx';
import { Users, Briefcase, Edit, ShieldAlert, CheckCircle, ExternalLink, Filter, Search as SearchIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PAGINATION_PAGE_SIZE } from '../constants.ts';


const AdminDashboardPage: React.FC = () => {
  const { user: adminUser, loading: authLoading } = useAuth();
  const { addNotification } = useNotifications();

  const [activeTab, setActiveTab] = useState<'users' | 'projects'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState<UserRole | ''>('');

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newProjectStatus, setNewProjectStatus] = useState<ProjectStatus | ''>('');
  
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus | ''>('');

  const [usersPage, setUsersPage] = useState(1);
  const [projectsPage, setProjectsPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [hasMoreProjects, setHasMoreProjects] = useState(true);


  const fetchUsers = useCallback(async (page: number, search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError, count } = await getAllUsersAdmin(page, search);
      if (fetchError) throw fetchError;
      setUsers(prev => page === 1 ? (data || []) : [...prev, ...(data || [])]);
      setHasMoreUsers((data || []).length === PAGINATION_PAGE_SIZE);
    } catch (err: any) {
      setError(err.message || 'Failed to load users.');
      addNotification(err.message || 'Failed to load users.', NotificationType.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  const fetchProjects = useCallback(async (page: number, search: string, status: ProjectStatus | '') => {
    setIsLoading(true);
    setError(null);
    const filters: any = {};
    if (search) filters.search = search;
    if (status) filters.status = status;

    try {
      const { data, error: fetchError, count } = await getAllProjectsAdmin(page, filters);
      if (fetchError) throw fetchError;
      setProjects(prev => page === 1 ? (data || []) : [...prev, ...(data || [])]);
      setHasMoreProjects((data || []).length === PAGINATION_PAGE_SIZE);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects.');
      addNotification(err.message || 'Failed to load projects.', NotificationType.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    if (activeTab === 'users') {
      setUsers([]); // Clear before new search/filter
      fetchUsers(1, userSearchTerm);
      setUsersPage(1);
    }
  }, [activeTab, userSearchTerm, fetchUsers]);

  useEffect(() => {
     if (activeTab === 'projects') {
      setProjects([]); // Clear before new search/filter
      fetchProjects(1, projectSearchTerm, projectStatusFilter);
      setProjectsPage(1);
    }
  }, [activeTab, projectSearchTerm, projectStatusFilter, fetchProjects]);

  const handleOpenRoleModal = (userToEdit: UserProfile) => {
    setSelectedUser(userToEdit);
    setNewRole(userToEdit.role);
    setIsRoleModalOpen(true);
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole || newRole === selectedUser.role) {
      setIsRoleModalOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error: updateError } = await updateUserRoleAdmin(selectedUser.id, newRole);
      if (updateError) throw updateError;
      addNotification(`Role for ${selectedUser.name} updated to ${newRole}.`, NotificationType.SUCCESS);
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
      setIsRoleModalOpen(false);
    } catch (err: any) {
      addNotification(err.message || 'Failed to update role.', NotificationType.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenStatusModal = (projectToEdit: Project) => {
    setSelectedProject(projectToEdit);
    setNewProjectStatus(projectToEdit.status);
    setIsStatusModalOpen(true);
  };

  const handleProjectStatusChange = async () => {
    if (!selectedProject || !newProjectStatus || newProjectStatus === selectedProject.status) {
      setIsStatusModalOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error: updateError } = await updateProjectStatusAdmin(selectedProject.id, newProjectStatus);
      if (updateError) throw updateError;
      addNotification(`Status for project "${selectedProject.title}" updated to ${newProjectStatus}.`, NotificationType.SUCCESS);
      setProjects(projects.map(p => p.id === selectedProject.id ? { ...p, status: newProjectStatus } : p));
      setIsStatusModalOpen(false);
    } catch (err: any) {
      addNotification(err.message || 'Failed to update project status.', NotificationType.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUsers([]);
    fetchUsers(1, userSearchTerm);
    setUsersPage(1);
  };
  
  const handleProjectSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProjects([]);
    fetchProjects(1, projectSearchTerm, projectStatusFilter);
    setProjectsPage(1);
  };

  if (authLoading) return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  if (!adminUser || adminUser.role !== UserRole.ADMIN) {
    return <div className="text-center p-8 text-red-600">Access Denied. Admins only.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <ShieldAlert size={30} className="mr-3 text-red-500" /> Admin Dashboard
        </h1>
      </header>

      <div className="mb-6 border-b border-gray-300">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('users')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            User Management ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'projects' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Project Oversight ({projects.length})
          </button>
        </nav>
      </div>

      {isLoading && users.length === 0 && projects.length === 0 && <Spinner size="lg" />}
      {error && <p className="text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}

      {activeTab === 'users' && (
        <section>
          <form onSubmit={handleUserSearchSubmit} className="mb-4 flex gap-2">
            <Input 
              type="search" 
              placeholder="Search users (name, email, institution)..." 
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              containerClassName="flex-grow !mb-0"
            />
            <Button type="submit" leftIcon={<SearchIcon size={18}/>}>Search</Button>
          </form>
          <div className="bg-white shadow overflow-x-auto rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.institution}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenRoleModal(u)} leftIcon={<Edit size={14}/>}>Change Role</Button>
                      {/* Add Ban/Unban button later if DB supports user status */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
           {hasMoreUsers && !isLoading && (
            <div className="mt-4 text-center">
              <Button onClick={() => fetchUsers(usersPage + 1, userSearchTerm)} variant="outline" isLoading={isLoading}>Load More Users</Button>
            </div>
          )}
          {!isLoading && users.length === 0 && <p className="text-center text-gray-500 py-4">No users found.</p>}
        </section>
      )}

      {activeTab === 'projects' && (
        <section>
          <form onSubmit={handleProjectSearchSubmit} className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <Input 
              type="search" 
              placeholder="Search projects (title, description)..." 
              value={projectSearchTerm}
              onChange={(e) => setProjectSearchTerm(e.target.value)}
              containerClassName="md:col-span-2 !mb-0"
            />
            <Select
              value={projectStatusFilter}
              onChange={(e) => {
                setProjectStatusFilter(e.target.value as ProjectStatus | '');
                // Immediate filter update, or wait for search button? For now, part of search form.
              }}
              containerClassName="!mb-0"
            >
              <option value="">All Statuses</option>
              {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </Select>
            <Button type="submit" leftIcon={<SearchIcon size={18}/>} className="md:col-span-3">Search & Filter Projects</Button>
          </form>
          <div className="bg-white shadow overflow-x-auto rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Research Lead</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map(p => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.posted_by_user?.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            p.status === ProjectStatus.OPEN ? 'bg-green-100 text-green-800' : 
                            p.status === ProjectStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' :
                            p.status === ProjectStatus.COMPLETED ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'}`}>
                            {p.status.replace(/_/g, ' ')}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(p.created_at || '').toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenStatusModal(p)} leftIcon={<Edit size={14}/>}>Change Status</Button>
                      <Link to={`/projects/${p.id}`} target="_blank">
                        <Button variant="ghost" size="sm" leftIcon={<ExternalLink size={14}/>} className="ml-2">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
           {hasMoreProjects && !isLoading && (
            <div className="mt-4 text-center">
              <Button onClick={() => fetchProjects(projectsPage + 1, projectSearchTerm, projectStatusFilter)} variant="outline" isLoading={isLoading}>Load More Projects</Button>
            </div>
          )}
          {!isLoading && projects.length === 0 && <p className="text-center text-gray-500 py-4">No projects found.</p>}
        </section>
      )}

      {/* Modals */}
      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title={`Change Role for ${selectedUser?.name}`}>
        <Select label="New Role" value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
          <option value="" disabled>Select a role</option>
          {Object.values(UserRole).map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </Select>
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
          <Button onClick={handleRoleChange} isLoading={isLoading} disabled={!newRole || newRole === selectedUser?.role}>Confirm Change</Button>
        </div>
      </Modal>

      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title={`Change Status for "${selectedProject?.title}"`}>
        <Select label="New Status" value={newProjectStatus} onChange={(e) => setNewProjectStatus(e.target.value as ProjectStatus)}>
          <option value="" disabled>Select status</option>
          {Object.values(ProjectStatus).map(status => (
            <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
          ))}
        </Select>
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
          <Button onClick={handleProjectStatusChange} isLoading={isLoading} disabled={!newProjectStatus || newProjectStatus === selectedProject?.status}>Confirm Change</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboardPage;