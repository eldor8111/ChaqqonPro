# ===================================================
# POSTGRES MUAMMO DIAGNOSTIKA KOMANDALAR (Serverda ishlating)
# ===================================================

# 1. PostgreSQL xizmat ishlayaptimi?
sudo systemctl status postgresql

# 2. Postgres versiyasi va holati
psql --version
pg_lsclusters  # Qaysi portda ishlayapti

# 3. smart_db mavjudmi?
sudo -u postgres psql -c "\l"

# 4. Foydalanuvchi postgres parolini tekshirish
sudo -u postgres psql -c "\du"

# 5. .env.production faylini tekshirish
cat /root/eldor/chaqqonpro/frontend/.env.production

# 6. Joriy DATABASE_URL ni ko'rish
cat /root/eldor/chaqqonpro/frontend/.env | grep DATABASE_URL

# 7. PM2 logs (so'nggi xatolar)
pm2 logs smart-pos-frontend --lines 30 --nostream

# 8. To'g'ridan-to'g'ri Postgres ulanishini sinash
sudo -u postgres psql -d smart_db -c "SELECT count(*) FROM \"Tenant\""
