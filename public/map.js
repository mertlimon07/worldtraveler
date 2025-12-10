const currentUser = localStorage.getItem('currentUser');
let savedMarkers = {}; // Markerları ID ile saklamak için obje

// Auth Check
if (!currentUser) {
    window.location.href = 'index.html';
} else {
    document.getElementById('display-username').innerText = currentUser.toUpperCase();
}

// Map Initialization
const map = L.map('map', { zoomControl: false }).setView([20, 0], 3);

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

let tempLatLng = null;

map.on('click', (e) => {
    tempLatLng = e.latlng;
    openModal();
});

// --- UI FUNCTIONS ---
function openModal() {
    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('memory-text').value = '';
    document.getElementById('memory-photo').value = '';
    document.getElementById('file-name').innerText = 'No file chosen';
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

document.getElementById('memory-photo').addEventListener('change', function() {
    const fileName = this.files[0] ? this.files[0].name : "No file chosen";
    document.getElementById('file-name').innerText = fileName;
});

// --- LIGHTBOX FUNCTIONS (RESİM BÜYÜTME) ---
// Not: Bu fonksiyonu global (window) yapıyoruz ki HTML içinden çağrılabilsin
window.viewImage = function(url) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = url;
    lightbox.classList.remove('hidden');
}

window.closeLightbox = function() {
    document.getElementById('lightbox').classList.add('hidden');
}

// --- DELETE FUNCTION (SİLME) ---
window.deleteMemory = async function(id) {
    if (!confirm("Are you sure you want to delete this memory permanently?")) return;

    try {
        const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            // Haritadan sil
            if (savedMarkers[id]) {
                map.removeLayer(savedMarkers[id]); // Leaflet katmanını kaldır
                delete savedMarkers[id]; // Listeden sil
            }
        } else {
            alert("Could not delete memory.");
        }
    } catch (error) {
        console.error("Delete error:", error);
    }
}

// --- API OPERATIONS ---
async function saveMemory() {
    const text = document.getElementById('memory-text').value;
    const fileInput = document.getElementById('memory-photo');
    
    if(!text) {
        alert("Please write a memory.");
        return;
    }

    const formData = new FormData();
    formData.append('username', currentUser);
    formData.append('text', text);
    formData.append('lat', tempLatLng.lat);
    formData.append('lng', tempLatLng.lng);
    
    if (fileInput.files[0]) {
        formData.append('photo', fileInput.files[0]);
    }

    const res = await fetch('/api/memories', {
        method: 'POST',
        body: formData
    });

    const data = await res.json();
    if (data.success) {
        addMarker(data.data);
        closeModal();
    } else {
        alert("Error saving memory.");
    }
}

async function loadMemories() {
    const res = await fetch(`/api/memories/${currentUser}`);
    const memories = await res.json();
    memories.forEach(mem => addMarker(mem));
}

function addMarker(mem) {
    let popupContent = `<div style="text-align:center">
                            <h4 style="margin:0 0 5px 0; color:#d4af37;">MEMORY</h4>
                            <p style="margin:0; font-size:0.9rem;">${mem.text}</p>`;
    
    if (mem.photoUrl) {
        // Tırnak işaretlerine dikkat: '${mem.photoUrl}'
        popupContent += `<img src="${mem.photoUrl}" class="popup-img" onclick="viewImage('${mem.photoUrl}')" title="Click to Expand">`;
    }

    // DÜZELTME BURADA: ID'yi tırnak içine aldık ('${mem.id}')
    popupContent += `<button class="btn-delete-marker" onclick="deleteMemory('${mem.id}')">DELETE</button>`;
    popupContent += `</div>`;
    
    const marker = L.marker([mem.lat, mem.lng]).addTo(map)
        .bindPopup(popupContent);
    
    savedMarkers[mem.id] = marker;
}

// Başlangıç
loadMemories();