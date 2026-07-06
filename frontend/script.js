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

const isLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" || window.location.protocol === "file:";
const BACKEND_URL = isLocal ? "http://127.0.0.1:8000" : "https://your-backend-app.onrender.com"; 

async function fetchLogs() {
    try {
        const res = await fetch(`${BACKEND_URL}/trips/`);
        const data = await res.json();
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

async function updateTrip(id, status) {
    await fetch(`${BACKEND_URL}/trips/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ status })
    });
    fetchLogs();
}

async function deleteTrip(id) {
    await fetch(`${BACKEND_URL}/trips/${id}`, {
        method: "DELETE"
    });
    activeRoute.clearLayers();
    fetchLogs();
}

fetchLogs();