// pages/LoginPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import AuthForm from '../components/auth/AuthForm.tsx';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-light flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/signup" className="font-medium text-primary-dark hover:text-primary">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <AuthForm isSignUp={false} />
        {/* ADDED FORGOT PASSWORD LINK */}
        <div className="mt-6 text-center">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary hover:text-primary-dark"
          >
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;