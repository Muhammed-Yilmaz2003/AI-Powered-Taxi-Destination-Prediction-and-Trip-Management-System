//config
const CONFIG = {
    local: { apiUrl: "http://127.0.0.1:8000" },
    production: { apiUrl: "https://ai-taxi-dest-backend.onrender.com" } 
};

const isLocal = window.location.hostname === "127.0.0.1" || 
                window.location.hostname === "localhost" || 
                window.location.protocol === "file:";

const BACKEND_URL = isLocal ? CONFIG.local.apiUrl : CONFIG.production.apiUrl;


//loading screen
const loadingOverlay = document.getElementById("loading-overlay");
const mainApp = document.getElementById("main-app");
const loadingText = document.getElementById("loading-text");
const loadingError = document.getElementById("loading-error");
const spinner = document.querySelector(".spinner");

const loadingMessages = [
    "Connecting to cloud backend...",
    "Waking up FastAPI server...",
    "Loading San Francisco geospatial data...",
    "Initializing XGBoost machine learning model...",
    "Almost there, warming up the inference engine..."
];

let messageIndex = 0;
const messageInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % loadingMessages.length;
    if (loadingText) loadingText.innerText = loadingMessages[messageIndex];
}, 6000); 

const failureTimeout = setTimeout(() => {
    clearInterval(messageInterval);
    if (spinner) spinner.style.display = "none";
    if (loadingText) {
        loadingText.innerText = "Backend failed to wake up.";
        loadingText.style.color = "#ff6b6b"; 
    }
    if (loadingError) {
        loadingError.style.display = "block";
        loadingError.innerText = "Please refresh the page to try again.";
    }
}, 90000);

async function wakeUpBackend() {
    try {
        const response = await fetch(`${BACKEND_URL}/docs`);
        
        if (response.ok) {
            clearInterval(messageInterval); 
            clearTimeout(failureTimeout);   
            if (loadingOverlay) loadingOverlay.style.display = "none";
            if (mainApp) {
                mainApp.style.display = "flex";
                setTimeout(() => {
                    map.invalidateSize();
                }, 200);
            }
            fetchLogs();
        } else {
            throw new Error("Server not ready");
        }
    } catch (error) {
        setTimeout(wakeUpBackend, 3000);
    }
}


//leaflet map initialization
const htmlEl = document.documentElement;
const themeBtn = document.getElementById('themeToggle');

const lightTiles = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

let currentTheme = localStorage.getItem('theme') || 'light';
htmlEl.setAttribute('data-theme', currentTheme);
themeBtn.innerText = currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';

const map = L.map('map').setView([37.7749, -122.4194], 13);
const tileLayer = L.tileLayer(currentTheme === 'dark' ? darkTiles : lightTiles, {
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);
let activeRoute = L.featureGroup().addTo(map);

themeBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    htmlEl.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    themeBtn.innerText = currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    
    tileLayer.setUrl(currentTheme === 'dark' ? darkTiles : lightTiles);
});


//crud requests
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { "Content-Type": "application/json" }
    };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`${BACKEND_URL}${endpoint}`, options);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return await res.json();
}

async function fetchLogs() {
    try {
        const data = await apiRequest('/trips/');
        const tbody = document.getElementById("logBody");
        tbody.innerHTML = data.map(t => `
            <tr>
                <td>#${t.id}</td>
                <td>${t.pickup_lat.toFixed(4)}, ${t.pickup_lon.toFixed(4)}</td>
                <td><span class="status status-${t.status}">${t.status}</span></td>
                <td>
                    <button class="btn" onclick="updateTrip(${t.id}, 'completed')">✔</button>
                    <button class="btn" onclick="updateTrip(${t.id}, 'cancelled')">✖</button>
                    <button class="btn btn-del" onclick="deleteTrip(${t.id})">Drop</button>
                </td>
            </tr>
        `).join('');
    } catch(e) {
        console.error("Backend offline or CORS issue.", e);
    }
}

async function updateTrip(id, status) {
    try {
        await apiRequest(`/trips/${id}`, 'PUT', { status });
        fetchLogs();
    } catch(e) {
        console.error("Failed to update trip:", e);
    }
}

async function deleteTrip(id) {
    try {
        await apiRequest(`/trips/${id}`, 'DELETE');
        activeRoute.clearLayers();
        fetchLogs();
    } catch(e) {
        console.error("Failed to delete trip:", e);
    }
}
//map behavior
map.on('click', async (e) => {
    if (e.originalEvent) {
        e.originalEvent.preventDefault();
    }
    try {
        const res = await fetch(`${BACKEND_URL}/trips/`, {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({ pickup_lat: e.latlng.lat, pickup_lon: e.latlng.lng })
        });
        
        if (!res.ok) {
            alert("Click must be within San Francisco bounds.");
            return;
        }
        
        const trip = await res.json();
        activeRoute.clearLayers();
        
        L.circleMarker([trip.pickup_lat, trip.pickup_lon], {color: '#28a745', fillOpacity: 0.8}).addTo(activeRoute).bindPopup("Pickup",{ autoClose: false }).openPopup();
        L.circleMarker([trip.pred_dropoff_lat, trip.pred_dropoff_lon], {color: '#dc3545', fillOpacity: 0.8}).addTo(activeRoute).bindPopup("Dropoff",{ autoClose: false }).openPopup();
        
        L.polyline([[trip.pickup_lat, trip.pickup_lon], [trip.pred_dropoff_lat, trip.pred_dropoff_lon]], {
            color: '#007bff', weight: 4, dashArray: '5, 10'
        }).addTo(activeRoute);
        
        if (activeRoute.getLayers().length > 0) {
            map.fitBounds(activeRoute.getBounds(), { padding: [50, 50] });
        }
        fetchLogs();
    } catch(err) {
        console.error("Failed inference request", err);
    }
});
//start or call the backend
wakeUpBackend();