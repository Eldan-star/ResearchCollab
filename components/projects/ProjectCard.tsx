
import React from 'react';
import { Link } from 'react-router-dom';
import { Project, CompensationModel, UserRole } from '../../types.ts';
import Button from '../ui/Button.tsx';
import { Briefcase, CalendarDays, DollarSign, Edit3, Eye, Users, CheckSquare, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';

interface ProjectCardProps {
  project: Project;
  showApplyButton?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, showApplyButton = true }) => {
  const { user, isResearchLead } = useAuth();

  const getCompensationIcon = (model: CompensationModel) => {
    switch (model) {
      case CompensationModel.STIPEND: return <DollarSign size={16} className="mr-1 text-green-600" />;
      case CompensationModel.CO_AUTHORSHIP: return <Users size={16} className="mr-1 text-blue-600" />;
      case CompensationModel.LETTER_OF_RECOMMENDATION: return <CheckSquare size={16} className="mr-1 text-purple-600" />;
      default: return <Briefcase size={16} className="mr-1 text-gray-600" />;
    }
  };
  
  const isOwner = user?.id === project.posted_by_user_id;

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden transition-all hover:shadow-2xl flex flex-col">
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold text-primary hover:text-primary-dark">
            <Link to={`/projects/${project.id}`}>{project.title}</Link>
          </h3>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            project.status === 'open' ? 'bg-green-100 text-green-700' : 
            project.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {project.status.replace('_', ' ')}
          </span>
        </div>

        <p className="text-gray-600 text-sm mb-3 h-16 overflow-hidden text-ellipsis">
          {project.description.substring(0, 150)}{project.description.length > 150 && '...'}
        </p>

        <div className="text-sm text-gray-500 mb-3">
          <p className="flex items-center mb-1">
            {getCompensationIcon(project.compensation_model)}
            {project.compensation_model.replace('_', ' ')}
            {project.compensation_model === CompensationModel.STIPEND && project.stipend_amount && (
              <span className="ml-1 font-semibold text-green-700">${project.stipend_amount}</span>
            )}
          </p>
          {project.application_deadline && (
            <p className="flex items-center">
              <CalendarDays size={16} className="mr-1 text-red-500" />
              Apply by: {new Date(project.application_deadline).toLocaleDateString()}
            </p>
          )}
        </div>

        {project.required_skills && project.required_skills.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Skills:</h4>
            <div className="flex flex-wrap gap-1">
              {project.required_skills.slice(0, 5).map(skill => (
                <span key={skill} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                  {skill}
                </span>
              ))}
              {project.required_skills.length > 5 && (
                 <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                  +{project.required_skills.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {project.posted_by_user && (
          <div className="text-xs text-gray-500 mt-auto pt-3 border-t border-gray-200">
            Posted by: {project.posted_by_user.is_anonymous && !isOwner ? 'Anonymous Researcher' : project.posted_by_user.name} 
            {project.posted_by_user.is_anonymous && !isOwner ? '' : ` (${project.posted_by_user.institution})`}
          </div>
        )}
      </div>
      
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <Link to={`/projects/${project.id}`} className="flex-1 mr-2">
            <Button variant="outline" size="sm" className="w-full" leftIcon={<Eye size={16}/>}>
              View Details
            </Button>
          </Link>
          {showApplyButton && user && !isResearchLead && !isOwner && project.status === 'open' && (
            <Link to={`/projects/${project.id}/apply`} className="flex-1">
              <Button variant="primary" size="sm" className="w-full" leftIcon={<Edit3 size={16}/>}>
                Apply Now
              </Button>
            </Link>
          )}
           {isOwner && (
             <Link to={`/projects/${project.id}/manage`} className="flex-1">
              <Button variant="secondary" size="sm" className="w-full" leftIcon={<Settings size={16}/>}>
                Manage Project
              </Button>
            </Link>
           )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;