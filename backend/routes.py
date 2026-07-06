import os
from datetime import datetime
from pathlib import Path
import joblib
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

import database 

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
try:
    artifacts = joblib.load(BASE_DIR / "models" / "sf_taxi_regression_production.pkl")
    model = artifacts['model']
    time_stats = artifacts['time_stats']
    static_stats = artifacts['static_stats']
    global_coords = artifacts['global_coords']
    bounds = artifacts['bounds']
    grid_size = artifacts['grid_size']
    feature_cols = artifacts['feature_cols']
except FileNotFoundError:
    print("WARNING: sf_taxi_regression_production.pkl not found in backend/models/. Inference will fail.")
    model = None

class TripCreateRequest(BaseModel):
    pickup_lat: float = Field(..., examples=[37.7749])
    pickup_lon: float = Field(..., examples=[-122.4194])

class TripUpdateRequest(BaseModel):
    status: str

@router.post("/trips/", status_code=201)
async def create_trip(payload: TripCreateRequest):
    p_lat = payload.pickup_lat
    p_lon = payload.pickup_lon
    if not model:
        raise HTTPException(status_code=500, detail="Machine Learning model is not loaded on the server.")
        
    if not (bounds["lat_min"] <= p_lat <= bounds["lat_max"] and bounds["lon_min"] <= p_lon <= bounds["lon_max"]):
        raise HTTPException(status_code=422, detail="Coordinates outside active San Francisco bounds.")
        
    now = datetime.now()
    now_str = now.isoformat()
    hour = now.hour
    dayofweek = now.weekday()
    
    try:
        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)
        day_sin = np.sin(2 * np.pi * dayofweek / 7)
        day_cos = np.cos(2 * np.pi * dayofweek / 7)
        is_weekend = 1 if dayofweek >= 5 else 0
        is_rush_hour = 1 if (dayofweek < 5 and (7 <= hour <= 9 or 16 <= hour <= 19)) else 0
        
        center_lat, center_lon = 37.7879, -122.4074
        lat_rad, lon_rad = np.radians(p_lat), np.radians(p_lon)
        c_lat_rad, c_lon_rad = np.radians(center_lat), np.radians(center_lon)
        
        dlat = c_lat_rad - lat_rad
        dlon = c_lon_rad - lon_rad
        a = np.sin(dlat/2)**2 + np.cos(lat_rad)*np.cos(c_lat_rad)*np.sin(dlon/2)**2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
        dist_to_center = 6371 * c
        
        y_bearing = np.sin(dlon) * np.cos(c_lat_rad)
        x_bearing = np.cos(lat_rad)*np.sin(c_lat_rad) - np.sin(lat_rad)*np.cos(c_lat_rad)*np.cos(dlon)
        bearing_to_center = (np.degrees(np.arctan2(y_bearing, x_bearing)) + 360) % 360
        
        pickup_lat_bins = np.linspace(bounds['lat_min'], bounds['lat_max'], grid_size + 1)
        pickup_lon_bins = np.linspace(bounds['lon_min'], bounds['lon_max'], grid_size + 1)
        pickup_cell = int((np.digitize([p_lat], pickup_lat_bins)[0] - 1) * grid_size + (np.digitize([p_lon], pickup_lon_bins)[0] - 1))
        
        ts_match = time_stats[(time_stats['pickup_cell'] == pickup_cell) & (time_stats['pickup_hour'] == hour)]
        st_match = static_stats[static_stats['pickup_cell'] == pickup_cell]
        
        if not st_match.empty:
            hist_lat_static = st_match.iloc[0]['hist_lat_static']
            hist_lon_static = st_match.iloc[0]['hist_lon_static']
        else:
            hist_lat_static, hist_lon_static = global_coords[0], global_coords[1]
            
        if not ts_match.empty:
            hist_lat_time = ts_match.iloc[0]['hist_lat_time']
            hist_lon_time = ts_match.iloc[0]['hist_lon_time']
        else:
            hist_lat_time, hist_lon_time = hist_lat_static, hist_lon_static

        raw_features = {
            'pickup_lat': p_lat,
            'pickup_lon': p_lon,
            'pickup_hour': hour,
            'pickup_dayofweek': dayofweek,
            'hour_sin': hour_sin,
            'hour_cos': hour_cos,
            'day_sin': day_sin,
            'day_cos': day_cos,
            'is_weekend': is_weekend,
            'is_rush_hour': is_rush_hour,
            'dist_to_center': dist_to_center,
            'bearing_to_center': bearing_to_center,
            'pickup_cell': pickup_cell,
            'hist_lat_time': hist_lat_time,
            'hist_lon_time': hist_lon_time,
            'hist_lat_static': hist_lat_static,
            'hist_lon_static': hist_lon_static
        }
        
        inference_df = pd.DataFrame([raw_features])[feature_cols]
        
        prediction = model.predict(inference_df)
        d_lat = float(prediction[0][0])
        d_lon = float(prediction[0][1])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference pipeline execution error: {str(e)}")
    
    trip_id = database.insert_trip(p_lat, p_lon, d_lat, d_lon, now_str)
        
    return {
        "id": trip_id, 
        "pickup_lat": p_lat, 
        "pickup_lon": p_lon, 
        "pred_dropoff_lat": d_lat, 
        "pred_dropoff_lon": d_lon, 
        "timestamp": now_str,
        "status": "pending"
    }

@router.get("/trips/")
async def read_trips():
    return database.get_all_trips()

@router.put("/trips/{trip_id}")
async def update_trip(trip_id: int, payload: TripUpdateRequest):
    valid_statuses = ['pending', 'completed', 'cancelled']
    new_status = payload.status.lower()
    
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")
        
    if not database.update_trip_status(trip_id, new_status):
        raise HTTPException(status_code=404, detail="Trip record not found.")
        
    return {"message": "Update successful"}

@router.delete("/trips/{trip_id}")
async def delete_trip(trip_id: int):
    if not database.delete_trip(trip_id):
        raise HTTPException(status_code=404, detail="Trip record not found.")
    return {"message": "Record deleted"}