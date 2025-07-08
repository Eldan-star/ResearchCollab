// pages/ForgotPasswordPage.tsx
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabaseClient.ts';
import Input from '../components/ui/Input.tsx';
import Button from '../components/ui/Button.tsx';
import { useNotifications } from '../hooks/useNotifications.ts';
import { NotificationType } from '../types.ts';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address."),
});
type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormData> = async (data) => {
    setIsLoading(true);
    setMessageSent(false);
    try {
      // IMPORTANT: Replace 'http://localhost:YOUR_PORT/#/update-password' 
      // with your actual redirect URL for the update password page.
      // This URL must be whitelisted in your Supabase project's Auth settings.
      // For development with HashRouter, it might be like:
      const redirectTo = 'http://localhost:5173/#/update-password';
      // For production, it would be your production URL:
      // const redirectTo = 'https://your-app-domain.com/#/update-password';


      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectTo,
      });

      if (error) {
        // Supabase might not always return an error for non-existent emails to prevent email enumeration.
        // So, we often show a generic success message regardless.
        console.error("Error sending password reset email:", error);
        // You might choose to show a generic message anyway or a specific one if error.message is helpful
        addNotification(error.message || 'Failed to send reset instructions. Please try again.', NotificationType.ERROR);
      } else {
        setMessageSent(true);
      }
    } catch (error: any) {
      console.error("Catch block error sending password reset:", error);
      addNotification('An unexpected error occurred. Please try again.', NotificationType.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-light flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
          Forgot Your Password?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          {messageSent ? (
            <div className="text-center">
              <Mail size={48} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700">Check Your Email</h3>
              <p className="text-gray-600 mt-2">
                If an account exists for the email address you entered, we've sent instructions on how to reset your password.
              </p>
              <p className="mt-4">
                <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
                  ← Back to Login
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
              />
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Send Reset Link
              </Button>
              <div className="text-center mt-4">
                <Link to="/login" className="text-sm font-medium text-primary hover:text-primary-dark">
                  Remembered your password? Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;