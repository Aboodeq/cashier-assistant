# Cashier Assistant

A Firebase-backed cashier/cash-register assistant: track deposit and withdrawal
sessions across multiple companies and representatives, with printable reports.
React + Vite, RTL Arabic UI.

## Stack

- React 19 + React Router 7
- Firebase (Auth + Firestore)
- Vite 8, plain CSS (no CSS framework)

## Project structure

```
src/
  App.jsx                 Routes + auth gate (redirects to /login or /dashboard)
  main.jsx                Entry point
  index.css               Global reset, CSS variables, shared keyframes

  firebase/config.js      Firebase app/auth/db initialization

  features/                One folder per screen/area. Each pairs a .jsx with its .css.
    auth/                  Login, Register
    dashboard/              Sidebar/topbar shell (DashboardShell) + home screen (DashboardHome)
    companies/              Companies CRUD
    representatives/        Representatives CRUD
    sessions/                Session list → session detail → deposit/withdrawal entries,
                             plus printing (PrintDialog, PrintTemplate, printReport.js)

  components/              Shared, reusable UI (currently: ConfirmDeleteDialog)

  hooks/
    useFirestoreCollection  Realtime Firestore collection subscription
    useStagger              Staggered entrance-animation timing
    useCanvasAnimation      <canvas> requestAnimationFrame lifecycle (used by the
                             login/register particle background)
    useMediaQuery           Reactive CSS media query match

  utils/format.js          Money formatting, entry totals/net, date/report formatting
```

Each feature's CSS lives in its own file next to the component (imported directly,
e.g. `import "./Login.css"`) rather than as an inline template string, and shared
logic (Firestore subscriptions, canvas setup, stagger timing) lives in `hooks/` so
it isn't duplicated per screen.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run preview` — preview a production build locally
