# Architecture & Design Decisions

This document explains the choices made when building the MediShift platform, written in plain, simple English so anyone can understand how the system works behind the scenes.

## 1. How We Handle Double-Booking (Concurrency)
**The Problem:** Imagine two nurses see the exact same open shift and click "Claim" at the exact same millisecond. If the server isn't careful, it might assign both of them to the same slot, leaving the shift overstaffed.

**The Solution:** We use a technique called "Row-Level Locking." When a staff member tries to claim a shift, the database essentially puts a temporary "Do Not Disturb" sign on that specific shift. 
1. The server stops anyone else from touching that shift for a fraction of a second.
2. It counts how many people are currently assigned.
3. If there is still space, it assigns the staff member.
4. It removes the "Do Not Disturb" sign.

If a second nurse tries to claim it during that fraction of a second, they simply wait in line. By the time it's their turn, the server sees the shift is full and politely tells them it's no longer available. No double-booking, ever!

## 2. Making the Database Faster (Connection Pooling)
**The Problem:** Every time the app needs to talk to the database, it takes time to "pick up the phone and dial." If hundreds of people use the app at once, the database gets overwhelmed answering all those calls.

**The Solution:** We use a tool provided by Supabase called a "Connection Pooler" (PgBouncer). Think of it like a dedicated receptionist that holds a few phone lines open all the time. When the app needs data, it just uses an already-open line. We also tweaked the backend code to disable "statement caching," which makes our code fully compatible with this smart receptionist system without crashing.

## 3. How We Process CSV Uploads
Managers can upload Excel-like CSV files to create shifts or add staff in bulk. We built the system to be very forgiving and smart:

- **Staff CSVs:**
  - **Email Typos:** If a manager writes `john(at)clinic.com` or `john (AT) clinic.com` instead of using the `@` symbol, the system automatically detects this and fixes it during upload.
  - **Default Passwords:** To make onboarding easy, all imported staff are automatically given the password `password123`. We added a friendly popup warning the manager about this before they upload the file.
  
- **Shift CSVs:**
  - **Combining Duplicates:** If a manager uploads two rows for the exact same shift (e.g., one row asking for a Doctor, another row asking for a Nurse at the exact same time), the system merges them into a single shift that asks for both.
  - **Error Tracking:** If a row has a bad date or a missing time, it doesn't crash the whole upload. The system skips the bad row, imports the good ones, and gives the manager a clean report card showing exactly what failed and why.

## 4. Why We Chose Our Tech Stack
- **Next.js & React (Frontend):** We chose this because it allows us to build a lightning-fast, highly interactive user interface. When a user clicks a button, the app reacts instantly.
- **FastAPI (Backend):** We chose this Python framework because it's built for speed. It handles thousands of requests seamlessly and is very easy to read and maintain.
- **PostgreSQL (Database):** We chose this because it is the gold standard for reliable, relational data. It is excellent at enforcing rules (like "a shift cannot end before it starts").

## 5. Staff Accounts & Passwords
There are two ways staff get added to the system:
1. **Bulk CSV Import:** The system creates the accounts and gives everyone the default `password123`.
2. **Manual Creation:** The manager clicks "Create Staff" in the dashboard, types in the staff member's details, and manually types in a starting password for them.

**Security Note:** Even though the manager might set the password initially, the database *never* saves the actual password. It scrambles the password into a secret code (called a "hash"). If a hacker ever broke into the database, they would just see random gibberish, not the actual passwords.
