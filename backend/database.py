import os
import sqlite3

DB_NAME = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aimoro.db")


def create_tables():
    connection = sqlite3.connect(DB_NAME)
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER,
            name TEXT,
            platform TEXT,
            country TEXT,
            product TEXT,
            unit_price REAL,
            rating REAL,
            minimum_order_quantity INTEGER,
            delivery_days INTEGER,
            verified INTEGER,
            supplier_url TEXT
        )
    """)

    connection.commit()
    connection.close()


def save_supplier_to_db(supplier):
    connection = sqlite3.connect(DB_NAME)
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO saved_suppliers (
            supplier_id, name, platform, country, product, unit_price, rating,
            minimum_order_quantity, delivery_days, verified, supplier_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        supplier["id"],
        supplier["name"],
        supplier["platform"],
        supplier["country"],
        supplier["product"],
        supplier["unit_price"],
        supplier["rating"],
        supplier["minimum_order_quantity"],
        supplier["delivery_days"],
        int(supplier["verified"]),
        supplier["supplier_url"]
    ))

    connection.commit()
    connection.close()


def get_saved_suppliers():
    connection = sqlite3.connect(DB_NAME)
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM saved_suppliers")
    rows = cursor.fetchall()

    connection.close()

    return [dict(row) for row in rows]

def delete_saved_supplier(saved_id):
    connection = sqlite3.connect(DB_NAME)
    cursor = connection.cursor()

    cursor.execute(
        "DELETE FROM saved_suppliers WHERE id = ?",
        (saved_id,)
    )

    connection.commit()
    connection.close()