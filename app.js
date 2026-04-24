const map = L.map('map').setView([34.7, -120.0], 9);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let allProjectFeatures = [];
let projectMarkersLayer = L.layerGroup().addTo(map);

let countyBoundaryLayer;
let fuelTreatmentLayer;
let montecitoFirewiseLayer;
let layerControl;

// -------------------------
// INIT
// -------------------------
async function initMap() {
  await loadProjects();
  await loadCountyBoundary();
  await loadFuelTreatments();
  await loadMontecitoFirewisePoints();
  addLayerControl();
}

// -------------------------
// PROJECT POINTS
// -------------------------
async function loadProjects() {
  const response = await fetch('projects.geojson');
  const data = await response.json();
  allProjectFeatures = data.features || [];
  renderProjects();
}

function getProjectColor(program) {
  switch (program) {
    case 'Chipping':
      return '#2563eb';
    case 'Grazing':
      return '#16a34a';
    case 'Defensible Space':
      return '#dc2626';
    case 'Home Hardening':
      return '#7c3aed';
    case 'Outreach':
      return '#ea580c';
    default:
      return '#374151';
  }
}

function renderProjects() {
  const programValue = document.getElementById('programFilter').value;
  const statusValue = document.getElementById('statusFilter').value;

  projectMarkersLayer.clearLayers();
  const projectList = document.getElementById('projectList');
  projectList.innerHTML = '';

  const filtered = allProjectFeatures.filter(feature => {
    const p = feature.properties || {};
    const programMatch = programValue === 'All' || p.program === programValue;
    const statusMatch = statusValue === 'All' || p.status === statusValue;
    return programMatch && statusMatch;
  });

  filtered.forEach(feature => {
    if (!feature.geometry || feature.geometry.type !== 'Point') return;

    const [lng, lat] = feature.geometry.coordinates;
    const p = feature.properties || {};

    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: '#1f2937',
      weight: 1,
      fillColor: getProjectColor(p.program),
      fillOpacity: 0.9
    });

    marker.bindPopup(`
      <strong>${p.name || 'Unnamed Project'}</strong><br>
      <b>Program:</b> ${p.program || ''}<br>
      <b>Status:</b> ${p.status || ''}<br>
      <b>Location:</b> ${p.location || ''}<br>
      <b>Description:</b> ${p.description || ''}
    `);

    projectMarkersLayer.addLayer(marker);

    const li = document.createElement('li');
    li.innerHTML = `<strong>${p.name || 'Unnamed Project'}</strong> — ${p.program || ''} — ${p.status || ''}`;
    projectList.appendChild(li);
  });
}

// -------------------------
// COUNTY BOUNDARY
// -------------------------
async function loadCountyBoundary() {
  const response = await fetch('sb_county_boundary.geojson');
  const data = await response.json();

  countyBoundaryLayer = L.geoJSON(data, {
    style: {
      color: '#1d4ed8',
      weight: 3,
      opacity: 0.95,
      fill: false
    }
  }).addTo(map);

  map.fitBounds(countyBoundaryLayer.getBounds(), { padding: [20, 20] });
}

// -------------------------
// FUEL TREATMENT POLYGONS
// -------------------------
async function loadFuelTreatments() {
  const response = await fetch('fuel_treatments.geojson');
  const data = await response.json();

  fuelTreatmentLayer = L.geoJSON(data, {
    style: function(feature) {
      const p = feature.properties || {};
      const type = (p.treatment_type || p.type || '').toLowerCase();

      let fillColor = '#f59e0b';

      if (type.includes('chipping')) fillColor = '#2563eb';
      else if (type.includes('grazing')) fillColor = '#16a34a';
      else if (type.includes('mastication')) fillColor = '#b45309';
      else if (type.includes('burn')) fillColor = '#dc2626';

      return {
        color: '#92400e',
        weight: 1.2,
        fillColor: fillColor,
        fillOpacity: 0.35
      };
    },
    onEachFeature: function(feature, layer) {
      const p = feature.properties || {};

      layer.bindPopup(`
        <strong>${p.name || p.project_name || p.treatment_name || 'Fuel Treatment Area'}</strong><br>
        <b>Type:</b> ${p.treatment_type || p.type || ''}<br>
        <b>Status:</b> ${p.status || ''}<br>
        <b>Acres:</b> ${p.acres || ''}<br>
        <b>Year:</b> ${p.year || ''}<br>
        <b>Description:</b> ${p.description || ''}
      `);
    }
  }).addTo(map);
}

// -------------------------
// MONTECITO FIREWISE POINTS
// -------------------------
async function loadMontecitoFirewisePoints() {
  const response = await fetch('montecito_firewise_points.geojson');
  const data = await response.json();

  montecitoFirewiseLayer = L.geoJSON(data, {
    pointToLayer: function(feature, latlng) {
      return L.circleMarker(latlng, {
        radius: 8,
        color: '#111827',
        weight: 1,
        fillColor: '#ec4899',
        fillOpacity: 0.9
      });
    },
    onEachFeature: function(feature, layer) {
      const p = feature.properties || {};

      layer.bindPopup(`
        <strong>${p.PLACE_NAME || 'Montecito Firewise'}</strong>
      `);

      layer.bindTooltip(p.PLACE_NAME || 'Montecito Firewise', {
        permanent: true,
        direction: 'top',
        offset: [0, -10],
        className: 'point-label'
      });
    }
  }).addTo(map);
}

// -------------------------
// LAYER CONTROL
// -------------------------
function addLayerControl() {
  if (layerControl) {
    map.removeControl(layerControl);
  }

  const overlayMaps = {
    "Project Points": projectMarkersLayer,
    "Santa Barbara County Boundary": countyBoundaryLayer,
    "Fuel Treatment Areas": fuelTreatmentLayer,
    "Montecito Firewise Points": montecitoFirewiseLayer
  };

  layerControl = L.control.layers(null, overlayMaps, {
    collapsed: false
  }).addTo(map);
}

// -------------------------
// FILTER EVENTS
// -------------------------
document.getElementById('programFilter').addEventListener('change', renderProjects);
document.getElementById('statusFilter').addEventListener('change', renderProjects);

initMap();
