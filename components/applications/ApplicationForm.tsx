// components/applications/ApplicationForm.tsx
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApplicationInput, ApplicationSchema, Project, NotificationType, UserRole } from '../../types.ts'; // Added UserRole
import Textarea from '../ui/Textarea.tsx';
import Input from '../ui/Input.tsx';
import Button from '../ui/Button.tsx';
import { useAuth } from '../../hooks/useAuth.ts';
import { useNotifications } from '../../hooks/useNotifications.ts';
import { createApplication, uploadFile } from '../../services/apiService.ts'; // Added uploadFile
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, XCircle } from 'lucide-react'; // Icons for file input

// Keep existing ApplicationSchema, but cv_url will be populated after upload
// The schema validates the final data sent to createApplication

const ApplicationForm: React.FC<ApplicationFormProps> = ({ project }) => {
  const { user, loading: authLoading } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false); // Combined loading state
  const [selectedCvFile, setSelectedCvFile] = useState<File | null>(null);
  const [cvFileError, setCvFileError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ApplicationInput>({
    resolver: zodResolver(ApplicationSchema),
    defaultValues: {
      project_id: project.id,
      proposal_text: '',
      availability: '',
      // cv_url is now handled by file upload primarily
      // linkedin_url: user?.linkedin_url || '', // Example if you stored it in user profile
    },
  });

  const handleCvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic client-side validation (optional, can be enhanced)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        setCvFileError('Invalid file type. Please upload a PDF or Word document.');
        setSelectedCvFile(null);
        setValue('cv_url', ''); // Clear any previously set URL
        return;
      }
      if (file.size > maxSize) {
        setCvFileError('File is too large. Maximum size is 5MB.');
        setSelectedCvFile(null);
        setValue('cv_url', '');
        return;
      }
      setSelectedCvFile(file);
      setCvFileError(null);
      // We don't set cv_url here yet, only after successful upload.
    } else {
      setSelectedCvFile(null);
      setCvFileError(null);
    }
  };

  const onSubmit: SubmitHandler<ApplicationInput> = async (data) => {
    if (!user || authLoading) {
      addNotification('You must be logged in to apply.', NotificationType.ERROR);
      return;
    }
    // Ensure role is contributor from AuthContext, not just relying on UI hiding the form.
    if (user.role !== UserRole.CONTRIBUTOR) { 
      addNotification('Only contributors can apply for projects.', NotificationType.ERROR);
      return;
    }
    setIsSubmitting(true);
    setCvFileError(null); // Clear previous file errors

    let uploadedCvUrl = data.cv_url; // Use existing URL if no new file or if it was pre-filled and not changed

    if (selectedCvFile) {
      try {
        addNotification('Uploading CV...', NotificationType.INFO, 10000); // Longer duration for upload
        // Using a specific bucket for CVs
        const { publicUrl, error: uploadError } = await uploadFile(selectedCvFile, 'cv-uploads'); 
        if (uploadError || !publicUrl) {
          throw new Error(uploadError?.message || 'CV upload failed. Please try again.');
        }
        uploadedCvUrl = publicUrl;
        addNotification('CV uploaded successfully!', NotificationType.SUCCESS);
      } catch (uploadError: any) {
        addNotification(uploadError.message, NotificationType.ERROR);
        setIsSubmitting(false);
        return; // Stop submission if CV upload fails
      }
    }
    
    const applicationPayload: ApplicationInput = {
      ...data,
      cv_url: uploadedCvUrl || '', // Ensure it's an empty string if no URL
    };

    try {
      const response = await createApplication(applicationPayload);
      if (response.error) {
        // Attempt to extract a more specific message if available
        const message = response.error.details?.includes('unique_application_per_project_user')
          ? 'You have already applied to this project.'
          : response.error.message;
        throw new Error(message);
      }
      addNotification('Application submitted successfully!', NotificationType.SUCCESS);
      navigate(`/projects/${project.id}`); 
    } catch (error: any) {
      addNotification(error.message || 'Failed to submit application.', NotificationType.ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 shadow-xl rounded-lg">
      <h3 className="text-2xl font-semibold text-primary mb-6">Apply for: {project.title}</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Textarea
          label="Your Proposal"
          {...register('proposal_text')}
          error={errors.proposal_text?.message}
          placeholder="Explain why you are a good fit for this project, your relevant experience, and how you can contribute."
          rows={6}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Availability (e.g., 20 hours/week, full-time for July)"
            {...register('availability')}
            error={errors.availability?.message}
          />
          <Input
            label="Proposed Rate (USD, if applicable)"
            type="number"
            step="0.01"
            {...register('proposed_rate', { valueAsNumber: true })}
            error={errors.proposed_rate?.message}
            placeholder="e.g., 25 (for $/hr) or 500 (fixed)"
          />
        </div>
        
        {/* CV Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload CV/Resume (PDF or Word, max 5MB)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {selectedCvFile ? (
                <>
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-sm text-gray-600">{selectedCvFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedCvFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                        setSelectedCvFile(null); 
                        setValue('cv_url', ''); // Also clear any underlying URL from schema
                        const fileInput = document.getElementById('cv_file_upload') as HTMLInputElement;
                        if(fileInput) fileInput.value = ''; // Reset file input
                    }}
                    className="text-red-600 hover:text-red-800"
                    leftIcon={<XCircle size={14}/>}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="cv_file_upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                    >
                      <span>Upload a file</span>
                      <input id="cv_file_upload" name="cv_file_upload" type="file" className="sr-only" onChange={handleCvFileChange} accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"/>
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 5MB</p>
                </>
              )}
            </div>
          </div>
          {(errors.cv_url?.message || cvFileError) && (
            <p className="mt-1 text-xs text-red-600">{cvFileError || errors.cv_url?.message}</p>
          )}
        </div>

        <Input
          label="Link to LinkedIn Profile (Optional, URL)"
          type="url"
          {...register('linkedin_url')}
          error={errors.linkedin_url?.message}
          placeholder="https://linkedin.com/in/yourprofile"
        />
        
        <Button type="submit" className="w-full text-lg py-3" isLoading={isSubmitting || authLoading}>
          Submit Application
        </Button>
      </form>
    </div>
  );
};

export default ApplicationForm;