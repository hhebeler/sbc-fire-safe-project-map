const map = L.map('map').setView([34.7, -120.0], 9);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let allFeatures = [];
let markersLayer = L.layerGroup().addTo(map);

async function loadProjects() {
  const response = await fetch('projects.geojson');
  const data = await response.json();
  allFeatures = data.features;
  renderProjects();
}

function renderProjects() {
  const programValue = document.getElementById('programFilter').value;
  const statusValue = document.getElementById('statusFilter').value;

  markersLayer.clearLayers();
  const projectList = document.getElementById('projectList');
  projectList.innerHTML = '';

  const filtered = allFeatures.filter(feature => {
    const p = feature.properties;
    const programMatch = programValue === 'All' || p.program === programValue;
    const statusMatch = statusValue === 'All' || p.status === statusValue;
    return programMatch && statusMatch;
  });

  filtered.forEach(feature => {
    const [lng, lat] = feature.geometry.coordinates;
    const p = feature.properties;

    const marker = L.marker([lat, lng]).bindPopup(`
      <strong>${p.name}</strong><br>
      <b>Program:</b> ${p.program}<br>
      <b>Status:</b> ${p.status}<br>
      <b>Location:</b> ${p.location}<br>
      <b>Description:</b> ${p.description}
    `);

    markersLayer.addLayer(marker);

    const li = document.createElement('li');
    li.innerHTML = `<strong>${p.name}</strong> — ${p.program} — ${p.status}`;
    projectList.appendChild(li);
  });
}

document.getElementById('programFilter').addEventListener('change', renderProjects);
document.getElementById('statusFilter').addEventListener('change', renderProjects);

loadProjects();
