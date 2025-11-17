# Project: autorenta

This document provides an overview of the `autorenta` project, its technologies, and development conventions, serving as instructional context for future interactions.

## Project Overview

`autorenta` is a monorepo project built with Angular and TypeScript, designed as a car rental application. It leverages a modern web stack for both frontend and backend services.

**Key Technologies:**
*   **Frontend:** Angular (standalone components)
*   **Backend:** Supabase
*   **Package Manager:** pnpm
*   **Monorepo Orchestration:** Turbo
*   **End-to-End Testing:** Playwright
*   **Deployment:** Cloudflare Pages
*   **Languages:** TypeScript, SQL

**Architecture:**
The project follows an `angular-standalone` architecture for its frontend applications. The backend is powered by Supabase, handling database, authentication, and other services. The monorepo structure is organized into:
*   `apps/web`: Contains the main web application(s).
*   `apps/web-v2`: Potentially a newer version or a separate web application.
*   `apps/workers`: Houses worker services.
*   `tools`: Contains utility scripts and configurations.

## Building and Running

Most project operations are centralized through the `./tools/run.sh` script.

**Initial Setup:**
To set up the project for the first time, install dependencies using pnpm:
```bash
pnpm install
```

**Development Server:**
To start the development server for the web application:
```bash
npm run dev:web
# or using the wrapper script
./tools/run.sh dev:web
```

**Building the Project:**
To build the project for production:
```bash
npm run build
# or using the wrapper script
./tools/run.sh build
```

**Running Tests:**
The project uses Playwright for end-to-end testing.
```bash
npm run test:e2e
# or using the wrapper script
./tools/run.sh test:e2e
```

**Linting:**
To lint the codebase:
```bash
npm run lint
# or using the wrapper script
./tools/run.sh lint
```

## Development Conventions

**Coding Style:**
The project adheres to specific naming conventions as defined in `package.json`:
*   **File Naming:** `kebab-case`
*   **Component Suffix:** `.component.ts`
*   **Service Suffix:** `.service.ts`
*   **Page Suffix:** `.page.ts`
*   **Model Suffix:** `.model.ts`

**Testing:**
End-to-end tests are written using Playwright. Refer to the `e2e/` and `tests/` directories for existing test suites.

**Database:**
Supabase is used as the backend. Database schema changes and migrations are managed through SQL files located in the `database/` directory.

**Type Generation:**
TypeScript types for the Supabase database schema can be generated using the `types:db:gen` script.

## Responsive Design

For detailed information on the project's responsive design strategy, including tools, breakpoints, and guidelines, please refer to the [Responsive Design Documentation](docs/RESPONSIVE_DESIGN.md).

```bash
npm run types:db:gen
```
This command generates `supabase.types.generated.ts`.
