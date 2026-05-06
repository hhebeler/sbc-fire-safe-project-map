// -----------------------------------------------------------------------------
// Wildfire Mitigations Map
// Santa Barbara County Fire Safe Council
// -----------------------------------------------------------------------------

const GEOJSON_FILE = 'Fuel_Treatment_FeaturesToJSO.geojson';
const GEOJSON_LAYER_NAME = 'Fuel Treatment Points';

const COUNTY_BOUNDARY_FILE = 'sb_county_boundary.geojson';
const COUNTY_BOUNDARY_LAYER_NAME = 'Santa Barbara County Boundary';

// Initialize map
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

// Layer references
let countyBoundaryLayer;
let fuelTreatmentPointLayer;
let layerControl;

// Store features for filtering
let allFeatures = [];

// -----------------------------------------------------------------------------
// Pin icons
// -----------------------------------------------------------------------------

function makePinIcon(fillColor) {
  return L.divIcon({
    className: 'fuel-treatment-pin-wrapper',
    html: `
      <div class="fuel-treatment-pin" style="background:${fillColor};">
        <div class="fuel-treatment-pin-dot"></div>
      </div>
    `,
    iconSize: [18, 24],
    iconAnchor: [9, 24],
    popupAnchor: [0, -22]
  });
}


const iconPotential = makePinIcon('#f4b000');
const iconCurrent = makePinIcon('#2b7de9');
const iconCompleted = makePinIcon('#5b4bc4');

// -----------------------------------------------------------------------------
// Helpers
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
    `Fuel Treatment Project ${index + 1}`
  );
}

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

  // For LineString, MultiLineString, Polygon, and MultiPolygon,
  // use the center of the feature bounds.
  const tempLayer = L.geoJSON(feature);
  const bounds = tempLayer.getBounds();

  if (bounds.isValid()) {
    return bounds.getCenter();
  }

  return null;
}

// -----------------------------------------------------------------------------
// Status/category handling
// -----------------------------------------------------------------------------

function getProjectCategory(feature) {
  const props = feature.properties || {};
  const name = getFeatureName(feature, 0);

  // Custom override for Montecito Roadside Fuel Reduction
  if (name === 'Montecito Roadside Fuel Reduction') {
    return 'Current';
  }

  const rawStatus = String(
    getProperty(
      props,
      [
        'status',
        'Status',
        'STATUS',
        'project_stage',
        'Project_Stage',
        'PROJECT_STAGE',
        'stage',
        'Stage',
        'STAGE'
      ],
      ''
    )
  ).toLowerCase();

  if (
    rawStatus.includes('completed') ||
    rawStatus.includes('complete') ||
    rawStatus.includes('post-implementation') ||
    rawStatus.includes('done') ||
    rawStatus.includes('closed')
  ) {
    return 'Completed';
  }

  if (
    rawStatus.includes('implementation') ||
    rawStatus.includes('current') ||
    rawStatus.includes('active') ||
    rawStatus.includes('in progress') ||
    rawStatus.includes('ongoing')
  ) {
    return 'Current';
  }

  if (
    rawStatus.includes('planning') ||
    rawStatus.includes('planned') ||
    rawStatus.includes('design') ||
    rawStatus.includes('potential') ||
    rawStatus.includes('proposed') ||
    rawStatus.includes('forecast')
  ) {
    return 'Potential/Ongoing';
  }

  return 'Potential/Ongoing';
}

  // Default bucket while your data is still being built out
  return 'Potential/Ongoing';
}

function getMarkerIconForCategory(category) {
  if (category === 'Current') return iconCurrent;
  if (category === 'Completed') return iconCompleted;
  return iconPotential;
}

// -----------------------------------------------------------------------------
// Popup content
// -----------------------------------------------------------------------------
function getCustomProjectDetails(projectName) {
  if (projectName === 'Montecito Roadside Fuel Reduction') {
    return {
      status: 'Potential/Ongoing',
      duration: '',
      leadImplementer: '',
      focusArea: 'Roadside Fire Hazard Abatement',
      goal: '',
      strategy: '',
      estimatedTotalCost: '',
      description:
        'Also in the spring, the District funds fire hazard abatement projects along 12 miles of community roads and trailheads in the High Severity Zones in Montecito. These areas include Gibraltar, West Mountain, Coyote, East Mountain, Bella Vista, Romero Canyon, and Ortega Ridge roads.',
      storyMapUrl:
        'https://storymaps.arcgis.com/stories/af1f9293bf414967b590962cfa9be39d'
    };
  }

  return null;
}
function getCustomProjectDetails(projectName) {
  if (projectName === 'Montecito Roadside Fuel Reduction') {
    return {
      status: 'Current',
      duration: 'Annually',
      leadImplementer: 'Montecito Fire Department',
      focusArea: 'Roadside Fire Hazard Abatement',
      goal: 'Wildfire community protection',
      strategy: '',
      estimatedTotalCost: '',
      description:
        'Also in the spring, the District funds fire hazard abatement projects along 12 miles of community roads and trailheads in the High Severity Zones in Montecito. These areas include Gibraltar, West Mountain, Coyote, East Mountain, Bella Vista, Romero Canyon, and Ortega Ridge roads.',
      storyMapUrl:
        'https://storymaps.arcgis.com/stories/af1f9293bf414967b590962cfa9be39d'
    };
  }

  return null;
}
function buildPopupContent(feature, index) {
  const featureId = encodeURIComponent(getFeatureId(feature, index));
  const name = getFeatureName(feature, index);
  const category = getProjectCategory(feature);
  const customDetails = getCustomProjectDetails(name);

  const status = customDetails?.status || category;
  const duration = customDetails?.duration || '';
  const leadImplementer = customDetails?.leadImplementer || '';
  const focusArea = customDetails?.focusArea || '';
  const goal = customDetails?.goal || '';
  const strategy = customDetails?.strategy || '';
  const estimatedTotalCost = customDetails?.estimatedTotalCost || '';
  const description = customDetails?.description || '';

  return `
    <div class="project-popup">
      <h3 class="project-popup-title">
        <a href="project.html?id=${featureId}">${name}</a>
      </h3>

      <div class="project-popup-details">
        <p><strong>Project Status:</strong> ${status}</p>
        <p><strong>Duration:</strong> ${duration}</p>
        <p><strong>Lead Implementer:</strong> ${leadImplementer}</p>
        <p><strong>Focus Area:</strong> ${focusArea}</p>
        <p><strong>Goal:</strong> ${goal}</p>
        <p><strong>Strategy:</strong> ${strategy}</p>
        <p><strong>Estimated Total Cost:</strong> ${estimatedTotalCost}</p>
        ${
          description
            ? `<p class="project-popup-description">${description}</p>`
            : ''
        }
      </div>

      <p class="project-popup-footer">
        For project details, see the
        <a href="project.html?id=${featureId}">Project Fact Sheet</a>
      </p>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// County boundary
// -----------------------------------------------------------------------------

async function loadCountyBoundary() {
  try {
    const response = await fetch(COUNTY_BOUNDARY_FILE);

    if (!response.ok) {
      throw new Error(`Unable to load ${COUNTY_BOUNDARY_FILE}`);
    }

    const data = await response.json();

    countyBoundaryLayer = L.geoJSON(data, {
      style: {
        color: '#000000',
        weight: 1,
        opacity: 0.9,
        fill: false
      },
      interactive: false
    }).addTo(map);

    return countyBoundaryLayer;
  } catch (error) {
    console.warn('Could not load Santa Barbara County boundary:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Load project points
// -----------------------------------------------------------------------------

async function loadFuelTreatmentPoints() {
  try {
    const response = await fetch(GEOJSON_FILE);

    if (!response.ok) {
      throw new Error(`Unable to load ${GEOJSON_FILE}`);
    }

    const data = await response.json();
    allFeatures = data.features || [];

    renderFilteredProjects();
    addLayerControl();
  } catch (error) {
    console.warn('Could not load fuel treatment points:', error);
  }
}

// -----------------------------------------------------------------------------
// Render filtered projects
// -----------------------------------------------------------------------------

function renderFilteredProjects() {
  const statusFilter = document.getElementById('statusFilter');
  const filterValue = statusFilter ? statusFilter.value : 'All';

  if (fuelTreatmentPointLayer) {
    map.removeLayer(fuelTreatmentPointLayer);
  }

  fuelTreatmentPointLayer = L.layerGroup();

  const filteredFeatures = allFeatures.filter((feature) => {
    const category = getProjectCategory(feature);
    return filterValue === 'All' || category === filterValue;
  });

  const allLatLngs = [];

  filteredFeatures.forEach((feature, index) => {
    const latlng = getFeatureCenterLatLng(feature);
    if (!latlng) return;

    allLatLngs.push(latlng);

    const category = getProjectCategory(feature);
    const marker = L.marker(latlng, {
      icon: getMarkerIconForCategory(category),
      title: getFeatureName(feature, index)
    });

    marker.bindPopup(buildPopupContent(feature, index), {
      maxWidth: 620,
      minWidth: 420,
      className: 'project-popup-container'
    });

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
}

// -----------------------------------------------------------------------------
// Project list intentionally disabled on main page
// -----------------------------------------------------------------------------

function populateFeatureList(features) {
  // Project list intentionally disabled.
  // Users access project details by clicking map markers.
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

  const overlayMaps = {};

  if (countyBoundaryLayer) {
    overlayMaps[COUNTY_BOUNDARY_LAYER_NAME] = countyBoundaryLayer;
  }

  if (fuelTreatmentPointLayer) {
    overlayMaps[GEOJSON_LAYER_NAME] = fuelTreatmentPointLayer;
  }

  layerControl = L.control.layers(baseMaps, overlayMaps, {
    collapsed: false
  }).addTo(map);
}

// -----------------------------------------------------------------------------
// Event listeners
// -----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const statusFilter = document.getElementById('statusFilter');

  if (statusFilter) {
    statusFilter.addEventListener('change', renderFilteredProjects);
  }
});

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------

async function initMap() {
  await loadCountyBoundary();
  await loadFuelTreatmentPoints();
}

initMap();
