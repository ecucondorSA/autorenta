# Project: Autorenta

## Project Overview

This is a monorepo for the Autorenta application, a car rental platform. The project is built with a modern stack, including:

*   **Frontend:** Angular with standalone components and signals.
*   **Backend:** Supabase, providing database, authentication, and serverless functions.
*   **Mobile:** The project is configured with Ionic and Capacitor, suggesting a hybrid mobile app.
*   **Deployment:** The web application is deployed to Cloudflare Pages.
*   **Testing:** End-to-end testing is done with Playwright.

The project is structured as a monorepo using pnpm workspaces, with the main web application located in `apps/web`.

## Building and Running

The project uses a set of scripts in the `package.json` to manage the development lifecycle. The most important commands are:

*   **Install dependencies:**
    ```bash
    pnpm install
    ```

*   **Run the development server:**
    ```bash
    pnpm dev
    ```

*   **Run tests:**
    ```bash
    pnpm test
    ```

*   **Run end-to-end tests:**
    ```bash
    pnpm test:e2e
    ```

*   **Build the application:**
    ```bash
    pnpm build
    ```

## Development Conventions

*   **Package Manager:** The project uses `pnpm`.
*   **Monorepo:** The project is a monorepo with workspaces defined in `pnpm-workspace.yaml`.
*   **Angular:** The frontend is built with Angular, using standalone components and signals for state management.
*   **File Naming:** Files are named using kebab-case (e.g., `my-component.component.ts`).
*   **Commits:** The project uses conventional commits, enforced by `@commitlint/config-conventional`.
*   **CI/CD:** The project has CI/CD scripts defined in `package.json` for linting, testing, and deployment.
