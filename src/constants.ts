
// Fallback to an empty string if the environment variable is not set.
// In a Next.js app, this would be process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAINS
// For a simple SPA, you might need a different way to set this or hardcode for demo.
// For this example, we'll simulate it being available.
// Vite exposes environment variables from .env on import.meta.env
const universityEmailDomainsFromEnv = import.meta.env.VITE_UNIVERSITY_EMAIL_DOMAINS || "aau.edu.et";

export const UNIVERSITY_EMAIL_DOMAINS: string[] = universityEmailDomainsFromEnv.split(',').map(domain => domain.trim());

export const DEFAULT_PROFILE_PHOTO_URL = "https://picsum.photos/200"; // Placeholder
export const MAX_FILE_UPLOAD_SIZE_MB = 5;
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export const APP_NAME = "UniCollab";

export const PAGINATION_PAGE_SIZE = 10;