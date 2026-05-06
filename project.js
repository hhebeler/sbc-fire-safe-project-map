// -----------------------------------------------------------------------------
// PROJECT DETAIL PAGE
// Loads one feature from Fuel_Treatment_FeaturesToJSO.geojson based on URL id
// -----------------------------------------------------------------------------

const GEOJSON_FILE = 'Fuel_Treatment_FeaturesToJSO.geojson';

function getProjectIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

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

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = value || 'Not listed';
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
    `Fuel Treatment Area ${index + 1}`
  );
}

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
    weight: 2,
    opacity: 0.95,
    fillColor: fillColor,
    fillOpacity: 0.4
  };
}

function populateAttributeTable(props) {
  const tbody = document.getElementById('attributeTableBody');

  if (!tbody) return;

  tbody.innerHTML = '';

  Object.entries(props).forEach(([key, value]) => {
    const row = document.createElement('tr');

    const keyCell = document.createElement('th');
    keyCell.textContent = key;

    const valueCell = document.createElement('td');
    valueCell.textContent =
      value === null || value === undefined || value === ''
        ? 'Not listed'
        : value;

    row.appendChild(keyCell);
    row.appendChild(valueCell);
    tbody.appendChild(row);
  });
}

function showProjectNotFound(message) {
  setText('projectName', 'Project not found');
  setText('projectDescription', message);

  const mapContainer = document.getElementById('detailMap');
  if (mapContainer) {
    mapContainer.innerHTML = '';
  }
}

async function loadProjectDetail() {
  const projectId = getProjectIdFromUrl();

  if (!projectId) {
    showProjectNotFound('No project ID was provided in the URL.');
    return;
  }

  try {
    const response = await fetch(GEOJSON_FILE);

    if (!response.ok) {
      throw new Error(`Unable to load ${GEOJSON_FILE}`);
    }

    const data = await response.json();
    const features = data.features || [];

    const projectIndex = features.findIndex((feature, index) => {
      return String(getFeatureId(feature, index)) === String(projectId);
    });

    if (projectIndex === -1) {
      showProjectNotFound(
        'This fuel treatment area could not be found in the GeoJSON file.'
      );
      return;
    }

    const project = features[projectIndex];
    const props = project.properties || {};

    const name = getFeatureName(project, projectIndex);
    const customDetails = getCustomProjectDetails(name);

    const customDetails = getCustomProjectDetails(name);

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

    const funding = getProperty(props, [
      'funding',
      'Funding',
      'FUNDING',
      'funding_source',
      'Funding_Source',
      'FUNDING_SOURCE'
    ]);

    const contact = getProperty(props, [
      'contact',
      'Contact',
      'CONTACT',
      'contact_name',
      'Contact_Name',
      'CONTACT_NAME'
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

setText('projectName', name);

setText(
  'projectDescription',
  customDetails?.description ||
    description ||
    'No description is currently listed for this fuel treatment area.'
);

setText('projectType', customDetails?.focusArea || type);
setText('projectStatus', customDetails?.status || status);
setText('projectAcres', acres);
setText('projectYear', customDetails?.duration || year);
setText('projectLead', customDetails?.leadImplementer || lead);
setText('projectFunding', funding);
setText('projectContact', contact);

    const relatedLinks = document.getElementById('projectRelatedLinks');

if (relatedLinks) {
  if (customDetails?.storyMapUrl) {
    relatedLinks.innerHTML = `
      <h3>Related Links</h3>
      <p>
        <a href="${customDetails.storyMapUrl}" target="_blank" rel="noopener noreferrer">
          View Montecito Roadside Fuel Reduction StoryMap
        </a>
      </p>
    `;
  } else {
    relatedLinks.innerHTML = '';
  }
}

    populateAttributeTable(props);
    drawDetailMap(project);
  } catch (error) {
    console.warn('Could not load project detail:', error);
    showProjectNotFound(
      'There was a problem loading the fuel treatment GeoJSON file.'
    );
  }
}
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
function drawDetailMap(project) {
  const detailMap = L.map('detailMap').setView([34.7, -120.0], 9);

  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: 'Tiles &copy; Esri'
    }
  ).addTo(detailMap);

  const layer = L.geoJSON(project, {
    style: getFuelTreatmentStyle,

    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng, {
        radius: 8,
        color: '#0f172a',
        weight: 2,
        fillColor: '#14b8a6',
        fillOpacity: 0.85
      });
    }
  }).addTo(detailMap);

  if (layer.getBounds().isValid()) {
    detailMap.fitBounds(layer.getBounds(), {
      padding: [30, 30],
      maxZoom: 15
    });
  }
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
loadProjectDetail();
