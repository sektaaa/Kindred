# Kindred — Values-Aligned Niche Dating

Matchmaking for communities where mainstream dating filters fail: **sober / alcohol-free**, **eco & vegan**, and **neurodivergent** people.

**Stack (per team guidelines):** Next.js (frontend) · Node.js + Express (backend API) · MongoDB (database)

---

## What makes it different

| Feature | Why it matters |
|---|---|
| **Community silos** | You only ever see people in your own community. Matching never crosses silos. |
| **"How to talk to me" card** | Reply pace, directness, text vs calls, sensory preferences — shown up front. |
| **Boundaries as first-class data** | Say your non-negotiables once; they're on your profile. |
| **Explainable matching** | Every suggestion shows a % score *and* plain-language reasons ("You both care about…"). |
| **Privacy by design** | Identity tags (e.g. ADHD, sober 1–5 yrs) are visible to *everyone / matches only / nobody* — enforced server-side. |
| **Safety** | Block (hides both ways + deletes chat), unmatch, rate-limited auth. |
| **Monetization built in** | Free = 15 likes/day; Premium = unlimited + see who liked you; sponsored community events. |

---

## Quick start

**Prerequisites:** Node.js 18+ and MongoDB (local install, Docker, or a free MongoDB Atlas cluster).

```bash
# 0. Start MongoDB (Docker option)
docker run -d -p 27017:27017 --name kindred-mongo mongo:7

# 1. Backend
cd server
cp .env.example .env        # edit MONGO_URI / JWT_SECRET if needed
npm install
npm run seed                # demo users, likes and events
npm run dev                 # http://localhost:5000/api

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:3000
```

**Demo logins** (password `Demo1234`) — or click the one-tap demo buttons on the login page:
- `demo.sober@kindred.app`
- `demo.eco@kindred.app`
- `demo.neurodiverse@kindred.app`

Seeded users have already liked each demo account, so liking the top suggestions produces an instant match.

**Run the API tests:** `cd server && npm test` (uses an in-memory MongoDB; or set `MONGO_URI_TEST`).

---

## Project structure

```
kindred/
├── client/                      # Next.js (App Router)
│   ├── app/
│   │   ├── page.js              # Landing
│   │   ├── signup/  login/      # Auth
│   │   ├── profile/             # Profile builder + live preview + upgrade
│   │   ├── discover/            # Ranked feed with "why you might click"
│   │   ├── matches/             # Match list + "liked you" (premium)
│   │   ├── matches/[id]/        # Chat (polling) + their comfort card
│   │   └── events/              # Community events
│   ├── components/              # Reusable: ProfileCard, ComfortCard, TagSelector,
│   │                            # BoundaryBadge, ChatBubble, Avatar, Navbar, Protected
│   ├── context/AuthContext.js
│   └── lib/api.js               # fetch wrapper (cookies, error handling)
│
└── server/                      # Express API
    ├── src/
    │   ├── config/              # env, db, communities (vocabulary per silo)
    │   ├── models/              # User, Like, Match, Message, Event (Mongoose)
    │   ├── middleware/          # auth (JWT), validate (zod), errorHandler
    │   ├── validators/          # zod schemas
    │   ├── controllers/         # auth, profile, discover, match
    │   ├── services/            # matchingService (aggregation), serialize (privacy)
    │   ├── routes/index.js
    │   ├── seed/seed.js
    │   ├── app.js  server.js
    └── tests/api.test.js        # end-to-end API tests
```

---

## How the guidelines are implemented

| Guideline | Implementation |
|---|---|
| Next.js frontend | App Router, reusable components, responsive CSS; `/api` proxied to Express via `next.config.mjs` rewrites (same-origin cookies) |
| Node + Express backend | Layered: routes → middleware → controllers → services → models |
| MongoDB | Mongoose models with indexes (unique `(fromUser,toUser)` on likes, `(match, createdAt)` on messages, `pairKey` on matches) |
| Authentication | bcrypt (12 rounds) + JWT in an **httpOnly** cookie (Bearer header also accepted) |
| Authorization | `requireAuth`, `requireCompleteProfile`; only match members can read/write a chat; profiles only visible within your community; blocked users hidden both ways |
| Input validation | zod on every body/param; profile options validated against the user's own community |
| Error handling | Central handler — every error returns `{ success: false, message, details? }`; CastError → 400, duplicate → 409 |
| Security | helmet, CORS allow-list, rate-limited auth, 100kb body limit, no private fields in public responses |
| Clean code / reusable | Single source of truth for community vocabulary (`config/communities.js`), shared UI components |
| Git / GitHub | See *Git workflow* below |

---

## API reference

All responses: `{ success: true, data }` or `{ success: false, message, details? }`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | – | Health check |
| GET | `/api/meta/options` | – | Community vocabularies for the profile builder |
| POST | `/api/auth/signup` | – | `{ email, password, community }` |
| POST | `/api/auth/login` | – | `{ email, password }` |
| POST | `/api/auth/logout` | – | Clears cookie |
| GET | `/api/auth/me` | ✓ | Current user |
| PUT | `/api/profile/me` | ✓ | Create/update profile (+ `visibility`) |
| POST | `/api/profile/me/upgrade` | ✓ | Demo Premium upgrade (stand-in for payment webhook) |
| GET | `/api/profile/:id` | ✓ + profile | View a profile in your community |
| POST | `/api/profile/:id/block` | ✓ + profile | Block user |
| GET | `/api/discover` | ✓ + profile | Ranked feed with `compatibility` + `reasons` |
| POST | `/api/swipes` | ✓ + profile | `{ toUser, action: 'like' \| 'pass' }` → `{ matched, matchId }` |
| GET | `/api/likes/received` | ✓ + profile | Who liked you (Premium; free sees count only) |
| GET | `/api/matches` | ✓ + profile | Matches with last message |
| DELETE | `/api/matches/:id` | ✓ + profile | Unmatch |
| GET | `/api/matches/:id/messages?after=` | ✓ + profile | Messages (polling-friendly) |
| POST | `/api/matches/:id/messages` | ✓ + profile | `{ text }` |
| GET | `/api/events` | ✓ + profile | Events for your community |

---

## Admin panel (`/admin`)

**Default admin** — created automatically when the server starts and no admin exists (and again after `npm run seed`):

| Email | Password |
|---|---|
| `admin@kindred.app` | `Admin@12345` |

Change these with `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME` in `server/.env` **before the first start**, and change the password from **Admins → My admin profile** after logging in. In local development the login page also shows an **admin** demo button; it is hidden in production builds.

> `npm run seed` wipes every user, including extra admins, then recreates the default admin.

| Page | What admins can do |
|---|---|
| **Dashboard** | Total, new and active users; profile completion; premium conversion; likes, matches, conversations and messages; daily charts for 7/30/90 days; breakdowns by community, plan, goal and city; recent admin activity |
| **Users** | Search by name, email or city; filter by community, plan, status and profile; sort; per-user likes, matches and messages |
| **User detail** | Per-user analytics (likes sent/received, matches, conversations, compatibility, completeness, blocks, 30-day swipe chart, match list); edit email, community, plan, status and every profile field; reset password; suspend or re-activate; make admin or remove admin; delete (cascades likes, matches, messages); change history |
| **Admins** | Edit own name and password; create new admins; list all admins and who added them |
| **Events** | Create, feature and delete community events |
| **Activity log** | Every admin change: who, what, when, before → after |

**Guard rails:** an admin can't suspend, demote or delete their own account, and the last admin can't be removed. Suspended users can't log in and disappear from Discover. Admin accounts don't appear in Discover or analytics user counts and can't use dating features.

**Privacy:** admins see message *counts*, never message content, and the password hash is never returned.

| Method | Endpoint (all need role `admin`) | Description |
|---|---|---|
| GET | `/api/admin/stats/overview` | Platform totals, rates and breakdowns |
| GET | `/api/admin/stats/timeseries?days=30` | Daily signups, likes, matches, messages |
| GET | `/api/admin/users?search=&community=&plan=&status=&profile=&sort=&page=&limit=` | User list with per-user counts |
| GET / PATCH / DELETE | `/api/admin/users/:id` | User detail + stats + history / edit / delete |
| POST | `/api/admin/users/:id/password` | `{ password }` |
| POST | `/api/admin/users/:id/role` | `{ role: 'user' \| 'admin' }` |
| GET / POST | `/api/admin/admins` | List admins / create `{ name, email, password }` |
| PATCH | `/api/admin/me` | `{ name?, currentPassword?, newPassword? }` |
| GET / POST / PATCH / DELETE | `/api/admin/events[/:id]` | Event management |
| GET | `/api/admin/logs?limit=50` | Audit log |

---

## Matching algorithm (`server/src/services/matchingService.js`)

One MongoDB aggregation pipeline:

1. **`$match` — hard filters:** same community, complete profile, not me, not already swiped, not blocked either way.
2. **`$addFields` — overlap:** `$setIntersection` of values, boundaries and sensory prefs; equality checks for reply pace, directness, text preference and relationship goal.
3. **`$addFields` — weighted score:** shared value ×10, shared boundary ×6, shared sensory ×5, reply pace +10, directness +8, text preference +5, same goal +12.
4. **`$sort` + `$limit`**, then normalised to 0–100% against the user's maximum possible score, with human-readable reasons.

---

## Git workflow

```bash
git init && git add . && git commit -m "feat: Kindred MVP"
git branch -M main
git remote add origin https://github.com/<you>/kindred.git
git push -u origin main
```
Day-to-day: one branch per feature (`feat/auth`, `feat/matching`, `fix/chat-scroll`), PR into `main`, review before merge.

---

## 3-minute demo script

1. **Landing** → explain the three communities (10s).
2. **Log in** with the *neurodiverse* demo button.
3. **Discover** → point at the **% score** and **"Why you might click"** list, then the **"How to talk to me"** card. *"No mainstream app can bolt this on with a filter."*
4. Click **Interested** → instant **mutual match** modal that reminds you of their reply pace.
5. **Chat** → their comfort card + boundaries sit next to the conversation; identity tags now visible because you matched (privacy by design).
6. **My profile** → show the visibility control and **Upgrade** (Premium = unlimited likes + who liked you).
7. **Events** → sponsored, community-safe meetups = third revenue stream.

## Roadmap

Photo uploads (S3/Cloudinary) · real-time chat (Socket.io) · Stripe payments · ID/selfie verification · report & moderation queue · location radius search · React Native app.
