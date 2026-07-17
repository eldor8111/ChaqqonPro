import asyncio
import asyncpg
import sqlite3
import datetime
import traceback

sqlite_db_path = r"C:\Users\E-co\Downloads\ChaqqonPro-main\Smart pos\frontend\prisma\dev.db"
pg_url = "postgresql://postgres:postgres@localhost:5432/smart_db"

tables_to_migrate = [
    "SuperAdmin",
    "PlatformUser",
    "Session",
    "Tariff",
    "Tenant",
    "Staff",
    "Product",
    "SmartTable",
    "AuditLog",
    "BalanceLog"
]

def parse_datetime(val):
    if val is None:
        return None
    dt = None
    if isinstance(val, int) or isinstance(val, float):
        if val > 1000000000000:
            val = val / 1000.0
        dt = datetime.datetime.fromtimestamp(val, tz=datetime.timezone.utc)
    elif isinstance(val, str):
        val = val.replace('Z', '+00:00')
        try:
            dt = datetime.datetime.fromisoformat(val)
        except ValueError:
            try:
                dt = datetime.datetime.strptime(val, "%Y-%m-%d %H:%M:%S").replace(tzinfo=datetime.timezone.utc)
            except ValueError:
                return val
    else:
        dt = val

    if isinstance(dt, datetime.datetime):
        # Convert to naive datetime in UTC to avoid offset-naive/aware issues in asyncpg
        return dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return dt

async def migrate_table(sqlite_conn, pg_conn, table_name):
    print(f"\nMigrating table: {table_name}")
    
    sqlite_cursor = sqlite_conn.cursor()
    try:
        sqlite_cursor.execute(f"SELECT * FROM \"{table_name}\"")
    except sqlite3.OperationalError as e:
        print(f"Table {table_name} does not exist in SQLite: {e}")
        return
        
    sqlite_rows = sqlite_cursor.fetchall()
    if not sqlite_rows:
        print(f"No rows in SQLite for {table_name}, skipping.")
        return
        
    sqlite_cols = [desc[0] for desc in sqlite_cursor.description]

    pg_cols_query = """
        SELECT column_name, data_type 
        from information_schema.columns 
        where table_name = $1
    """
    pg_col_rows = await pg_conn.fetch(pg_cols_query, table_name)
    pg_cols = {row['column_name']: row['data_type'] for row in pg_col_rows}
    
    if not pg_cols:
        print(f"Table {table_name} does not exist in PostgreSQL. Skipping.")
        return

    try:
        await pg_conn.execute(f"TRUNCATE TABLE \"{table_name}\" CASCADE")
    except Exception as e:
        print(f"Truncating {table_name} failed: {e}")

    shared_cols = [col for col in sqlite_cols if col in pg_cols]
    print(f"Shared columns for {table_name}: {shared_cols}")

    col_str = ", ".join([f'"{c}"' for c in shared_cols])
    val_placeholders = ", ".join([f"${i+1}" for i in range(len(shared_cols))])
    insert_query = f"INSERT INTO \"{table_name}\" ({col_str}) VALUES ({val_placeholders})"

    success_count = 0
    for row in sqlite_rows:
        row_dict = dict(zip(sqlite_cols, row))
        converted_row = []
        for col in shared_cols:
            val = row_dict[col]
            col_type = pg_cols[col]
            
            if "timestamp" in col_type or col in ["createdAt", "expiresAt", "arrivedAt", "registeredAt", "acceptedAt", "since"]:
                val = parse_datetime(val)
            elif col_type == "boolean":
                if val is not None:
                    val = bool(val)
            converted_row.append(val)

        try:
            await pg_conn.execute(insert_query, *converted_row)
            success_count += 1
        except Exception as e:
            print(f"Failed to insert row into {table_name}: {e}")
            print(f"Row dict: {row_dict}")
            traceback.print_exc()

    print(f"Successfully migrated {success_count}/{len(sqlite_rows)} rows for {table_name}.")

async def main():
    print("Connecting to databases...")
    sqlite_conn = sqlite3.connect(sqlite_db_path)
    
    try:
        pg_conn = await asyncpg.connect(pg_url)
    except Exception as e:
        print(f"Error connecting to PostgreSQL: {e}")
        sqlite_conn.close()
        return
        
    for table in tables_to_migrate:
        await migrate_table(sqlite_conn, pg_conn, table)
        
    print("\nMigration finished!")
    sqlite_conn.close()
    await pg_conn.close()

if __name__ == "__main__":
    asyncio.run(main())
