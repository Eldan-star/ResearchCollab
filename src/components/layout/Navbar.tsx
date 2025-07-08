// components/layout/Navbar.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.ts';
import Button from '../ui/Button.tsx';
import { APP_NAME } from '../../constants.ts';
import { LogOut, UserCircle, PlusCircle, LayoutDashboard, Search, Briefcase, Settings as AdminIcon } from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell.tsx'; // Added import

const Navbar: React.FC = () => {
  const { user, signOut, isResearchLead, isAdmin, isContributor } = useAuth();
  const navigate = useNavigate();

  // console.log("Navbar User:", JSON.stringify(user, null, 2)); 
  // console.log("Navbar isResearchLead:", isResearchLead);
  // console.log("Navbar isContributor:", isContributor);
  // console.log("Navbar isAdmin:", isAdmin);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-primary hover:text-primary-dark">
              {APP_NAME}
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-4"> {/* Links visible on medium screens and up */}
            {user && (
              <Link to="/dashboard" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center">
                <LayoutDashboard size={18} className="mr-1" /> Dashboard
              </Link>
            )}
            {user && isResearchLead && (
              <Link to="/projects/create" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center">
                <PlusCircle size={18} className="mr-1" /> New Project
              </Link>
            )}
            {user && isContributor && (
               <Link to="/my-applications" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center">
                <Briefcase size={18} className="mr-1" /> My Applications
              </Link>
            )}
            {user && isAdmin && (
               <Link to="/admin" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center">
                <AdminIcon size={18} className="mr-1" /> Admin Panel
              </Link>
            )}
            <Link to="/projects" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center">
                <Search size={18} className="mr-1" /> Browse Projects
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <NotificationBell /> {/* NOTIFICATION BELL ADDED HERE */}
                
                <div className="relative group">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="flex items-center">
                        <UserCircle size={20} className="mr-1" /> 
                        <span className="truncate max-w-[100px] md:max-w-[150px]">{user.name || user.email}</span>
                    </Button>
                </div>
                <Button onClick={handleSignOut} variant="outline" size="sm" leftIcon={<LogOut size={16}/>} className="hidden md:inline-flex">
                  Sign Out
                </Button>
                <Button onClick={handleSignOut} variant="ghost" size="sm" className="md:hidden"> {/* Icon only for small screens */}
                  <LogOut size={20}/>
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;