# Deployment Guide

## Vercel Deployment

### Prerequisites
1. Ensure all environment variables are set in your Vercel dashboard
2. Database should be accessible from Vercel's deployment regions

### Required Environment Variables
- `DATABASE_URL` - Your PostgreSQL database connection string
- `DIRECT_URL` - Direct database connection (for migrations)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `GOOGLE_AI_API_KEY` - Google AI API key (for visual search)
- `ARCJET_KEY` - Arcjet security key

### Build Configuration
The project is configured to automatically generate the Prisma client during build:

1. **package.json** includes:
   - `postinstall` script that runs `prisma generate`
   - `build` script that runs `prisma generate && next build`

2. **vercel.json** specifies the build command

### Troubleshooting

#### Prisma Client Issues
If you encounter "Prisma has detected that this project was built on Vercel" errors:

1. Check that `postinstall` script is present in package.json
2. Verify that `DATABASE_URL` is correctly set
3. Ensure the database is accessible from Vercel's build environment

#### Database Connection
- Use `DATABASE_URL` for general connections
- Use `DIRECT_URL` for migrations and direct database operations
- Ensure your database allows connections from Vercel's IP ranges

### Local Development
```bash
npm install
npm run db:generate
npm run dev
```

### Production Build Test
```bash
npm run build
npm start
```