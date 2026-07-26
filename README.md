<img width="1311" height="944" alt="image" src="https://github.com/user-attachments/assets/2ba41328-9cc0-4647-9ba7-436960eb559e" />

# FindAJob

A full-stack job board. Job seekers search openings, build a profile and track their
applications; employers publish postings and manage the people who apply; an
administrator oversees the whole platform.

Built with an ASP.NET Core Web API on top of SQLite, and a React + TypeScript single
page application.

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Running it locally](#running-it-locally)
- [Demo accounts](#demo-accounts)
- [Configuration](#configuration)
- [Tests](#tests)
- [Deployment](#deployment)
- [Project layout](#project-layout)

## Features

**Job seekers**

- Search postings by title, company, location or tag, with paged results
- Save postings for later and apply with a cover message
- Upload CVs (PDF/DOC/DOCX) and track every application's status
- Build a profile with a bio, avatar, banner, work history, education and skills

**Employers**

- Publish, edit and archive postings with tags and structured fields
- Review applicants, read their profile and CV, and move them through the pipeline
  (Pending → Reviewed → Interviewing → Accepted/Rejected)
- Maintain a company profile with size, industry, tech stack and benefits

**Everyone**

- Direct messaging with per-side conversation deletion and blocking
- Connection requests between users
- In-app notifications for application updates, messages and connection requests

**Administrators**

- Platform statistics
- Manage users: view profiles, edit details, assign roles, disable or delete accounts
- Manage every posting, including archived ones
- Review and remove pending registrations

## Architecture

```text
Browser
   │
   ├── React SPA (Vite, TypeScript, MUI)
   │      routes guarded by role, paged data, dark MUI theme
   │
   └── ASP.NET Core Web API
          Controllers → Services → EF Core → SQLite
          Cookie authentication via ASP.NET Core Identity
```

A few decisions worth calling out:

- **Uploads live outside `wwwroot`.** Static-file middleware applies no
  authorisation, so anything under the web root is public. User uploads are written to
  a configurable store instead. Avatars and banners are served through
  `MediaController`; CVs are only reachable via `GET /api/cv/{id}/content`, which
  checks that the caller is the owner, an administrator, or an employer with an open
  application from that person.
- **Seeding is additive.** The seeder creates roles, the administrator and six demo
  employers, and generates demo postings *only when the database has none*. It never
  deletes rows and never overwrites profile content entered through the UI, because
  applications and saved jobs reference those postings.
- **Archive rather than delete.** Removing a posting cascades to its applications, so
  the normal employer action marks it archived and keeps the history.
- **One vocabulary per concept.** Roles, job types and application statuses are defined
  once in `backend/Models` and exposed to the UI through `GET /api/jobs/metadata`.

## Running it locally

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)

### 1. Start the API

```bash
cd backend
dotnet run
```

It listens on `https://localhost:7001`, applies any pending EF Core migrations and
seeds the demo data on first run.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install     # first time only
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api` and `/uploads`
through to the API, so both sides share one origin and the auth cookie works.

### Confirming a registration without a mail server

Registration sends a confirmation email. With no SMTP server running locally the send
fails harmlessly, so in the **Development** environment the API also returns the
confirmation token and the success screen shows a **Confirm now** button. To exercise
the real email path instead, run any local SMTP catcher on port 1025 (MailHog,
Papercut, `python -m aiosmtpd -n -l localhost:1025`).

## Demo accounts

These are seeded from `backend/appsettings.Development.json` and only exist in the
Development environment.

| Role | Login | Password |
| --- | --- | --- |
| Administrator | `monkey` | `1GetAjObScaMMErLSD!` |
| Employers | `google@example.com`, `microsoft@example.com`, `sony@example.com`, `samsung@example.com`, `apple@example.com`, `arasaka@example.com` | `1WouldYoULiKEaJoBiNMYCallCeNtER!` |

Register through the UI to create a job seeker account.

In production the same values are read from `SEED__ADMINPASSWORD` and
`SEED__EMPLOYERPASSWORD`; when they are absent nothing is seeded, so a deployed
instance never ends up with known credentials by accident.

## Configuration

Settings come from `appsettings.json`, then the environment-specific file, then
environment variables (`__` separates nested keys). Nothing secret is committed.

| Key | Purpose | Default |
| --- | --- | --- |
| `ConnectionStrings:DefaultConnection` | SQLite location | `findajob.db` beside the project |
| `FileStorage:RootPath` | Where uploads are written | `App_Data/uploads` |
| `App:FrontendBaseUrl` | Base URL used in email links | `http://localhost:5173` |
| `App:CorsOrigins` | Origins allowed to call the API with credentials | `http://localhost:5173` |
| `EmailSettings:*` | SMTP host, port, credentials, TLS | `localhost:1025`, no auth |
| `Seed:AdminPassword` | Administrator password; no account without it | unset |
| `Seed:EmployerPassword` | Demo employer password; no accounts without it | unset |

For real SMTP credentials during development, prefer user secrets over editing a
tracked file:

```bash
cd backend
dotnet user-secrets set "EmailSettings:Password" "..."
```

`VITE_API_TARGET` overrides the dev-server proxy target if the API runs elsewhere.

## Tests

```bash
cd backend.tests
dotnet test
```

47 tests covering `JobService` (search, paging, ownership rules, tag syncing), the
database guarantees the application depends on (cascade behaviour, unique
constraints), the upload store including path-traversal rejection, and the shared
role/status vocabularies.

They run against **SQLite in memory** rather than the EF Core in-memory provider,
which ignores foreign keys, cascades and unique indexes — exactly the behaviour these
tests need to verify.

Frontend checks:

```bash
cd frontend
npm run lint
npm run build    # type-checks, then builds
```

## Deployment

The `Dockerfile` builds the SPA, publishes the API, and serves the compiled frontend
as the API's static content so one container serves one origin.

`/data` must be a mounted volume: it holds the SQLite database and every upload, and
without it a redeploy replaces the container filesystem and takes the data with it.

```bash
fly volumes create findajob_data --region fra --size 1
fly secrets set SEED__ADMINPASSWORD="..." SEED__EMPLOYERPASSWORD="..."
fly deploy
```

`GET /health` backs the platform health check.

## Project layout

```text
findajob/
├── backend/
│   ├── Controllers/        Auth, Jobs, Application, Profiles, Cv, Messages,
│   │                       Friendships, Notifications, SavedJobs, Admin, Media
│   ├── Data/               DbContext and the additive seeder
│   ├── Models/             Entities plus shared role/status/job vocabularies
│   ├── Services/           JobService, file storage, email
│   ├── Migrations/         EF Core migrations
│   ├── SeedAssets/         Company logos copied into the upload store on first run
│   └── App_Data/uploads/   Runtime user uploads (git-ignored)
├── backend.tests/          xUnit tests against SQLite in memory
├── frontend/src/
│   ├── components/         AppShell, RequireRole, error boundary, shared dialogs,
│   │                       providers/ (auth, toast, confirm, notifications)
│   ├── pages/              Route components, grouped by role
│   ├── types.ts            API response types
│   ├── constants.ts        Shared option lists and password rules
│   └── api.ts              Axios client and error normalisation
├── Dockerfile
└── fly.toml
```
