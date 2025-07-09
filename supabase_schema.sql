-- Remove existing types and tables if they exist to ensure a clean slate (optional, be careful on existing data)
-- Consider this section if you are re-running and want to start fresh.
-- DROP TABLE IF EXISTS public.ratings CASCADE;
-- DROP TABLE IF EXISTS public.messages CASCADE;
-- DROP TABLE IF EXISTS public.applications CASCADE;
-- DROP TABLE IF EXISTS public.milestones CASCADE;
-- DROP TABLE IF EXISTS public.projects CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;

-- DROP TYPE IF EXISTS public.user_role;
-- DROP TYPE IF EXISTS public.project_status;
-- DROP TYPE IF EXISTS public.milestone_status;
-- DROP TYPE IF EXISTS public.application_status;
-- DROP TYPE IF EXISTS public.compensation_model;

-- Custom ENUM types
CREATE TYPE public.user_role AS ENUM (
    'research_lead',
    'contributor',
    'admin'
);

CREATE TYPE public.project_status AS ENUM (
    'open',
    'in_progress',
    'completed',
    'closed',
    'cancelled'
);

CREATE TYPE public.milestone_status AS ENUM (
    'pending',
    'completed',
    'paid'
);

CREATE TYPE public.application_status AS ENUM (
    'pending',
    'shortlisted',
    'accepted',
    'rejected',
    'withdrawn'
);

CREATE TYPE public.compensation_model AS ENUM (
    'stipend',
    'co_authorship',
    'letter_of_recommendation',
    'other_benefit'
);

-- Users Table
-- This table stores public profile information for users.
-- It references the `auth.users` table which is managed by Supabase Authentication.
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email character varying(255) NOT NULL UNIQUE,
    role public.user_role NOT NULL DEFAULT 'contributor'::public.user_role,
    name character varying(255) NOT NULL,
    institution character varying(255) NOT NULL,
    bio text NULL,
    skills text[] NULL, -- Array of text, e.g., {'Python', 'Data Analysis'}
    profile_photo_url character varying(2048) NULL, -- URL to image in Supabase Storage or external
    is_anonymous boolean NOT NULL DEFAULT false, -- Specific to research_lead role
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.users IS 'Stores public user profile information, extending auth.users.';
COMMENT ON COLUMN public.users.is_anonymous IS 'Allows research leads to post projects anonymously until selection.';

-- Projects Table
CREATE TABLE public.projects (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    posted_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title character varying(150) NOT NULL,
    description text NOT NULL,
    required_skills text[] NULL,
    estimated_hours integer NULL CHECK (estimated_hours IS NULL OR estimated_hours > 0),
    deliverables text[] NULL,
    compensation_model public.compensation_model NOT NULL,
    stipend_amount numeric(10, 2) NULL CHECK (stipend_amount IS NULL OR stipend_amount >= 0),
    confidentiality_agreement_required boolean NOT NULL DEFAULT false,
    application_deadline date NULL,
    start_date date NULL,
    end_date date NULL,
    status public.project_status NOT NULL DEFAULT 'open'::public.project_status,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT projects_dates_check CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);
COMMENT ON TABLE public.projects IS 'Stores details of research projects posted by research leads.';
COMMENT ON COLUMN public.projects.stipend_amount IS 'Monetary amount if compensation_model is stipend.';

-- Milestones Table
CREATE TABLE public.milestones (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    description text NOT NULL,
    amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
    due_date date NULL,
    status public.milestone_status NOT NULL DEFAULT 'pending'::public.milestone_status,
    stripe_transaction_id character varying(255) NULL, -- Optional reference to a Stripe charge
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.milestones IS 'Defines specific milestones for a project, including payment amounts.';

-- Applications Table
CREATE TABLE public.applications (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    contributor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    proposal_text text NOT NULL CHECK (char_length(proposal_text) <= 2000),
    availability character varying(255) NULL,
    proposed_rate numeric(10, 2) NULL CHECK (proposed_rate IS NULL OR proposed_rate >= 0),
    cv_url character varying(2048) NULL,
    linkedin_url character varying(2048) NULL,
    status public.application_status NOT NULL DEFAULT 'pending'::public.application_status,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_application_per_project_user UNIQUE (project_id, contributor_user_id)
);
COMMENT ON TABLE public.applications IS 'Stores applications submitted by contributors for projects.';

-- Messages Table (for project-specific chat)
CREATE TABLE public.messages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    sender_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message_text text NOT NULL,
    attachment_url character varying(2048) NULL, -- URL to file in Supabase Storage
    created_at timestamp with time zone NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.messages IS 'Stores chat messages related to a specific project collaboration.';

-- Ratings Table
CREATE TABLE public.ratings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    rated_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL, -- Keep rating if rater account deleted
    rated_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- Remove rating if rated user account deleted
    communication_rating integer NULL CHECK (communication_rating BETWEEN 1 AND 5),
    quality_rating integer NULL CHECK (quality_rating BETWEEN 1 AND 5),
    timeliness_rating integer NULL CHECK (timeliness_rating BETWEEN 1 AND 5),
    comments text NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT unique_rating_per_project_users UNIQUE (project_id, rated_by_user_id, rated_user_id)
);
COMMENT ON TABLE public.ratings IS 'Stores ratings given by users (leads to contributors, vice-versa) upon project completion.';

-- Indexes for performance
CREATE INDEX idx_projects_posted_by_user_id ON public.projects(posted_by_user_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_compensation_model ON public.projects(compensation_model);
CREATE INDEX idx_projects_application_deadline ON public.projects(application_deadline);
CREATE INDEX idx_projects_required_skills ON public.projects USING GIN (required_skills); -- For array searching

CREATE INDEX idx_milestones_project_id ON public.milestones(project_id);
CREATE INDEX idx_applications_project_id ON public.applications(project_id);
CREATE INDEX idx_applications_contributor_user_id ON public.applications(contributor_user_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_messages_project_id ON public.messages(project_id);
CREATE INDEX idx_messages_sender_user_id ON public.messages(sender_user_id);
CREATE INDEX idx_ratings_project_id ON public.ratings(project_id);
CREATE INDEX idx_ratings_rated_user_id ON public.ratings(rated_user_id);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- USERS Table RLS
-- Users can view their own profile.
CREATE POLICY "Allow individual user read access for themselves"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile.
CREATE POLICY "Allow individual user update access for themselves"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to view non-sensitive fields of other users (e.g., for project owner display)
-- Be restrictive here. This example allows viewing name, institution, profile_photo_url, is_anonymous if not anonymous.
-- Adjust as per actual needs. For instance, a research lead might see more of an applicant.
CREATE POLICY "Allow authenticated users to view basic profile info"
ON public.users
FOR SELECT
TO authenticated
USING (true); -- This is very permissive for SELECT. You might want to restrict columns or based on relationships.


-- PROJECTS Table RLS
-- Anyone can view open projects (or projects based on specific status logic).
CREATE POLICY "Allow public read access to open projects"
ON public.projects
FOR SELECT
USING (status = 'open'::public.project_status OR status = 'in_progress'::public.project_status OR status = 'completed'::public.project_status);

-- Authenticated users who are 'research_lead' can create projects.
CREATE POLICY "Allow research_lead to create projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = posted_by_user_id AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'research_lead'::public.user_role
);

-- Only the user who posted the project can update it.
CREATE POLICY "Allow project owner to update their projects"
ON public.projects
FOR UPDATE
USING (auth.uid() = posted_by_user_id)
WITH CHECK (auth.uid() = posted_by_user_id);

-- Only the user who posted the project can delete it (consider if deletion is allowed or just status change to 'closed'/'cancelled').
CREATE POLICY "Allow project owner to delete their projects"
ON public.projects
FOR DELETE
USING (auth.uid() = posted_by_user_id);


-- MILESTONES Table RLS
-- Users involved in a project (owner or accepted contributor) can view milestones.
CREATE POLICY "Allow project participants to view milestones"
ON public.milestones
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND (
            p.posted_by_user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.applications a
                WHERE a.project_id = p.id AND a.contributor_user_id = auth.uid() AND a.status = 'accepted'::public.application_status
            )
        )
    )
);

-- Only the project owner can create milestones for their project.
CREATE POLICY "Allow project owner to create milestones"
ON public.milestones
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.posted_by_user_id = auth.uid()
    )
);

-- Only the project owner can update milestones for their project.
CREATE POLICY "Allow project owner to update milestones"
ON public.milestones
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.posted_by_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.posted_by_user_id = auth.uid()
    )
);

-- Only project owner can delete milestones.
CREATE POLICY "Allow project owner to delete milestones"
ON public.milestones
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.posted_by_user_id = auth.uid()
    )
);


-- APPLICATIONS Table RLS
-- Contributors can view their own applications.
CREATE POLICY "Allow contributor to view their own applications"
ON public.applications
FOR SELECT
USING (auth.uid() = contributor_user_id);

-- Project owners can view applications for their projects.
CREATE POLICY "Allow project owner to view applications for their projects"
ON public.applications
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.posted_by_user_id = auth.uid()
    )
);

-- Authenticated users who are 'contributor' can create applications.
CREATE POLICY "Allow contributors to create applications"
ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = contributor_user_id AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'contributor'::public.user_role AND
    (SELECT status FROM public.projects WHERE id = project_id) = 'open'::public.project_status -- Can only apply to open projects
);

-- Project owner can update application status for their project.
CREATE POLICY "Allow project owner to update application status"
ON public.applications
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.posted_by_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND p.posted_by_user_id = auth.uid()
    )
);

-- Contributor can withdraw their own PENDING application.
CREATE POLICY "Allow contributor to withdraw their pending application"
ON public.applications
FOR UPDATE -- Typically status update to 'withdrawn'
USING (
    auth.uid() = contributor_user_id AND status = 'pending'::public.application_status
)
WITH CHECK (
    auth.uid() = contributor_user_id AND status = 'pending'::public.application_status
);


-- MESSAGES Table RLS
-- Project owner and accepted contributor for a project can view messages.
CREATE POLICY "Allow project participants to view messages"
ON public.messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND (
            p.posted_by_user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.applications a
                WHERE a.project_id = p.id AND a.contributor_user_id = auth.uid() AND a.status = 'accepted'::public.application_status
            )
        )
    )
);

-- Project owner and accepted contributor can send messages in their project.
CREATE POLICY "Allow project participants to send messages"
ON public.messages
FOR INSERT
WITH CHECK (
    auth.uid() = sender_user_id AND
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND (
            p.posted_by_user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.applications a
                WHERE a.project_id = p.id AND a.contributor_user_id = auth.uid() AND a.status = 'accepted'::public.application_status
            )
        )
    )
);


-- RATINGS Table RLS
-- Anyone authenticated can view ratings (can be made more restrictive).
CREATE POLICY "Allow authenticated users to view ratings"
ON public.ratings
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can create ratings.
-- More specific checks (e.g., must be project owner or accepted contributor, project must be 'completed') should be added.
CREATE POLICY "Allow authenticated users to create ratings"
ON public.ratings
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = rated_by_user_id AND
    EXISTS ( -- Ensure rater and rated are part of the project
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id AND (
            (p.posted_by_user_id = auth.uid() AND rated_user_id IN (SELECT contributor_user_id FROM public.applications WHERE project_id = p.id AND status = 'accepted'::public.application_status)) OR
            (rated_user_id = p.posted_by_user_id AND auth.uid() IN (SELECT contributor_user_id FROM public.applications WHERE project_id = p.id AND status = 'accepted'::public.application_status))
        ) AND p.status = 'completed'::public.project_status -- Can only rate completed projects
    )
);

-- Users can update their own ratings (e.g. edit comments).
CREATE POLICY "Allow user to update their own ratings"
ON public.ratings
FOR UPDATE
USING (auth.uid() = rated_by_user_id)
WITH CHECK (auth.uid() = rated_by_user_id);

-- Users can delete their own ratings.
CREATE POLICY "Allow user to delete their own ratings"
ON public.ratings
FOR DELETE
USING (auth.uid() = rated_by_user_id);


-- Functions to update `updated_at` columns automatically
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for users table
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Triggers for projects table
CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Triggers for milestones table
CREATE TRIGGER set_milestones_updated_at
BEFORE UPDATE ON public.milestones
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Triggers for applications table
CREATE TRIGGER set_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Grant usage on schema public to anon and authenticated roles
-- (Supabase usually handles default grants, but explicit can be good)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant specific permissions on tables
GRANT SELECT ON TABLE public.users TO anon, authenticated;
-- Insert on public.users is handled by AuthContext after Supabase auth.signUp, not direct RLS for anon.
GRANT UPDATE (bio, skills, profile_photo_url, name, institution, is_anonymous) ON TABLE public.users TO authenticated;


GRANT SELECT ON TABLE public.projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.projects TO authenticated; -- RLS policies will filter

GRANT SELECT ON TABLE public.milestones TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.milestones TO authenticated;

GRANT SELECT ON TABLE public.applications TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.applications TO authenticated; -- RLS handles delete logic via status update

GRANT SELECT ON TABLE public.messages TO authenticated;
GRANT INSERT ON TABLE public.messages TO authenticated; -- RLS policies filter

GRANT SELECT ON TABLE public.ratings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.ratings TO authenticated;

-- Grant permissions for sequence used by gen_random_uuid if any issues (usually not needed)
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Set up Supabase Storage Buckets policies (done in Supabase Dashboard UI, but noted here)
-- 1. 'profile-photos' bucket:
--    - Public: No (unless you want all profile photos to be public URLs)
--    - Allowed MIME types: image/jpeg, image/png, image/gif
--    - Max file size: e.g., 1MB
--    - RLS for INSERT: auth.uid() = (storage.foldername(name))[1] -- user can only upload to their own folder (e.g., user_id/avatar.png)
--    - RLS for SELECT: auth.uid() = (storage.foldername(name))[1] OR bucket_id = 'profile-photos' -- user can select their own, or make it public if needed.
--
-- 2. 'project-attachments' bucket (for general project files):
--    - Public: No
--    - Allowed MIME types: application/pdf, image/*, etc.
--    - Max file size: e.g., 5MB
--    - RLS for INSERT: Check if user is part of the project (e.g., owner or accepted contributor)
--      (this requires more complex RLS or a helper function that checks project membership based on storage path)
--    - RLS for SELECT: Check if user is part of the project.
--
-- 3. 'project-chat-attachments' bucket:
--    - Public: Yes (if links in chat should be directly accessible) or No and use signed URLs.
--    - Allowed MIME types: varies.
--    - Max file size: e.g., 5MB
--    - RLS for INSERT: Check if user is part of the project chat.
--    - RLS for SELECT: If public, true. If not, check if user is part of project chat.


-- Example Seed Data (Uncomment and modify user IDs after creating them in Supabase Auth)
/*
-- Ensure these UUIDs match actual user IDs from the auth.users table after they sign up.
-- You can get these IDs from the Supabase Studio under Authentication -> Users.

INSERT INTO public.users (id, email, role, name, institution, bio, skills, is_anonymous) VALUES
('REPLACE_WITH_AUTH_USER_ID_PROF_1', 'prof1@aau.edu.et', 'research_lead', 'Dr. Addis Alemayehu', 'Addis Ababa University', 'Expert in Computational Linguistics.', '{"NLP", "Machine Learning", "Python"}', FALSE),
('REPLACE_WITH_AUTH_USER_ID_STUDENT_1', 'student1@aau.edu.et', 'contributor', 'Beshatu Lemma', 'Addis Ababa University', 'Final year CS student, eager to learn.', '{"Java", "Web Development"}', FALSE),
('REPLACE_WITH_AUTH_USER_ID_ADMIN_1', 'admin@aau.edu.et', 'admin', 'Platform Admin', 'ResearchCollab Ops', 'System administrator for ResearchCollab.', '{}', FALSE);

INSERT INTO public.projects (posted_by_user_id, title, description, required_skills, compensation_model, status, application_deadline) VALUES
((SELECT id FROM public.users WHERE email = 'prof1@aau.edu.et'), 'Amharic Sentiment Analysis Model', 'Develop a state-of-the-art sentiment analysis tool for Amharic text using deep learning.', '{"Python", "TensorFlow", "NLP", "Amharic"}', 'stipend', 'open', '2024-09-30'),
((SELECT id FROM public.users WHERE email = 'prof1@aau.edu.et'), 'Historical Ethiopian Manuscript Digitization', 'A project to digitize and catalog rare historical manuscripts from Ethiopian monasteries.', '{"Archival Research", "Ge''ez Script", "Digital Imaging"}', 'co_authorship', 'open', '2024-10-15');

INSERT INTO public.milestones (project_id, description, amount, status) VALUES
((SELECT id FROM public.projects WHERE title = 'Amharic Sentiment Analysis Model'), 'Dataset Collection and Preprocessing', 200.00, 'pending'),
((SELECT id FROM public.projects WHERE title = 'Amharic Sentiment Analysis Model'), 'Model Training and Initial Evaluation', 300.00, 'pending');

*/

SELECT 'Database schema setup complete.' AS result;