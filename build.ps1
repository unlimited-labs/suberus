#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- Config ---
$env:REGISTRY   = "registry.wimiip.eu"
$env:IMAGE_NAME = "suberus/app"
$env:TAG        = Get-Date -Format "yyyyMMdd"

# --- Helper ---
function Invoke-Docker {
    param([string[]]$Arguments)
    Write-Host ">> docker $($Arguments -join ' ')" -ForegroundColor Cyan
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker $($Arguments[0]) failed with exit code $LASTEXITCODE"
    }
}

# --- Main ---
try {
    Write-Host "`n=== Building & pushing (TAG=$($env:TAG)) ===" -ForegroundColor Yellow

    Invoke-Docker buildx, bake, "--push"

    Write-Host "`n=== Done ===" -ForegroundColor Green
    Write-Host "  Runtime : $($env:REGISTRY)/$($env:IMAGE_NAME):$($env:TAG)"
    Write-Host "  Migrate : $($env:REGISTRY)/$($env:IMAGE_NAME):migrate-$($env:TAG)"
    Write-Host "  Docling : $($env:REGISTRY)/suberus/docling:$($env:TAG)"
}
catch {
    Write-Error "Build pipeline failed: $_"
    exit 1
}
