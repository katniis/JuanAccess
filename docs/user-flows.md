# JuanAccess User Flows and Interaction Flowcharts

Drawn from the code (client routes, pages, server controllers), not from `docs.md`.

Roles: **Patient**, **Staff** (`staff`), **Staff Admin** (`staff_admin`). Rounded = start/end, rectangle = screen or action, diamond = decision.

## 1. Entry, sign-in and account access

```mermaid
flowchart TD
   Start([Visit app]) --> Session{Signed in?}
   Session -- Yes --> Own([Own role dashboard])
   Session -- No --> Login[Sign in /login]
   Start --> Public[Public pages: /prices, /privacy]

   Login --> Signup[Register /signup<br>details, optional insurance, privacy consent]
   Login --> Forgot[Forgot password] --> Reset[Reset password from email link]
   Reset --> Login
   Signup --> PHome[Patient Dashboard]

   Login --> Cred{Valid credentials?}
   Cred -- No --> Fail[Error; repeated failures lock the account] --> Login
   Cred -- Yes --> Role{Role}
   Role -- Patient --> Consent{Current privacy policy accepted?}
   Consent -- No --> Accept[Accept or sign out] --> PHome
   Consent -- Yes --> PHome

   Role -- Staff or Admin --> Enrolled{Second Factor set up?}
   Enrolled -- Yes --> Code[Enter authenticator or recovery code]
   Enrolled -- No --> Enrol[Enter Enrolment Code] --> Setup[Set up authenticator<br>save recovery codes]
   Invite([Invitation link /accept-invite]) --> Pass[Set password] --> Setup
   Code --> SHome[Staff Dashboard]
   Setup --> SHome
```

## 2. Patient portal map

```mermaid
flowchart LR
   Home[Dashboard /patient] --> Book[Book Appointment]
   Home --> Wait[My Waitlist]
   Home --> Appts[My Appointments]
   Home --> Bills[Upload a Bill]
   Home --> Set[Settings]
   Home --> Bell[Notifications: view, dismiss]

   Home --> HomeAct[Confirm or decline offer<br>Cancel or rebook visit]
   Appts --> ApptAct[View insurance and prior auth status<br>Cancel with optional letter]
   Wait --> WaitAct[Join, remove, confirm, decline]
   Set --> SetAct[Profile, password, email change<br>Add or edit insurance coverage]
   SetAct --> Unverified[Coverage awaits Staff Admin verification]
```

## 3. Booking a visit

```mermaid
flowchart TD
   A([Book Appointment]) --> B[Choose visit type]
   B --> C[Choose date range and time preference]
   C --> D{Slots found?}
   D -- No --> W[Go to My Waitlist]
   D -- Yes --> E[Pick a slot and confirm]
   E --> F{Provider, room, equipment<br>and patient still free?}
   F -- No --> G[Slot just taken: pick another] --> D
   F -- Yes --> H[Appointment created<br>coverage status recorded<br>patient notified]
   H --> I{Prior auth required<br>for visit type and plan?}
   I -- No --> J[Status: not_required]
   I -- Yes --> K[Status: needs_draft<br>draft generated in background]
   K --> L[Staff Prior Auth Queue, flow 7]
   J --> M([Booked confirmation])
   L --> M
```

## 4. Cancellation and waitlist

```mermaid
flowchart TD
   J([Patient joins waitlist]) --> Wt[waiting]
   C([Patient or staff cancels a visit]) --> R[Reason + optional letter]
   R --> M{First matching waiting entry?<br>oldest first}
   Wt --> M
   M -- No --> Open[Slot stays open]
   M -- Yes --> O[offered: appointment reserved<br>patient notified, 30 minutes]
   O --> A{Patient response}
   A -- Confirm --> Conf([confirmed])
   A -- Decline --> Rel[Release reserved slot]
   A -- No reply --> Exp[expired] --> Rel
   Rel --> M
   Wt -- Remove --> X([cancelled])
```

## 5. Bill review and dispute

```mermaid
flowchart TD
   A([Upload a Bill]) --> B{PDF, JPG or PNG,<br>10 MB or less?}
   B -- No --> A
   B -- Yes --> C[Upload and extract line items]
   C --> D[Save bill and check each line]
   D --> E{Any line flagged?}
   E -- No --> F([Review items and explanations])
   E -- Yes --> G[Dispute letter drafted]
   G --> H[Review and edit]
   H --> I[Download letter]
   H --> J[Submit to clinic staff<br>letter locks, bill cannot be deleted]
   J --> K([Staff Disputes page: read only])
```

## 6. Staff portal map

```mermaid
flowchart LR
   Home[Dashboard /staff] --> Att[Needs Attention]
   Home --> Search[Search records] --> Rec[Patient record]
   Home --> Sch[Provider Schedule]
   Home --> Slot[Slot Management]
   Home --> PA[Prior Auth Queue]
   Home --> Ap[Appeals Queue]
   Home --> Dis[Disputes] --> Det[Dispute detail, read only]
   Home --> Set[Settings: profile, security]

   Sch --> Pre[Appointment: pre-visit summary<br>and chart data]
   Sch --> Can[Cancel visit, triggers flow 4]
   Slot --> Util[Utilization and waitlist monitor]

   Set -. Admin only .-> Ver[Verify insurance]
   Set -. Admin only .-> Acc[Invite staff, issue Enrolment Code,<br>reset Second Factor]
   Set -. Admin only .-> Prac[Manage practitioners]
   Home -. Admin only .-> Rep[Cancellation Report]
```

## 7. Prior authorization and appeal

Insurer decisions are simulated. Submitting from the UI returns **approved**; a denial is recorded by a Staff Admin with "Mark denied".

```mermaid
flowchart TD
   N([needs_draft]) --> Dr[Staff generates or edits justification]
   Dr --> D[drafted]
   D --> S{Staff Admin submits}
   S --> Ok([approved])
   Ok -- Admin marks denied --> Den[denied]
   Den --> Cr[Staff creates appeal<br>guideline matched, letter drafted]
   Cr --> AD[Appeal drafted, prior auth: appealed]
   AD --> Ed[Staff edits and saves letter]
   Ed --> AS{Staff Admin submits appeal}
   AS --> AOk([Appeal and prior auth approved])
   AOk -- Admin marks denied --> ADen([Appeal and prior auth denied])
```

## Permissions

| Action                                                      | Patient | Staff | Staff Admin |
| ----------------------------------------------------------- | :-----: | :---: | :---------: |
| Book, join waitlist, upload and dispute bills               |   Yes   |  No   |     No      |
| Cancel appointments                                         |   Own   |  Yes  |     Yes     |
| View schedules, records, queues, disputes                   |   No    |  Yes  |     Yes     |
| Draft prior auths and appeals                               |   No    |  Yes  |     Yes     |
| Submit and decide prior auths and appeals                   |   No    |  No   |     Yes     |
| Verify insurance, manage staff and practitioners, reporting |   No    |  No   |     Yes     |
