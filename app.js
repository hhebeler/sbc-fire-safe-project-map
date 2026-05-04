// Initialize the map centered on Santa Barbara County
const map = L.map('map').setView([34.7, -120.0], 9);

// Clean Esri World Topographic basemap
L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: 'Tiles &copy; Esri'
  }
).addTo(map);

// -----------------------------------------------------------------------------
// FUTURE FUEL TREATMENT GEOJSON PLACEHOLDER
// -----------------------------------------------------------------------------
// This function is ready for future fuel treatment GeoJSON files.
// It is intentionally NOT called right now.
//
// When you are ready to add a GeoJSON file, upload it to the repo root and call:
//
// loadFutureFuelTreatmentLayer('fuel_treatments.geojson', 'Fuel Treatment Areas');
//
// Example:
// loadFutureFuelTreatmentLayer('chipping_program_year_1.geojson', 'Chipping Program Year 1');

async function loadFutureFuelTreatmentLayer(fileName, layerName) {
  try {
    const response = await fetch(fileName);

    if (!response.ok) {
      throw new Error(`Unable to load ${layerName} from ${fileName}`);
    }

    const data = await response.json();

    const layer = L.geoJSON(data, {
      style: function () {
        return {
          color: '#0f766e',
          weight: 2,
          fillColor: '#14b8a6',
          fillOpacity: 0.25
        };
      },

      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 7,
          color: '#0f766e',
          weight: 2,
          fillColor: '#14b8a6',
          fillOpacity: 0.85
        });
      },

      onEachFeature: function (feature, layer) {
        const props = feature.properties || {};

        const name =
          props.name ||
          props.project_name ||
          props.treatment_name ||
          props.Name ||
          props.PROJECT ||
          props.PROJECT_NAME ||
          layerName;

        const type =
          props.treatment_type ||
          props.type ||
          props.Type ||
          props.TREATMENT_TYPE ||
          '';

        const status =
          props.status ||
          props.Status ||
          props.STATUS ||
          '';

        const acres =
          props.acres ||
          props.Acres ||
          props.ACRES ||
          '';

        const year =
          props.year ||
          props.Year ||
          props.YEAR ||
          '';

        const description =
          props.description ||
          props.Description ||
          props.DESCRIPTION ||
          '';

        layer.bindPopup(`
          <strong>${name}</strong><br>
          ${type ? `<b>Type:</b> ${type}<br>` : ''}
          ${status ? `<b>Status:</b> ${status}<br>` : ''}
          ${acres ? `<b>Acres:</b> ${acres}<br>` : ''}
          ${year ? `<b>Year:</b> ${year}<br>` : ''}
          ${description ? `<b>Description:</b> ${description}<br>` : ''}
        `);
      }
    }).addTo(map);

    if (layer.getBounds && layer.getBounds().isValid()) {
      map.fitBounds(layer.getBounds(), {
        padding: [30, 30],
        maxZoom: 13
      });
    }

    return layer;
  } catch (error) {
    console.warn(`Could not load ${layerName}:`, error);
    return null;
  }
}
