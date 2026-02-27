import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Establishes a connection to the MySQL Database"""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )

def fetch_low_stock_report():
    """
    Queries the DB for items where stock is below threshold.
    Returns a list of dicts for the AI and frontend to process.
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = "SELECT part_name, stock_level, threshold, vendor_url FROM inventory WHERE stock_level < threshold"
        cursor.execute(query)
        results = cursor.fetchall()

        cursor.close()
        return results  # Always returns a list (empty or populated)

    except Exception as e:
        raise RuntimeError(f"Error accessing database: {str(e)}")  # Let main.py handle it

    finally:
        if conn and conn.is_connected():
            conn.close()