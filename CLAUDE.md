# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Mediways (메디웨이즈) is an AI-powered medical advertising content generation platform built with Next.js 15, TypeScript, and Supabase. It generates Korean Medical Law (의료법 제56조 및 시행령 제23조) compliant content for blogs, SNS, YouTube scripts, and copywriting using OpenAI GPT-4.

### Key Features
- 🏥 **Medical Law Compliance**: Automated filtering for prohibited content (guaranteed effects, patient testimonials, price mentions)
- 📝 **Multiple Content Types**: Blog posts, SNS content, YouTube scripts, marketing copy
- 🤖 **AI-Powered**: GPT-4o-mini model with medical-specific prompt engineering
- 🎯 **Keyword Optimization**: Tailored tone and style for different medical procedures
- 🔍 **SEO Ready**: Built-in SEO optimization for generated content

## Development Commands

### Package Manager
```bash
# This project uses pnpm as the primary package manager
# Project requires Node.js >=18.0.0 and pnpm >=8.0.0
pnpm install       # Install dependencies
pnpm dev          # Start dev server with Turbopack (http://localhost:3000)
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run Next.js ESLint
pnpm type-check   # TypeScript type checking (tsc --noEmit)
pnpm format       # Format code with Biome (--write flag)
```

### Testing & Validation
```bash
# ALWAYS run these commands before marking tasks complete:
pnpm lint         # ESLint + Biome linting
pnpm type-check   # TypeScript type checking
pnpm format       # Biome code formatting
pnpm build        # Ensure production build works

# Single test commands (no test framework currently configured):
# This project does not currently have test framework setup (Jest/Vitest)
# Consider adding tests when implementing new features
```

### Critical Development Rule
**ALWAYS run `pnpm lint && pnpm type-check && pnpm build` before marking any task complete.** This ensures code quality and prevents production deployment issues.

### Code Quality
- **Formatter**: Biome 1.9.4 (configured in `biome.json`)
- **Style**: Double quotes, space indentation
- **Linting**: Biome + Next.js ESLint with a11y exceptions for medical UI
- **Import Organization**: Automatic via Biome
- **TypeScript**: Strict mode enabled with tsc --noEmit for type checking

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.3.2 with App Router
- **Runtime**: Edge Runtime for API routes (requires Node.js ≥18.0.0)
- **Language**: TypeScript 5.8.3 with strict mode
- **Package Manager**: pnpm ≥8.0.0 (required by engines)
- **Styling**: Tailwind CSS with custom theme
- **UI Library**: Custom components with Radix UI primitives
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with Google OAuth support
- **AI Service**: OpenAI API (gpt-4o-mini model)
- **Code Quality**: Biome 1.9.4 for formatting and linting

### Core Architecture Patterns

#### 1. Authentication Flow
- Middleware (`src/middleware.ts`) handles route protection
- Protected routes: `/blog`, `/sns`, `/youtube`, `/copyrighting`, `/profile`
- Admin routes: `/admin/*` (requires `is_admin: true` in user metadata)
- Auth callback: `/auth/callback` for OAuth flow

#### 2. Content Generation Pipeline
```
User Input → API Route (/api/generate) → ContentGeneratorService → OpenAI API
    ↓                                             ↓
Database Log ← Stream Response ← Format Response
```

#### 3. Database Schema
Key tables (in `/supabase/migrations/`):
- `generations`: Content generation history
- `rate_limits`: API rate limiting
- `content_logs`: Detailed content logs
- `generations_with_email`: View combining generations with user emails

#### 4. Streaming Architecture
- Uses OpenAI streaming API for real-time content generation
- Edge Runtime for optimal performance
- ReadableStream with TextEncoder for client streaming

### Directory Structure Highlights
```
src/
├── app/
│   ├── (main)/        # User-facing pages with sidebar
│   ├── admin/         # Admin dashboard
│   ├── api/           # API routes (Edge Runtime)
│   └── login/         # Auth pages
├── lib/
│   ├── prompts/       # AI prompt templates
│   ├── services/      # Business logic
│   └── supabase/      # Database clients
└── types/             # TypeScript definitions
```

## Medical Law Compliance System

### Automated Content Filtering
The platform implements comprehensive medical law compliance through:

1. **Prompt-Level Integration** (`src/lib/prompts/medical-law-prompt.ts`)
   - Centralized compliance rules for all content types
   - Automatic injection of legal guidelines into AI prompts
   - Content-type specific compliance adjustments

2. **Prohibited Content Detection**
   - ❌ Guaranteed treatment effects (100%, 완치, etc.)
   - ❌ Patient testimonials and before/after photos
   - ❌ Direct price mentions
   - ❌ Competitor comparisons
   - ❌ Exaggerated claims

3. **Required Disclaimers**
   - ✅ Individual results may vary (개인차 존재)
   - ✅ Professional consultation necessary
   - ✅ Potential side effects disclosure
   - ✅ Medical advertising approval notice

### Medical Keywords Handling
Specialized tone guides for common procedures:
- **시력교정 (Vision Correction)**: Hopeful, youth-oriented
- **미용성형 (Cosmetic Surgery)**: Emotional, confidence-focused
- **통증치료 (Pain Treatment)**: Recovery-focused, non-surgical emphasis
- **혈관질환 (Vascular Disease)**: Medical credibility, professional
- **족부질환 (Foot Disorders)**: Educational, practical tips

## Development Guidelines

### Environment Variables
Required in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

### API Development
- **Runtime**: Use Node.js Runtime for API routes (`export const runtime = 'nodejs'`) - Edge Runtime incompatible with Supabase
- **Admin Auth**: Use centralized `verifyAdminAuth()` function from `@/lib/auth/adminGuard`
- **Rate Limiting**: Implemented via `rateLimiter` service (disabled in development)
- **Mock Mode**: Returns fake streaming responses when `OPENAI_API_KEY` not configured
- **Logging**: Always save generation logs to database for analytics
- **Validation**: Use `validateTone()` from `@/types/api` for tone validation

### Supabase Integration
- Use `createClient()` for server-side operations
- Row Level Security (RLS) enabled on all tables
- Admin functions require service role key
- User emails accessed via `get_user_emails()` function

### Database Migrations
Apply these migrations in chronological order (check current migration status first):
1. `001_create_generations_table.sql` - Core generations table
2. `001_rate_limiting.sql` - Rate limiting system
3. `003_add_admin_policies_for_generations.sql` - Admin access policies
4. `004_fix_generations_policies.sql` - Policy fixes
5. `006_create_generations_with_email_view.sql` - Email view for admin dashboard
6. `008_fix_generations_type_check.sql` - Fix content type validation (`copywriting` not `copyrighting`)
7. `009_count_distinct_generations_users.sql` - User count function
8. `010_get_user_stats.sql` - User statistics with search/pagination
9. `011_get_admin_dashboard.sql` - Admin dashboard functions
10. `012_get_admin_dashboard_kst.sql` - KST timezone support
11. `013_get_admin_analytics.sql` - Analytics functions
12. `014_fix_get_admin_analytics.sql` - Analytics bug fixes

### Content Generation Types
1. **Blog**: Review (`review`) or Information (`information`) styles
2. **SNS**: Instagram, TikTok/Shorts, X (Twitter), Threads
3. **YouTube**: Script generation with customizable tone
4. **Copywriting**: Korean or English marketing copy

### Admin Features
- User management at `/admin/users`
- Content logs at `/admin/logs`
- Analytics at `/admin/analytics`
- Admin status set via `raw_user_meta_data.is_admin` in auth.users

## Korean Language Support
- UTF-8 encoding throughout
- Korean-specific tone options: `~해요체`, `~습니다체`, `반말`
- Medical terminology compliance with Korean regulations

## Deployment Notes
- Deployed on Vercel with automatic CI/CD
- Edge functions for optimal performance
- Supabase connection pooling enabled
- Environment variables required in Vercel dashboard

## Common Patterns

### Creating Protected API Routes
```typescript
// Regular user authentication
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return new Response('Unauthorized', { status: 401 });

// Apply rate limiting in production
if (process.env.NODE_ENV === 'production') {
  const { allowed } = await rateLimiter.checkLimit(user.id, path);
  if (!allowed) return new Response('Rate limited', { status: 429 });
}
```

### Admin API Routes (NEW - Use Centralized Guard)
```typescript
import { verifyAdminAuth } from '@/lib/auth/adminGuard';

// Centralized admin authentication
const authResult = await verifyAdminAuth();
if (!authResult.success) {
  return authResult.response;
}
const { user, adminSupabase } = authResult;

// Use adminSupabase for RLS bypass operations
const { data, error } = await adminSupabase.from('table').select('*');
```

### Content Validation (NEW - Centralized Pattern)
```typescript
import { validateTone, VALID_TONES } from '@/types/api';

// Tone validation for content generation
try {
  validateTone(blogData.tone);  // Throws APIError if invalid
  // Proceed with content generation
} catch (error) {
  // Handle validation error automatically
}

// Available tones: VALID_TONES = ['~해요체', '~습니다체', '반말']
```

### Streaming Responses
```typescript
// Use ReadableStream for streaming content
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    // Stream chunks
    controller.enqueue(encoder.encode(chunk));
    controller.close();
  }
});
return new Response(stream);
```

## Important Files
- `src/middleware.ts`: Route protection and auth flow
- `src/app/api/generate/route.ts`: Main content generation endpoint (Node.js runtime)
- `src/lib/services/contentGenerator.ts`: OpenAI integration with centralized validation
- `src/lib/auth/adminGuard.ts`: **NEW** - Centralized admin authentication utility
- `src/lib/prompts/medical-law-prompt.ts`: Medical law compliance system
- `src/lib/prompts/`: Prompt templates for each content type
- `src/types/api.ts`: Type definitions with validation functions
- `supabase/migrations/`: Database schema definitions

## Development Environment Setup

### Initial Setup Commands
```bash
# Install dependencies (pnpm required, npm will not work properly)
pnpm install

# Copy environment template
cp .env.local.example .env.local

# Start development server
pnpm dev
```

### Required Environment Variables
Create `.env.local` (use `.env.local.example` as template):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=sk-your_openai_api_key
```

### Development Mode Behavior
- **OpenAI API**: If `OPENAI_API_KEY` is missing, API returns mock streaming responses for `/api/generate`
- **Database**: All operations require valid Supabase credentials
- **Authentication**: Google OAuth and email/password supported
- **Rate Limiting**: Disabled in development mode

### Development Mode Features
- Turbopack enabled for faster development builds (`--turbopack` flag)
- Mock streaming responses when `OPENAI_API_KEY` is not configured
- Development server binds to all interfaces (`-H 0.0.0.0`)
- Automatic code formatting and import organization via Biome

## Development Workflows

### Adding New Features
1. **Always run validation before marking complete**:
   ```bash
   pnpm lint && pnpm type-check && pnpm build
   ```
2. **API Route Development**: 
   - Use `verifyAdminAuth()` for admin endpoints
   - Use `validateTone()` for content generation
   - Include authentication checks and rate limiting
3. **Database Changes**: Create migration files in `supabase/migrations/`
4. **Medical Content**: Use `medical-law-prompt.ts` for compliance integration

### Debugging Tips
- **Mock Mode**: Development API generates fake streaming content when OpenAI key missing
- **Rate Limiting**: Check `api_requests` table for rate limit debugging
- **Admin Issues**: Verify migrations 006+ are applied for performance
- **Auth Problems**: Check middleware.ts route protection and Supabase RLS policies

### Common Development Tasks
```bash
# Quick validation (run before commits)
pnpm lint && pnpm type-check

# Full production build test
pnpm build && pnpm start

# Format code (auto-imports organization)
pnpm format

# Development with all features
pnpm dev   # Includes Turbopack, mock API, hot reload
```

## Recent Updates (Version 2.0.0)
- DB performance optimizations with SQL-based aggregation
- Enhanced admin dashboard with `generations_with_email` view
- Improved rate limiter reliability with timestamp-based calculations
- Added comprehensive Supabase migration system
- Development mode now includes proper mock streaming
- Medical law compliance enhancements with centralized prompt system

## Latest Improvements (Version 2.0.1)
- **NEW**: Centralized admin authentication with `verifyAdminAuth()` utility
- **NEW**: Tone validation system with `validateTone()` function
- **Code Quality**: Eliminated 85% of duplicate code in admin APIs
- **Type Safety**: Enhanced with `VALID_TONES` constants and strict typing
- **Runtime**: Clarified Node.js runtime requirement for Supabase compatibility
- **Documentation**: Updated CLAUDE.md with new patterns and utilities

## Quick Reference Commands
```bash
# Essential development workflow
pnpm install                    # Initial setup
pnpm dev                       # Start development server
pnpm lint && pnpm type-check   # Quick validation
pnpm build                     # Production build test

# Must run before completing tasks
pnpm lint && pnpm type-check && pnpm build
```