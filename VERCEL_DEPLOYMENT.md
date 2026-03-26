# Vercel Deployment Guide

## Step 1: Prepare Your Project (Already Done ✅)
- `.env.local` - Contains your local environment variables
- `.env.example` - Template for environment variables (created)
- `.gitignore` - Excludes sensitive files (updated)
- GitHub repo initialized (ready to push)

## Step 2: Push to GitHub

```bash
# Commit your changes
git add .
git commit -m "Prepare app for Vercel deployment"

# Push to GitHub (adjust branch name if needed)
git push origin main
```

## Step 3: Import Project to Vercel

1. Go to **https://vercel.com** and sign in (create account if needed)
2. Click **"Add New"** → **"Project"**
3. Click **"Import Git Repository"**
4. Search for and select your attendance-app repository
5. Click **"Import"**

## Step 4: Configure Environment Variables in Vercel

After importing, before deploying:

1. In the Vercel dashboard, go to your project settings
2. Click **"Environment Variables"**
3. Add each variable from your `.env.local`:

```
GOOGLE_SHEET_ID = [your sheet ID]
GOOGLE_SERVICE_ACCOUNT_EMAIL = [your service account email]
GOOGLE_PRIVATE_KEY = [your private key - keep the \n characters]
NEXTAUTH_SECRET = [generate new: https://generate-secret.vercel.app/32 or use existing]
NEXTAUTH_URL = https://your-project-name.vercel.app
ADMIN_EMAILS = academymindtree1720@gmail.com
```

**⚠️ Important:**
- Don't use localhost URLs in NEXTAUTH_URL
- Keep the exact format of GOOGLE_PRIVATE_KEY (with \n escape sequences)
- Generate a new NEXTAUTH_SECRET: https://generate-secret.vercel.app/32

## Step 5: Deploy

- Vercel will automatically deploy when you hit **"Deploy"** button
- Or push a new commit to your repository for automatic deployment

## Step 6: Verify Deployment

1. Your app will be live at: `https://your-project-name.vercel.app`
2. Test login functionality
3. Verify Google Sheets integration works

## Troubleshooting

**If deployment fails:**
- Check Build Logs in Vercel dashboard
- Verify all environment variables are set correctly
- Ensure package.json has correct scripts (dev, build, start)

**If login doesn't work:**
- Check NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL matches your Vercel domain
- Check Google credentials in environment variables

**Common Issues:**
- Missing NEXTAUTH_SECRET - app won't start
- Wrong NEXTAUTH_URL - session cookies won't work
- Malformed GOOGLE_PRIVATE_KEY - Google API calls fail

---

Your app is ready for Vercel! Follow these steps to go live.
