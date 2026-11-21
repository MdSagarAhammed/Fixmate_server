# FixMate Server

REST API for **FixMate**, an on-demand device and home appliance repair booking platform.

## Short Description
FixMate Server handles authentication checks, role-based access, repair services, bookings, and Stripe payments for the FixMate client app. Technicians list services, customers request repairs and track each job, and payment happens only after the job is completed.

## Live URL
- **API:** https://fixmate-server-dusky.vercel.app
- **Client:** https://https://fixmate-wheat-mu.vercel.app
- **Client repo:** https://github.com/MdSagarAhammed/Fixmate_server.git

## Purpose
This server is the single source of truth for FixMate. It:
- Verifies every private request and enforces who can do what (customer, technician, admin).
- Stores and serves the 4 core collections: `users`, `services`, `bookings`, `payments`.
- Enforces business rules on the server, so the client cannot bypass them (status pipeline, duplicate requests, payment gate).
- Creates Stripe Checkout sessions and records each payment exactly once.

## Key Features
- JWT verification with role middlewares: `verifyToken`, `verifyCustomer`, `verifyTechnician`, `verifyAdmin`
- Server-side search, category/mode filters, and sorting for services (MongoDB queries)
- Technician service CRUD with availability toggle; edits send a service back to `pending`
- Admin approval of services and role management of users
- Repair requests with duplicate-active-request prevention
- Enforced job status pipeline: requested → accepted → in-progress → completed (or rejected / cancelled)
- Stripe Checkout (test mode) with amount loaded from the database, never from the client
- Idempotent payment saving (success-page verify and webhook can both run safely)
- Admin stats, bookings, and transactions endpoints
- Seed script with demo users, 12 services, and bookings in every status

## Technology Stack
| Area | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (official `mongodb` driver) |
| Auth | JWT (`jsonwebtoken`), BetterAuth sessions on the client |
| Payments | Stripe Checkout and Webhook (test mode) |
| Config / CORS | `dotenv`, `cors` |
| Deployment | Vercel |

## Local Setup
1. Clone and install:
   ```bash
   git clone https://github.com/MdSagarAhammed/Fixmate_server.git
   cd fixmate-server
   npm install
   ```
2. Create your env file:
   ```bash
   cp .env.example .env
   ```
3. Fill in `.env`:
   ```env
   PORT=5010
   MONGODB_URI=<your mongodb connection string>
   DB_NAME=fixmate
   JWT_SECRET=<same value as the client JWT_SECRET>
   CLIENT_URL=http://localhost:3000
   CLIENT_URLS=http://localhost:3000
   STRIPE_SECRET_KEY=<sk_test_...>
   STRIPE_WEBHOOK_SECRET=<whsec_...>
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
5. Seed demo data (the client must be running, because accounts are created through BetterAuth):
   ```bash
   npm run seed
   ```
6. Optional, test the Stripe webhook locally:
   ```bash
   stripe listen --forward-to localhost:5010/api/webhook
   ```

## API Overview
Base path: `/api`

| Method | Endpoint | Access |
|---|---|---|
| GET | `/services` (query: `q`, `category`, `mode`, `sort`, `limit`) | Public |
| GET | `/services/:id` | Public (approved and available only) |
| GET | `/users/technician/:email` | Public (technician summary) |
| GET | `/services/mine` | Technician |
| POST | `/services` | Technician |
| PATCH | `/services/:id` | Technician (owner) |
| PATCH | `/services/:id/availability` | Technician (owner) |
| DELETE | `/services/:id` | Technician (owner) |
| POST | `/bookings` | Customer |
| GET | `/bookings/my` | Customer |
| PATCH | `/bookings/:id/cancel` | Customer (owner) |
| GET | `/bookings/technician` | Technician |
| PATCH | `/bookings/:id/status` | Technician (owner) |
| POST | `/payments/create-checkout-session` | Customer |
| GET | `/payments/verify?session_id=` | Customer |
| GET | `/payments/my` | Customer |
| POST | `/webhook` | Stripe (signature verified) |
| GET | `/admin/stats`, `/admin/users`, `/admin/services`, `/admin/bookings`, `/admin/payments` | Admin |
| PATCH | `/admin/users/:id/role` | Admin |
| PATCH | `/admin/services/:id/approval` | Admin |
| PATCH | `/users/profile` | Any logged-in user |

## Security and Validation
- **Authentication:** every private route requires `Authorization: Bearer <token>`. Missing or invalid token returns `401`.
- **Authorization:** a valid user with the wrong role gets `403`. The role is re-read from MongoDB on every request, so role changes apply immediately.
- **Ownership:** user email comes from the verified token, never the URL or body. A customer can only read their own bookings, and a technician can only touch their own services and jobs.
- **Status pipeline:** only allowed transitions are accepted, and only by the right actor. `completed` requires `finalAmount > 0`.
- **Payment gate:** checkout works only for a `completed` and `unpaid` booking owned by the logged-in customer. The amount is read from the database.
- **Idempotent payments:** a unique index on `stripeSessionId` plus an upsert prevents duplicate payment records.
- **Webhook:** the raw body is used and the Stripe signature is verified with the signing secret.
- **Input validation:** required fields, allowed categories and modes, positive prices, a future preferred date, and a problem description of at least 20 characters.
- **Business rules:** no duplicate active request for the same service, technicians cannot request their own service, and admins cannot change their own role.
- **Secrets:** all credentials live in `.env` (git-ignored). CORS is limited to the configured client origins.
- **Safe search:** user search text is regex-escaped before it reaches MongoDB.

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Start with auto-reload |
| `npm start` | Start in production |
| `npm run seed` | Insert demo users, services, and bookings |
