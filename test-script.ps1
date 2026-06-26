#!/usr/bin/env powershell

Write-Host "========== SESSION 8: LOCAL TESTING ==========" -ForegroundColor Green
Write-Host ""

# TEST 1: Health
Write-Host "TEST 1: Health Endpoint" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3000/health' -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "✅ Content: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 2: Register User
Write-Host "TEST 2: Register User" -ForegroundColor Cyan
try {
    $registerData = @{
        name = "Test User"
        email = "test@example.com"
        password = "Test123!"
        born_date = "2000-01-01"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/register' `
        -Method POST `
        -ContentType 'application/json' `
        -Body $registerData `
        -UseBasicParsing `
        -TimeoutSec 5
    
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "✅ User ID: $($json.userId)" -ForegroundColor Green
    Write-Host "✅ Email: $($json.email)" -ForegroundColor Green
    Write-Host "✅ Token: $($json.token.Substring(0, 20))..." -ForegroundColor Green
    $global:token = $json.token
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 3: Login with correct credentials
Write-Host "TEST 3: Login with Correct Credentials" -ForegroundColor Cyan
try {
    $loginData = @{
        email = "test@example.com"
        password = "Test123!"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' `
        -Method POST `
        -ContentType 'application/json' `
        -Body $loginData `
        -UseBasicParsing `
        -TimeoutSec 5
    
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "✅ Login successful, token: $($json.token.Substring(0, 20))..." -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 4: Login with incorrect password
Write-Host "TEST 4: Login with Wrong Password" -ForegroundColor Cyan
try {
    $loginData = @{
        email = "test@example.com"
        password = "WRONG"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' `
        -Method POST `
        -ContentType 'application/json' `
        -Body $loginData `
        -UseBasicParsing `
        -TimeoutSec 5
    
    Write-Host "❌ Should have failed! Status: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Correctly rejected (401)" -ForegroundColor Green
        $json = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "✅ Error message: $($json.error)" -ForegroundColor Green
    } else {
        Write-Host "❌ Wrong error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# TEST 5: Database Check
Write-Host "TEST 5: PostgreSQL Database" -ForegroundColor Cyan
try {
    $dbResult = docker exec freematch-db psql -U postgres -d freematch -c "SELECT COUNT(*) as user_count FROM users WHERE is_mock = false;" -t
    Write-Host "✅ Database query successful" -ForegroundColor Green
    Write-Host "✅ Non-mock users count: $($dbResult)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 6: Redis Check
Write-Host "TEST 6: Redis" -ForegroundColor Cyan
try {
    $redisResult = docker exec freematch-redis redis-cli PING
    if ($redisResult -eq "PONG") {
        Write-Host "✅ Redis PING successful: PONG" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis returned: $redisResult" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 7: Socket.io Status
Write-Host "TEST 7: Socket.io Status" -ForegroundColor Cyan
try {
    $logs = docker logs freematch-backend 2>&1
    if ($logs -match "Redis adapter connected") {
        Write-Host "✅ Redis adapter connected" -ForegroundColor Green
    }
    if ($logs -match "FreeMatch backend running on port 3000") {
        Write-Host "✅ Backend running on port 3000" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "========== TESTING COMPLETE ==========" -ForegroundColor Green
