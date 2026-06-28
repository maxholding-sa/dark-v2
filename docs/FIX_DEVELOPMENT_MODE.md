# 🔧 Fix "Development Mode" Warning in Clerk

## The Problem
You're seeing "Development mode" banners on your sign-in and sign-up pages because you're using Clerk **test keys** in production.

Current keys (Development):
- `pk_test_...` ❌ 
- `sk_test_...` ❌

You need:
- `pk_live_...` ✅
- `sk_live_...` ✅

---

## ✅ Solution (5 minutes)

### Step 1: Get Production Keys from Clerk

1. **Visit Clerk Dashboard**: https://dashboard.clerk.com
2. **Sign in** to your Clerk account
3. **Select your application** (or create a new production instance)
4. **Click "API Keys"** in the left sidebar
5. **Switch to "Production" tab** (NOT Development)
6. **Copy these two keys**:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`)

### Step 2: Update Environment Variables in Your Hosting Platform

#### If using **Vercel**:
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings → Environment Variables**
4. **Update these variables**:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
   CLERK_SECRET_KEY=sk_live_YOUR_KEY_HERE
   ```
5. Click **Save**
6. **Redeploy** your application (Settings → Deployments → Click ••• → Redeploy)

#### If using **Netlify**:
1. Go to: https://app.netlify.com
2. Select your site
3. Go to **Site settings → Environment variables**
4. **Edit these variables**:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
   CLERK_SECRET_KEY=sk_live_YOUR_KEY_HERE
   ```
5. Click **Save**
6. **Trigger new deployment** (Deploys → Trigger deploy → Deploy site)

#### If using **Railway** / **Render** / Other:
1. Go to your project settings
2. Find **Environment Variables** section
3. Update the Clerk keys
4. Redeploy

### Step 3: Configure Production Domain in Clerk

**Important!** After getting production keys, configure your domain:

1. In Clerk Dashboard → **Domains**
2. Add your **production domain** (e.g., `yourdomain.com`)
3. Enable **Production mode**

---

## 🔍 Verify It's Fixed

After redeploying, visit your sign-in page:
- ✅ NO "Development mode" banner
- ✅ Clean, professional sign-in/sign-up pages
- ✅ Production-ready authentication

---

## ⚠️ Important Notes

### Don't Commit Production Keys!
- Never commit `.env` or `.env.production` with real keys to Git
- Always use environment variables in your hosting platform
- Keys are already in `.gitignore` ✅

### Development vs Production Keys
- **Development keys** (`pk_test_...`): Only for local development
- **Production keys** (`pk_live_...`): For deployed production site

### What Stays the Same
These URLs don't need to change:
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

---

## 📋 Quick Checklist

- [ ] Got production keys from Clerk Dashboard
- [ ] Updated `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` with `pk_live_...`
- [ ] Updated `CLERK_SECRET_KEY` with `sk_live_...`
- [ ] Added production domain in Clerk Dashboard
- [ ] Redeployed application
- [ ] Tested sign-in/sign-up pages
- [ ] No "Development mode" banner visible ✅

---

## 🆘 Troubleshooting

**Still seeing "Development mode"?**
1. Clear browser cache and cookies
2. Check environment variables are saved correctly
3. Ensure you redeployed after changing variables
4. Verify you're using `pk_live_...` not `pk_test_...`

**Authentication not working?**
1. Make sure production domain is added in Clerk Dashboard
2. Check all redirect URLs are correct
3. Verify secret key matches publishable key (same Clerk instance)

**Need Help?**
- Clerk Documentation: https://clerk.com/docs
- Clerk Support: https://clerk.com/support
