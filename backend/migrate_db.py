from sqlalchemy import create_engine, text
import sys
import os

# Fügen wir den aktuellen Pfad hinzu, damit wir app importieren können
sys.path.append(os.getcwd())

from app.config import settings

engine = create_engine(settings.DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Checking for missing columns...")
        
        # 1. users table
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id VARCHAR(255) UNIQUE"))
            print("Updated users table.")
        except Exception as e:
            print(f"Error updating users table: {e}")

        # 2. documents table
        try:
            conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS tenant_id INTEGER DEFAULT 1"))
            print("Updated documents table.")
        except Exception as e:
            print(f"Error updating documents table: {e}")

        # 3. tenants table (falls Base.metadata.create_all fehlgeschlagen ist oder nicht gereicht hat)
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS tenants (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL
                )
            """))
            print("Ensured tenants table exists.")
        except Exception as e:
            print(f"Error ensuring tenants table: {e}")

        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
