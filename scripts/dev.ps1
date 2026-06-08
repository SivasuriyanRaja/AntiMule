# AntiMule Dev Script - Runs backend (FastAPI) + frontend (Vite) concurrently
# Usage: npm run dev  (from C:\Users\sivas\Downloads\AntiMule)

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AntiMule Dev Server Starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend  -> http://localhost:8005" -ForegroundColor Green
Write-Host "  Frontend -> http://localhost:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C to stop both servers" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend silently as a background job
Write-Host '[BACKEND] Starting FastAPI on http://localhost:8005...' -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    & "$root\.venv\Scripts\uvicorn.exe" main:app --host 0.0.0.0 --port 8005 --reload
} -ArgumentList $ROOT

# Give backend 3 seconds to start before launching frontend
Start-Sleep -Seconds 3

# Start Frontend (Vite) in this window (Ctrl+C kills it)
Write-Host "[FRONTEND] Starting Vite..." -ForegroundColor Yellow
try {
    Set-Location "$ROOT\neon-guard-ui-main"
    npm run dev -- --force
} finally {
    Write-Host ""
    Write-Host "Stopping backend server..." -ForegroundColor Red
    # Cleanup the job
    Stop-Job $backendJob -PassThru | Remove-Job -Force
    # Hard-kill any process still holding port 8005 to prevent "port in use" errors on restart
    $portPid = (Get-NetTCPConnection -LocalPort 8005 -ErrorAction SilentlyContinue).OwningProcess
    if ($portPid) {
        Stop-Process -Id $portPid -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Both servers stopped." -ForegroundColor Green
}
