# AntiMule Dev Script - Runs both backend (FastAPI) and frontend (Vite) together
# Usage: npm run dev  (from C:\Users\sivas\Downloads\AntiMule)

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AntiMule Dev Server Starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend  -> http://localhost:8000" -ForegroundColor Green
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C to stop both servers" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend (FastAPI via uvicorn) in a new window
$backendCmd = @"
cd '$ROOT'
Write-Host '[BACKEND] Starting FastAPI on http://localhost:8000...' -ForegroundColor Green
& '.venv\Scripts\uvicorn.exe' 'neon-guard-ui-main.src.lib.ml.api_wrapper:app' --host 0.0.0.0 --port 8000 --reload --app-dir '$ROOT'
"@

$backendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    & "$root\.venv\Scripts\uvicorn.exe" "main:app" `
        --host 0.0.0.0 --port 8000 --reload
} -ArgumentList $ROOT

# Start Frontend (Vite) in this window (so Ctrl+C kills it)
Write-Host "[FRONTEND] Starting Vite on http://localhost:8080..." -ForegroundColor Yellow
try {
    Set-Location "$ROOT\neon-guard-ui-main"
    npm run dev -- --force
} finally {
    Write-Host ""
    Write-Host "Stopping backend server..." -ForegroundColor Red
    Stop-Job -Job $backendJob
    Remove-Job -Job $backendJob
    Write-Host "Both servers stopped." -ForegroundColor Red
}
