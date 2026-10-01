# WorkNest

**One workspace for a service company: run the team inside, deliver projects, and give every client a live window into their work.**

Agencies and service companies usually juggle a spreadsheet for attendance, WhatsApp for leave, Jira for tasks and email threads with clients. WorkNest puts all of that in one multi-tenant app with four kinds of users, each seeing only what they should.

| Role | What they get |
|---|---|
| **Admin** | The whole company: people, clients, every project, attendance and leave, company rules |
| **Manager** | Projects they lead (board, milestones, team), their reports' attendance, leave approvals |
| **Employee** | Their tasks across projects, geo-verified check-in/out, leave balance and requests |
| **Team lead** | A manager who leads a team: its members, services, requests and task assignment |
| **Client** | A portal limited to *their* projects, plus your teams' services: requests, live progress, milestone sign-off, discussion |
| **Platform owner** | The WorkNest operator: every company on the platform, their size and activity |

## Features

**Accounts & security**
- Invites can place people precisely: role, designation, department, reporting manager and the projects they join on day one. The invite email says exactly where they will land.
- **Forgot password** by email, with single-use links that expire in 1 hour (hashed, like invites)
- Company signup creates the workspace and its first admin
- **Invite links** (Slack-style): admins invite teammates or client contacts. Tokens are random 256-bit values, and only their SHA-256 hash is stored. Links are single-use (claimed atomically in a transaction) and expire after 7 days. Admins can re-issue or revoke them.
- Password policy enforced on server and shown live in the UI
- **Brute-force protection**: 8 failed sign-ins per IP+email lock that pair for 15 minutes (HTTP 429)
- Every sign-in attempt is recorded (user, IP, device, success) for the admin security log

**Admin console**
- Overview: headcount, who is in today, delivery health, open and overdue tasks, a 14-day attendance chart, workload per person, departments, leave taken
- Members & access: pending invites, and every account with its last sign-in
- Searchable, paginated **audit log** of every action
- **Sign-in log** with a filter for failed attempts

**Platform console** (owner only, checked against the DB on every request): all tenants with owner, users, projects, clients, last activity, plus signups per day

**Internal (HR)**
- Company signup that creates an isolated workspace (multi-tenant, every row scoped by `companyId`)
- Employees with roles, designation, department and reporting manager
- **Attendance**: check-in/out with an optional office **geofence** (haversine distance vs. a configurable radius). Late marks are automatic, based on the company's start time and timezone. Admins and managers get a live "who's in today" board.
- **Leave**: casual, sick, earned and unpaid types with yearly allowances. Working-day counting skips weekends. Overlap and balance checks count pending requests too. Managers approve their direct reports; nobody can approve their own leave.

**Teams & services**
- Admins create teams (e.g. Web, Design, Mobile) and pick a **team lead**
- Leads manage their members, publish a **service catalogue** (description, deliverables, turnaround, starting price) and **assign tasks** to members
- Team members automatically join every project the team owns
- Clients browse visible teams in their portal and **request a service**; the lead is notified by email and in-app, can accept or decline, and turns the request into a **project in one click**

**Delivery (Projects)**
- Projects → milestones → tasks, with a drag-and-drop **Kanban board**
- **Progress is computed from tasks** in a single grouped query, never typed in by hand
- Permission-aware editing: the project manager edits anything; team members can only move tasks assigned to them
- Activity log for every change

**Client portal**
- Clients sign in and see **only** projects linked to their company. This is enforced in one shared query scope used by both REST and WebSocket joins.
- Live progress, milestone timeline, client-safe task view (no internal notes or estimates)
- **Milestone approval flow**: the team sends a milestone for approval, and the client approves it or requests changes with a note
- Shared discussion thread between the team and the client

**Realtime**
- Socket.io with cookie-authenticated connections and per-project rooms. Clients join a separate room that only receives client-visible events.
- Boards, progress bars, activity feeds, attendance and leave queues update without refresh
- Personal notifications (task assigned, leave reviewed)

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Motion (animations, CSS 3D), Socket.io client |
| Email | Nodemailer over SMTP, with an in-app outbox fallback |
| Backend | Node.js, Express 5, TypeScript, Zod validation, Socket.io |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT in an httpOnly cookie, bcrypt password hashing, role-based middleware |
| Dev DB | Embedded PostgreSQL (no Docker needed locally) |

## Architecture

```
Browser (Next.js) ──/api/*──► Next rewrite ──► Express API ──► Prisma ──► PostgreSQL
      │                                            │
      └──────── Socket.io (cookie auth) ◄──────────┘  rooms: company:*, project:*, project-client:*, user:*
```

- The API is proxied through the web origin, so the auth cookie is first-party and `httpOnly` (not readable by JS).
- `server/src/lib/access.ts` holds the single source of truth for "which projects can this user see". REST routes and socket room joins both use it.
- `server/src/lib/activity.ts` writes an activity row and broadcasts it. The `clientVisible` flag decides whether the client portal receives it.

## Getting started

Requires **Node.js 20+**. No Docker or local Postgres install needed.

```bash
npm run setup   # installs everything, creates server/.env, creates the DB and loads demo data
npm run dev     # starts Postgres, the API (:4000) and the web app (:3000)
```

Open http://localhost:3000. `npm run setup` creates **your** workspace from `server/.env` (see below) and prints a link to set your password. There is no demo data: you add your own clients, teams and people.

Want sample data to click around? `npm run db:demo --prefix server` loads a demo company (it wipes the database first). `npm run db:setup --prefix server -- --fresh` wipes it again and recreates only your owner account.

### Your own owner account

Set `ADMIN_EMAIL`, `ADMIN_NAME` and `COMPANY_NAME` in `server/.env`, then run `npm run db:setup --prefix server`. That person becomes the founder/admin of the workspace **and** the platform owner. The seed prints a one-time link to choose a password (you can also use **Forgot password** on the sign-in page).

### Sending real emails

Invites and password resets are emailed through SMTP. Without SMTP settings nothing is lost: every email is saved to **Admin console → Emails**, where you can open it and copy the link.

For Gmail, turn on 2-Step Verification, create an App Password (Google Account → Security → App passwords), then set in `server/.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=you@gmail.com
SMTP_PASS=your-16-character-app-password
MAIL_FROM="WorkNest <you@gmail.com>"
```

Restart the API after changing `.env`.


## Project structure

```
server/
  prisma/schema.prisma        data model (Company, User, Client, Project, Milestone, Task, Attendance, Leave, Activity, Comment)
  prisma/seed.ts              realistic demo company
  src/lib/access.ts           project visibility rules per role
  src/lib/socket.ts           Socket.io auth + rooms
  src/lib/rate-limit.ts       sign-in brute-force protection
  src/modules/*.routes.ts     auth, invites, users, clients, company, projects, tasks, attendance, leaves, dashboard, admin, platform
web/
  src/app/page.tsx            animated landing page
  src/app/join/[token]/       accept an invite and create an account
  src/app/(app)/              authenticated pages (dashboard, projects, my-tasks, attendance, leaves, people, clients, admin, platform, settings)
  src/components/admin/       admin console: overview charts, members, audit and sign-in logs
  src/components/charts.tsx   accessible column and bar charts
  src/components/project/     Kanban board, milestones, discussion, team, task editor
  src/lib/                    API client, socket, hooks, types
```

## Roadmap

- [ ] **AI assistant (basic)**: ask "who is on leave this week?" or "summarise FreshCart progress", plus an auto-written weekly client report
- [ ] **AWS**: S3 for file attachments on tasks and milestones, SES for email notifications, deploy to ECS/EC2 with RDS
- [ ] Selfie check-in verified with AWS Rekognition
- [ ] Timesheets → client invoices and monthly salary slips (PDF)
- [ ] CI with GitHub Actions and API tests

## Deploying

The app is two services plus a database:

| Part | Host | Notes |
|---|---|---|
| Web (`web/`) | **Vercel** | Root directory `web`. Env: `API_URL` and `NEXT_PUBLIC_SOCKET_URL`, both set to the API's URL |
| API (`server/`) | **Render** (or Railway/Fly) | `render.yaml` is included. Needs a long-running Node process for Socket.io, so it can't run on Vercel |
| Database | **Neon** (or any Postgres) | Put its connection string in the API's `DATABASE_URL` |

On the API set `CLIENT_ORIGIN` to the Vercel URL. After the first deploy, run `npm run db:setup` in the API's shell to create your owner account and get the set-password link.
