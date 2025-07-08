// services/apiService.ts
import { supabase } from '../lib/supabaseClient.ts';
import { 
  Project, ProjectInput, Application, ApplicationInput, UserProfile, UserRole, Message, Milestone, 
  MilestoneStatus, ProjectStatus, ApplicationStatus,
  AppNotification, NotificationTypeEnum // Added for in-app notifications
} from '../types.ts'; 
import { PAGINATION_PAGE_SIZE } from '../constants.ts';
import { PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';

// Helper to get current user ID
const getCurrentUserId = async (): Promise<string | undefined> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id;
};

// --- IN-APP NOTIFICATIONS (Helper - defined first for use below) ---

interface CreateNotificationInput {
  user_id: string; 
  type: NotificationTypeEnum;
  message: string;
  link?: string;
  related_project_id?: string;
  related_application_id?: string;
  related_milestone_id?: string;
}

export const createDBNotification = async (notificationData: CreateNotificationInput): Promise<PostgrestSingleResponse<AppNotification>> => {
  console.log("Attempting to create DB Notification for user:", notificationData.user_id, "Data:", notificationData);
  // WARNING: Direct client-side inserts for *another user* will likely be blocked by RLS on 'notifications' table.
  // This needs to be handled by an Edge Function using service_role key for proper multi-user notifications.
  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationData)
    .select()
    .single();

  if (error) {
    console.error("Error creating DB notification:", error, "Input data:", notificationData);
  } else {
    console.log("DB Notification created successfully:", data);
  }
  // Ensure the return type matches PostgrestSingleResponse structure
  return { data, error, count: data ? 1 : 0, status: error ? 500 : 201, statusText: error ? error.message : "Created" };
};


// PROJECTS
export const createProject = async (projectData: ProjectInput): Promise<PostgrestSingleResponse<Project>> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const { milestones: milestoneInputs, ...coreProjectData } = projectData;
  
  const response = await supabase
    .from('projects')
    .insert({ ...coreProjectData, posted_by_user_id: userId, status: ProjectStatus.OPEN })
    .select()
    .single();

  if (response.error) {
    console.error('Error creating project:', response.error);
    return { data: null, error: response.error, count: null, status: 500, statusText: "Error creating project" };
  }

  const project = response.data as Project;

  if (project && milestoneInputs && milestoneInputs.length > 0) {
    const milestonesToInsert = milestoneInputs.map(m => ({
      ...m,
      project_id: project.id,
      status: MilestoneStatus.PENDING,
    }));
    const { error: milestoneError } = await supabase
      .from('milestones')
      .insert(milestonesToInsert);
    
    if (milestoneError) {
      console.error('Error creating milestones, project created but milestones failed:', milestoneError);
      return { data: project, error: milestoneError, count: 1, status: 207, statusText: "Project created, milestones failed" };
    }
    project.milestones = milestonesToInsert.map(m => ({ ...m, id: crypto.randomUUID() })) as Milestone[];
  }
  
  // No notification for project creation itself to the creator, usually.
  // Could notify admins if desired, but that's a separate flow.
  return { data: project, error: null, count: 1, status: 201, statusText: "Created" };
};

// ... getProjects, getProjectById, updateProject (no direct notification triggers here yet) ...
export const getProjects = async (page: number = 1, filters: any = {}): Promise<PostgrestSingleResponse<Project[]>> => {
  let query = supabase.from('projects').select(`
    *, 
    posted_by_user:users(id, name, institution, profile_photo_url, is_anonymous), 
    milestones(*)
  `);

  query = query.order('created_at', { ascending: false })
    .range((page - 1) * PAGINATION_PAGE_SIZE, page * PAGINATION_PAGE_SIZE - 1);

  if (filters.status) {
    query = query.eq('status', filters.status);
  } else {
    query = query.eq('status', 'open'); 
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters.compensation_model) {
    query = query.eq('compensation_model', filters.compensation_model);
  }

  if (filters.user_id) {
    query = query.eq('posted_by_user_id', filters.user_id);
  }

  return query as Promise<PostgrestSingleResponse<Project[]>>;
};

export const getProjectById = async (id: string): Promise<PostgrestSingleResponse<Project>> => {
  return supabase
    .from('projects')
    .select(`
      *,
      posted_by_user:users(id, name, institution, profile_photo_url, is_anonymous),
      milestones(*),
      applications(*, contributor_user:users(id, name, email, profile_photo_url))
    `)
    .eq('id', id)
    .single() as Promise<PostgrestSingleResponse<Project>>;
};

type ProjectDirectUpdatableFields = Partial<Omit<ProjectInput, 'milestones'>>;

export const updateProject = async (
  id: string,
  updates: ProjectDirectUpdatableFields & { status?: ProjectStatus }
): Promise<PostgrestSingleResponse<Project>> => {
  const { milestones, ...projectTableUpdates } = updates as ProjectInput;
  // If project status changes significantly (e.g., to 'completed' or 'cancelled'),
  // could notify accepted applicants. This requires fetching them.
  const response = await supabase
    .from('projects')
    .update(projectTableUpdates)
    .eq('id', id)
    .select()
    .single();

    // Example: If project status is updated by owner.
    // This logic should ideally be in an Edge Function to fetch project details securely.
    // if (!response.error && updates.status && response.data) {
    //     const projectDetails = response.data;
    //     projectDetails.applications?.forEach(app => {
    //         if (app.status === ApplicationStatus.ACCEPTED) {
    //             createDBNotification({
    //                 user_id: app.contributor_user_id,
    //                 type: NotificationTypeEnum.PROJECT_MILESTONE_UPDATE, // Or a more generic project update type
    //                 message: `Project "${projectDetails.title}" status updated to ${updates.status}.`,
    //                 link: `/projects/${projectDetails.id}`,
    //                 related_project_id: projectDetails.id
    //             });
    //         }
    //     });
    // }
  return response;
};


// APPLICATIONS
export const createApplication = async (applicationData: ApplicationInput): Promise<PostgrestSingleResponse<Application>> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");
  
  const response = await supabase
    .from('applications')
    .insert({ ...applicationData, contributor_user_id: userId, status: ApplicationStatus.PENDING })
    .select('*, project:projects(posted_by_user_id, title)') // Fetch project owner and title
    .single();

  if (!response.error && response.data && response.data.project) {
    const projectOwnerId = response.data.project.posted_by_user_id;
    const projectTitle = response.data.project.title;
    const applicant = await getUserProfile(userId); // Get applicant name

    if (projectOwnerId && applicant.data) {
      createDBNotification({
        user_id: projectOwnerId,
        type: NotificationTypeEnum.NEW_APPLICATION,
        message: `You have a new application from ${applicant.data.name} for your project: "${projectTitle}".`,
        link: `/projects/${applicationData.project_id}/manage`, // Link to manage applications view
        related_project_id: applicationData.project_id,
        related_application_id: response.data.id
      }).catch(err => console.error("Failed to create notification for new application:", err)); // Log error but don't fail application
    }
  }
  return response as PostgrestSingleResponse<Application>; // Cast needed because of joined project
};

export const getApplicationsForUser = async (): Promise<PostgrestSingleResponse<Application[]>> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  return supabase
    .from('applications')
    .select('*, project:projects(id, title)')
    .eq('contributor_user_id', userId)
    .order('created_at', { ascending: false });
};

export const getApplicationsForProject = async (projectId: string): Promise<PostgrestSingleResponse<Application[]>> => {
  return supabase
    .from('applications')
    .select('*, contributor_user:users(id, name, email, profile_photo_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
};

export const updateApplicationStatus = async (
  applicationId: string, 
  newStatus: ApplicationStatus,
  applicantUserId?: string, // Pass this from where you call it if available
  projectId?: string,       // Pass this
  projectTitle?: string     // Pass this
): Promise<PostgrestSingleResponse<Application>> => {
  
  const response = await supabase
    .from('applications')
    .update({ status: newStatus })
    .eq('id', applicationId)
    .select()
    .single();

  if (!response.error && response.data && applicantUserId && projectId && projectTitle) {
    if (newStatus === ApplicationStatus.ACCEPTED || newStatus === ApplicationStatus.REJECTED || newStatus === ApplicationStatus.SHORTLISTED) {
      createDBNotification({
        user_id: applicantUserId,
        type: NotificationTypeEnum.APPLICATION_STATUS_UPDATE,
        message: `Your application status for project "${projectTitle}" has been updated to: ${newStatus}.`,
        link: `/projects/${projectId}`, // Link to project page or 'my applications'
        related_project_id: projectId,
        related_application_id: applicationId
      }).catch(err => console.error("Failed to create notification for application status update:", err));
    }
  }
  return response;
};

// USER PROFILE
export const getUserProfile = async (userId: string): Promise<PostgrestSingleResponse<UserProfile>> => {
  return supabase.from('users').select('*').eq('id', userId).single();
};

// MESSAGES
export const sendMessage = async (projectId: string, messageText: string, attachmentUrl?: string): Promise<PostgrestSingleResponse<Message>> => {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) throw new Error("User not authenticated");

  const response = await supabase
    .from('messages')
    .insert({ project_id: projectId, sender_user_id: currentUserId, message_text: messageText, attachment_url: attachmentUrl })
    .select('*, sender_user:users(id, name, profile_photo_url)')
    .single();

  if (!response.error && response.data) {
    // Notify other project participants
    // This needs more robust logic to get all participants (owner + accepted contributors)
    // and avoid notifying the sender themselves.
    // Placeholder for Edge Function logic:
    const projectDetails = (await getProjectById(projectId)).data;
    if (projectDetails) {
        const participantsToNotify: string[] = [];
        // Notify owner if sender is not owner
        if (projectDetails.posted_by_user_id !== currentUserId) {
            participantsToNotify.push(projectDetails.posted_by_user_id);
        }
        // Notify accepted contributors if sender is not them
        projectDetails.applications?.forEach(app => {
            if (app.status === ApplicationStatus.ACCEPTED && app.contributor_user_id !== currentUserId) {
                participantsToNotify.push(app.contributor_user_id);
            }
        });
        
        const uniqueParticipants = [...new Set(participantsToNotify)]; // Ensure unique user IDs
        const senderName = response.data.sender_user?.name || "A user";

        uniqueParticipants.forEach(participantId => {
            createDBNotification({
                user_id: participantId,
                type: NotificationTypeEnum.NEW_MESSAGE_IN_PROJECT,
                message: `New message from ${senderName} in project: "${projectDetails.title}".`,
                link: `/projects/${projectId}`, // Link to project chat
                related_project_id: projectId
            }).catch(err => console.error("Failed to create notification for new message:", err));
        });
    }
  }
  return response;
};

// ... (getMessagesForProject, createCheckoutSession, uploadFile remain unchanged from your version) ...
export const getMessagesForProject = async (projectId: string): Promise<PostgrestSingleResponse<Message[]>> => {
  return supabase
    .from('messages')
    .select('*, sender_user:users(id, name, profile_photo_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
};

export const createCheckoutSession = async (projectId: string, milestoneId: string, amount: number): Promise<{ checkout_url?: string; error?: string }> => {
  console.warn("Simulating createCheckoutSession. In a real app, this calls a backend API.");
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (amount > 0) {
    return { checkout_url: `https://example.com/stripe-checkout-simulated?project=${projectId}&milestone=${milestoneId}&amount=${amount}` };
  } else {
    return { error: "Invalid amount for payment." };
  }
};

export const uploadFile = async (file: File, bucketName: string = 'project-attachments'): Promise<{ path?: string; publicUrl?: string; error?: Error }> => {
  const userId = await getCurrentUserId();
  if (!userId) return { error: new Error("User not authenticated") };

  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-\s]/g, '_'); 
  const fileName = `${userId}/${Date.now().toString()}_${sanitizedFileName}`;
  
  const { data, error } = await supabase.storage.from(bucketName).upload(fileName, file);

  if (error) {
    console.error('Error uploading file:', error);
    return { error };
  }
  if (!data || !data.path) {
     console.error('Upload successful but path is missing in response data.');
     return { error: new Error('Upload successful but path is missing in response data.') };
  }

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
  if (!urlData || !urlData.publicUrl) {
      console.error('File uploaded but failed to get public URL.');
      return { path: data.path, error: new Error('File uploaded but failed to get public URL.') };
  }
  return { path: data.path, publicUrl: urlData.publicUrl };
};


// MILESTONES
export const updateMilestoneStatus = async (
    milestoneId: string, 
    projectId: string, 
    newStatus: MilestoneStatus,
    // For notifications:
    projectTitle?: string,
    projectOwnerId?: string,
    acceptedContributorIds?: string[]
): Promise<PostgrestSingleResponse<Milestone>> => {

  const response = await supabase
    .from('milestones')
    .update({ status: newStatus })
    .eq('id', milestoneId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (!response.error && response.data && projectTitle) {
    const milestoneDescription = response.data.description;
    // Notify project owner
    if (projectOwnerId) {
        createDBNotification({
            user_id: projectOwnerId,
            type: NotificationTypeEnum.PROJECT_MILESTONE_UPDATE,
            message: `Milestone "${milestoneDescription}" in project "${projectTitle}" was updated to ${newStatus}.`,
            link: `/projects/${projectId}`,
            related_project_id: projectId,
            related_milestone_id: milestoneId
        }).catch(err => console.error("Failed to create notification for milestone update (owner):", err));
    }
    // Notify accepted contributors
    acceptedContributorIds?.forEach(contributorId => {
        createDBNotification({
            user_id: contributorId,
            type: NotificationTypeEnum.PROJECT_MILESTONE_UPDATE,
            message: `Milestone "${milestoneDescription}" in project "${projectTitle}" was updated to ${newStatus}.`,
            link: `/projects/${projectId}`,
            related_project_id: projectId,
            related_milestone_id: milestoneId
        }).catch(err => console.error("Failed to create notification for milestone update (contributor):", err));
    });
  }
  return response;
};

// --- ADMIN SPECIFIC FUNCTIONS (copied from your version, assumed correct) ---
export const getAllUsersAdmin = async (page: number = 1, searchTerm: string = ''): Promise<PostgrestResponse<UserProfile[]>> => {
  let query = supabase
    .from('users')
    .select('*', { count: 'exact' }) 
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGINATION_PAGE_SIZE, page * PAGINATION_PAGE_SIZE - 1);

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,institution.ilike.%${searchTerm}%`);
  }
  return query;
};

export const updateUserRoleAdmin = async (userId: string, newRole: UserRole): Promise<PostgrestSingleResponse<UserProfile>> => {
  return supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single();
};

export const getAllProjectsAdmin = async (page: number = 1, filters: any = {}): Promise<PostgrestResponse<Project[]>> => {
  let query = supabase
    .from('projects')
    .select(`
      *,
      posted_by_user:users(id, name, institution)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGINATION_PAGE_SIZE, page * PAGINATION_PAGE_SIZE - 1);

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.userId) {
    query = query.eq('posted_by_user_id', filters.userId);
  }
  return query;
};

export const updateProjectStatusAdmin = async (projectId: string, newStatus: ProjectStatus): Promise<PostgrestSingleResponse<Project>> => {
  return supabase
    .from('projects')
    .update({ status: newStatus })
    .eq('id', projectId)
    .select()
    .single();
};


// --- IN-APP NOTIFICATIONS (API functions - moved from top for clarity) ---

export const getAppNotificationsForUser = async (page: number = 1, limit: number = 10): Promise<PostgrestResponse<AppNotification[]>> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn("User not authenticated for fetching notifications");
    return { data: [], error: { message: "User not authenticated", details: "", hint: "", code: "401" }, count: 0, status: 401, statusText: "Unauthorized" };
  }

  return supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
};

export const getUnreadNotificationsCount = async (): Promise<{ count: number; error: null | any }> => {
    const userId = await getCurrentUserId();
    if (!userId) return { count: 0, error: { message: "User not authenticated" } };

    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    
    return { count: count || 0, error };
};

export const markNotificationAsRead = async (notificationId: string): Promise<PostgrestSingleResponse<AppNotification>> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn("User not authenticated for marking notification as read");
    return { data: null, error: { message: "User not authenticated", details: "", hint: "", code: "401" }, count: 0, status: 401, statusText: "Unauthorized" };
  }
  return supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();
};

export const markAllUserNotificationsAsRead = async (): Promise<PostgrestResponse<AppNotification>> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn("User not authenticated for marking all notifications as read");
    return { data: [], error: { message: "User not authenticated", details: "", hint: "", code: "401" }, count: 0, status: 401, statusText: "Unauthorized" };
  }
  return supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select();
};