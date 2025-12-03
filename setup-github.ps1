# GitHub Repository Setup Script for BIMS
# Run this script after creating the repository on GitHub

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "BIMS - GitHub Setup Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Git is not installed!" -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Checking repository status..." -ForegroundColor Green
git status

Write-Host ""
Write-Host "Step 2: Pushing to GitHub..." -ForegroundColor Green
Write-Host "Repository: https://github.com/TheStormKingG/BIMS" -ForegroundColor Yellow
Write-Host ""

$pushResult = git push -u origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "==================================" -ForegroundColor Red
    Write-Host "PUSH FAILED!" -ForegroundColor Red
    Write-Host "==================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "You need to:" -ForegroundColor Yellow
    Write-Host "1. Create the repository on GitHub first" -ForegroundColor Yellow
    Write-Host "   Go to: https://github.com/new" -ForegroundColor Cyan
    Write-Host "   Repository name: BIMS" -ForegroundColor White
    Write-Host "   Visibility: Public" -ForegroundColor White
    Write-Host "   DON'T initialize with README" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Then run this script again" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "SUCCESS! Code pushed to GitHub!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Add your Gemini API Key as a secret:" -ForegroundColor Yellow
Write-Host "   Go to: https://github.com/TheStormKingG/BIMS/settings/secrets/actions" -ForegroundColor Cyan
Write-Host "   Click: 'New repository secret'" -ForegroundColor White
Write-Host "   Name: VITE_GEMINI_API_KEY" -ForegroundColor White
Write-Host "   Value: [Your Gemini API Key]" -ForegroundColor White
Write-Host ""

Write-Host "2. Enable GitHub Pages:" -ForegroundColor Yellow
Write-Host "   Go to: https://github.com/TheStormKingG/BIMS/settings/pages" -ForegroundColor Cyan
Write-Host "   Source: GitHub Actions" -ForegroundColor White
Write-Host ""

Write-Host "3. Watch the deployment:" -ForegroundColor Yellow
Write-Host "   Go to: https://github.com/TheStormKingG/BIMS/actions" -ForegroundColor Cyan
Write-Host "   Wait 2-3 minutes for green checkmark" -ForegroundColor White
Write-Host ""

Write-Host "4. Your live app will be at:" -ForegroundColor Yellow
Write-Host "   https://thestormkingg.github.io/BIMS/" -ForegroundColor Green -BackgroundColor Black
Write-Host ""

Write-Host "Opening GitHub in your browser..." -ForegroundColor Cyan
Start-Process "https://github.com/TheStormKingG/BIMS"

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Setup script completed!" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan


