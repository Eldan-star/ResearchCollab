import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProjectInput, ProjectSchema, CompensationModel, Project, NotificationType } from '../../types.ts';
import Input from '../ui/Input.tsx';
import Textarea from '../ui/Textarea.tsx';
import Select from '../ui/Select.tsx';
import Button from '../ui/Button.tsx';
import { useAuth } from '../../hooks/useAuth.ts';
import { useNotifications } from '../../hooks/useNotifications.ts';
import { createProject, updateProject } from '../../services/apiService.ts';
import { useNavigate } from 'react-router-dom';
import MilestoneListEditor from './MilestoneListEditor.tsx';
import { PlusCircle, Tag } from 'lucide-react';

interface ProjectFormProps {
  projectToEdit?: Project;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ projectToEdit }) => {
  const { addNotification } = useNotifications();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [currentSkills, setCurrentSkills] = useState<string[]>(projectToEdit?.required_skills || []);
  const [skillInput, setSkillInput] = useState('');

  const { 
    register, 
    handleSubmit, 
    control, 
    setValue, 
    watch, 
    formState: { errors } 
  } = useForm<ProjectInput>({
    resolver: zodResolver(ProjectSchema),
    defaultValues: {
      // Base defaults for a new project
      title: '',
      description: '',
      required_skills: [],
      compensation_model: CompensationModel.STIPEND,
      confidentiality_agreement_required: false,
      milestones: [],
      deliverables: '', // Textarea starts with a string
      // If projectToEdit exists, spread its values over the defaults
      ...(projectToEdit && {
        ...projectToEdit,
        application_deadline: projectToEdit.application_deadline?.split('T')[0],
        start_date: projectToEdit.start_date?.split('T')[0],
        end_date: projectToEdit.end_date?.split('T')[0],
        milestones: projectToEdit.milestones?.map(m => ({
          description: m.description,
          amount: m.amount,
          due_date: m.due_date?.split('T')[0]
        })) || [],
        // Correctly convert deliverables array back to a newline-separated string for the textarea
        deliverables: projectToEdit.deliverables?.join('\n') || ''
      })
    } as unknown as ProjectInput, // Cast because form state (string) differs from final data (string[])
  });

  useEffect(() => {
    // Sync local state for UI tag display when projectToEdit changes
    if (projectToEdit?.required_skills) {
      setCurrentSkills(projectToEdit.required_skills);
    }
  }, [projectToEdit]);

  const compensationModelValue = watch('compensation_model');

  const handleAddSkill = () => {
    if (skillInput.trim() && !currentSkills.includes(skillInput.trim())) {
      const updatedSkills = [...currentSkills, skillInput.trim()];
      setCurrentSkills(updatedSkills);
      setValue('required_skills', updatedSkills, { shouldValidate: true });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = currentSkills.filter(skill => skill !== skillToRemove);
    setCurrentSkills(updatedSkills);
    setValue('required_skills', updatedSkills, { shouldValidate: true });
  };

  const onSubmit: SubmitHandler<ProjectInput> = async (data) => {
    if (!user || authLoading) {
      addNotification('You must be logged in to create or update a project.', NotificationType.ERROR);
      return;
    }

    setIsLoading(true);
    try {
      // REMOVED: Redundant logic. Zod schema now handles deliverables conversion.
      // The `data` object passed here will already have `deliverables` as a string array.

      let response;
      if (projectToEdit) {
        const { milestones, ...projectCoreData } = data;
        response = await updateProject(projectToEdit.id, projectCoreData);
      } else {
        response = await createProject(data);
      }

      if (response.error) {
        throw new Error(response.error.message || `Database error code: ${response.error.code}`);
      }

      addNotification(
        `Project ${projectToEdit ? 'updated' : 'created'} successfully!`, 
        NotificationType.SUCCESS
      );
      navigate(`/projects/${response.data?.id || ''}`);
    } catch (error: any) {
      addNotification(
        error.message || `Failed to ${projectToEdit ? 'update' : 'create'} project.`,
        NotificationType.ERROR
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 md:p-8 shadow-xl rounded-lg max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-primary mb-8">
        {projectToEdit ? 'Edit Project' : 'Create New Research Project'}
      </h2>

      <Input 
        label="Project Title" 
        {...register('title')} 
        error={errors.title?.message} 
        placeholder="e.g., Analysis of Quantum Entanglement in Urban Pigeons" 
      />

      <Textarea 
        label="Project Description" 
        {...register('description')} 
        error={errors.description?.message} 
        placeholder="Detailed description of the project, goals, methodology, and expected outcomes..." 
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
        <div className="flex items-center gap-2 mb-2">
          <Input 
            type="text" 
            value={skillInput} 
            onChange={(e) => setSkillInput(e.target.value)} 
            placeholder="e.g., Python, SPSS, Lab Safety" 
            containerClassName="flex-grow mb-0"
            onKeyDown={(e) => { 
              if (e.key === 'Enter') { 
                e.preventDefault(); 
                handleAddSkill(); 
              }
            }}
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleAddSkill} 
            leftIcon={<PlusCircle size={18}/>}
          >
            Add Skill
          </Button>
        </div>
        {errors.required_skills && (
          <p className="text-xs text-red-600 mb-2">{errors.required_skills.message}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {currentSkills.map(skill => (
            <span key={skill} className="flex items-center bg-primary-light text-primary-dark px-3 py-1 rounded-full text-sm">
              <Tag size={14} className="mr-1.5"/>{skill}
              <button 
                type="button" 
                onClick={() => handleRemoveSkill(skill)} 
                className="ml-2 text-primary-dark hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input 
          label="Estimated Hours (Optional)" 
          type="number" 
          {...register('estimated_hours', { valueAsNumber: true })} 
          error={errors.estimated_hours?.message} 
        />
        <Select 
          label="Compensation Model" 
          {...register('compensation_model')} 
          error={errors.compensation_model?.message}
        >
          {Object.values(CompensationModel).map(model => (
            <option key={model} value={model}>
              {model.replace(/_/g, ' ')}
            </option>
          ))}
        </Select>
      </div>

      {compensationModelValue === CompensationModel.STIPEND && (
        <Input 
          label="Stipend Amount (USD, Optional)" 
          type="number" 
          step="0.01" 
          {...register('stipend_amount', { valueAsNumber: true })} 
          error={errors.stipend_amount?.message} 
        />
      )}
      
      <Textarea 
        label="Deliverables (Optional, one per line)" 
        {...register('deliverables')} 
        placeholder="e.g., Literature review report\nProcessed dataset\nDraft manuscript section"
        error={errors.deliverables?.message}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Input 
          label="Application Deadline (Optional)" 
          type="date" 
          {...register('application_deadline')} 
          error={errors.application_deadline?.message} 
        />
        <Input 
          label="Project Start Date (Optional)" 
          type="date" 
          {...register('start_date')} 
          error={errors.start_date?.message} 
        />
        <Input 
          label="Project End Date (Optional)" 
          type="date" 
          {...register('end_date')} 
          error={errors.end_date?.message} 
        />
      </div>

      <div className="flex items-center">
        <input
          id="confidentiality_agreement_required"
          type="checkbox"
          {...register('confidentiality_agreement_required')}
          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
        <label htmlFor="confidentiality_agreement_required" className="ml-2 block text-sm text-gray-900">
          Confidentiality Agreement Required
        </label>
      </div>

      <MilestoneListEditor control={control} register={register} errors={errors} />

      <Button 
        type="submit" 
        className="w-full text-lg py-3" 
        isLoading={isLoading || authLoading}
      >
        {projectToEdit ? 'Update Project Details' : 'Publish Project'}
      </Button>
    </form>
  );
};

export default ProjectForm;