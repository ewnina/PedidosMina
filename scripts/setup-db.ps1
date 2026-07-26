# =============================================================================
# LunchSync - Database Setup Script
# =============================================================================
# Requirements: PostgreSQL running on localhost:5432
# Usage: .\setup-db.ps1
# =============================================================================

param(
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbAdmin = "postgres",
    [string]$DbName = "lunchsync",
    [string]$DbUser = "lunchsync",
    [string]$DbPassword = "admin1234"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  LunchSync - Database Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Check PostgreSQL connection ---
Write-Host "[1/4] Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    $env:PGPASSWORD = $DbPassword
    $result = & psql -h $DbHost -p $DbPort -U $DbAdmin -tAc "SELECT 1;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot connect to PostgreSQL"
    }
    Write-Host "  OK - PostgreSQL is running" -ForegroundColor Green
} catch {
    Write-Host "  FAIL - Cannot connect to PostgreSQL" -ForegroundColor Red
    Write-Host "  Make sure PostgreSQL is running on ${DbHost}:${DbPort}" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

# --- Step 2: Create database and user ---
Write-Host "[2/4] Creating database and user..." -ForegroundColor Yellow
try {
    # Create user if not exists
    $createUserSql = @"
DO `$`BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DbUser') THEN
        CREATE ROLE $DbUser WITH LOGIN PASSWORD '$DbPassword';
    END IF;
END
`$`$;
"@
    & psql -h $DbHost -p $DbPort -U $DbAdmin -c $createUserSql 2>&1 | Out-Null

    # Create database if not exists
    $checkDb = & psql -h $DbHost -p $DbPort -U $DbAdmin -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'" 2>&1
    if ($checkDb.Trim() -ne "1") {
        & psql -h $DbHost -p $DbPort -U $DbAdmin -c "CREATE DATABASE $DbName OWNER $DbUser;" 2>&1 | Out-Null
        Write-Host "  OK - Database '$DbName' created" -ForegroundColor Green
    } else {
        Write-Host "  OK - Database '$DbName' already exists" -ForegroundColor Green
    }

    # Grant privileges
    & psql -h $DbHost -p $DbPort -U $DbAdmin -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;" 2>&1 | Out-Null
    & psql -h $DbHost -p $DbPort -U $DbAdmin -d $DbName -c "GRANT ALL ON SCHEMA public TO $DbUser;" 2>&1 | Out-Null
} catch {
    Write-Host "  FAIL - Error creating database: $_" -ForegroundColor Red
    exit 1
}

# --- Step 3: Run init.sql ---
Write-Host "[3/4] Running init.sql (DDL + stored functions)..." -ForegroundColor Yellow
$initSqlPath = Join-Path $PSScriptRoot "..\lunchsync-backend\init.sql"
if (-not (Test-Path $initSqlPath)) {
    Write-Host "  FAIL - init.sql not found at: $initSqlPath" -ForegroundColor Red
    exit 1
}

try {
    $env:PGPASSWORD = $DbPassword
    & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $initSqlPath 2>&1
    Write-Host "  OK - Schema created successfully" -ForegroundColor Green
} catch {
    Write-Host "  FAIL - Error running init.sql: $_" -ForegroundColor Red
    exit 1
}

# --- Step 4: Verify tables ---
Write-Host "[4/4] Verifying tables..." -ForegroundColor Yellow
$tables = & psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -tAc "
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
" 2>&1

$tableList = $tables -split "`n" | Where-Object { $_.Trim() -ne "" }
$tableCount = $tableList.Count

Write-Host ""
Write-Host "  Tables created ($tableCount):" -ForegroundColor Cyan
foreach ($t in $tableList) {
    Write-Host "    - $($t.Trim())" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Database: $DbName @ ${DbHost}:${DbPort}" -ForegroundColor Cyan
Write-Host "  User:     $DbUser" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "    1. Copy .env.example to .env in each project" -ForegroundColor Gray
Write-Host "    2. cd lunchsync-backend; npm install; npm run start:dev" -ForegroundColor Gray
Write-Host "    3. cd lunchsync-frontend; npm install; npm run dev" -ForegroundColor Gray
Write-Host "    4. cd lunchsync-whatsapp-bot; npm install; npm run dev" -ForegroundColor Gray
Write-Host ""
