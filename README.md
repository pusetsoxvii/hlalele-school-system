# Hlalele High School Management System

A full-stack school management system for Hlalele High School.

## Stack

- Backend: Node.js, Express, MongoDB, Mongoose, JWT auth
- Frontend: React 18, Vite
- Reports: jsPDF and jspdf-autotable

## Project Structure

```text
hlalele/
  backend/      Node.js API
  frontend/     React Vite app
```

## Local Setup

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Edit `backend/.env` with your real MongoDB URI and JWT secret.

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Edit `frontend/.env` if your API URL is different.

## Environment Variables

### Backend

```text
MONGODB_URI=your MongoDB connection string
JWT_SECRET=long random secret
PORT=5001
FRONTEND_URL=http://localhost:5173
```

### Frontend

```text
VITE_API_URL=http://localhost:5001
```

## Quality Checks

```bash
cd frontend
npm run lint
npm run build
```

## Deployment Notes

Recommended flow:

1. Push this repository to GitHub.
2. Deploy `backend/` as a Node web service on Render.
3. Deploy `frontend/` as a Vite static site on Netlify or Vercel.
4. Set production environment variables in each hosting dashboard.
5. Do not commit real `.env` files or database credentials.

## Default Login

Change default passwords immediately after first login.

| Role | Username | Password |
| --- | --- | --- |
| Principal | `principal` | `hlalele2024` |
| Vice Principal | `vice` | `hlalele2024` |
| Secretary | `secretary` | `hlalele2024` |
