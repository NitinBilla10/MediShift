# Clinic Shift Scheduler

A production-grade full-stack application built to manage clinic staff shifts, handle complex concurrency (race-condition free claims), and bulk import shifts via CSV.

## Features
- **Role-based Authentication**: JWT based auth with `manager` and `staff` roles.
- **Coverage Dashboard**: Visualize shifts and required roles for any week.
- **Transaction-Safe Claiming**: SQL Row-Level Locking ensures no double-booking, even if multiple staff claim simultaneously.
- **Smart CSV Import**: Robust parsing, deduplication, role normalization, and detailed import reporting.
- **Modern UI**: Built with Next.js 15, TailwindCSS, and shadcn/ui.

## Tech Stack
- **Frontend**: Next.js (App Router), React, TypeScript, TailwindCSS, TanStack Query, Zustand, shadcn/ui.
- **Backend**: FastAPI, Python, SQLAlchemy (asyncpg), Alembic, Pydantic, Passlib.
- **Database**: PostgreSQL
- **Deployment**: Docker Compose

## Folder Structure
- `backend/`: FastAPI application code.
  - `app/api/`: REST Endpoints.
  - `app/services/`: Core business logic and transaction safety.
  - `app/models/`: SQLAlchemy DB models.
  - `app/importer/`: CSV parsing logic.
- `frontend/`: Next.js application code.
  - `src/app/`: App router pages.
  - `src/components/`: Reusable shadcn and UI components.
  - `src/features/`: Complex domain components (e.g. Dashboards).
  - `src/store/`: Zustand global state.

## Setup & Running Locally (With Docker)

Ensure you have Docker and Docker Compose installed.

1. Clone the repository and navigate to the project root.
2. Run the full stack using Docker:
   ```bash
   docker compose up --build
   ```
3. The database will be automatically created, migrated, and seeded.

## Setup & Running Locally (Without Docker)

If you prefer to run the applications natively:

1. **Start Database**: You must have a PostgreSQL instance running. The default connection string in `backend/app/core/config.py` expects PostgreSQL on `127.0.0.1:5433` with user `postgres` and password `postgres`.
2. **Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate # or .\venv\Scripts\activate on Windows
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Seed Credentials
- **Manager**: `manager@clinic.com` (Password: `password123`)
- **Staff**: Use any email from `staff.csv` (e.g. `marcus.whitfield@clinicmail.test`) with password `password123`.

## Architecture & Decisions
For a deep dive into concurrency handling, the CSV import strategy, and shift editing behavior, see [DECISIONS.md](./DECISIONS.md).
