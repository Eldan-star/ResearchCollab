
import React, { useState } from 'react';
import { useForm, SubmitHandler, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth.ts';
import { useNotifications } from '../../hooks/useNotifications.ts';
import { UserRole, NotificationType } from '../../types.ts';
import { UNIVERSITY_EMAIL_DOMAINS } from '../../constants.ts';
import Input from '../ui/Input.tsx';
import Button from '../ui/Button.tsx';
import Select from '../ui/Select.tsx';
import { useNavigate } from 'react-router-dom';

interface AuthFormProps {
  isSignUp?: boolean;
}

const emailValidation = z.string().email("Invalid email address")
  .refine(email => {
    if (UNIVERSITY_EMAIL_DOMAINS.length === 0) return true;
    const domain = email.substring(email.lastIndexOf('@') + 1);
    return UNIVERSITY_EMAIL_DOMAINS.includes(domain);
  }, `Email must be from an approved university domain (${UNIVERSITY_EMAIL_DOMAINS.join(', ')}).`);

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  institution: z.string().min(2, "Institution is required"),
  email: emailValidation,
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.nativeEnum(UserRole),
  is_anonymous: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;
type LoginFormData = z.infer<typeof loginSchema>;
type FormData = SignUpFormData | LoginFormData;

const AuthForm: React.FC<AuthFormProps> = ({ isSignUp = false }) => {
  const { signUp, signInWithPassword, loading } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [showAnonToggle, setShowAnonToggle] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(isSignUp ? signUpSchema : loginSchema),
    defaultValues: isSignUp ? { role: UserRole.CONTRIBUTOR, is_anonymous: false } : {},
  });
  
  const roleValue = isSignUp ? watch('role' as keyof SignUpFormData) : undefined;

  React.useEffect(() => {
    if (isSignUp) {
      setShowAnonToggle(roleValue === UserRole.RESEARCH_LEAD);
    }
  }, [roleValue, isSignUp]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (isSignUp) {
      const { name, institution, email, password, role, is_anonymous } = data as SignUpFormData;
      const { error } = await signUp({ name, institution, email, password_hash: password, role, is_anonymous });
      if (error) {
        addNotification(error.message || 'Sign up failed', NotificationType.ERROR);
      } else {
        addNotification('Sign up successful! Please check your email for verification.', NotificationType.SUCCESS);
        navigate('/dashboard');
      }
    } else {
      const { email, password } = data as LoginFormData;
      const { error } = await signInWithPassword({ email, password_hash: password });
      if (error) {
        addNotification(error.message || 'Login failed', NotificationType.ERROR);
      } else {
        addNotification('Login successful!', NotificationType.SUCCESS);
        navigate('/dashboard');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-8 shadow-xl rounded-lg max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center text-primary">
        {isSignUp ? 'Create an Account' : 'Login to ResearchCollab'}
      </h2>
      
      {isSignUp && (
        <>
          <Input label="Full Name" {...register('name' as keyof SignUpFormData)} error={(errors as FieldErrors<SignUpFormData>).name?.message as string} />
          <Input label="Institution" {...register('institution' as keyof SignUpFormData)} error={(errors as FieldErrors<SignUpFormData>).institution?.message as string} />
          <Select label="Role" {...register('role' as keyof SignUpFormData)} error={(errors as FieldErrors<SignUpFormData>).role?.message as string}>
            <option value={UserRole.CONTRIBUTOR}>Contributor (Student/Resident)</option>
            <option value={UserRole.RESEARCH_LEAD}>Research Lead (Professor/Senior)</option>
          </Select>
          {showAnonToggle && (
            <div className="flex items-center">
              <input
                id="is_anonymous"
                type="checkbox"
                {...register('is_anonymous' as keyof SignUpFormData)}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="is_anonymous" className="ml-2 block text-sm text-gray-900">
                Remain anonymous until collaborator selection
              </label>
            </div>
          )}
        </>
      )}
      
      <Input label="Email Address" type="email" {...register('email' as keyof FormData)} error={errors.email?.message as string} />
      <Input label="Password" type="password" {...register('password' as keyof FormData)} error={errors.password?.message as string} />
      
      <Button type="submit" className="w-full" isLoading={loading}>
        {isSignUp ? 'Sign Up' : 'Login'}
      </Button>
      
      {/* TODO: Add Google OAuth Button */}
      {/* <Button variant="outline" className="w-full mt-4" type="button" onClick={() => console.log('Google Sign In/Up')}>
        {isSignUp ? 'Sign Up with Google' : 'Login with Google'}
      </Button> */}
    </form>
  );
};

export default AuthForm;