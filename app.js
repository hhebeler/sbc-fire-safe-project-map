// -----------------------------------------------------------------------------
// MAIN MAP PAGE
// Santa Barbara County Fire Safe Council Fuel Treatment Map
// Converts each feature into a clickable point marker on the main map
// -----------------------------------------------------------------------------

const GEOJSON_FILE = 'Fuel_Treatment_FeaturesToJSO.geojson';
const GEOJSON_LAYER_NAME = 'Fuel Treatment Points';

// Initialize map centered on Santa Barbara County
const map = L.map('map').setView([34.7, -120.0], 9);

// Basemaps
const topoBasemap = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles &copy; Esri'
  }
);

const imageryBasemap = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles &copy; Esri'
  }
);

topoBasemap.addTo(map);

let fuelTreatmentPointLayer;
let layerControl;

// -----------------------------------------------------------------------------
// Helper: safely read attributes from different possible field names
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
// Helper: create a stable ID for each feature
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
// Helper: get a display name
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
// Helper: convert any feature into a representative point location
// -----------------------------------------------------------------------------

function getFeatureCenterLatLng(feature) {
  const geometry = feature.geometry;

  if (!geometry) return null;

  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    return L.latLng(lat, lng);
  }

  if (geometry.type === 'MultiPoint') {
    const firstPoint = geometry.coordinates[0];
    if (!firstPoint) return null;
    return L.latLng(firstPoint[1], firstPoint[0]);
  }

  // For LineString, MultiLineString, Polygon, MultiPolygon:
  // use the center of the feature bounds
  const tempLayer = L.geoJSON(feature);
  const bounds = tempLayer.getBounds();

  if (bounds.isValid()) {
    return bounds.getCenter();
  }

  return null;
}

// -----------------------------------------------------------------------------
// Helper: marker color by treatment type
// -----------------------------------------------------------------------------

function getMarkerColor(feature) {
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

  if (type.includes('chipping')) return '#2563eb';
  if (type.includes('grazing')) return '#16a34a';
  if (type.includes('mastication')) return '#b45309';
  if (type.includes('burn')) return '#dc2626';
  if (type.includes('fuel')) return '#f59e0b';

  return '#14b8a6';
}

// -----------------------------------------------------------------------------
// Helper: popup content
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
    'GIS_ACRES'
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

  const description = getProperty(props, [
    'description',
    'Description',
    'DESCRIPTION',
    'notes',
    'Notes',
    'NOTES',
    'summary',
    'Summary'
  ]);

  return `
    <div class="popup-content">
      <strong>${name}</strong><br>
      ${type ? `<b>Type:</b> ${type}<br>` : ''}
      ${status ? `<b>Status:</b> ${status}<br>` : ''}
      ${acres ? `<b>Acres:</b> ${acres}<br>` : ''}
      ${year ? `<b>Year:</b> ${year}<br>` : ''}
      ${lead ? `<b>Lead:</b> ${lead}<br>` : ''}
      ${description ? `<b>Description:</b> ${description}<br>` : ''}
      <br>
      <a class="popup-detail-link" href="project.html?id=${featureId}">
        View Project Details
      </a>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// Load GeoJSON and convert features to point markers
// -----------------------------------------------------------------------------

async function loadFuelTreatmentPoints() {
  try {
    const response = await fetch(GEOJSON_FILE);

    if (!response.ok) {
      throw new Error(`Unable to load ${GEOJSON_FILE}`);
    }

    const data = await response.json();
    const features = data.features || [];

    fuelTreatmentPointLayer = L.layerGroup();

    const allLatLngs = [];

    features.forEach((feature, index) => {
      const latlng = getFeatureCenterLatLng(feature);

      if (!latlng) return;

      allLatLngs.push(latlng);

      const marker = L.circleMarker(latlng, {
        radius: 7,
        color: '#0f172a',
        weight: 1.5,
        fillColor: getMarkerColor(feature),
        fillOpacity: 0.9
      });

      marker.bindPopup(buildPopupContent(feature, index));
      fuelTreatmentPointLayer.addLayer(marker);
    });

    fuelTreatmentPointLayer.addTo(map);

    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 11
      });
    }

    addLayerControl();
    populateFeatureList(features);
  } catch (error) {
    console.warn('Could not load fuel treatment points:', error);

    const projectList = document.getElementById('projectList');
    if (projectList) {
      projectList.innerHTML = `
        <li>
          Fuel treatment GeoJSON could not be loaded. Check that
          ${GEOJSON_FILE} is in the repository root.
        </li>
      `;
    }
  }
}

// -----------------------------------------------------------------------------
// Layer control
// -----------------------------------------------------------------------------

function addLayerControl() {
  if (layerControl) {
    map.removeControl(layerControl);
  }

  const baseMaps = {
    'Esri Topographic': topoBasemap,
    'Esri Imagery': imageryBasemap
  };

  const overlayMaps = {
    [GEOJSON_LAYER_NAME]: fuelTreatmentPointLayer
  };

  layerControl = L.control.layers(baseMaps, overlayMaps, {
    collapsed: false
  }).addTo(map);
}

// -----------------------------------------------------------------------------
// Populate list below the map
// -----------------------------------------------------------------------------

function populateFeatureList(features) {
  const projectList = document.getElementById('projectList');
  if (!projectList) return;

  projectList.innerHTML = '';

  if (!features.length) {
    projectList.innerHTML = '<li>No fuel treatment features found.</li>';
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

loadFuelTreatmentPoints();
