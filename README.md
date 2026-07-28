# MediShift

A comprehensive, production-grade full-stack platform built to seamlessly manage clinic staff shifts, handle complex scheduling concurrency, and bulk-import shifts and staff records via CSV. 

### 🌐 Live Demo
- **Frontend (Vercel)**: [https://medi-shift-nine.vercel.app](https://medi-shift-nine.vercel.app)
- **Backend API Docs (Render)**: [https://medishift.onrender.com/api/v1/docs](https://medishift.onrender.com/api/v1/docs)

**Demo Credentials**:
- **Manager**: `manager@clinic.com` | `password123`
- **Staff (Doctor)**: `staff1@clinic.com` | `password123`
- **Staff (Nurse)**: `staff2@clinic.com` | `password123`

---

## ✨ Features
- **Role-based Dashboards**: Dedicated UI and permissions for `manager` and `staff` roles.
- **Smart Shift Coverage Dashboard**: Managers can visually track daily and weekly shift coverage statuses (Unstaffed, Partially Staffed, Fully Staffed).
- **Transaction-Safe Claiming**: SQL Row-Level Locking ensures no double-booking or race conditions, even if multiple staff members try to claim a shift simultaneously.
- **Advanced CSV Imports**:
  - **Staff Import**: Bulk import staff accounts with robust parsing (handles variants like `(at)` in emails) and automated default passwords.
  - **Shift Import**: Bulk upload shift requirements with automated deduplication and smart requirements merging.
- **Modern & Responsive UI**: Clean, glassmorphism-inspired aesthetic built with Next.js 15, Tailwind CSS, and Radix UI primitives.

## 🛠️ Tech Stack
### Frontend
- **Framework**: Next.js 15 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui, Lucide Icons
- **State Management**: TanStack React Query (Server State), Zustand (Client Auth State)
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI, Python 3
- **ORM & Database**: SQLAlchemy 2.0 (with `asyncpg`), PostgreSQL (Supabase Connection Pooler)
- **Auth**: JWT (OAuth2 Password Bearer), Passlib
- **Migrations**: Alembic
- **Deployment**: Render Web Service

## 📂 Project Structure
- `backend/`: FastAPI application code.
  - `app/api/api_v1/`: REST API Endpoints & Routes.
  - `app/services/`: Core business logic, transactional locks, and shift manipulation.
  - `app/models/`: SQLAlchemy DB models (Users, Shifts, Claims).
  - `app/importer/`: CSV parser engines for bulk data ingestion.
- `frontend/`: Next.js application code.
  - `src/app/`: App router page definitions.
  - `src/components/`: Reusable interface components and UI dialogs.
  - `src/features/`: Complex domain components (e.g., Manager vs Staff Dashboards).
  - `src/store/`: Zustand global authentication state.

## 🚀 Running Locally

### Prerequisites
- Node.js v18+
- Python 3.10+
- A PostgreSQL Database (Local or Supabase)

### 1. Running with Docker (Easiest Method)
If you have Docker and Docker Compose installed, you can spin up the entire application (Frontend, Backend, and Database) with a single command!

```bash
# From the root of the project:
docker compose up --build
```
This will automatically:
- Start a local PostgreSQL database
- Run all the database migrations
- Seed the database with the default Manager and Staff accounts
- Start the Python Backend API on `http://localhost:8000`
- Start the Next.js Frontend on `http://localhost:3000`

### 2. Running Locally (Without Docker)

#### Database Setup
Create a PostgreSQL database. Ensure you use an async-compatible connection string in your `.env` files (e.g., prefixing with `postgresql+asyncpg://`). If using Supabase PgBouncer, ensure statement caching is disabled.

#### Backend Setup
```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows: .\venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt

# Set your environment variable
export DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/dbname"

# Run migrations to build the tables
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```
*The API will be available at `http://localhost:8000`. API Documentation is at `http://localhost:8000/api/v1/docs`.*

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create a .env.local file with your local backend URL:
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

npm run dev
```
*The web app will be available at `http://localhost:3000`.*

---

## 🔒 Concurrency & Safety Decisions
The backend is explicitly designed to handle high-concurrency environments:
- **Pessimistic Locking**: When a staff member attempts to claim a role, the backend uses `with_for_update()` to lock the shift row. If two nurses try to claim the final nurse slot at the exact same millisecond, the database forces sequential processing. The second request will correctly evaluate the updated requirement counts and throw a `400 Bad Request` instead of overbooking the shift.
- **Connection Pooling**: Natively optimized for Supabase's PgBouncer using `statement_cache_size=0`.

---
*Built with ❤️ for efficient healthcare staffing.*
