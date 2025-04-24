# Pizzeria Worker Check-In/Check-Out System

A web application for managing employee check-ins and check-outs in a pizzeria setting.

## Features

### Worker Features
- Login with unique ID
- Check-in/Check-out functionality
- View personal schedule
- View attendance history

### Admin Features
- View all workers' schedules
- Filter schedules by day/week/month
- View attendance logs
- Manage worker schedules

## Tech Stack
- Frontend: React + Tailwind CSS
- Backend: Node.js + Express
- Database: SQLite

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install-all
   ```
3. Start the development servers:
   ```bash
   npm start
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Project Structure
```
pizzeria-checkin/
├── frontend/          # React application
├── backend/           # Node.js + Express server
└── package.json       # Root package.json
```

## Development
- Frontend development: `cd frontend && npm start`
- Backend development: `cd backend && npm run dev` 