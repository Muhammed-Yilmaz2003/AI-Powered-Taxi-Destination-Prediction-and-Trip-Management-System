# AI-Powered-Taxi-Destination-Prediction-and-Trip-Management-System
An end-to-end geospatial machine learning application that predicts destination coordinates (latitude & longitude) for taxi trips across San Francisco. Built with a responsive Leaflet.js frontend and an asynchronous FastAPI backend serving a Scikit-Learn (XGBoost) regression pipeline.

The project is deployed on Render for the backend, and on Vercel for the frontend.

*Note: since the backend is deployed on render's free tier, it might take 30-50 seconds for it to wake up.*

## Live Demo
[![Live Demo](https://img.shields.io/badge/Demo-Live_App-2ea44f?style=for-the-badge)](https://ai-powered-taxi-destination-predict.vercel.app/)

## Tech Stack
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-1296DB?style=for-the-badge&logo=xgboost&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

## Key Features
* **Geospatial ML Inference:** Interactive map allowing users to select any pickup point within San Francisco bounds to receive real-time predicted dropoff coordinates.
* **Dynamic Feature Engineering:** Extracts temporal features, rush-hour indicators, and distance-to-center metrics on the fly before passing data to the XGBoost model.
* **Trip Operations (CRUD):** Embedded SQLite log system enabling real-time status updates (`pending`, `completed`, `cancelled`) and record deletion.
* **Decoupled Architecture:** Backend designed for Render (FastAPI/Uvicorn) and frontend for Vercel.
* **Cold-Start Resilience:** Custom UI loading state that gracefully handles cloud-provider (Render) spin-up latency with backend polling.

## Preview

![image](assets/prediction_demo.gif)
*Interactive Leaflet UI displaying geospatial ML predictions in real-time.*


## Project Structure

```text
AI-Powered-Taxi-Destination-Prediction-and-Trip-Management-System/
├── backend/
│   ├── models/                     # ML model
│   │   └── sf_taxi_regression_production.pkl
│   ├── database.py                 # SQLite database setup
│   ├── main.py                     # FastAPI application entry point
│   ├── routes.py                   # API endpoints
│   └── trips.db                    # SQLite database
├── frontend/
│   ├── index.html                  # Main webpage
│   ├── script.js                   # Frontend logic
│   └── style.css                   # Styling
├── training/
│   └── Model_Training.ipynb        # Model training notebook
├── .gitignore                      # Git ignore rules
├── LICENSE                         # Project license
├── README.md                       # Project documentation
└── requirements.txt                # Python dependencies
```

## Local Installation & Setup
Because the frontend is environment-aware, it will automatically connect to your local backend when run on localhost or 127.0.0.1.

**Prerequisites:**
* Python 3.12
* Git
* A local web server (like VS Code Live Server or Python HTTP Server)

**Installation:**

**1. Clone the Repository and Enter the Folder:**
```bash
git clone https://github.com/Muhammed-Yilmaz2003/AI-Powered-Taxi-Destination-Prediction-and-Trip-Management-System.git
cd AI-Powered-Taxi-Destination-Prediction-and-Trip-Management-System
```
**2. Backend Setup (FastAPI):**

Depending on your personal setup u can install requirements through pip globally or use venv, I recommend venv.

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install exact dependencies
pip install -r requirements.txt
```

**3. Run The Backend Server:**

You could manually run the FastAPI backend through the command line or just run main.py, I recommend running main.py.

If you want to run the backend from the command line:

```bash
# On macOS/Linux:
PYTHONPATH=backend uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

# On Windows (PowerShell):
$env:PYTHONPATH="backend"; uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```
The backend is now running and accepting API calls at http://127.0.0.1:8000.

**4. Run The Frontend:**

Since the JavaScript automatically detects local environments, you simply need to serve the HTML file.

Note : I recommend ***Option A*** because the live server loads too fast to see the prediction reliably.

* **Option A: Python HTTP Server (Terminal)**

Open a new terminal window, navigate to the frontend folder, and run:

```bash
cd frontend
python -m http.server 5500
```
Then open your browser to http://127.0.0.1:5500.

* **Option B: VS Code Live Server**

Right-click frontend/index.html inside VS Code and select "Open with Live Server".

## API Endpoint Overview

The backend exposes the following REST API endpoints to handle live taxi operations, model queries, and workspace dashboard telemetry:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/trips/` | Fetches the historical and live taxi dispatch records to feed the operations dashboard grid. |
| `POST` | `/trips/` | creates a trip and sends current pickup inputs to the **XGBoost model** to compute spatial destinations. |
| `PUT` | `/trips/{id}`| Updates a trip state when changed dynamically via the dashboard interface. |
| `DELETE`| `/trips/{id}`| Remotely removes a specific trip log entry via the UI delete button panel. |

FastAPI provides automatic documentation through Swagger UI, which can be accessed by going to http://127.0.0.1:8000/docs.

## Model Training 

The model was trained on google colab.

* Utilizes the XGBoost framework, and specifically implements the XGBoost Regressor model.
* The target/core features are the destination coordinates (Latitude,Longitude).

If you want to view/use the training code, you can run the *training/Model_Training.ipynb* inside google colab along with the dataset that you can get from IEE Dataport (reference below). 

If you do choose to run the exact code, then make sure you *unzip the dataset tar file* then go inside the new folder and zip the folder inside, *cabspottingdata*, then put it inside google colab and run the code.

## Dataset Reference & Citation

The machine learning model in this repository was trained using the CRAWDAD epfl/mobility Dataset from IEEE Dataport.

*CRAWDAD epfl/mobility Dataset*

    Piorkowski, M., Sarafijanovic-Djukic, N., & Grossglauser, M. (2009). CRAWDAD dataset epfl/mobility. 
    
    https://doi.org/10.15783/C7J010

    https://ieee-dataport.org/open-access/crawdad-epflmobility

## License

Distributed under the MIT License. See LICENSE for more information.