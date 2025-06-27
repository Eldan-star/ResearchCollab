// pages/ProjectListPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Project, CompensationModel, ProjectStatus } from '../types.ts';
import { getProjects } from '../services/apiService.ts';
import ProjectCard from '../components/projects/ProjectCard.tsx';
import Spinner from '../components/ui/Spinner.tsx';
import Button from '../components/ui/Button.tsx';
import Input from '../components/ui/Input.tsx';
import Select from '../components/ui/Select.tsx';
import { PAGINATION_PAGE_SIZE } from '../constants.ts';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const DEBOUNCE_DELAY = 500;

const ProjectListPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchTermFromUrl = searchParams.get('search') || '';
  const compensationFilterFromUrl = searchParams.get('compensation') || '';

  const [searchInput, setSearchInput] = useState(searchTermFromUrl);
  const [selectedCompensation, setSelectedCompensation] = useState<CompensationModel | ''>(compensationFilterFromUrl as CompensationModel | '');

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput.trim() !== searchTermFromUrl.trim()) {
        setSearchParams(prev => {
          if (searchInput.trim()) {
            prev.set('search', searchInput.trim());
          } else {
            prev.delete('search');
          }
          prev.set('page', '1');
          return prev;
        }, { replace: true });
      }
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, searchTermFromUrl, setSearchParams]);


  const fetchAndSetProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: any = { status: ProjectStatus.OPEN };
      if (searchTermFromUrl) {
        filters.search = searchTermFromUrl;
      }
      if (compensationFilterFromUrl) {
        filters.compensation_model = compensationFilterFromUrl;
      }

      const { data, error: fetchError } = await getProjects(currentPage, filters);

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch projects.');
      }

      setProjects(data || []);
    } catch (err: any) {
      setError(err.message);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTermFromUrl, compensationFilterFromUrl]);

  useEffect(() => {
    setSearchInput(searchTermFromUrl);
    setSelectedCompensation(compensationFilterFromUrl as CompensationModel | '');
  }, [searchTermFromUrl, compensationFilterFromUrl]);

  useEffect(() => {
    fetchAndSetProjects();
  }, [fetchAndSetProjects]);

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  };

  const handleSearchSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    setSearchParams(prev => {
      if (searchInput.trim()) {
        prev.set('search', searchInput.trim());
      } else {
        prev.delete('search');
      }
      prev.set('page', '1');
      return prev;
    }, { replace: true });
  };

  const handleCompensationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as CompensationModel | '';
    setSelectedCompensation(value);
    setSearchParams(prev => {
      if (value) {
        prev.set('compensation', value);
      } else {
        prev.delete('compensation');
      }
      prev.set('page', '1');
      return prev;
    }, { replace: true });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      prev.set('page', newPage.toString());
      return prev;
    }, { replace: true });
    window.scrollTo(0, 0);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary">Browse Research Projects</h1>
        <p className="text-lg text-gray-600 mt-2">Find your next collaborative opportunity.</p>
      </header>

      <div className="mb-8 p-4 bg-white shadow-md rounded-lg">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input
            label="Search Projects"
            type="text"
            value={searchInput}
            onChange={handleSearchInputChange}
            placeholder="Keywords, title, skills..."
            containerClassName="md:col-span-2"
            className="!mb-0"
          />
          <Button type="submit" leftIcon={<Search size={18} />} className="w-full md:w-auto h-10">
            Search
          </Button>
        </form>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Select
                label="Filter by Compensation"
                value={selectedCompensation}
                onChange={handleCompensationChange}
                containerClassName="!mb-0"
            >
                <option value="">All Compensation Types</option>
                {Object.values(CompensationModel).map(model => (
                <option key={model} value={model}>
                    {model.replace(/_/g, ' ')}
                </option>
                ))}
            </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="text-center text-red-500 bg-red-50 p-4 rounded-md">
          <p className="font-semibold">Error loading projects:</p>
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && projects.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          <Filter size={48} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold">No projects found.</h2>
          <p>Try adjusting your search or filters, or check back later for new opportunities.</p>
        </div>
      )}

      {!isLoading && !error && projects.length > 0 && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          <div className="mt-12 flex justify-between items-center">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              variant="outline"
              leftIcon={<ChevronLeft size={18}/>}
            >
              Previous
            </Button>
            <span className="text-gray-700">Page {currentPage}</span>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={projects.length < PAGINATION_PAGE_SIZE || isLoading}
              variant="outline"
              rightIcon={<ChevronRight size={18}/>}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
export default ProjectListPage;