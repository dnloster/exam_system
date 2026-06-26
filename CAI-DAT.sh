#!/usr/bin/env bash
# Cài đặt tự động — dùng trên macOS / Linux / Git Bash (Windows)
# Chạy: bash CAI-DAT.sh

set -euo pipefail
cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

step() { echo -e "\n${YELLOW}>> $1${NC}"; }
ok()   { echo -e "   ${GREEN}OK: $1${NC}"; }
warn() { echo -e "   ${YELLOW}! $1${NC}"; }
err()  { echo -e "   ${RED}LOI: $1${NC}"; exit 1; }

title() {
  echo -e "\n${CYAN}========================================${NC}"
  echo -e "${CYAN} $1${NC}"
  echo -e "${CYAN}========================================${NC}"
}

urlencode() {
  python3 -c "import urllib.parse; print(urllib.parse.quote('''$1''', safe=''))" 2>/dev/null \
    || node -e "console.log(encodeURIComponent(process.argv[1]))" "$1"
}

check_node() {
  step "Kiem tra Node.js (can 18 tro len)..."
  if ! command -v node >/dev/null 2>&1; then
    err "Chua co Node.js. Cai tai https://nodejs.org (phien ban 18+) roi chay lai."
  fi
  major=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$major" -lt 18 ]; then
    err "Node.js qua cu ($(node -v)). Can 18 tro len."
  fi
  ok "Node.js $(node -v)"
  ok "npm $(npm -v)"
}

read_mysql_settings() {
  step "Cau hinh ket noi MySQL"
  echo "   (Neu chua cai MySQL: cai MySQL Server 8, dat user root va mat khau)"
  echo ""

  read -rp "   May chu MySQL [localhost]: " DB_HOST
  DB_HOST=${DB_HOST:-localhost}

  read -rp "   Cong MySQL [3306]: " DB_PORT
  DB_PORT=${DB_PORT:-3306}

  read -rp "   Ten dang nhap MySQL [root]: " DB_USER
  DB_USER=${DB_USER:-root}

  read -rsp "   Mat khau MySQL (Enter neu khong co): " DB_PASS
  echo ""

  read -rp "   Ten database [exam_system]: " DB_NAME
  DB_NAME=${DB_NAME:-exam_system}
}

write_env() {
  step "Tao file .env"
  if [ -f .env ]; then
    read -rp "   File .env da ton tai. Ghi de? (y/N): " ow
    if [[ ! "$ow" =~ ^[Yy]$ ]]; then
      ok "Giu nguyen file .env hien tai"
      return
    fi
  fi

  enc_pass=$(urlencode "$DB_PASS")
  secret=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

  cat > .env <<EOF
DATABASE_URL="mysql://${DB_USER}:${enc_pass}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
NEXTAUTH_SECRET="${secret}"
NEXTAUTH_URL="http://localhost:3000"
EOF
  ok "Da tao file .env"
}

ensure_database() {
  step "Tao database (neu chua co)..."
  sql="CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

  if command -v mysql >/dev/null 2>&1; then
    if [ -n "$DB_PASS" ]; then
      mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "$sql" \
        && ok "Database '$DB_NAME' san sang" \
        || warn "Khong tu dong tao duoc database — tao thu cong"
    else
      mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "$sql" \
        && ok "Database '$DB_NAME' san sang" \
        || warn "Khong tu dong tao duoc database — tao thu cong"
    fi
  else
    warn "Khong tim thay lenh mysql."
    echo ""
    echo "   Chay SQL sau trong MySQL Workbench:"
    echo "   CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    echo ""
    read -rp "   Nhan Enter sau khi da tao database..."
  fi
}

install_deps() {
  step "Cai dat thu vien (npm install) — co the mat vai phut..."
  npm install
  ok "Da cai dat thu vien"
}

setup_db() {
  step "Tao bang va du lieu mau (Prisma)..."
  npx prisma generate
  npx prisma db push
  npx prisma db seed
  ok "Database da san sang"
}

show_success() {
  title "CAI DAT THANH CONG"
  echo ""
  echo "  Mo trinh duyet: http://localhost:3000"
  echo ""
  echo "  Tai khoan thu nghiem:"
  echo "    Quan tri:     admin / admin123"
  echo "    Chi huy KCNTT: chi-huy-kcntt / chi-huy123"
  echo "    Thanh vien:   thanhvien-kcntt-1 / thanhvien123"
  echo "    Mat khau bai thi mau: thi123"
  echo ""
}

title "CAI DAT TU DONG - HE THONG KIEM TRA TRAC NGHIEM"
check_node
read_mysql_settings
write_env
ensure_database
install_deps
setup_db
show_success

read -rp "Khoi dong ung dung ngay bay gio? (Y/n): " start
if [[ -z "$start" || "$start" =~ ^[Yy]$ ]]; then
  step "Dang chay server (npm run dev)..."
  npm run dev
else
  echo ""
  echo "  Khi can chay lai: npm run dev"
  echo ""
fi
