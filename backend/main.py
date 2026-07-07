from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
#from dotenv import load_dotenv

import database
import routes 

#load_dotenv()

database.init_db()

app = FastAPI(
    title="AI-Powered Taxi Prediction System Backend",
    description="Inference and CRUD engine",
    version="1.0.0"
)

origins = [
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5500",
    "https://your-frontend-app.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(routes.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)