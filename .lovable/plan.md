

## Problem

When clicking "Painel Administrativo" in the profile screen, you're redirected back to the feed ("Mercado") instead of seeing the admin panel.

## Root Cause

There's a race condition in the `AdminGuard` component:

1. You click the admin button, which calls `navigate('/admin')`
2. React Router renders the `AdminLayout` with `AdminGuard`
3. `AdminGuard` uses `useAdminAuth()`, which internally creates a **new instance** of `useAuth()`
4. This new `useAuth()` starts with `user = null` while it fetches the session
5. But `useAdminAuth` calculates `loading` as: `!user ? false : rolesLoading` -- so when user is null, loading is immediately `false`
6. AdminGuard sees `loading = false` and `user = null`, so it redirects to `/` (the feed page)

In short: the guard decides "no user, redirect away" before the authentication has had time to load.

## Solution

Fix the `useAdminAuth` hook to account for the auth loading state, so `AdminGuard` waits for authentication to fully resolve before making access decisions.

---

## Technical Details

### 1. Fix `useAdminAuth.ts` loading logic

Change the loading calculation to include `authLoading` from `useAuth`:

```typescript
// Current (broken):
const { user } = useAuth();
// ...
loading: !user ? false : rolesLoading

// Fixed:
const { user, loading: authLoading } = useAuth();
// ...
loading: authLoading || rolesLoading
```

This ensures `AdminGuard` shows the loading spinner while the session is being fetched, preventing the premature redirect.

### 2. No other files need changes

The `AdminGuard` component already handles the `loading` state correctly by showing a spinner. The only issue is that `useAdminAuth` was reporting `loading = false` too early.

