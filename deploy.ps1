param(
    [string]$Service = "railway",
    [string]$Environment = "staging"
)

if ($Service -eq "railway") {
    Write-Host "Deploying to Railway ($Environment)..."
    
    if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
        Write-Host "Railway CLI not found. Install from: https://railway.app/docs/cli/quick-start"
        exit 1
    }

    Write-Host "Building Docker image..."
    docker build -t freematch-backend:latest ./backend

    Write-Host "Deploying to Railway..."
    railway up --service backend
}
elseif ($Service -eq "fly") {
    Write-Host "Deploying to Fly.io ($Environment)..."
    
    if (-not (Get-Command flyctl -ErrorAction SilentlyContinue)) {
        Write-Host "Fly CLI not found. Install from: https://fly.io/docs/getting-started/installing-flyctl/"
        exit 1
    }

    $flyApp = if ($Environment -eq "production") { "freematch-prod" } else { "REDACTED_RW_ENV" }
    
    Write-Host "Deploying to Fly app: $flyApp"
    flyctl deploy --app $flyApp
}
else {
    Write-Host "Usage: .\deploy.ps1 -Service [railway|fly] -Environment [staging|production]"
    exit 1
}

Write-Host "Deployment complete!"
