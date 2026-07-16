---
name: Admin Dashboard Architecture
description: Key decisions and constraints for the admin-dashboard artifact (artifacts/admin-dashboard)
---

## Stack
React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui + TanStack Query + React Hook Form + Zod + Firebase + React Router v7

## Dark Theme
Add `class="dark"` to `<html>` in `index.html`. The CSS vars in `index.css` define both `:root` (light) and `.dark` (dark) blocks. Without the class on <html>, the app renders in light mode.

**Why:** Tailwind v4 dark mode variant is `(&:is(.dark *))` — it needs a `.dark` ancestor, not `prefers-color-scheme`.

## Firebase
- Config: `src/config/firebase.ts` — null-safe; only initializes if `VITE_FIREBASE_API_KEY` is set; logs warning to console if credentials missing.
- Exports: `auth`, `rtdb`, `db` (Firestore, unused), `storage`.
- All domain data is in Firebase Realtime Database (RTDB) only — no Firestore writes.
- Schema must NOT be changed.

## Auth Context
`src/contexts/AuthContext.tsx` — wraps `onAuthStateChanged`, fetches `users/{uid}` from RTDB, checks role.
- Only `admin` and `superAdmin` roles may access the dashboard.
- `ADMIN_ROLES` constant exported from `src/types/index.ts`.
- `useAppAuth()` returns: `{ user, appUser, loading, isAdmin, signIn, signOut }`.

## Data Patterns
- RTDB snapshot normalization: use `{ ...defaults, ...snapshot.val(), uid }` — spread defaults FIRST, then data, then uid last. Never put explicit keys before a spread of the same type (TS2783).
- All client-side filtering/sorting/pagination happens inside `useUsers()` via `useMemo` — no extra fetches.
- Mutations always call `logModerationAction` via the service layer.
- All mutation hooks fire toasts internally — do NOT double-toast in components.

## Key File Locations
- Auth context: `src/contexts/AuthContext.tsx`
- All hooks: `src/hooks/` (barrel at `src/hooks/index.ts`)
- Services: `src/services/` (auth, user, report, room, moderation)
- Types: `src/types/index.ts`
- Providers: `src/app/providers.tsx`
- Routes: `src/routes/index.tsx`
- Pages: `src/pages/{auth,dashboard,users,reports,rooms,moderation}/`
- Layout: `src/components/layout/` (AppLayout, Sidebar, Header, Breadcrumb)
- ProtectedRoute: `src/components/auth/ProtectedRoute.tsx`

## TS2783 Fix
When normalizing RTDB snapshot data into a typed object, TypeScript TS2783 fires if you write explicit property keys before a spread that contains the same keys. Fix: put the spread FIRST (with defaults in a separate object), then any override keys last.
```ts
const defaults = { name: '', role: 'user' as const, ... };
return { ...defaults, ...snapshot.val(), uid } as AppUser;
```
**How to apply:** Any time you merge RTDB data with TypeScript defaults in a single object literal.
