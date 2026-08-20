$ErrorActionPreference = 'Stop'

Write-Host '=== DFNS Publish ===' -ForegroundColor Cyan

npm run prepare:web
npx cap sync android

$status = git status --porcelain
if (-not $status) {
    Write-Host 'No changes to commit.' -ForegroundColor Yellow
    exit 0
}

Write-Host ''
git status --short
Write-Host ''
$message = Read-Host 'Commit message'
if ([string]::IsNullOrWhiteSpace($message)) {
    throw 'A commit message is required.'
}

# Stage project files explicitly; generated Android build output and local IDE files stay ignored.
$paths = @(
    '*.html', 'css', 'js', 'favicon.svg', 'package.json', 'package-lock.json',
    'capacitor.config.*', 'android', '.github', 'scripts'
)

git add -- $paths

git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    throw 'Nothing from the configured project paths is staged. Check your changes.'
}

git commit -m $message
git push

Write-Host ''
Write-Host 'Published to GitHub. GitHub Actions will build the APK automatically.' -ForegroundColor Green
