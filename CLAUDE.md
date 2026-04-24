# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Dev server with HMR — http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Serve the production build
```

No test framework configured.

## Stack

**React 18 + Vite 8 + vanilla CSS.** No routing library — uses a custom hash-based router (`src/router.jsx`). No state management library — uses React Context for auth and toasts, local `useState` for everything else.

## Architecture

### Entry & routing
- `src/main.jsx` — React root (`createRoot`), wraps app in `ToastProvider` → `AuthProvider`
- `src/App.jsx` — reads `window.location.hash` via `useHash()`, renders the matching view inside `AppShell` (sidebar + Pomodoro + Search). Unauthenticated users are redirected to `#/login`.
- `src/router.jsx` — exports `navigate(path)` and `useHash()` hook

### Context
- `src/context/AuthContext.jsx` — `user` state, `login()` / `logout()`
- `src/context/ToastContext.jsx` — `showToast(message, type)` rendered as a portal

### Data layer (`src/db.js`)
All persistence lives here — **swap these for `fetch()` calls when the Spring Boot backend is ready.** Uses `localStorage` for structured data and `IndexedDB` for file binaries. Key namespaces: `users`, `session`, `years`, `subjects`, `events`, `subjectLinks`, `dashboardLinks`, `notes`, `fileMeta`, `grades`.

### Components (`src/components/`)
| File | Purpose |
|---|---|
| `Navbar.jsx` | Fixed sidebar; receives `open`, `onClose`, `onSearchOpen` props |
| `Calendar.jsx` | Monthly calendar with colored event dots; `onDayClick` callback |
| `Pomodoro.jsx` | Floating bottom-left timer; uses `useRef` + `setTimeout` chain to avoid stale closures |
| `Search.jsx` | Ctrl+K overlay; searches subjects, events, notes, links across all of `db.js` |
| `Modal.jsx` | Presentational wrapper — each view manages its own modal `useState` |
| `ColorPicker.jsx` | Row of colored circle buttons, controlled |
| `NotificationBanner.jsx` | Requests browser notification permission; fires native notifs for events within 0/1/3/7 days |

### Views (`src/views/`)
| File | Route | Notes |
|---|---|---|
| `LoginView.jsx` | `#/login` | Login + register tabs, demo account button |
| `DashboardView.jsx` | `#/dashboard` | Calendar, upcoming events, editable tool links |
| `YearsView.jsx` | `#/years` / `#/years/:id` | Same component; renders year list or subject grid depending on `yearId` prop |
| `SubjectDetailView.jsx` | `#/subjects/:id` | 6 tabs: Info, Fechas, Links, Archivos, Post-its, Calificaciones |

### Subject detail tabs
- **Info** — editable subject data, weighted grade average
- **Fechas** — events sorted by date, urgency highlighting, ICS export
- **Links** — subject-specific URLs
- **Archivos** — drag-and-drop file upload; binary stored in IndexedDB, metadata in localStorage
- **Post-its** — draggable sticky notes (`useRef` mouse event drag), 6 colors
- **Calificaciones** — weighted average calculator

## Future backend (Spring Boot)
Replace the methods in `src/db.js` with `fetch()` / `axios` calls to the REST API. The rest of the codebase doesn't need to change.
