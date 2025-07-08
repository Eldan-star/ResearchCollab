// Create this file: pages/ProfilePage.tsx

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth.ts';
import { useNotifications } from '../hooks/useNotifications.ts';
import { UserProfile, UserRole, NotificationType } from '../types.ts';
import Input from '../components/ui/Input.tsx';
import Textarea from '../components/ui/Textarea.tsx';
import Button from '../components/ui/Button.tsx';
import Spinner from '../components/ui/Spinner.tsx';
import { DEFAULT_PROFILE_PHOTO_URL } from '../constants.ts';
import { Save, Image as ImageIcon } from 'lucide-react'; // UserCog was not used, removed

// Schema for profile updates
const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  institution: z.string().min(2, "Institution is required").optional(),
  bio: z.string().max(500, "Bio must be 500 characters or less").nullable().optional(), // Allow null
  skills: z.array(z.string()).optional(), 
  profile_photo_url: z.string().url("Must be a valid URL").or(z.literal('')).nullable().optional(), // Allow empty or null
  is_anonymous: z.boolean().optional(),
});

// FormData should allow partial updates
type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;


const ProfilePage: React.FC = () => {
  const { user, updateUserProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotifications();
  const [isLoadingForm, setIsLoadingForm] = useState(false); // Local loading for form submission
  const [currentSkills, setCurrentSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors, isDirty } } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    // Default values will be set by useEffect
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        institution: user.institution || '',
        bio: user.bio || '',
        profile_photo_url: user.profile_photo_url || '',
        is_anonymous: user.role === UserRole.RESEARCH_LEAD ? user.is_anonymous || false : undefined,
      });
      setCurrentSkills(user.skills || []);
    }
  }, [user, reset]);

  const handleAddSkill = () => {
    const trimmedSkill = skillInput.trim();
    if (trimmedSkill && !currentSkills.includes(trimmedSkill)) {
      const updatedSkills = [...currentSkills, trimmedSkill];
      setCurrentSkills(updatedSkills);
      setValue('skills', updatedSkills, { shouldValidate: true, shouldDirty: true }); // Mark form as dirty
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = currentSkills.filter(skill => skill !== skillToRemove);
    setCurrentSkills(updatedSkills);
    setValue('skills', updatedSkills, { shouldValidate: true, shouldDirty: true }); // Mark form as dirty
  };

  const onSubmit: SubmitHandler<ProfileUpdateFormData> = async (formData) => {
    if (!user) return;
    setIsLoadingForm(true);

    // Construct the payload with only the changed fields or fields intended to be explicitly set/cleared.
    const updatesToSubmit: Partial<UserProfile> = {
      // Always include skills array even if empty, as it's managed by currentSkills
      skills: currentSkills,
    };

    if (formData.name !== user.name) updatesToSubmit.name = formData.name;
    if (formData.institution !== user.institution) updatesToSubmit.institution = formData.institution;
    if (formData.bio !== (user.bio || '')) updatesToSubmit.bio = formData.bio || null; // Send null if cleared
    if (formData.profile_photo_url !== (user.profile_photo_url || '')) updatesToSubmit.profile_photo_url = formData.profile_photo_url || null; // Send null if cleared
    
    if (user.role === UserRole.RESEARCH_LEAD && formData.is_anonymous !== undefined && formData.is_anonymous !== user.is_anonymous) {
      updatesToSubmit.is_anonymous = formData.is_anonymous;
    }
    
    if (Object.keys(updatesToSubmit).length === 1 && updatesToSubmit.hasOwnProperty('skills') && JSON.stringify(updatesToSubmit.skills) === JSON.stringify(user.skills || [])) {
        // If only skills are in updatesToSubmit and they haven't actually changed.
        // This check might be too complex; isDirty from react-hook-form is better.
        // For now, if isDirty is false, we won't submit.
    }


    if (!isDirty && JSON.stringify(currentSkills) === JSON.stringify(user.skills || [])) {
        addNotification('No changes to save.', NotificationType.INFO);
        setIsLoadingForm(false);
        return;
    }


    const { error } = await updateUserProfile(updatesToSubmit);
    if (error) {
      addNotification(error.message || 'Failed to update profile.', NotificationType.ERROR);
    } else {
      addNotification('Profile updated successfully!', NotificationType.SUCCESS);
      // Reset form with new user data from context (which should update due to updateUserProfile success)
      // The useEffect watching `user` will handle resetting the form.
      // reset(formData); // Resets dirty state based on submitted data
    }
    setIsLoadingForm(false);
  };

  if (authLoading && !user) { // Use context's loading until user is available
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  if (!user) {
    return <div className="text-center p-8">Please log in to view or edit your profile.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
      <div className="bg-white p-6 md:p-8 shadow-xl rounded-lg">
        <div className="flex items-center space-x-4 mb-8">
          <img 
            src={user.profile_photo_url || DEFAULT_PROFILE_PHOTO_URL} 
            alt={user.name} 
            className="w-24 h-24 rounded-full object-cover border-4 border-primary-light"
          />
          <div>
            <h1 className="text-3xl font-bold text-primary">{user.name}</h1>
            <p className="text-gray-600">{user.email} ({user.role.replace('_', ' ')})</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input 
            label="Full Name" 
            {...register('name')} 
            error={errors.name?.message} 
            placeholder="Your full name"
          />
          <Input 
            label="Institution" 
            {...register('institution')} 
            error={errors.institution?.message}
            placeholder="Your university or research institution"
          />
          <Textarea 
            label="Bio" 
            {...register('bio')} 
            error={errors.bio?.message}
            placeholder="Tell us a bit about yourself, your research interests, etc. (Max 500 characters)"
            rows={4}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
            <div className="flex items-center gap-2 mb-2">
              <Input 
                type="text" 
                value={skillInput} 
                onChange={(e) => setSkillInput(e.target.value)} 
                placeholder="e.g., Python, Data Analysis" 
                containerClassName="flex-grow mb-0"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); }}}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddSkill}>Add Skill</Button>
            </div>
            {errors.skills && <p className="text-xs text-red-600 mb-1">{errors.skills.message}</p>}
            <div className="flex flex-wrap gap-2 min-h-[20px]">
              {currentSkills.map(skill => (
                <span key={skill} className="flex items-center bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {skill}
                  <button type="button" onClick={() => handleRemoveSkill(skill)} className="ml-1.5 text-gray-500 hover:text-red-500" aria-label={`Remove skill ${skill}`}>×</button>
                </span>
              ))}
            </div>
          </div>

          <Input 
            label="Profile Photo URL" 
            type="url"
            {...register('profile_photo_url')} 
            error={errors.profile_photo_url?.message}
            leftIcon={<ImageIcon size={16} className="text-gray-400"/>}
            placeholder="https://example.com/your-photo.jpg"
          />

          {user.role === UserRole.RESEARCH_LEAD && (
            <div className="flex items-center pt-2">
              <input
                id="is_anonymous"
                type="checkbox"
                {...register('is_anonymous')}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="is_anonymous" className="ml-2 block text-sm text-gray-900">
                Remain anonymous when posting projects (until collaborator selection)
              </label>
            </div>
          )}
          
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full text-lg py-3" 
              isLoading={isLoadingForm || authLoading} 
              disabled={!isDirty && JSON.stringify(currentSkills) === JSON.stringify(user.skills || [])} // Disable if no changes
              leftIcon={<Save size={18}/>}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;