# ⚡ Quick Start - Deploy BIMS to GitHub Pages

## 🎯 What You Need To Do (5 Minutes)

### Step 1: Create GitHub Repository (1 minute)

**Option A: Use the Web Interface**
1. Open: https://github.com/new
2. Sign in to GitHub if needed
3. Fill in:
   - **Repository name:** `BIMS`
   - **Description:** `Business Information Management System`
   - **Visibility:** ✅ **Public** (required for free GitHub Pages)
   - ❌ **DON'T** check "Initialize with README"
   - ❌ **DON'T** add .gitignore
   - ❌ **DON'T** choose a license (we have these already)
4. Click **"Create repository"**

**Option B: Use GitHub CLI (if installed)**
```bash
gh repo create BIMS --public --source=. --remote=origin --push
```

---

### Step 2: Push Your Code (1 minute)

**If you used Option A above**, run:
```powershell
git push -u origin main
```

**Or run the automated script:**
```powershell
.\setup-github.ps1
```

---

### Step 3: Add API Key Secret (1 minute)

1. Go to: https://github.com/TheStormKingG/BIMS/settings/secrets/actions
2. Click **"New repository secret"**
3. Enter:
   - **Name:** `VITE_GEMINI_API_KEY`
   - **Secret:** Your API key from https://aistudio.google.com/app/apikey
4. Click **"Add secret"**

---

### Step 4: Enable GitHub Pages (1 minute)

1. Go to: https://github.com/TheStormKingG/BIMS/settings/pages
2. Under **"Build and deployment"**:
   - **Source:** Select **"GitHub Actions"** from dropdown
3. The page will auto-save

---

### Step 5: Watch It Deploy (2 minutes)

1. Go to: https://github.com/TheStormKingG/BIMS/actions
2. You'll see **"Deploy to GitHub Pages"** workflow running
3. Click on it to watch the progress
4. Wait for the green ✅ checkmark (takes ~2 minutes)

---

## 🎉 Your App is Live!

**Visit:** https://thestormkingg.github.io/BIMS/

---

## 🔧 Troubleshooting

### "Repository not found" when pushing

**Cause:** The GitHub repository hasn't been created yet.

**Fix:** Complete Step 1 first, then try pushing again.

---

### "Permission denied" error

**Cause:** Git needs your GitHub credentials.

**Fix:** 
```powershell
# Configure Git (first time only)
git config --global user.name "TheStormKingG"
git config --global user.email "your-email@example.com"

# Then push again
git push -u origin main
```

If prompted for credentials, use:
- Username: `TheStormKingG`
- Password: [Create a Personal Access Token](https://github.com/settings/tokens/new)
  - Select scopes: `repo`, `workflow`
  - Copy the token and use it as your password

---

### Build fails with "VITE_GEMINI_API_KEY is not defined"

**Cause:** The API key secret wasn't added.

**Fix:** Complete Step 3 again, making sure the name is exactly `VITE_GEMINI_API_KEY`

---

### Workflow doesn't start automatically

**Cause:** GitHub Actions might not be enabled.

**Fix:**
1. Go to: https://github.com/TheStormKingG/BIMS/settings/actions
2. Under **"Actions permissions"**, select:
   - ✅ **"Allow all actions and reusable workflows"**
3. Under **"Workflow permissions"**, select:
   - ✅ **"Read and write permissions"**
4. Click **"Save"**

Then manually trigger the workflow:
1. Go to: https://github.com/TheStormKingG/BIMS/actions
2. Click **"Deploy to GitHub Pages"**
3. Click **"Run workflow"** → **"Run workflow"**

---

### 404 Page Not Found

**Cause:** Deployment hasn't completed or Pages isn't configured.

**Fix:**
1. Check Actions tab - ensure workflow completed successfully (green ✅)
2. Verify GitHub Pages is enabled in Settings → Pages
3. Wait up to 10 minutes for first deployment
4. Hard refresh browser: `Ctrl + Shift + R`

---

## 📝 Making Updates

After initial deployment, just commit and push:

```powershell
git add .
git commit -m "Your update message"
git push
```

The app will automatically redeploy in 2-3 minutes!

---

## 📚 Full Documentation

- [GITHUB_PAGES_SETUP.md](./GITHUB_PAGES_SETUP.md) - Detailed setup guide
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Alternative deployment options
- [README.md](./README.md) - Project documentation

---

## 🆘 Still Need Help?

Open an issue at: https://github.com/TheStormKingG/BIMS/issues


