#Requires -Version 5.1
<#
  CAI-DAT.ps1 — Cài đặt tự động Hệ thống kiểm tra trắc nghiệm

  Cách chạy (Windows):
    - Double-click file CAI-DAT.bat (khuyến nghị)
    - Hoặc: chuột phải CAI-DAT.ps1 > Run with PowerShell

  Yêu cầu trước khi chạy:
    - Đã cài MySQL 8+ (hoặc MariaDB) và biết user/mật khẩu MySQL
    - Kết nối Internet (để tải Node.js nếu chưa có, và npm install)
#>

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Write-Title([string]$Text) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Step([string]$Text) {
    Write-Host ""
    Write-Host ">> $Text" -ForegroundColor Yellow
}

function Write-Ok([string]$Text) {
    Write-Host "   OK: $Text" -ForegroundColor Green
}

function Write-Warn([string]$Text) {
    Write-Host "   ! $Text" -ForegroundColor DarkYellow
}

function Write-Err([string]$Text) {
    Write-Host "   LOI: $Text" -ForegroundColor Red
}

function Test-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Encode-MySqlPassword([string]$Password) {
  if ([string]::IsNullOrEmpty($Password)) { return "" }
  return [uri]::EscapeDataString($Password)
}

function Get-NodeMajorVersion {
    if (-not (Test-Command "node")) { return $null }
    $version = (node -v) -replace "^v", ""
  return [int]($version.Split(".")[0])
}

function Ensure-NodeJs {
    Write-Step "Kiem tra Node.js (can 18 tro len)..."

    $major = Get-NodeMajorVersion
    if ($major -ge 18) {
        Write-Ok "Node.js $(node -v)"
        return
    }

    Write-Warn "Chua co Node.js hoac phien ban qua cu."

    if (Test-Command "winget") {
        $answer = Read-Host "Ban co muon tu dong cai Node.js LTS bang winget? (Y/n)"
        if ($answer -eq "" -or $answer -match "^[Yy]") {
            Write-Host "   Dang cai Node.js LTS (co the mat vai phut)..."
            winget install -e --id OpenJS.NodeJS.LTS `
                --accept-package-agreements --accept-source-agreements
            Write-Warn "Da cai Node.js. DONG cua so nay, mo lai CAI-DAT.bat va chay lai script."
            Read-Host "Nhan Enter de thoat"
            exit 0
        }
    }

    Write-Err "Vui long cai Node.js 18+ tai https://nodejs.org roi chay lai script."
    Read-Host "Nhan Enter de thoat"
    exit 1
}

function Find-MySqlClient {
    if (Test-Command "mysql") {
        return (Get-Command "mysql").Source
    }

    $candidates = @(
        "${env:ProgramFiles}\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "${env:ProgramFiles}\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "${env:ProgramFiles}\MySQL\MySQL Server 5.7\bin\mysql.exe",
        "${env:ProgramFiles(x86)}\MySQL\MySQL Server 8.0\bin\mysql.exe"
    )

    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }

    return $null
}

function Read-MySqlSettings {
    Write-Step "Cau hinh ket noi MySQL"
    Write-Host "   (Neu chua cai MySQL: cai MySQL Server 8, dat user root va mat khau khi cai dat)"
    Write-Host ""

    $hostName = Read-Host "   May chu MySQL [localhost]"
    if ([string]::IsNullOrWhiteSpace($hostName)) { $hostName = "localhost" }

    $portInput = Read-Host "   Cong MySQL [3306]"
    $port = if ([string]::IsNullOrWhiteSpace($portInput)) { 3306 } else { [int]$portInput }

    $user = Read-Host "   Ten dang nhap MySQL [root]"
    if ([string]::IsNullOrWhiteSpace($user)) { $user = "root" }

    $secure = Read-Host "   Mat khau MySQL (de trong neu khong co)" -AsSecureString
    $password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )

    $dbName = Read-Host "   Ten database [exam_system]"
    if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "exam_system" }

    return @{
        Host     = $hostName
        Port     = $port
        User     = $user
        Password = $password
        Database = $dbName
    }
}

function Write-EnvFile([hashtable]$Db) {
    Write-Step "Tao file .env"

    if (Test-Path ".env") {
        $overwrite = Read-Host "   File .env da ton tai. Ghi de? (y/N)"
        if ($overwrite -notmatch "^[Yy]") {
            Write-Ok "Giu nguyen file .env hien tai"
            return
        }
    }

    $encodedPassword = Encode-MySqlPassword $Db.Password
    $databaseUrl = "mysql://$($Db.User):$encodedPassword@$($Db.Host):$($Db.Port)/$($Db.Database)"

    $secretBytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($secretBytes)
    $nextAuthSecret = [Convert]::ToBase64String($secretBytes)

    @"
DATABASE_URL="$databaseUrl"
NEXTAUTH_SECRET="$nextAuthSecret"
NEXTAUTH_URL="http://localhost:3000"
"@ | Set-Content -Path ".env" -Encoding UTF8

    Write-Ok "Da tao file .env"
}

function Ensure-Database([hashtable]$Db) {
    Write-Step "Tao database (neu chua co)..."

    $mysql = Find-MySqlClient
    $sql = "CREATE DATABASE IF NOT EXISTS ``$($Db.Database)`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

    if ($mysql) {
        $mysqlArgs = @(
            "-h", $Db.Host,
            "-P", $Db.Port,
            "-u", $Db.User,
            "-e", $sql
        )
        if ($Db.Password) {
            $mysqlArgs = @("-h", $Db.Host, "-P", $Db.Port, "-u", $Db.User, "-p$($Db.Password)", "-e", $sql)
        }

        $output = & $mysql @mysqlArgs 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Khong tu dong tao duoc database."
            Write-Host $output
            Show-ManualDatabaseSql $Db.Database
        } else {
            Write-Ok "Database '$($Db.Database)' san sang"
        }
        return
    }

    Write-Warn "Khong tim thay lenh mysql.exe trong PATH."
    Show-ManualDatabaseSql $Db.Database
}

function Show-ManualDatabaseSql([string]$DbName) {
    Write-Host ""
    Write-Host "   Hay mo MySQL Workbench hoac phpMyAdmin va chay lenh SQL sau:" -ForegroundColor White
    Write-Host ""
    Write-Host "   CREATE DATABASE $DbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" -ForegroundColor Green
    Write-Host ""
    Read-Host "   Sau khi tao xong database, nhan Enter de tiep tuc"
}

function Invoke-Npm([string[]]$NpmArgs) {
    & npm @NpmArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Lenh that bai: npm $($NpmArgs -join ' ')"
    }
}

function Invoke-Npx([string[]]$NpxArgs) {
    & npx @NpxArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Lenh that bai: npx $($NpxArgs -join ' ')"
    }
}

function Install-Dependencies {
    Write-Step "Cai dat thu vien (npm install) — co the mat vai phut..."
    Invoke-Npm @("install")
    Write-Ok "Da cai dat thu vien"
}

function Setup-Database {
    Write-Step "Tao bang va du lieu mau (Prisma)..."
    Invoke-Npx @("prisma", "generate")
    Invoke-Npx @("prisma", "db", "push")
    Invoke-Npx @("prisma", "db", "seed")
    Write-Ok "Database da san sang"
}

function Show-SuccessInfo {
    Write-Title "CAI DAT THANH CONG"
    Write-Host ""
    Write-Host "  Mo trinh duyet: " -NoNewline
    Write-Host "http://localhost:3000" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Tai khoan thu nghiem:" -ForegroundColor White
    Write-Host "    Quan tri:     admin / admin123"
    Write-Host "    Chi huy KCNTT: chi-huy-kcntt / chi-huy123"
    Write-Host "    Thanh vien:   thanhvien-kcntt-1 / thanhvien123"
    Write-Host "    Mat khau bai thi mau: thi123"
    Write-Host ""
    Write-Host "  De dung server: nhan Ctrl+C trong cua so nay"
    Write-Host ""
}

# --- Main ---
try {
    Write-Title "CAI DAT TU DONG - HE THONG KIEM TRA TRAC NGHIEM"

    Ensure-NodeJs

    if (-not (Test-Command "npm")) {
        throw "Khong tim thay npm. Hay cai lai Node.js va chay lai script."
    }
    Write-Ok "npm $(npm -v)"

    $dbSettings = Read-MySqlSettings
    Write-EnvFile $dbSettings
    Ensure-Database $dbSettings
    Install-Dependencies
    Setup-Database
    Show-SuccessInfo

    $start = Read-Host "Khoi dong ung dung ngay bay gio? (Y/n)"
    if ($start -eq "" -or $start -match "^[Yy]") {
        Write-Step "Dang chay server phat trien (npm run dev)..."
        Write-Host "   Truy cap: http://localhost:3000"
        Write-Host ""
        Invoke-Npm @("run", "dev")
    } else {
        Write-Host ""
        Write-Host "  Khi can chay lai, mo thu muc du an va go:" -ForegroundColor White
        Write-Host "    npm run dev" -ForegroundColor Green
        Write-Host ""
        Read-Host "Nhan Enter de thoat"
    }
}
catch {
    Write-Host ""
    Write-Err $_.Exception.Message
    Write-Host ""
    Write-Host "  Goi y xu ly loi thuong gap:" -ForegroundColor White
    Write-Host "  - Kiem tra MySQL dang chay (Services > MySQL80)"
    Write-Host "  - Kiem tra user/mat khau MySQL trong file .env"
    Write-Host "  - Dam bao da tao database exam_system"
    Write-Host "  - Thu chay lai CAI-DAT.bat"
    Write-Host ""
    Read-Host "Nhan Enter de thoat"
    exit 1
}
