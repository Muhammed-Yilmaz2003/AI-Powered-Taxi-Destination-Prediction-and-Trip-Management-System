import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "trips.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS trips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pickup_lat REAL NOT NULL,
                pickup_lon REAL NOT NULL,
                pred_dropoff_lat REAL NOT NULL,
                pred_dropoff_lon REAL NOT NULL,
                timestamp TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'cancelled'))
            )
        """)

def insert_trip(p_lat, p_lon, d_lat, d_lon, timestamp_str):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO trips (pickup_lat, pickup_lon, pred_dropoff_lat, pred_dropoff_lon, timestamp, status)
               VALUES (?, ?, ?, ?, ?, 'pending')""",
            (p_lat, p_lon, d_lat, d_lon, timestamp_str)
        )
        return cursor.lastrowid

def get_all_trips():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        rows = cursor.execute("SELECT * FROM trips ORDER BY id DESC").fetchall()
    return [dict(row) for row in rows]

def update_trip_status(trip_id, new_status):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        updated = cursor.execute("UPDATE trips SET status = ? WHERE id = ?", (new_status, trip_id)).rowcount
        return updated > 0

def delete_trip(trip_id):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        deleted = cursor.execute("DELETE FROM trips WHERE id = ?", (trip_id,)).rowcount
        return deleted > 0