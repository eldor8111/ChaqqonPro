#!/bin/bash
# ChaqqonPro DB Zaxiralash skripti (Backup)

# Bu skriptni crontab orqali har kuni kurgizish mumkin (Masalan 02:00 tunda)
# 0 2 * * * /path/to/chaqqonpro/scripts/backup.sh

BACKUP_DIR="/var/backups/chaqqonpro"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
mkdir -p "$BACKUP_DIR"

if [ -f "./dev.db" ]; then
    echo "💾 SQLite ma'lumotlar bazasini zaxiralash..."
    cp ./dev.db "$BACKUP_DIR/db_backup_$DATE.db"
    
    # Eskilarni o'chirish (Faqat so'nggi 7 kungi saqlanadi)
    find "$BACKUP_DIR" -type f -name "*.db" -mtime +7 -exec rm {} \;
    echo "✅ Zaxira saqlandi: $BACKUP_DIR/db_backup_$DATE.db"
else
    # PostgreSQL bo'lsa
    echo "🐘 PostgreSQL zaxirasini olish..."
    # pg_dump -U postgres -d chaqqonpro > "$BACKUP_DIR/db_backup_$DATE.sql"
    echo "⚠️ PostgreSQL sozlangan bo'lsa, commentni ochaverasiz."
fi
