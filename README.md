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
