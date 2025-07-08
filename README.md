# University Research Collaboration Platform

## Project Structure (After Refactor)

- `src/` - Main source code directory
  - `components/` - All UI and feature components
  - `pages/` - All page-level React components
  - `services/` - API and service logic
  - `contexts/` - React context providers
  - `hooks/` - Custom React hooks
  - `lib/` - Utility libraries (e.g., supabase client)
  - `App.tsx`, `index.tsx`, `constants.ts`, `types.ts` - Main entry and shared files
- `index.html` - Main HTML file
- `supabase_schema.sql` - Database schema
- `package.json`, `vite.config.ts`, `tsconfig.json` - Project configuration

All source files have been moved into `src/` for a standard React/Vite project structure.

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
