# Velox Go - SSO & Platform Services

Centralized authentication, billing, and navigation service for all Velox Labs apps.

## Deployment

**Production URL**: https://go.veloxlabs.app

Related Services:
- **velox-www**: https://www.veloxlabs.com

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 (credentials + Google OAuth)
- **Payments**: Stripe
- **Styling**: Tailwind CSS

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
│   │   ├── billing/         # Stripe webhooks
│   │   └── oauth/           # Mobile OAuth endpoints
│   └── widget/              # Embeddable nav widget
├── components/
│   ├── ui/                  # Base components
│   ├── auth/                # Auth forms
│   └── dashboard/           # Dashboard components
├── lib/
│   ├── auth.ts              # NextAuth config
│   ├── prisma.ts            # Prisma client
│   ├── stripe.ts            # Stripe helpers
│   ├── apps.ts              # App definitions
│   └── utils.ts             # Utilities
└── prisma/
    ├── schema.prisma        # Database schema
    └── migrations/          # Migration history
```

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run db:push      # Push schema to DB (dev)
npm run db:migrate   # Run migrations (prod)
npm run db:studio    # Open Prisma Studio
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID/SECRET` - From Google Cloud Console
- `STRIPE_*` - From Stripe Dashboard

## Database Migrations

```bash
# Create migration
npx prisma migrate dev --name describe_change

# Deploy to production
npx prisma migrate deploy
```

## Key Models

- **User** - Account with email/password or OAuth
- **Organization** - Individual or Business, owns subscriptions
- **OrgMember** - User membership with role (owner/admin/member)
- **Subscription** - Stripe subscription per app per org
