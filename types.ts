// types.ts
import type { User as SupabaseUser } from '@supabase/gotrue-js';
import { z } from 'zod';

export enum UserRole {
  RESEARCH_LEAD = 'research_lead',
  CONTRIBUTOR = 'contributor',
  ADMIN = 'admin',
}

export enum ProjectStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum MilestoneStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  PAID = 'paid',
}

export enum ApplicationStatus {
  PENDING = 'pending',
  SHORTLISTED = 'shortlisted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export enum CompensationModel {
  STIPEND = 'stipend',
  CO_AUTHORSHIP = 'co_authorship',
  LETTER_OF_RECOMMENDATION = 'letter_of_recommendation',
  OTHER_BENEFIT = 'other_benefit',
}

export interface UserProfile {
  id: string; 
  email: string;
  role: UserRole;
  name: string;
  institution: string;
  bio?: string;
  skills?: string[];
  profile_photo_url?: string;
  is_anonymous?: boolean; 
  created_at?: string;
  updated_at?: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  description: string;
  amount: number;
  due_date?: string;
  status: MilestoneStatus;
  stripe_transaction_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const MilestoneSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0, "Amount must be non-negative"),
  due_date: z.string().optional(), 
});

export type MilestoneInput = z.infer<typeof MilestoneSchema>;


export interface Project {
  id: string;
  posted_by_user_id: string;
  posted_by_user?: UserProfile; 
  title: string;
  description: string;
  required_skills?: string[];
  estimated_hours?: number;
  deliverables?: string[];
  compensation_model: CompensationModel;
  stipend_amount?: number;
  confidentiality_agreement_required: boolean;
  application_deadline?: string;
  start_date?: string;
  end_date?: string;
  status: ProjectStatus;
  milestones?: Milestone[];
  applications?: Application[]; 
  created_at?: string;
  updated_at?: string;
}

export const ProjectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150, "Title must be 150 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  required_skills: z.array(z.string()).optional(),
  estimated_hours: z.number().int().positive().optional(),
  deliverables: z.array(z.string()).optional(),
  compensation_model: z.nativeEnum(CompensationModel),
  stipend_amount: z.number().min(0).optional(),
  confidentiality_agreement_required: z.boolean().default(false),
  application_deadline: z.string().optional(), 
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  milestones: z.array(MilestoneSchema).optional().default([]),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;


export interface Application {
  id: string;
  project_id: string;
  project?: Pick<Project, 'id' | 'title'>; 
  contributor_user_id: string;
  contributor_user?: UserProfile; 
  proposal_text: string;
  availability?: string;
  proposed_rate?: number;
  cv_url?: string;
  linkedin_url?: string;
  status: ApplicationStatus;
  created_at?: string;
  updated_at?: string;
}

export const ApplicationSchema = z.object({
  project_id: z.string().uuid(),
  proposal_text: z.string().min(10, "Proposal must be at least 10 characters").max(1000, "Proposal must be 1000 characters or less"),
  availability: z.string().optional(),
  proposed_rate: z.number().min(0).optional(),
  cv_url: z.string().url().optional().or(z.literal('')),
  linkedin_url: z.string().url().optional().or(z.literal('')),
});
export type ApplicationInput = z.infer<typeof ApplicationSchema>;


export interface Message {
  id: string;
  project_id: string;
  sender_user_id: string;
  sender_user?: Pick<UserProfile, 'id' | 'name' | 'profile_photo_url'>; 
  message_text: string;
  attachment_url?: string;
  created_at: string; 
}

export interface Rating {
  id: string;
  project_id: string;
  rated_by_user_id: string;
  rated_user_id: string;
  communication_rating?: number; 
  quality_rating?: number; 
  timeliness_rating?: number; 
  comments?: string;
  created_at?: string;
}

export interface ApiErrorResponse {
  message: string;
  errors?: { field?: string; code?: string; description: string }[];
  reference_id?: string;
}

export interface SignupRequest {
  email: string;
  password_hash: string; 
  name: string;
  institution: string;
  role: UserRole;
  profile_photo_url?: string;
  is_anonymous?: boolean;
}

export type AppUser = SupabaseUser & { user_metadata: UserProfile };

// --- START: Added/Updated for In-App Persistent Notifications ---
export enum NotificationTypeEnum { // For DB notifications, distinct from Toast NotificationType
  NEW_APPLICATION = 'new_application',
  APPLICATION_STATUS_UPDATE = 'application_status_update',
  PROJECT_MILESTONE_UPDATE = 'project_milestone_update',
  NEW_MESSAGE_IN_PROJECT = 'new_message_in_project',
  PROJECT_FUNDED = 'project_funded',
  GENERIC_SYSTEM_UPDATE = 'generic_system_update',
}

export interface AppNotification { // For DB notifications
  id: string;
  user_id: string; 
  type: NotificationTypeEnum;
  message: string;
  link?: string;
  is_read: boolean;
  related_project_id?: string;
  related_application_id?: string;
  related_milestone_id?: string;
  created_at: string;
}
// --- END: Added/Updated for In-App Persistent Notifications ---


// For Toast system (already existing in your file)
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
}

export interface NotificationMessage {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}