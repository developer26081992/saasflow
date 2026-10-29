
# SaaSFlow

## IQA Web Development Professional
### Paper 2 — Practical Project

SaaSFlow is a multi-tenant Software-as-a-Service (SaaS)
web application built using Next.js, TypeScript, Prisma,
PostgreSQL, Clerk and Stripe.

The application allows users to create and manage
organisations, collaborate with members, manage projects,
and access subscription-based features.

## 1. Project Objectives

The objectives of SaaSFlow are to:

- Develop a modern SaaS web application.
- Implement secure user authentication.
- Support multiple independent organisations.
- Isolate organisation data.
- Implement role-based access control.
- Integrate Stripe subscription billing.
- Enforce subscription-based usage limits.
- Deploy the application to a cloud platform.

## 2. Technology Stack

| Technology | Purpose |
|---|---|
| Next.js 14 | Full-stack web framework |
| React 18 | User interface |
| TypeScript | Type-safe development |
| Tailwind CSS | Responsive styling |
| Clerk | Authentication and organisations |
| Prisma ORM 6 | Database access |
| Neon PostgreSQL | Cloud database |
| Stripe | Subscription billing |
| Vercel | Hosting and deployment |
| GitHub | Version control |

## 3. Application Features

### Authentication

- User registration and login using Clerk.
- Protected dashboard routes.
- User profile and session management.
- Organisation selection and switching.

### Multi-Tenant Architecture

SaaSFlow supports multiple organisations.

Each organisation has its own:

- Members and roles.
- Projects.
- Subscription plan.
- Stripe customer record.
- Billing information.

Organisation-specific data is filtered using
the authenticated user's organisation context.

### Role-Based Access Control

The application uses organisation membership
and permissions to restrict administrative actions.

Membership roles include:

- OWNER
- ADMIN
- MEMBER

Sensitive operations are protected by server-side
authorisation checks.

### Project Management

Users can:

- View organisation projects.
- Create projects.
- Manage projects within subscription limits.

Projects are associated with their owning organisation.

### Organisation Management

The dashboard includes:

- Overview
- Projects
- Members
- Billing
- Settings

Organisation administrators can manage organisation
information and invite members, subject to plan limits.

## 4. Subscription Plans

SaaSFlow supports three subscription tiers.

| Feature | Free | Pro | Enterprise |
|---|---|---|---|
| Monthly price | $0 | $15 | $49 |
| Maximum projects | 3 | 25 | Unlimited |
| Maximum members | 2 | 10 | Unlimited |

Subscription limits are checked on the server.

Stripe Checkout is used to create subscription
checkout sessions.

Stripe webhooks are configured to process
subscription lifecycle events.

### Billing Implementation Status

The following have been tested successfully:

- Stripe Checkout session creation.
- Reuse of an existing open Checkout session.
- Separate Stripe customers for different organisations.
- Successful HTTP delivery of a Stripe test webhook.

The following still require end-to-end verification:

- Successful subscription activation.
- Automatic organisation plan upgrades.
- Subscription cancellation and downgrade handling.
- Subscription state synchronisation with Prisma.

The public Upgrade buttons remain disabled
until billing verification is complete.

## 5. Database Architecture

The application uses PostgreSQL with Prisma ORM.

### Main Models

**Organisation**

Stores organisation details, subscription plan,
Stripe customer information and checkout state.

**User**

Stores application user information associated
with Clerk authentication.

**Membership**

Connects users to organisations and stores
their membership roles.

**Project**

Stores projects associated with an organisation.

### Data Isolation

Each project belongs to an organisation.

Server-side queries use the authorised organisation
identifier to prevent cross-organisation access.

## 6. Project Structure

```text
saasflow/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── billing/
│   │   │   ├── webhooks/
│   │   │   └── ...
│   │   └── dashboard/
│   └── lib/
├── package.json
├── README.md
└── ...
```

## 7. Local Installation

### Prerequisites

- Node.js and npm
- Git
- PostgreSQL database
- Clerk application
- Stripe test account

### Clone the Repository

```bash
git clone https://github.com/developer26081992/saasflow.git
cd saasflow
```

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root.

Configure the environment variables required by
the application's Clerk, Prisma, Stripe and
deployment integrations.

Examples include:

```text
DATABASE_URL
STRIPE_SECRET_KEY
STRIPE_PRO_PRICE_ID
STRIPE_ENTERPRISE_PRICE_ID
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
```

Clerk authentication keys and webhook configuration
must also be supplied according to the project's
Clerk integration.

Never commit real environment variable values,
API keys or webhook signing secrets to GitHub.

### Generate Prisma Client

```bash
npx prisma generate
```

### Apply Existing Database Migrations

For a newly configured database:

```bash
npx prisma migrate deploy
```

### Start Development Server

```bash
npm run dev
```

Open:

http://localhost:3000

## 8. Production Build

The application uses:

```bash
npm run build
```

The build script runs:

```bash
prisma generate && next build
```

This generates the current Prisma Client before
compiling the Next.js application.

## 9. Deployment

SaaSFlow is deployed using Vercel.

Deployment workflow:

1. Commit source code to Git.
2. Push changes to GitHub.
3. Vercel builds the connected repository.
4. Configure required environment variables.
5. Apply database migrations when required.
6. Verify the production deployment.

Live application:

https://saasflow-tau.vercel.app/

GitHub repository:

https://github.com/developer26081992/saasflow

## 10. Testing

The application has undergone development testing
for the following functionality:

- User authentication and protected routes.
- Organisation switching.
- Organisation project isolation.
- Project creation and persistence.
- Subscription project limits.
- Organisation membership display and invitations.
- Organisation settings.
- Stripe Checkout session creation.
- Checkout session reuse.
- Stripe customer separation.
- Stripe webhook HTTP delivery.
- Local production builds.
- Vercel deployment.

### Outstanding Verification

- Clerk webhook synchronisation.
- Complete Stripe subscription lifecycle.
- Final regression testing across organisations.

## 11. Security Considerations

SaaSFlow implements:

- Authentication through Clerk.
- Server-side organisation authorisation.
- Organisation-scoped database queries.
- Role and permission checks.
- Stripe webhook signature verification.
- Environment-based secret configuration.
- Subscription limits enforced by backend logic.

Additional security and billing edge-case testing
should be completed before production payment use.

## 12. Challenges and Solutions

### Prisma Client Build Error

Problem:

The deployment build reported that the
checkoutSessionId field was missing from Prisma types.

Solution:

The build script was updated to generate Prisma
Client before running the Next.js build.

### Multi-Tenant Data Isolation

Challenge:

Prevent users from accessing projects belonging
to another organisation.

Solution:

Use authenticated organisation context and
server-side organisation-scoped database queries.

### Stripe Checkout Session Duplication

Challenge:

Avoid creating unnecessary duplicate checkout
sessions.

Solution:

Implement checkout reservation locking and
reuse existing open Stripe Checkout sessions.

## 13. AI Assistance Disclosure

AI-assisted development tools, including ChatGPT,
were used to support:

- Project planning and architecture.
- Code generation and debugging.
- Database schema design.
- Integration guidance.
- Testing procedures.
- Documentation preparation.

Generated code was integrated and tested within
the development environment.

## 14. Future Improvements

Potential improvements include:

- Complete subscription lifecycle verification.
- Customer billing portal.
- Additional project management functionality.
- Improved reporting and analytics.
- Expanded automated testing.
- Stronger billing concurrency and recovery handling.

## 15. Conclusion

SaaSFlow demonstrates the development of a
multi-tenant SaaS application using modern web
technologies.

The project integrates authentication, organisation
management, project management, subscription billing
infrastructure, database persistence and cloud
deployment.

The application is deployed and functional, with
final subscription lifecycle and webhook verification
remaining before billing can be considered fully tested.
