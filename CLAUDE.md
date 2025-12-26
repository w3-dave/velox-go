# Velox Go - SSO & Platform Services

Centralized authentication, billing, and navigation service for all Velox Labs apps.

## Deployment

**Production URL**: https://go.veloxlabs.app

Related Services:
- **velox-www**: https://www.veloxlabs.app (marketing site)
- **velox-nota**: https://nota.veloxlabs.app (notes app)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 (credentials + Google OAuth)
- **Payments**: Stripe
- **Styling**: Tailwind CSS

## Authentication Architecture

### Session Strategy
Uses **JWT strategy** (not database sessions) because NextAuth's Credentials provider doesn't work with database sessions - the PrismaAdapter only creates sessions for OAuth providers. Session records are manually created in the `jwt` callback for session management features.

### Cross-Domain SSO
Cookies are configured with `domain: .veloxlabs.app` to enable SSO across all subdomains:
- `authjs.session-token` - JWT session token
- `authjs.callback-url` - OAuth callback URL
- `authjs.csrf-token` - CSRF protection

### SSO Flow for Sub-Apps (e.g., Nota)
1. User visits nota.veloxlabs.app
2. Middleware checks for session via velox-go API
3. If no session: redirect to `go.veloxlabs.app/login?redirect=...`
4. After login: velox-go issues SSO token and redirects back
5. Sub-app validates token via `/api/sso/validate`
6. Sub-app creates local session cookie

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Auth pages (login, register)
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # Protected pages
│   │   ├── dashboard/       # App launcher
│   │   ├── account/         # User settings
│   │   ├── billing/         # Subscriptions
│   │   └── org/             # Organization settings
│   ├── api/
│   │   ├── auth/            # NextAuth routes
│   │   ├── nav/             # Navigation data API (CORS-enabled)
│   │   ├── sso/             # SSO token validation
│   │   ├── users/           # User management (sessions, profile)
│   │   ├── orgs/            # Organization management
│   │   └── billing/         # Stripe webhooks
│   └── widget/              # Embeddable nav widget
│       └── nav.js/          # JavaScript widget for sub-apps
├── components/
│   ├── ui/                  # Base components
│   ├── auth/                # Auth forms
│   └── dashboard/           # Dashboard components
├── lib/
│   ├── auth.ts              # NextAuth config with cross-domain cookies
│   ├── prisma.ts            # Prisma client
│   ├── stripe.ts            # Stripe helpers
│   ├── apps.ts              # App definitions (slugs, URLs, icons)
│   └── utils.ts             # Utilities
└── prisma/
    ├── schema.prisma        # Database schema
    └── migrations/          # Migration history
```

## Key API Endpoints

### Navigation API (`/api/nav`)
Returns app list, user info, and subscriptions. CORS-enabled for cross-origin requests from sub-apps.

**Allowed Origins:**
- https://veloxlabs.app
- https://www.veloxlabs.app
- https://go.veloxlabs.app
- https://nota.veloxlabs.app

### SSO Validation (`/api/sso/validate`)
Validates SSO tokens for sub-apps during authentication callback.

### Session Management (`/api/users/sessions`)
Lists and revokes user sessions across devices.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run db:push      # Push schema to DB (dev)
npm run db:migrate   # Run migrations (prod)
npm run db:studio    # Open Prisma Studio
```

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - https://go.veloxlabs.app
- `GOOGLE_CLIENT_ID/SECRET` - From Google Cloud Console
- `STRIPE_SECRET_KEY` - From Stripe Dashboard
- `STRIPE_WEBHOOK_SECRET` - From Stripe webhook settings

## Database Models

- **User** - Account with email/password or OAuth
- **Session** - Active sessions for session management
- **Organization** - Individual or Business, owns subscriptions
- **OrgMember** - User membership with role (OWNER/ADMIN/MEMBER)
- **Subscription** - Stripe subscription per app per org

## Important Notes

- **Credentials + JWT**: Must use JWT strategy with Credentials provider. Database sessions don't work.
- **Session Records**: Created manually in jwt callback for session management features.
- **Cookie Domain**: Set to `.veloxlabs.app` in production for cross-subdomain SSO.
- **CORS**: Nav API uses specific origin allowlist (not `*`) because credentials are included.
