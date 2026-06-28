# Production Deployment Guide

## ✅ Changes Made for Production

### 1. **next.config.mjs** - Updated for Production
- Removed experimental HMR cache (development only)
- Added `reactStrictMode: true` for better error detection
- Disabled source maps in production for security

### 2. **.env.production** - Created Production Environment File
- Set `NODE_ENV=production`
- All production environment variables configured

## 🚀 Deployment Instructions

### If Using Vercel (Recommended for Next.js):

1. **Build Command** (already configured in `vercel.json`):
   ```
   npm run build
   ```

2. **Environment Variables** - Add these in your Vercel dashboard:
   - Go to your project → Settings → Environment Variables
   - Add all variables from `.env.production`
   - Make sure `NODE_ENV` is set to `production`

3. **Deploy**:
   - Push your changes to GitHub
   - Vercel will automatically redeploy
   - Or manually redeploy from Vercel dashboard

### If Using Other Platforms (Netlify, Railway, Render, etc.):

1. **Build Command**: `npm run build`
2. **Start Command**: `npm run start`
3. **Node Version**: Use Node 18+ (specified in package.json)

4. **Environment Variables** - Add all from `.env.production`:
   ```
   NODE_ENV=production
   DATABASE_URL=your_database_url
   CLERK_SECRET_KEY=your_clerk_secret
   GEMINI_API_KEY=your_gemini_key
   ARCJET_KEY=your_arcjet_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   # ... and all other variables
   ```

## 🔍 Verify Production Mode

After deployment, check your application logs. You should see:
- ✅ `NODE_ENV: production`
- ✅ Next.js optimizations enabled
- ✅ No development warnings
- ✅ Faster page loads

## ⚠️ Important Notes

1. **Clerk Keys**: You're currently using TEST keys (`pk_test_...` and `sk_test_...`). For production:
   - Create production keys in Clerk dashboard
   - Replace test keys with production keys

2. **Database**: Ensure your database is production-ready with proper backups

3. **Security**: 
   - Never commit `.env` files to Git (already in `.gitignore`)
   - Use environment variables in your hosting platform
   - Enable HTTPS (automatic on Vercel/Netlify)

## 📝 Post-Deployment Checklist

- [ ] Application runs in production mode (check console logs)
- [ ] All environment variables are set correctly
- [ ] Database connections work
- [ ] Clerk authentication works
- [ ] Image uploads work (Supabase storage)
- [ ] Visual search functions properly
- [ ] No console errors in browser

## 🔧 Troubleshooting

If you see "Development mode" warnings:
1. Ensure `NODE_ENV=production` is set in hosting environment
2. Use `npm run start` not `npm run dev`
3. Clear build cache and rebuild: `rm -rf .next && npm run build`

## 📊 Performance Monitoring

In production, monitor:
- Page load times
- API response times
- Error rates
- Database query performance

Use your hosting platform's built-in analytics or tools like:
- Vercel Analytics
- Google Analytics
- Sentry for error tracking
