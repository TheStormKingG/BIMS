# 🚀 Deployment Guide for BIMS

## Step 1: Push to GitHub

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Name it: `BIMS` (or any name you prefer)
   - Don't initialize with README (we already have one)
   - Click "Create repository"

2. **Push your code to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/BIMS.git
   git branch -M main
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 2: Deploy to Vercel (Recommended - Easiest)

### Why Vercel?
- ✅ Free tier available
- ✅ Automatic deployments on git push
- ✅ Easy environment variable management
- ✅ Excellent performance
- ✅ Built for React/Vite apps

### Steps:

1. **Sign up/Login to Vercel:**
   - Go to https://vercel.com
   - Sign up with your GitHub account

2. **Import your repository:**
   - Click "Add New" → "Project"
   - Select your BIMS repository from GitHub
   - Vercel will auto-detect Vite settings

3. **Configure environment variables:**
   - Before deploying, click "Environment Variables"
   - Add: `VITE_GEMINI_API_KEY`
   - Value: Your Gemini API key from https://aistudio.google.com/app/apikey
   - Apply to: Production, Preview, and Development

4. **Deploy:**
   - Click "Deploy"
   - Wait 1-2 minutes
   - Your app will be live at: `https://bims-xxxxx.vercel.app`

5. **Custom domain (Optional):**
   - Go to Project Settings → Domains
   - Add your custom domain

---

## Alternative: Deploy to Netlify

### Steps:

1. **Sign up/Login to Netlify:**
   - Go to https://netlify.com
   - Sign up with your GitHub account

2. **Import your repository:**
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your BIMS repository

3. **Configure build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - (These should be auto-detected from netlify.toml)

4. **Add environment variables:**
   - Go to Site settings → Environment variables
   - Add: `VITE_GEMINI_API_KEY`
   - Value: Your Gemini API key

5. **Deploy:**
   - Click "Deploy site"
   - Your app will be live at: `https://your-site-name.netlify.app`

---

## Alternative: Deploy to GitHub Pages

### Steps:

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json:**
   Add these scripts:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. **Update vite.config.ts:**
   Add base path:
   ```typescript
   export default defineConfig({
     base: '/BIMS/',
     // ... rest of config
   })
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages:**
   - Go to your repo → Settings → Pages
   - Source: Deploy from branch
   - Branch: gh-pages
   - Your app will be at: `https://YOUR_USERNAME.github.io/BIMS/`

**Note:** GitHub Pages doesn't support environment variables well. You'll need to handle the API key differently (not recommended for production).

---

## Step 3: Post-Deployment

### Test Your Deployment:
1. Visit your deployed URL
2. Test the Scanner feature with a receipt image
3. Check that all navigation works
4. Verify the dashboard loads correctly

### Monitor Your App:
- **Vercel**: Dashboard shows analytics, logs, and deployment history
- **Netlify**: Similar dashboard with analytics and logs

### Automatic Deployments:
Both Vercel and Netlify will automatically redeploy when you push to GitHub:
```bash
git add .
git commit -m "Update feature"
git push
```

---

## Troubleshooting

### Issue: "VITE_GEMINI_API_KEY is not defined"
**Solution:** Make sure you added the environment variable in your deployment platform's settings.

### Issue: "404 on page refresh"
**Solution:** The vercel.json and netlify.toml files handle this. Make sure they're committed.

### Issue: Build fails
**Solution:** 
1. Check the build logs in your deployment platform
2. Make sure all dependencies are in package.json
3. Try building locally: `npm run build`

---

## Security Notes

⚠️ **Important:**
- Never commit `.env.local` or `.env` files to Git (they're in .gitignore)
- Always use environment variables for API keys
- Rotate your API keys periodically
- Monitor your Gemini API usage at https://aistudio.google.com

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **Vite Deployment:** https://vitejs.dev/guide/static-deploy.html


