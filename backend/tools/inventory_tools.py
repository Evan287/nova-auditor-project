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
    Tool for the AI: Queries the DB for items where stock is below the threshold
    Returns a string summary for the AI to process
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        #This query finds items needing attention
        query = "SELECT part_name, stock_level, threshold, vendor_url FROM inventory WHERE stock_level < threshold"
        cursor.execute(query)
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        if not results:
            return "Inventory Check: All items are currently above safety threshold"
        
        return f"Inventory Alert: The following items are low: {results}"
    
    except Exception as e:
        return f"Error accessing database: {str(e)}"