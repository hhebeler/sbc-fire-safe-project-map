// -----------------------------------------------------------------------------
// MAIN MAP PAGE
// Santa Barbara County Fire Safe Council Fuel Treatment Map
// -----------------------------------------------------------------------------

const GEOJSON_FILE = 'Fuel_Treatment_FeaturesToJSO.geojson';
const GEOJSON_LAYER_NAME = 'Fuel Treatment Areas';

// Initialize map centered on Santa Barbara County
const map = L.map('map').setView([34.7, -120.0], 9);

// Esri World Topographic basemap
L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles &copy; Esri'
  }
).addTo(map);

// Optional imagery basemap
const imageryBasemap = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles &copy; Esri'
  }
);

let fuelTreatmentLayer;
let layerControl;

// -----------------------------------------------------------------------------
// Helper: Safely get a useful value from multiple possible property names
// -----------------------------------------------------------------------------

function getProperty(props, names, fallback = '') {
  for (const name of names) {
    if (
      props[name] !== undefined &&
      props[name] !== null &&
      props[name] !== ''
    ) {
      return props[name];
    }
  }
  return fallback;
}

// -----------------------------------------------------------------------------
// Helper: Build a stable feature ID for detail links
// -----------------------------------------------------------------------------

function getFeatureId(feature, index) {
  const props = feature.properties || {};

  return (
    getProperty(props, [
      'id',
      'ID',
      'OBJECTID',
      'ObjectID',
      'FID',
      'GlobalID',
      'GLOBALID',
      'project_id',
      'PROJECT_ID'
    ]) || String(index)
  );
}

// -----------------------------------------------------------------------------
// Helper: Get display name
// -----------------------------------------------------------------------------

function getFeatureName(feature, index) {
  const props = feature.properties || {};

  return getProperty(
    props,
    [
      'name',
      'Name',
      'NAME',
      'project_name',
      'Project_Name',
      'PROJECT_NAME',
      'treatment_name',
      'Treatment_Name',
      'TREATMENT_NAME',
      'PROJECT',
      'Project'
    ],
    `Fuel Treatment Area ${index + 1}`
  );
}

// -----------------------------------------------------------------------------
// Helper: Style fuel treatment polygons
// -----------------------------------------------------------------------------

function getFuelTreatmentStyle(feature) {
  const props = feature.properties || {};

  const type = String(
    getProperty(props, [
      'treatment_type',
      'Treatment_Type',
      'TREATMENT_TYPE',
      'type',
      'Type',
      'TYPE'
    ])
  ).toLowerCase();

  let fillColor = '#14b8a6';

  if (type.includes('chipping')) {
    fillColor = '#2563eb';
  } else if (type.includes('grazing')) {
    fillColor = '#16a34a';
  } else if (type.includes('mastication')) {
    fillColor = '#b45309';
  } else if (type.includes('burn')) {
    fillColor = '#dc2626';
  } else if (type.includes('fuel')) {
    fillColor = '#f59e0b';
  }

  return {
    color: '#0f172a',
    weight: 1.5,
    opacity: 0.9,
    fillColor: fillColor,
    fillOpacity: 0.35
  };
}

// -----------------------------------------------------------------------------
// Helper: Create popup content
// -----------------------------------------------------------------------------

function buildPopupContent(feature, index) {
  const props = feature.properties || {};

  const featureId = encodeURIComponent(getFeatureId(feature, index));
  const name = getFeatureName(feature, index);

  const type = getProperty(props, [
    'treatment_type',
    'Treatment_Type',
    'TREATMENT_TYPE',
    'type',
    'Type',
    'TYPE'
  ]);

  const status = getProperty(props, [
    'status',
    'Status',
    'STATUS',
    'project_status',
    'PROJECT_STATUS'
  ]);

  const acres = getProperty(props, [
    'acres',
    'Acres',
    'ACRES',
    'GIS_ACRES',
    'Shape_Area',
    'shape_area'
  ]);

  const year = getProperty(props, [
    'year',
    'Year',
    'YEAR',
    'project_year',
    'PROJECT_YEAR'
  ]);

  const lead = getProperty(props, [
    'lead',
    'Lead',
    'LEAD',
    'lead_agency',
    'Lead_Agency',
    'LEAD_AGENCY',
    'organization',
    'Organization'
  ]);

  return `
    <div class="popup-content">
      <strong>${name}</strong><br>
      ${type ? `<b>Type:</b> ${type}<br>` : ''}
      ${status ? `<b>Status:</b> ${status}<br>` : ''}
      ${acres ? `<b>Acres:</b> ${acres}<br>` : ''}
      ${year ? `<b>Year:</b> ${year}<br>` : ''}
      ${lead ? `<b>Lead:</b> ${lead}<br>` : ''}
      <br>
      <a class="popup-detail-link" href="project.html?id=${featureId}">
        View Project Details
      </a>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// Load fuel treatment GeoJSON
// -----------------------------------------------------------------------------

async function loadFuelTreatmentLayer() {
  try {
    const response = await fetch(GEOJSON_FILE);

    if (!response.ok) {
      throw new Error(`Unable to load ${GEOJSON_FILE}`);
    }

    const data = await response.json();

    fuelTreatmentLayer = L.geoJSON(data, {
      style: getFuelTreatmentStyle,

      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 7,
          color: '#0f172a',
          weight: 1.5,
          fillColor: '#14b8a6',
          fillOpacity: 0.85
        });
      },

      onEachFeature: function (feature, layer) {
        const index = data.features.indexOf(feature);
        layer.bindPopup(buildPopupContent(feature, index));
      }
    }).addTo(map);

    if (fuelTreatmentLayer.getBounds().isValid()) {
      map.fitBounds(fuelTreatmentLayer.getBounds(), {
        padding: [30, 30],
        maxZoom: 13
      });
    }

    addLayerControl();
    populateFeatureList(data.features || []);
  } catch (error) {
    console.warn('Could not load fuel treatment layer:', error);

    const projectList = document.getElementById('projectList');
    if (projectList) {
      projectList.innerHTML = `
        <li>
          Fuel treatment GeoJSON could not be loaded. 
          Check that ${GEOJSON_FILE} is uploaded to the repository root.
        </li>
      `;
    }
  }
}

// -----------------------------------------------------------------------------
// Layer control
// -----------------------------------------------------------------------------

function addLayerControl() {
  const baseMaps = {
    'Esri Topographic': map._layers[Object.keys(map._layers)[0]],
    'Esri Imagery': imageryBasemap
  };

  const overlayMaps = {
    [GEOJSON_LAYER_NAME]: fuelTreatmentLayer
  };

  layerControl = L.control.layers(baseMaps, overlayMaps, {
    collapsed: false
  }).addTo(map);
}

// -----------------------------------------------------------------------------
// Populate list below map
// -----------------------------------------------------------------------------

function populateFeatureList(features) {
  const projectList = document.getElementById('projectList');

  if (!projectList) return;

  projectList.innerHTML = '';

  if (!features.length) {
    projectList.innerHTML = '<li>No fuel treatment areas found.</li>';
    return;
  }

  features.forEach((feature, index) => {
    const props = feature.properties || {};
    const featureId = encodeURIComponent(getFeatureId(feature, index));
    const name = getFeatureName(feature, index);

    const type = getProperty(props, [
      'treatment_type',
      'Treatment_Type',
      'TREATMENT_TYPE',
      'type',
      'Type',
      'TYPE'
    ]);

    const status = getProperty(props, [
      'status',
      'Status',
      'STATUS'
    ]);

    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${name}</strong>
      ${type ? ` — ${type}` : ''}
      ${status ? ` — ${status}` : ''}
      <br>
      <a href="project.html?id=${featureId}">View Project Details</a>
    `;

    projectList.appendChild(li);
  });
}

// -----------------------------------------------------------------------------
// Start app
// -----------------------------------------------------------------------------

loadFuelTreatmentLayer();
