
import React from 'react';
import { Link } from 'react-router-dom';
import AuthForm from '../components/auth/AuthForm.tsx';

const SignupPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-light flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-primary">
          Create your ResearchCollab account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-dark hover:text-primary">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <AuthForm isSignUp={true} />
      </div>
    </div>
  );
};

export default SignupPage;