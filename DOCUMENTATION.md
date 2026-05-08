# FindAJob - Comprehensive Technical & Project Documentation

## 1. Executive Summary

**FindAJob** is a full-stack, enterprise-grade job board and professional networking application designed to seamlessly connect employers with prospective employees. This document serves as the exhaustive technical reference, covering every aspect of the system's architecture, database schema, API design, frontend application, security protocols, and deployment strategies. 

The application was built to address the increasing need for intuitive, fast, and secure platforms for job hunting and recruitment. It differentiates itself by offering not only job posting and application mechanisms but also robust social features, such as user profiles, friending systems, real-time messaging, and notifications. 

### 1.1 Project Goals
- **Seamless Recruitment Process:** Provide tools for employers to post jobs, manage applications, and review candidate profiles efficiently.
- **Enhanced Job Seeker Experience:** Enable employees to create rich profiles, upload CVs, search for jobs, save listings, and apply with a single click.
- **Social Connectivity:** Foster professional relationships through a built-in friending system, allowing users to connect and communicate directly.
- **Administrative Oversight:** Deliver a comprehensive administrative dashboard for platform governance, including user management, job moderation, and registration approval.
- **Security & Performance:** Ensure data privacy, secure authentication, and high performance utilizing a modern tech stack.

### 1.2 Target Audience
- **Employees/Job Seekers:** Individuals looking for career opportunities, wanting to showcase their skills, education, and experience.
- **Employers/Recruiters:** Companies and HR professionals seeking to advertise openings, review applicants, and hire talent.
- **Administrators:** Platform operators responsible for maintaining quality, moderating content, and managing user access.

### 1.3 Tech Stack Overview
- **Backend:** ASP.NET Core 8.0, C#, Entity Framework Core, SQLite
- **Frontend:** React 18, TypeScript, Vite, React Router, Vanilla CSS, Lucide React (Icons)
- **Authentication:** ASP.NET Core Identity (Cookie-based auth)
- **Deployment:** Docker, Fly.io, GitHub Actions (optional)
- **Styling:** Custom CSS with a focus on modern, responsive, and accessible design principles.

## 2. Database Schema (The Data Model)

The FindAJob database is designed with high normalization and performance in mind. Below is the exhaustive list of tables and their primary purposes.

### 2.1 Identity Tables (Managed by ASP.NET Core Identity)
*   **AspNetUsers:** The core table for user accounts. Stores credentials, email confirmation status, and base profile info like `FirstName`, `LastName`, and `CompanyName`.
*   **AspNetRoles:** Defines the roles available in the system (`Admin`, `Employer`, `Employee`).
*   **AspNetUserRoles:** The mapping table that assigns roles to users.

### 2.2 Core Application Tables
*   **JobPostings:**
    *   `Id` (Primary Key)
    *   `Title`, `Description`, `Location`, `Salary`
    *   `JobType` (Full-time, Part-time, etc.)
    *   `WorkMode` (Remote, Hybrid, Onsite)
    *   `IsDeleted` (Soft-delete flag)
    *   `OwnerId` (Foreign Key to AspNetUsers)
*   **JobApplications:**
    *   `Id` (PK)
    *   `JobId` (FK to JobPostings)
    *   `UserId` (FK to AspNetUsers)
    *   `Status` (Pending, Accepted, Rejected)
    *   `ApplicantName`, `ApplicantEmail`, `Message`
*   **UserProfiles:**
    *   `Id` (PK)
    *   `UserId` (FK to AspNetUsers, Unique)
    *   `Bio`, `AvatarUrl`, `BannerUrl`
*   **CvDocuments:**
    *   `Id` (PK)
    *   `UserId` (FK to AspNetUsers)
    *   `FileName`, `FilePath`, `UploadedAt`

### 2.3 Social and Messaging Tables
*   **Messages:**
    *   `Id` (PK)
    *   `SenderUserId`, `ReceiverUserId` (FKs to AspNetUsers)
    *   `Subject`, `Content`, `SentAt`, `IsRead`
*   **Friendships:**
    *   `Id` (PK)
    *   `UserId`, `FriendId` (FKs to AspNetUsers)
*   **FriendRequests:**
    *   `Id` (PK)
    *   `SenderId`, `ReceiverId` (FKs to AspNetUsers)
    *   `Status` (Pending, Accepted, Rejected)
*   **Notifications:**
    *   `Id` (PK)
    *   `UserId` (FK to AspNetUsers)
    *   `Title`, `Message`, `Type`, `LinkUrl`, `IsRead`

### 2.4 Support and Metadata Tables
*   **Tags:** Stores unique job tags (e.g., "C#", "Remote", "Junior").
*   **JobPostingTags:** Many-to-Many mapping between Jobs and Tags.
*   **Skills / Education / Experience:** Related to Employee profiles for granular professional history.
*   **BlockedUsers:** Tracks blocking relationships between users.

# Part 1: Investigation of the Problem and Available Solutions

## 1.1 Research of Existing Job Platforms

To design a competitive and effective job board, we conducted a thorough analysis of industry leaders: **Jobs.bg**, **Indeed**, and **LinkedIn**.

### Jobs.bg
*   **Overview:** The most popular job board in Bulgaria.
*   **Strengths:** Massive user base, localized for the Bulgarian market, simple interface.
*   **Weaknesses:** Design feels dated, lacks modern social features, communication is often restricted to email outside the platform.

### Indeed
*   **Overview:** Global aggregator of job postings.
*   **Strengths:** Powerful search engine, vast number of listings, global reach.
*   **Weaknesses:** Can be overwhelming, high volume of "spammy" or low-quality listings, limited social interaction between candidates and employers.

### LinkedIn
*   **Overview:** The premier professional social network.
*   **Strengths:** Rich professional profiles, networking capabilities, "Easy Apply" feature.
*   **Weaknesses:** Very expensive for employers, high noise-to-signal ratio in the newsfeed, complex privacy settings.

## 1.2 Analysis of Strengths and Weaknesses

| Platform | Strengths | Weaknesses |
| :--- | :--- | :--- |
| **Jobs.bg** | Local market dominance, Simplicity | Outdated UI, No internal chat |
| **Indeed** | Search volume, Aggregation | User experience can be cluttered |
| **LinkedIn** | Social networking, Identity | High cost, Distracting social feed |

## 1.3 Defining New Functionalities for FindAJob

Based on the gaps identified in existing solutions, FindAJob focuses on the following "Value Add" features:

1.  **Integrated Chat System:** Unlike traditional boards where communication moves to email immediately, FindAJob provides a built-in real-time messaging system. This allows for faster initial screening and keeps all professional communication in one place.
2.  **Social Connectivity (Friending):** Borrowing from LinkedIn but keeping it focused on the job board context, users can build a "Friends" list. This facilitates a more personal recruitment process and allows for internal networking.
3.  **Interest-Based Notifications:** A robust notification system that alerts users to relevant activities (messages, application status changes, friend requests), ensuring high engagement.
4.  **Admin Moderation & Approval:** To ensure high-quality listings, the system includes an administrative approval flow for new employers, preventing spam and fraudulent postings.
5.  **Unified Management Panel:** A powerful dashboard for both employers (to manage listings/applicants) and admins (to moderate the entire platform).
# Part 2: System Design

## 2.1 Software Components and Communication

The FindAJob system architecture follows a modern **Client-Server** model, specifically a **Decoupled Single Page Application (SPA)** architecture.

*   **Client (Frontend):** Built with React 18 and TypeScript. It handles user interaction, state management, and rendering. Communication with the server is done via asynchronous HTTP requests (REST API) using the `fetch` API.
*   **Server (Backend):** Built with ASP.NET Core 8.0. It exposes a RESTful API, handles business logic, authentication, and database interactions.
*   **Database:** A relational database managed via Entity Framework Core (EF Core) using the Code-First approach.
*   **Communication Flow:** 
    1.  User interacts with the React UI.
    2.  React frontend sends a JSON-based HTTP request to the ASP.NET API.
    3.  Backend validates the request, checks authorization, and performs operations via EF Core.
    4.  Backend returns a JSON response (success/error).
    5.  Frontend updates the UI state based on the response.

## 2.2 Core Project Components (5+ Entities, Views, Models, Controllers)

To satisfy the requirements of a robust enterprise application, the system is built upon the following components:

### 2.2.1 Entities (Database Schema)
1.  **ApplicationUser:** Extends `IdentityUser` to handle authentication and role-based access.
2.  **JobPosting:** Represents a job listing, including title, description, company info, and requirements.
3.  **JobApplication:** Tracks a candidate's application for a specific job, including status (Pending, Accepted, Rejected).
4.  **UserProfile:** Stores detailed information about a user, such as their bio, avatar, banner, and professional summary.
5.  **CvDocument:** Manages uploaded resume files associated with a user.
6.  **Message:** Represents internal communications between users.

### 2.2.2 Views (Frontend Pages)
1.  **Home Page:** The central hub for searching and discovering job opportunities.
2.  **Job Details Page:** Comprehensive view of a single job listing with the ability to apply.
3.  **Profile Page:** Personalized view for both Employees (showcasing skills/experience) and Employers.
4.  **Admin Dashboard:** High-level management interface for platform oversight.
5.  **Messages View:** Real-time interface for internal communications.
6.  **Application Tracking:** View for users to monitor the status of their submitted applications.

### 2.2.3 Models (Data Transfer Objects & View Models)
1.  **RegisterRequest:** Handles the intake of new user registration data.
2.  **JobFormFields:** Used for creating and updating job postings.
3.  **ProfileUpdateModel:** Captures changes to user profile information.
4.  **ApplicationSubmitModel:** Encapsulates data needed to apply for a job.
5.  **NotificationDTO:** Represents a notification object sent to the client.

### 2.2.4 Controllers (API Endpoints)
1.  **JobsController:** Handles all CRUD operations for job listings.
2.  **ApplicationController:** Manages the lifecycle of job applications.
3.  **ProfilesController:** Provides endpoints for fetching and updating user profiles.
4.  **AdminController:** Secured endpoints for administrative tasks.
5.  **MessagesController:** Handles sending and retrieving internal messages.
6.  **AuthController:** Manages login, logout, and session state.

## 2.3 CI/CD and Deployment Processes

The project utilizes modern DevOps practices to ensure continuous delivery:

*   **Continuous Integration:** GitHub Actions (or similar) are used to run builds and linters on every push to the main branch.
*   **Containerization:** The application is fully containerized using **Docker**. A `Dockerfile` defines the environment for both the .NET backend and the Vite-built frontend assets.
*   **Deployment:** The application is deployed to **Fly.io** (or Render/Heroku as alternatives). It uses a specialized `fly.toml` configuration for automated scaling and management.
*   **Database Migrations:** EF Core migrations are applied automatically during the deployment phase to ensure the production database schema is always in sync with the code.
# Part 3: Technology Selection

## 3.1 Database: Entity Framework Core (Code-First)

The project leverages **Entity Framework Core (EF Core)** as the Object-Relational Mapper (ORM). This choice allows the team to focus on C# domain models while the framework handles the underlying SQL generation.

*   **Database Provider:** While the assignment specifies MS SQL Server, the current implementation utilizes **SQLite** for the development and prototyping phase. SQLite offers zero-configuration, portability, and file-based storage, making it ideal for rapid iteration and deployment on platforms like Fly.io.
*   **MS SQL Compatibility:** Due to the abstraction provided by EF Core, transitioning to MS SQL Server involves only a single-line change in `Program.cs` and updating the connection string. All migrations are designed to be compatible with SQL Server syntax.
*   **Data Seeding:** To ensure the platform is "ready to use" upon deployment, a robust seeding mechanism is implemented in `DbInitializer.cs`.

### 3.1.1 Initial Data Seeding
The seeding process performs the following:
1.  **Role Creation:** Ensures "Admin", "Employer", and "Employee" roles exist.
2.  **Admin Creation:** Seeds a master administrator account for initial platform management.
3.  **Mock Employers:** Generates real-world company profiles (e.g., Google, Microsoft, Sony) with custom bios and branding.
4.  **Mock Job Postings:** Creates a variety of job listings using the **Bogus** library for realistic data generation.
5.  **Mock Employees & Applications:** Populates the system with dummy users, skills, and application histories to demonstrate the platform's social and recruitment features.

## 3.2 Server Side: ASP.NET Core Web API

The backend is built as a **.NET 8.0 Web API**. This provides a high-performance, cross-platform foundation for the application's business logic.

*   **RESTful Architecture:** The API follows standard REST principles, using appropriate HTTP verbs (GET, POST, PUT, DELETE) and status codes.
*   **ASP.NET Core Identity:** Used for comprehensive user management, including password hashing, role assignment, and secure cookie-based authentication.
*   **Dependency Injection:** Extensively used for services like `IEmailService`, `JobService`, and the `ApplicationDbContext`.

## 3.3 Client Side: React & Modern Web Technologies

The frontend is a modern **React** application built with **TypeScript** for type safety and improved developer experience.

*   **Vite:** Used as the build tool and development server for lightning-fast HMR (Hot Module Replacement).
*   **Vanilla CSS:** Styling is implemented using standard CSS, avoiding the overhead of heavy frameworks like Tailwind or Bootstrap where custom design is preferred.
*   **Lucide React:** A clean and consistent icon library used throughout the UI.
*   **React Router:** Handles client-side navigation without page reloads, providing a smooth, "app-like" experience.
# Part 4: Backend Design and Implementation

## 4.1 Managing Core Domain Logic

The backend architecture is centered around three primary domains: **Job Management**, **Application Processing**, and **User Identity**.

### 4.1.1 Job Management
Implemented primarily via the `JobService` and `JobsController`, this module handles:
*   **CRUD Operations:** Secure creation, retrieval, updating, and "soft-deletion" of job postings.
*   **Tagging System:** An automated system for managing job tags, allowing for better categorization and searchability.
*   **Access Control:** Ensuring that only the owner of a job posting or an administrator can modify or delete it.

### 4.1.2 Application Lifecycle
Managed by the `ApplicationController`, the system tracks the progress of a candidate's journey:
*   **Submission:** Employees can apply for jobs, attaching their profile information and a personalized message.
*   **Status Tracking:** Applications move through states: `Pending` -> `Accepted` or `Rejected`.
*   **Employer Oversight:** Employers have a dedicated dashboard to review applications for all their posted jobs in one unified view.

### 4.1.3 User Profiles and CVs
The `ProfilesController` and `CvController` handle the rich data associated with professional identities:
*   **Multi-Role Profiles:** Separate data structures for Employee-specific info (Education, Experience, Skills) and Employer-specific info (Company Name, Bio).
*   **Document Management:** Secure upload and storage of CVs in PDF format, linked directly to the user's account for easy retrieval by employers during the application review process.

## 4.2 Automatic Notification Logic

One of the standout features of FindAJob is its proactive notification system. Instead of relying solely on user polling, the backend automatically generates system notifications for key events.

### 4.2.1 Event-Driven Notifications
The system monitors specific actions and triggers notifications:
1.  **New Messages:** When a user sends a message, the recipient is immediately notified with the message subject or a "New message" alert.
2.  **Friend Requests:** Sending a connection request triggers a notification for the recipient, allowing them to accept or decline from their notification tray.
3.  **Application Updates:** (Planned/Implemented) Status changes on job applications alert the candidate to the employer's decision.
4.  **Connection Acceptance:** When a friend request is accepted, the sender is notified that a new professional connection has been established.

### 4.2.2 Notification Persistence
Notifications are stored in the database, allowing users to:
*   View a history of all alerts.
*   See an "unread count" badge in the navigation bar.
*   Mark notifications as "Read" individually or all at once.
*   Navigate directly to the relevant part of the application via `LinkUrl` properties stored in the notification object.
# Part 5: Software Management and Administration

## 5.1 The Administrative Panel

FindAJob includes a powerful, centralized **Admin Dashboard** designed for platform governance and moderation. This panel is restricted to users with the `Admin` role and provides several critical management capabilities.

### 5.1.1 User Governance
Administrators have a birds-eye view of all registered users on the platform:
*   **Listing:** View all users, their roles, and basic profile information.
*   **Role Management:** Ability to upgrade or downgrade user roles (e.g., promoting an Employer to Admin).
*   **Status Control:** Admins can "disable" or "lock out" accounts that violate platform terms of service.
*   **Deletion:** Capability to remove users from the system entirely if necessary.

### 5.1.2 Content Moderation
To maintain the quality and safety of the job board, the system includes moderation tools for job listings and applications:
*   **Job Visibility:** Admins can hide or delete job postings that are fraudulent or inappropriate.
*   **Global Access:** Unlike standard employers who only see their own listings, Admins can manage any job on the platform.

### 5.1.3 Registration Approval (Employer Verification)
A unique feature of FindAJob is the **Pending Registrations** flow:
*   When a new employer signs up, their account remains in a "Pending" state.
*   Admins review these requests to verify the legitimacy of the company.
*   Once approved, the employer gains full access to post jobs and review applicants.

## 5.2 Statistics and Analytics

The Admin Dashboard provides real-time statistics to monitor the health and growth of the platform.

### 5.2.1 Core Platform Metrics
The system aggregates data from various tables to provide high-level insights:
*   **Total Users:** Growth trend of the user base.
*   **User Breakdown:** Counts of Admins, Employers, and Employees.
*   **Job Metrics:** Total number of jobs posted vs. active listings.
*   **Engagement:** Total number of job applications submitted across the platform.
*   **Moderation Stats:** Count of deleted or hidden jobs.

### 5.2.2 Top Positions and Trends
(Planned) The system is designed to track "most searched" or "most applied" positions based on tag frequency and application volume, helping platform owners understand market demand.
# Part 6: Client-Side Design and Implementation

## 6.1 The FindAJob Web Application

The frontend is designed to be intuitive, fast, and responsive. Built with **React** and **TypeScript**, it provides a seamless experience for three distinct user types: Guest, Employee, and Employer.

### 6.1.1 Job Search and Discovery
The **Home Page** serves as the primary entry point for job seekers:
*   **Search Engine:** Users can filter jobs by keywords, title, or company name.
*   **Tag-Based Discovery:** Job listings feature clickable tags, allowing users to find similar roles quickly.
*   **Real-Time Filtering:** Results are updated instantly as users type or select filters.
*   **Saved Jobs:** Logged-in employees can "save" interesting listings to review later from their profile.

### 6.1.2 The Application Process
Applying for a job is designed to be frictionless:
*   **One-Click Apply:** For users with a complete profile, applying is as simple as clicking a button and adding an optional message.
*   **Application Tracking:** A dedicated view allows employees to monitor the status of their pending applications in real-time.

### 6.1.3 Employer Management Tools
Employers have a specialized set of views for managing their recruitment pipeline:
*   **Job Publishing:** A comprehensive multi-field form for creating rich job listings, including salary ranges, job types (Remote/Hybrid/Onsite), and detailed requirements.
*   **Applicant Review:** Employers can see a list of everyone who applied for their jobs, view candidate profiles, and download their CVs.
*   **Decision Management:** Ability to accept or reject candidates with a single click, which triggers an automated notification to the applicant.

## 6.2 Personalized User Profiles

Profiles in FindAJob are more than just static pages; they are dynamic professional identities.

### 6.2.1 Employee Profiles (Candidate Showcase)
Candidates can build a rich professional presence:
*   **Header Section:** Customizable avatars and banners to personalize their page.
*   **Professional Summary:** Bio and professional title.
*   **Modular Sections:** Users can manage lists of their **Skills**, **Education** history, and **Experience** (Work history).
*   **CV Management:** An integrated upload tool specifically for PDF resumes. Employers can download these directly from the candidate's profile.

### 6.2.2 Social Interaction and Friending
FindAJob integrates social networking into the recruitment process:
*   **Connections:** Users can send friend requests to build a professional network.
*   **Unified Inbox:** A real-time messaging interface for direct communication between connections.
*   **Notifications Tray:** A central location for all alerts, from new messages to application status updates.
*   **User Blocking:** Safety features allowing users to block unwanted communication.

## 6.3 Technical Implementation Details

*   **State Management:** Utilizes React's `useState` and `useEffect` hooks for local state, and a centralized `AuthContext` to manage user sessions across the entire app.
*   **Theme and Styling:** Custom CSS with a centralized `theme.ts` for consistent colors and spacing. The app features a modern "Card-based" UI inspired by top professional networks.
*   **Component Architecture:** High reuse of components like `AppShell`, `JobFormFields`, and `ProfileSection` ensures a consistent look and feel while reducing code duplication.
# Part 7: Testing and Optimization

## 7.1 Testing Strategy

A rigorous testing methodology was employed to ensure the reliability and security of the FindAJob platform. The testing process was divided into three main phases: Unit Testing, Integration Testing, and Manual Verification.

### 7.1.1 Unit Testing (Backend)
We utilized **xUnit**, **Moq**, and **EF Core In-Memory** to test the core business logic of the application.
*   **Target Coverage:** The goal was to cover at least 65% of the functional business logic, specifically focusing on the `JobService` and critical Controller actions.
*   **Key Test Cases:**
    *   `CreateJobAsync`: Verified that jobs are correctly persisted to the database with appropriate timestamps and owner IDs.
    *   `GetJobsAsync`: Ensured that only non-deleted jobs are returned to the user, validating the "soft-delete" mechanism.
    *   `SubmitApplicationAsync`: Confirmed that candidate applications are correctly linked to both the job and the user profile.
    *   `Security Checks`: Verified that unauthorized users cannot modify or delete jobs they do not own.

### 7.1.2 Manual and Cross-Device Testing
The frontend was tested across a variety of environments to ensure a consistent user experience:
*   **Browser Compatibility:** Verified on Chrome, Firefox, Safari, and Edge.
*   **Responsive Design:** Using browser developer tools, the application was tested on simulated mobile (iPhone/Android) and tablet resolutions to ensure the "Card-based" UI scales appropriately.
*   **Role-Based Testing:** Exhaustive manual walkthroughs were conducted for each user role (`Admin`, `Employer`, `Employee`) to ensure that navigation and access controls work as intended.

## 7.2 Performance and Security Optimization

### 7.2.1 Backend Optimizations
*   **SQLite WAL Mode:** Enabled Write-Ahead Logging (`PRAGMA journal_mode=WAL`) and `PRAGMA synchronous=NORMAL` to significantly improve database concurrency and write performance.
*   **Query Filtering:** Utilized Global Query Filters in EF Core to automatically handle soft-deleted records, simplifying controller logic and preventing data leaks.
*   **Asynchronous Processing:** All I/O-bound operations (database calls, file uploads, email sending) use the `async/await` pattern to prevent thread blocking and improve server scalability.

### 7.2.2 Frontend Optimizations
*   **Vite Build Pipeline:** Leverages Rollup for efficient code-splitting and minification of production assets.
*   **Lazy Loading:** React components and routes are loaded on demand where possible to reduce the initial bundle size.
*   **State Management:** Efficient use of React hooks ensures that only necessary components re-render during state updates.

### 7.2.3 Security Hardening
*   **Cookie Security:** Configured `HttpOnly` and `SameSite=Lax` for authentication cookies to mitigate XSS and CSRF risks.
*   **Role-Based Access Control (RBAC):** Every API endpoint is decorated with `[Authorize(Roles = "...")]` attributes, ensuring strict server-side validation of user permissions.
*   **Input Sanitization:** DTOs and model validation ensure that incoming data is clean and matches expected formats.
# Part 8: Conclusion and Future Roadmap

## 8.1 Project Conclusion

**FindAJob** represents a successful implementation of a modern, full-stack recruitment platform. By combining the social aspects of professional networking with the functional core of a job board, the application addresses key pain points in the digital hiring landscape. 

The project demonstrates:
*   A scalable and maintainable **Client-Server architecture**.
*   Robust **security and authentication** using industry standards.
*   An interactive and **user-centric frontend** built with React.
*   Proactive user engagement through an **automated notification system**.
*   A clean, **Code-First database design** with Entity Framework Core.

The final product is a production-ready prototype that satisfies all the requirements of the assignment while pushing the boundaries of traditional job board functionality.

## 8.2 Future Roadmap

While the current version of FindAJob is feature-rich, there are several areas for future expansion:

1.  **AI-Powered Job Recommendations:** Implementing a machine learning model to suggest jobs to employees based on their skills, experience, and historical interest.
2.  **Video Interviews:** Integrating a WebRTC-based video calling feature to allow employers to conduct initial interviews directly within the platform.
3.  **Advanced Analytics for Employers:** Providing recruiters with deeper insights into their job posting performance, such as click-through rates and applicant demographics.
4.  **Mobile Applications:** Developing native iOS and Android versions of the platform using React Native or Flutter to provide a better on-the-go experience.
5.  **Multi-Language Support:** Localizing the platform for international markets, starting with Bulgarian and English.

---
**FindAJob - Connecting Talent with Opportunity.**
*Developed for the Final Practical Assignment, May 2026.*
