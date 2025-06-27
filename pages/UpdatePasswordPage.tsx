// pages/UpdatePasswordPage.tsx
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabaseClient.ts';
import Input from '../components/ui/Input.tsx';
import Button from '../components/ui/Button.tsx';
import { useNotifications } from '../hooks/useNotifications.ts';
import { NotificationType } from '../types.ts';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, CheckCircle } from 'lucide-react'; // Changed Lock to LockKeyhole

const UpdatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});
type UpdatePasswordFormData = z.infer<typeof UpdatePasswordSchema>;

const UpdatePasswordPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(UpdatePasswordSchema),
  });
  
  useEffect(() => {
    // Supabase handles the token from the URL hash automatically
    // and fires an onAuthStateChange event with type 'PASSWORD_RECOVERY'.
    // In this event, a session is typically active.
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event detected, session:', session);
        setIsRecoverySession(true);
        // The session is automatically set by Supabase in this flow.
        // No need to manually parse token from URL if this event fires.
      } else if (event === 'SIGNED_IN' && session?.user) {
        // If already signed in normally, might also allow password update via a profile page later
        // For now, focus on recovery. If the user is just SIGNED_IN but not via recovery,
        // this page might not be the right place unless it's linked from a profile settings page.
        // For now, we primarily expect this page to be used via PASSWORD_RECOVERY event.
      }
    });

    // Check for initial session which might already be a recovery session if navigated directly
    // after clicking email link.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Check if it's a recovery session by looking for specific metadata if Supabase provides it,
        // or just assume if on this page with a session, it's likely recovery.
        // The onAuthStateChange 'PASSWORD_RECOVERY' is more reliable.
        // For robustness, let's assume any session on this page might be for update.
        // setIsRecoverySession(true); // This might be too broad. Rely on PASSWORD_RECOVERY event.
      }
    });

    return () => {
      authListener.subscription?.unsubscribe();
    };
  }, []);


  const onSubmit: SubmitHandler<UpdatePasswordFormData> = async (data) => {
    setIsLoading(true);
    setError(null);
    setUpdateSuccess(false);

    try {
      // Check if user is in a recovery session or simply logged in
      const { data: { user } , error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error(userError?.message || "No active user session. Please try the password reset process again.");
      }
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        throw updateError;
      }
      setUpdateSuccess(true);
      addNotification('Password updated successfully! You can now log in with your new password.', NotificationType.SUCCESS);
      // Optionally sign out the user here if Supabase doesn't do it automatically
      // await supabase.auth.signOut();
      // navigate('/login'); // Redirect after a delay or on button click
    } catch (err: any) {
      console.error("Error updating password:", err);
      setError(err.message || 'Failed to update password. The link may have expired or been used already.');
      addNotification(err.message || 'Failed to update password.', NotificationType.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  // Show a message if the page is accessed without a recovery session active
  // This check might need refinement based on how Supabase session behaves.
  // The most reliable way to enable the form is through the `PASSWORD_RECOVERY` event.
  // However, the `onAuthStateChange` might fire after initial render.

  if (updateSuccess) {
    return (
      <div className="min-h-screen bg-neutral-light flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10 text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">Password Updated!</h3>
            <p className="text-gray-600 mt-2">
              Your password has been changed successfully.
            </p>
            <Button onClick={() => navigate('/login')} className="mt-6 w-full">
              Proceed to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
          Set Your New Password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              error={errors.password?.message}
            />
            <Input
              label="Confirm New Password"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;