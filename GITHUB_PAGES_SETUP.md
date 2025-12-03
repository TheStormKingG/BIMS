# 🚀 GitHub Pages Deployment Guide

## What's Been Set Up

Your BIMS app is now configured for automatic deployment to GitHub Pages! Every time you push to the `main` branch, it will automatically build and deploy.

## Step-by-Step Setup

### Step 1: Create GitHub Repository

1. Go to: **https://github.com/new**
2. Repository name: **BIMS**
3. Description: *Business Information Management System*
4. Choose **Public** (required for free GitHub Pages)
5. **Don't** check any initialization options
6. Click **"Create repository"**

### Step 2: Add Your Gemini API Key as a Secret

1. Go to your repository: **https://github.com/TheStormKingG/BIMS**
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **"New repository secret"**
5. Name: `VITE_GEMINI_API_KEY`
6. Value: Your Gemini API key from https://aistudio.google.com/app/apikey
7. Click **"Add secret"**

### Step 3: Enable GitHub Pages

1. Still in **Settings**, scroll down to **Pages** (left sidebar)
2. Under **Source**, select: **GitHub Actions**
3. Click **Save**

### Step 4: Push Your Code

Run these commands in your terminal:

```bash
git add .
git commit -m "Configure for GitHub Pages deployment"
git branch -M main
git push -u origin main
```

### Step 5: Wait for Deployment

1. Go to the **Actions** tab in your GitHub repository
2. You'll see a workflow running called "Deploy to GitHub Pages"
3. Wait 2-3 minutes for it to complete (green checkmark)
4. Your app will be live at:
   
   **https://thestormkingg.github.io/BIMS/**

## 🎉 That's It!

Your app is now live! Every time you push changes to the main branch, it will automatically redeploy.

## Making Updates

Just commit and push:

```bash
git add .
git commit -m "Your update message"
git push
```

GitHub Actions will automatically rebuild and deploy your changes in 2-3 minutes.

## Troubleshooting

### Issue: Build fails with "VITE_GEMINI_API_KEY is not defined"
**Solution:** Make sure you added the secret in Step 2 exactly as `VITE_GEMINI_API_KEY`

### Issue: 404 error when visiting the page
**Solution:** 
1. Check that GitHub Pages is enabled in Settings → Pages
2. Make sure the workflow completed successfully in the Actions tab
3. Wait a few minutes - first deployment can take up to 10 minutes

### Issue: "Permission denied" during deployment
**Solution:** 
1. Go to Settings → Actions → General
2. Scroll to "Workflow permissions"
3. Select "Read and write permissions"
4. Click Save

### Issue: Changes not showing up
**Solution:** 
1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Check the Actions tab to ensure the workflow completed
3. Clear your browser cache

## Viewing Deployment Logs

1. Go to the **Actions** tab
2. Click on the most recent workflow run
3. Click on the "build" or "deploy" job to see detailed logs

## Local Development

To test locally before pushing:

```bash
npm install
npm run dev
```

Visit: http://localhost:3000

## Security Note

⚠️ **Important:** Never commit your `.env.local` file. The API key should only be in:
- Your local `.env.local` file (for development)
- GitHub Secrets (for production deployment)

## Need Help?

- **GitHub Pages Docs:** https://docs.github.com/en/pages
- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Vite Deployment:** https://vitejs.dev/guide/static-deploy.html

