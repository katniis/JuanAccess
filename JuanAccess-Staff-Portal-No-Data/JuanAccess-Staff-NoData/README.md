# JuanAccess Staff Portal (Frontend Demo)

React + TypeScript + Vite + Tailwind frontend. This package is the staff-side interface only. Not connected to the backend yet.

This copy has **no data**: every list is empty, so you can check the empty states (no bell notification, no side-menu numbers).

## Run locally
1. Install Node.js (LTS).
2. In this folder run `npm install` then `npm run dev`.
3. Log in with any non-empty email and password.

## Notifications (follows the backend in `untitled-main/server`)
- **Bell**: shows only *unread* notifications and a count badge that disappears at 0. Clicking one marks it read (it disappears from the list), closes the menu and opens the related screen (and the exact case for prior auth / appeals).
- **Side menu numbers**: show only the number of things still to do and are hidden at 0.
  - Patient: *My Waitlist* = offered slots waiting for your answer.
  - Staff: *Prior Auth Queue* = cases needing a draft (plus drafted ones if the user is elevated staff); *Appeals Queue* = appeals needing a draft or submission.
- Handling the task itself (confirm/decline an offer, save a draft, submit an appeal) also clears the matching notification.
- Notification shape = backend `notifications` table (`id, type, message, isRead, createdAt`). Type to screen mapping lives in `src/notifications.ts`; shared state in `src/store.tsx`; data in `src/data.ts`.

## Connecting the backend later
- `GET /notifications/mine` -> replace `initialNotifications` in `src/store.tsx`.
- `PATCH /notifications/:id/read` -> call it inside `openNotification`.
