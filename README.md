# Grainsaathi — Backend (TypeScript)

Grainsaathi is the backend service that powers a grain marketplace connecting farmers (kisaan), traders/buyers (vyapari), and organisations. This service handles authentication (OTP + JWT), user profiles, crop/product listings, contracts, notifications, and real-time events.

## Highlights (what it does, simply)
- Phone-based OTP authentication and JWT-based authorization.
- Separate flows for farmers, traders and organisations.
- Add/list/update/remove crop listings (trader features).
- Manage contracts and scheduled checks for expiry.
- Background job processing for notifications and heavy tasks (BullMQ + Redis).
- Real-time push using Server-Sent Events (SSE) for live updates.

## Tech stack
- Language: TypeScript (Node.js)
- HTTP framework: Express (v5)
- ORM: Prisma (@prisma/client)
- Database: Postgres (Neon/Serverless adapters present)
- Background jobs: BullMQ + Redis
- SMS/OTP: Twilio
- Validation: Zod
- Dev tools: tsx, nodemon, TypeScript

## Quick start (development)
1. Clone repository and move to server folder:
   git clone https://github.com/SudhanshuKumar7070/Grainsaathi-Backend.git
   cd Grainsaathi-Backend/Server

2. Install dependencies:
   npm install

3. Environment
   Create a `.env` file in Server/ with required variables. At minimum:
   - PORT=8000
   - DATABASE_URL=<postgres connection string>
   - JWT_SECRET=<jwt secret>
   - REDIS_URL=<redis connection string>          # for queues
   - TWILIO_ACCOUNT_SID=...
   - TWILIO_AUTH_TOKEN=...
   - TWILIO_PHONE_NUMBER=...
   Check Server/Config and other modules for any additional required variables.

4. Start in development
   npm run dev
   Visit http://localhost:8000/test to verify the service is running.

5. Build & run (production)
   npm run build
   npm start

6. Prisma
   - Generate client: npx prisma generate
   - Apply migrations (if any): npx prisma migrate deploy
   - Alternatively, push schema: npx prisma db push

## Project structure (important folders)
- Server/app.ts — Express app setup, middleware and routes
- Server/index.ts — server bootstrap and worker/cron loader
- Server/Route — route definitions (auth.routes.ts, trader.route.ts, farmers.route.ts, organisation.route.ts, superadmin.route.ts, contract.route.ts)
- Server/Controller — controller functions for routes
- Server/Service — business logic
- Server/Repositories — DB access layer
- Server/prisma — Prisma schema and migrations
- Server/Architecture/worker — background worker; Architecture/cron — scheduled tasks
- Server/SSE — server-sent events utilities
- Server/Validators — Zod validation schemas
- Server/Middleware — auth, rate limiting, error handling

## Important endpoints (overview)
- Auth:
  - POST /api/v1/auth/send_login_otp
  - POST /api/v1/auth/verify_login_otp
  - POST /api/v1/auth/send_register_otp
  - POST /api/v1/auth/verify_register_otp
  - POST /api/v1/auth/register_kisaan, /login_kisaan
  - POST /api/v1/auth/register_vyapari, /login_vyapari
  - POST /api/v1/auth/register_company, /login_company
  - POST /api/v1/auth/admin/login, /superadmin/login
  - POST /api/v1/auth/refresh_token, /logout
- Trader:
  - POST /api/v1/trader/add_crop
  - POST /api/v1/trader/remove_crop/:cropId
  - GET /api/v1/trader/get_listed_crop
  - POST /api/v1/trader/update_crop_price
- Contracts, farmers, organisations and superadmin routes exist under their respective /api/v1/* paths.
- SSE:
  - /sse_event — subscribe for real-time updates

## Features explained (for non-developers)
- OTP login/register: The system sends a one-time password (OTP) to a user's phone; after entering the OTP the user is logged in securely.
- Roles: Farmers list crops they grow; traders buy or list crops for sale; organisations can manage groups or companies.
- Contracts: Agreements between parties are stored and automatically checked for expiry. The server can notify users when contracts approach expiry.
- Notifications: Time-consuming notifications and retryable tasks are handled in the background, so the API responses stay fast.
- Live updates: Users using the web or mobile app can receive immediate updates (e.g., new messages or contract status) via SSE.

## Development notes & tips
- Validation: All incoming request bodies are validated with Zod schemas in Server/Validators. Follow those shapes when calling APIs.
- Rate limiting: OTP endpoints are rate limited to avoid abuse — don’t call OTP endpoints repeatedly in short bursts during development.
- Worker & Cron: index.ts imports Architecture/worker and Architecture/cron — ensure Redis is available if you run the worker and queues.
- Logging & errors: The app has a global error handler that returns structured JSON { statusCode, message, success, data }.

## Contributing
- Fork, make a feature branch, and open a pull request with a clear description.
- Add tests for new features when possible.
- Keep PRs small and focused.

## Troubleshooting & FAQs
- "Prisma client not found" — run `npx prisma generate`.
- "Queue errors" — confirm REDIS_URL is set and Redis is reachable.
- "Twilio errors" — verify Twilio credentials and that they are set in env.

## License & contact
- License: Add a LICENSE file with your chosen license (e.g., MIT).
- Maintainer: Sudhanshu Kumar — https://github.com/SudhanshuKumar7070

---
If you want, I can:
- Generate a .env.example with the environment variables pulled from the code.
- Add concrete curl examples for common flows (OTP -> verify -> get token -> call protected endpoint).
- Create a short CONTRIBUTING.md and a checklist for running worker + Redis + DB locally.
