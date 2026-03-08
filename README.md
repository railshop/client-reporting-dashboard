# Railshop Client Reporting Dashboard

Multi-client monthly reporting dashboard for Railshop, a digital marketing agency. Dark-themed, data-driven interface for generating, editing, and publishing performance reports across multiple data sources.

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend**: Netlify Functions (serverless)
- **Database**: Neon PostgreSQL (serverless)
- **Auth**: Custom JWT (bcrypt + jsonwebtoken)
- **Validation**: Zod schemas for all JSONB data
- **AI**: Anthropic Claude API for summary generation
- **Data Sources**: GA4, Google Search Console, Google Ads, Meta Ads, ServiceTitan, Google Business Profile

## Project Structure

```
app/
  src/
    components/       # Reusable UI components
      admin/          # Admin editor components (KpiEditor, TableEditor, etc.)
      ui/             # shadcn/ui primitives
    hooks/            # Custom React hooks
    lib/              # Utilities (api client, utils)
    pages/            # Route pages
    shared/schemas/   # Zod schemas shared between frontend + backend
    types/            # TypeScript type definitions
  netlify/functions/  # Serverless API endpoints
    _shared/          # Shared backend utilities
      pulls/          # Per-source data pull modules
  sql/                # Database schema + migrations
  public/             # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- Neon PostgreSQL database
- Netlify CLI (`npm i -g netlify-cli`)

### Setup

1. Clone and install dependencies:
   ```bash
   cd app
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Configure `.env`:
   ```
   DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   JWT_SECRET=your-secret-key-here-min-32-chars
   ENCRYPTION_MASTER_KEY=<64 hex chars - generate with: openssl rand -hex 32>
   ANTHROPIC_API_KEY=<your Anthropic API key>
   ```

4. Run database schema:
   ```bash
   psql $DATABASE_URL -f sql/schema.sql
   ```

5. Run migrations (if upgrading from an earlier version):
   ```bash
   psql $DATABASE_URL -f sql/migrations/001-client-updated-at.sql
   ```

6. Seed initial data (optional — update password hashes first):
   ```bash
   psql $DATABASE_URL -f sql/seed.sql
   ```

7. Start development server:
   ```bash
   netlify dev
   ```

## Features

### Client Dashboard
- Monthly performance reports with KPI cards, data tables, and trend indicators
- Dynamic tabs per data source (GA4, GSC, Google Ads, Meta, LSA, ServiceTitan, GBP)
- Overview with executive summary, hero stats, and platform cards
- Railshop notes and next priorities per section

### Admin Panel
- **Client Management**: Edit client details, toggle data sources, manage encrypted API credentials
- **Report CRUD**: Create, edit, and publish monthly reports with full section editors
- **Data Pulling**: One-click automated data pull from all configured sources (GA4, GSC, Google Ads, Meta, ServiceTitan, GBP)
- **AI Summaries**: Generate professional analysis summaries using Claude API with optional context prompts
- **User Management**: Create/edit admin and client users with role-based access
- **Draft/Published Workflow**: Draft reports visible only to admins; publish when ready for clients

### Security
- AES-256-GCM encryption for all stored API credentials
- JWT authentication with role-based access control
- Client users see only published reports for their assigned client
- Zod validation at all API boundaries

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth-login` | Public | Login, returns JWT |
| GET | `/auth-me` | Any | Current user info |
| GET | `/clients-list` | Any | List clients (filtered by role) |
| GET | `/client-get` | Admin | Client details + sources |
| PUT | `/client-update` | Admin | Update client name/logo/active |
| PUT | `/client-sources-update` | Admin | Upsert source credentials |
| GET | `/report-periods` | Any | List report periods (draft-filtered for clients) |
| GET | `/report-get` | Any | Get full report (draft-filtered for clients) |
| POST | `/report-create` | Admin | Create draft report period |
| PUT | `/report-update` | Admin | Update overview/notes/priorities |
| PUT | `/report-section-upsert` | Admin | Upsert section data |
| PUT | `/report-campaign-upsert` | Admin | Bulk upsert campaign metrics |
| PUT | `/report-publish` | Admin | Publish/unpublish report |
| POST | `/report-generate` | Admin | Pull data from all active sources |
| POST | `/ai-generate-summary` | Admin | Generate AI summary from section data |
| GET | `/admin-users-list` | Admin | List all users |
| POST | `/admin-users-create` | Admin | Create user |
| PUT | `/admin-users-update` | Admin | Update user |
| DELETE | `/admin-users-delete` | Admin | Delete user |

## Build

```bash
npm run build     # Production build
npm run dev       # Vite dev server (no functions)
netlify dev       # Full dev with functions
npx tsc --noEmit  # Type check
```

## Troubleshooting

### Clear Netlify Local Cache

If you're seeing stale functions or unexpected behavior in local dev, clear the Netlify cache:

```bash
rm -rf .netlify/cache
```

To clear all local Netlify state (cache, edge functions build artifacts, etc.):

```bash
rm -rf .netlify
```
