<img width="1311" height="944" alt="image" src="https://github.com/user-attachments/assets/2ba41328-9cc0-4647-9ba7-436960eb559e" />

# FindAJob

FindAJob is a comprehensive, full-stack job board platform designed to connect talented professionals with top-tier technology companies. Built with a modern C#/.NET backend and a dynamic React frontend, the application provides tailored experiences for job seekers, employers, and administrators.

## 🚀 Key Features

* **Role-Based Workflows**: Dedicated dashboards and feature sets depending on whether you are an `Employee` looking for jobs, an `Employer` posting opportunities, or an `Admin` managing the platform.
* **Dynamic Job Seeding**: Every time the server starts, the database is wiped clean of stale test data and dynamically populated with 200–300 highly realistic mock job postings using the [Bogus](https://github.com/bchavez/Bogus) library.
* **Top Tech Company Profiles**: Automatically seeds verified employer accounts representing industry leaders (Google, Microsoft, Sony, Samsung, Apple, and Arasaka).
* **Rich User Profiles**: Employees and employers can manage their public profiles, complete with custom avatars, banners, biographical details, location data, and a list of specific skills, technologies, or benefits.
* **Integrated File Uploads**: Image uploads (like user avatars and company banners) are stored durably within the project's `wwwroot/uploads` folder, ensuring they persist seamlessly when the project is shared or moved on a flash drive.
* **Email Verification**: Implemented an automated email confirmation flow during the registration process to ensure valid user identities.

## 🛠️ Technologies Used

### Backend
* **Framework**: .NET 10 / C# (ASP.NET Core Web API)
* **Database**: SQLite (via Entity Framework Core)
* **Authentication**: ASP.NET Core Identity (Cookie-based auth with roles)
* **Mock Data Generation**: Bogus

### Frontend
* **Library**: React 18 with TypeScript
* **Build Tool**: Vite
* **UI/UX**: Material UI (MUI) for a clean, accessible, and responsive component system
* **Routing**: React Router

## 📂 Project Structure

```text
findajob/
├── backend/       # ASP.NET Core API, Database, EF Migrations, Models, Services
└── frontend/      # React application, Vite config, MUI components, Pages
```

## 🏃 Getting Started

Since the project uses SQLite and local file storage for assets, everything needed to run the platform is self-contained.

### Prerequisites
* [.NET 10 SDK](https://dotnet.microsoft.com/download)
* [Node.js](https://nodejs.org/) (v18 or newer recommended)

### 1. Running the Backend

The backend automatically runs pending database migrations and seeds the database with employers, admins, and 200+ random jobs upon startup.

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Start the application:
   ```bash
   dotnet run
   ```
   *The API will start running (typically on `https://localhost:7001` or `http://localhost:5000`). Keep this terminal window open.*

### 2. Running the Frontend

1. Open a **new** terminal window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the necessary dependencies (only required the first time):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the URL provided in the terminal (usually `http://localhost:5173`).

## 🔑 Default Seeded Accounts

The platform comes pre-configured with several seeded accounts for testing and demonstration purposes.

**System Administrator:**
* **Email:** `monkey@findajob.com`
* **Password:** `1GetAjObScaMMErLSD!`

**Employers (Tech Giants):**
* **Emails:** `google@example.com`, `microsoft@example.com`, `sony@example.com`, `samsung@example.com`, `apple@example.com`, `boss@company.com`, `arasaka@example.com`
* **Password:** `1WouldYoULiKEaJoBiNMYCallCeNtER!`

*(Note: All seeded employer accounts share the same password. Feel free to log in as any of them to view their company profiles and manage their dynamically generated job postings.)*
