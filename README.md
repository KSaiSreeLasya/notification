**# Notification / Alerting Platform (PRD)**

Live Demo: [https://notification-9ydo.onrender.com/](https://notification-9ydo.onrender.com/)

---

**## 🌟 Overview**

This is a **Notification & Alerting Platform** that lets admins craft, manage, and send time-critical alerts across an organization, while users can receive, snooze, and track them. The app has two main views:

- **Admin interface**: Create alerts, manage users, set visibility, severity, status, etc.
- **End-User interface**: View alerts visible to the user, take actions (acknowledge, snooze, dismiss).

It’s built using Vite + React (frontend), and Supabase (backend / persistence).  

---

**## 🧩 Features**

- Seed a test alert via API endpoint (`/api/seed-test-alert`)  
- Fetch visible alerts via API (`/api/visible-alerts`)  
- Filter by severity  
- Visibility / status toggles  
- Notifications, snooze, etc.  
- Role separation: Admin vs End User  
- Supabase integration for data persistence  

---

**## 🛠 Tech Stack**

| Layer | Technology |
|---|---|
| Frontend | Vite, React, TypeScript |
| Backend / API | (Maybe Node / Express or Serverless functions) |
| Database / Auth | Supabase |
| Deployment | Render (or similar) |

---

**## 📦 Setup & Run (Development)**

1. **Clone the repo**

   ```bash
   git clone <your-repo-url>
   cd <project-folder>

   **
    install dependencies **
npm install
**
Run dev server**
npm run dev
**
🎯 Future Enhancements**

-Real-time notifications via WebSockets

-Email / SMS delivery options

-More advanced filtering & sorting

-User roles & permissions

-Audit logs of alert actions
