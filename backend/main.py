from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
#from dotenv import load_dotenv

import database
import routes 

#load_dotenv()

database.init_db()

app = FastAPI(
    title="AI-Powered Taxi System Backend",
    description="Inference and CRUD engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(routes.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)