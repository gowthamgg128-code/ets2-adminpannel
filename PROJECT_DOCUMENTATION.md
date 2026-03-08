# ETS2 Admin Panel — Project Documentation

This repository contains a small **React + Vite** admin panel UI for an “ETS2 Paid Mod Distribution” workflow.

It is currently a **front-end only** app with **mock data** and **placeholder authentication** (localStorage flag). There is **no backend/API integration** in this repo yet.

## 1) Tech Stack

- **Build tooling**: Vite
- **Language**: TypeScript
- **UI**: React 18
- **Routing**: React Router (`react-router-dom`)
- **UI components**: shadcn/ui (Radix UI primitives + Tailwind)
- **Styling**: Tailwind CSS (+ `tailwindcss-animate`)
- **Icons**: `lucide-react`
- **Data layer (ready, not heavily used yet)**: TanStack React Query
- **Testing**: Vitest (jsdom)
- **Linting**: ESLint (flat config)

## 2) Project Structure

Top-level layout:

- `public/` — static assets
- `src/` — application code
  - `main.tsx` — React entry
  - `App.tsx` — providers + router
  - `index.css` — Tailwind + theme tokens (CSS variables)
  - `components/` — app components (layout/header/sidebar) + `ui/` shadcn components
  - `contexts/` — React context (auth)
  - `hooks/` — small reusable hooks
  - `lib/` — utilities (`cn` helper)
  - `pages/` — route-level pages
  - `test/` — Vitest setup + example test

Notes:

- `bun.lockb` exists, but `package.json` scripts are standard Node/NPM scripts. You can use either npm or Bun.
- `src/App.css` looks like leftover Vite template CSS and is not imported by default.

## 3) Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm (or Bun)

### Install

With npm:

```bash
npm install
```

With Bun (optional):

```bash
bun install
```

### Run Dev Server

```bash
npm run dev
```

Vite is configured to run on:

- Host: `::` (IPv6)
- Port: `8080`

So locally you’ll typically open `http://localhost:8080`.

### Build / Preview

```bash
npm run build
npm run preview
```

## 4) NPM Scripts

From `package.json`:

- `dev` — start Vite dev server
- `build` — production build
- `build:dev` — build with `--mode development`
- `preview` — preview built app
- `lint` — run ESLint
- `test` — run Vitest once
- `test:watch` — run Vitest in watch mode

## 5) App Bootstrapping & Providers

### Entry Point

- App mounts in `src/main.tsx` and renders `App`.

### Global Providers (in `src/App.tsx`)

`App` wraps the router with:

- `QueryClientProvider` — TanStack Query client (ready for API calls; currently the pages use mock state/data)
- `TooltipProvider` — shadcn tooltip context
- `Toaster` + `Sonner` — toast/notification systems included
- `BrowserRouter` — client-side routing
- `AuthProvider` — app auth context (placeholder)

## 6) Routing

Routes are defined in `src/App.tsx`:

- `/login` → Login page (public)
- Protected (wrapped by `AdminLayout`):
  - `/dashboard`
  - `/mods`
  - `/requests`
  - `/licenses`
- `/` → redirects to `/dashboard`
- `*` → Not Found page

### Protected Route Mechanism

`AdminLayout` checks `isAuthenticated` from `AuthContext`:

- If **not authenticated** → redirect to `/login`
- If authenticated → renders sidebar + header + an `Outlet` for the selected page

## 7) Authentication (Current Implementation)

Auth lives in `src/contexts/AuthContext.tsx`.

What it does today:

- Uses a boolean flag in `localStorage` key: `ets2_admin_auth`
- `login(username, password)`:
  - Accepts **any non-empty username** (password is not validated)
  - Sets `ets2_admin_auth=true`
- `logout()`:
  - Clears the localStorage key

Important:

- This is **not secure** and is explicitly a **placeholder** implementation.
- For production you would typically replace this with:
  - real credential validation (API)
  - token/session storage
  - route guarding using token expiry
  - server-side authorization checks

## 8) Layout & Navigation

### Sidebar

`src/components/AdminSidebar.tsx` provides left navigation:

- Dashboard (`/dashboard`)
- Mods (`/mods`)
- Requests (`/requests`)
- Licenses (`/licenses`)

The sidebar is fixed, and its width is controlled via CSS variable:

- `--sidebar-width: 250px;`

### Header

`src/components/AdminHeader.tsx`:

- Displays the product title
- Provides a **Logout** button which clears auth and navigates to `/login`

Header height is controlled by:

- `--header-height: 56px;`

### Main Content

In `AdminLayout`, the main content area uses left/top offsets:

- `ml-[var(--sidebar-width)]`
- `pt-[var(--header-height)]`

## 9) Pages (Current UI Behavior)

All “business data” in these pages is currently mocked in the component files.

### Dashboard

`src/pages/Dashboard.tsx`

- Shows 3 cards:
  - Total Mods
  - Pending Requests
  - Active Licenses
- Values are hard-coded for now.

### Mods

`src/pages/Mods.tsx`

Contains two sections:

1) **Upload Mod** (placeholder)
   - Inputs: name, version, description, file input (`.zip`/`.scs`)
   - On submit: shows an `alert(...)` and clears local form state
   - No upload API integration yet

2) **Mods Table**
   - Renders a table from `mockMods` array
   - Shows status “Active/Inactive” badges using theme tokens

### Requests

`src/pages/Requests.tsx`

- Table of mod license requests with fields:
  - user name, phone, PC ID, Mod ID, status
- Pending requests show a **Generate Key** action.

Generate key flow:

- Clicking “Generate Key” opens a modal
- Clicking “Generate”:
  - Creates a random key like `ETS2-XXXX-YYYY-ZZZZ`
  - Marks the request as Approved
  - Stores the generated key in component state
- UI instructs admin to copy and send key to user (e.g., WhatsApp)
- Copy button uses `navigator.clipboard.writeText`

Important note:

- The UI text says “This key will NOT be shown again”, but currently the key is stored in component state and also persisted in the `requests` list for approved items. This is fine for a mock UI, but for real use you’d enforce this behavior via backend rules and not store/reveal it in the client.

### Licenses

`src/pages/Licenses.tsx`

- Displays a table from `mockLicenses`
- Status is “Active/Revoked”

### Login

`src/pages/Login.tsx`

- Simple login form
- Validates **both fields are non-empty**
- Calls `login(username, password)` from AuthContext
- On success, navigates to `/dashboard`

### Not Found

`src/pages/NotFound.tsx`

- Displays a basic 404 page
- Logs to console when a user hits an unknown route

## 10) UI Components (shadcn/ui)

This repo includes many pre-generated shadcn components under:

- `src/components/ui/`

The app currently uses a subset heavily:

- `button`, `input`, `label`, `textarea`
- `card`
- `table`
- `dialog`
- toast/toaster components

The `cn(...)` utility in `src/lib/utils.ts` merges Tailwind class names.

## 11) Styling & Theme Tokens

Tailwind is configured in `tailwind.config.ts` to use CSS variables (HSL) defined in `src/index.css`.

Key concept:

- Tailwind colors like `bg-background`, `text-foreground`, `bg-card`, etc. map to CSS variables like `--background`, `--foreground`, `--card`, etc.

Admin panel-specific tokens are also defined:

- Sidebar: `--sidebar-bg`, `--sidebar-fg`, `--sidebar-active`, etc.
- Status badges: `--status-active`, `--status-pending`, `--status-revoked`, etc.
- License key highlight: `--key-bg`, `--key-border`, `--key-fg`

Dark mode:

- Tailwind `darkMode: ["class"]`
- `.dark` variables exist in `src/index.css` (not all admin-sidebar tokens are overridden there yet)

## 12) Testing

Testing uses Vitest + jsdom.

- Setup file: `src/test/setup.ts` (adds `@testing-library/jest-dom` and a `matchMedia` stub)
- Example test: `src/test/example.test.ts`

Run:

```bash
npm test
```

## 13) Adding / Changing Features (Developer Notes)

### Add a new protected page

1) Create a new page component in `src/pages/`.
2) Add a `<Route />` inside the `AdminLayout` route group in `src/App.tsx`.
3) Add a new item in `src/components/AdminSidebar.tsx` so it shows in navigation.

### Hook up real data

The UI is structured so you can replace mock arrays/state with API calls. A typical next step is:

- create an API layer (fetch/axios)
- use React Query (`useQuery`, `useMutation`) per page
- replace the placeholder auth with token-based auth

## 14) Deployment

This is a standard Vite SPA build output.

- `npm run build` produces `dist/`
- Deploy `dist/` to any static host (e.g., Nginx, Cloudflare Pages, Netlify, Vercel static, etc.)

If you deploy behind a static host, ensure SPA fallback routing is configured (serve `index.html` for unknown paths).
