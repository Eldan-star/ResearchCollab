
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { ArrowRight, Search, Edit3 } from 'lucide-react';
import ProjectCard from '../components/projects/ProjectCard.tsx';
import { Project, ProjectStatus, UserRole } from '../types.ts';
import { getProjects } from '../services/apiService.ts';
import Spinner from '../components/ui/Spinner.tsx';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [heroVisible, setHeroVisible] = useState(false);
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Animate hero section
    const timer = setTimeout(() => setHeroVisible(true), 100);

    // Fetch featured projects
    const fetchFeaturedProjects = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch the first page of open projects, then take the first 3
        const { data, error: fetchError } = await getProjects(1, { status: ProjectStatus.OPEN });
        if (fetchError) {
          throw new Error(fetchError.message);
        }
        setFeaturedProjects(data?.slice(0, 3) || []);
      } catch (err: any) {
        setError('Failed to load featured projects. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProjects();
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-primary to-primary-dark text-white">
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-6 text-center">
          <h1 className={`text-4xl md:text-6xl font-bold mb-6 transition-all duration-700 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            Unlock Research Potential. <span className="text-secondary">Collaborate. Innovate.</span>
          </h1>
          <p className={`text-lg md:text-xl mb-10 max-w-2xl mx-auto transition-all duration-700 ease-out delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            Connecting brilliant minds for impactful academic and research projects.
            Find your next opportunity or the perfect contributor.
          </p>
          <div className={`space-x-4 transition-all duration-700 ease-out delay-[400ms] ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <Link to="/projects">
              <Button size="lg" variant="secondary" className="text-neutral-dark" rightIcon={<Search size={20}/>}>
                Browse Projects
              </Button>
            </Link>
            {!user && (
              <Link to="/signup">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary" rightIcon={<ArrowRight size={20}/>}>
                  Get Started
                </Button>
              </Link>
            )}
            {user && user.role === UserRole.RESEARCH_LEAD && (
               <Link to="/projects/create">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary" rightIcon={<Edit3 size={20}/>}>
                  Post a Project
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Featured Projects Section */}
      <section className="py-16 bg-white text-neutral-dark">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-semibold text-center mb-12 text-primary">Featured Opportunities</h2>
          {isLoading ? (
            <Spinner size="lg" />
          ) : error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : featuredProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 italic">No open projects available right now. Check back soon!</p>
          )}
           <div className="text-center mt-12">
            <Link to="/projects">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight size={20}/>}>
                View All Projects
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 bg-neutral-light text-neutral-dark">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-semibold text-center mb-12 text-primary">How ResearchCollab Works</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6 bg-white rounded-lg shadow-lg">
              <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">1</div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Post or Find</h3>
              <p className="text-gray-600">Research Leads share project needs. Contributors discover exciting opportunities.</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-lg">
               <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">2</div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Connect & Apply</h3>
              <p className="text-gray-600">Securely apply, discuss project details, and form collaborations.</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-lg">
               <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">3</div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Collaborate & Grow</h3>
              <p className="text-gray-600">Work on projects, achieve milestones, and build your academic portfolio.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer (Simplified) */}
      <footer className="py-8 text-center text-primary-light bg-primary-dark">
        <p>&copy; {new Date().getFullYear()} ResearchCollab Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
