import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.ts';
import { getUserProfile } from '../services/apiService.ts';
import { UserProfile } from '../types.ts';
import Spinner from '../components/ui/Spinner.tsx';
import Button from '../components/ui/Button.tsx';
import { Mail, Building, Award, Edit, Tag } from 'lucide-react';

const ViewProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>(); // This page always requires a userId
    const { user: currentUser, loading: authLoading } = useAuth();
    
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isOwnProfile = userId === currentUser?.id;

    const fetchProfile = useCallback(async () => {
        if (!userId) {
            setError("No user ID provided in URL.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await getUserProfile(userId);
            if (fetchError) throw fetchError;
            setProfile(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load profile.');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);
    
    if (isLoading || authLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">Error: {error}</div>;
    }

    if (!profile) {
        return <div className="text-center p-8">User profile not found.</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left space-y-4 md:space-y-0 md:space-x-8">
                        <img 
                            src={profile.profile_photo_url || `https://ui-avatars.com/api/?name=${profile.name.replace(' ','+')}&background=0D8ABC&color=fff&size=128`}
                            alt={`${profile.name}'s profile picture`}
                            className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                        />
                        <div className="flex-grow">
                            <h1 className="text-3xl font-bold text-primary">{profile.name}</h1>
                            <p className="text-md text-gray-600 flex items-center justify-center md:justify-start mt-1">
                                <Building size={16} className="mr-2 text-gray-500" />
                                {profile.institution || 'No institution provided'}
                            </p>
                            <p className="text-md text-gray-600 flex items-center justify-center md:justify-start mt-1">
                                <Award size={16} className="mr-2 text-gray-500" />
                                Role: <span className="font-semibold ml-1">{profile.role.replace('_', ' ')}</span>
                            </p>
                            {isOwnProfile && (
                                <p className="text-md text-gray-600 flex items-center justify-center md:justify-start mt-1">
                                    <Mail size={16} className="mr-2 text-gray-500" />
                                    {profile.email}
                                </p>
                            )}
                        </div>
                        {isOwnProfile && (
                            <div className="flex-shrink-0">
                                <Link to="/profile">
                                    <Button variant="outline" leftIcon={<Edit size={16} />}>
                                        Edit Profile
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {profile.bio && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-3">Biography</h2>
                            <p className="text-gray-600 whitespace-pre-line">{profile.bio}</p>
                        </div>
                    )}
                    
                    {profile.skills && profile.skills.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-3">Skills</h2>
                            <div className="flex flex-wrap gap-3">
                                {profile.skills.map(skill => (
                                    <span key={skill} className="flex items-center bg-primary-light text-primary-dark px-4 py-1.5 rounded-full text-sm font-medium">
                                        <Tag size={14} className="mr-2" />
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {!profile.bio && (!profile.skills || profile.skills.length === 0) && (
                        <div className="text-center text-gray-500 italic py-8">
                            This user has not added a biography or skills yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewProfilePage;