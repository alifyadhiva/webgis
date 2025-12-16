// Global Variables
const searchIndex = [];

// Init map
const map = L.map("map", { zoomControl: false }).setView([-2.5, 118], 5);

// Pane Projects
map.createPane("projectsPane");
map.getPane("projectsPane").style.zIndex = 430;

// Layer Group Projects
const projectsLayers = {
  desk: L.layerGroup([], { pane: "projectsPane" }),
  notDesk: L.layerGroup([], { pane: "projectsPane" }),
  mapping: L.layerGroup([], { pane: "projectsPane" }),
  survey: L.layerGroup([], { pane: "projectsPane" })
};

// Basemaps
const baseLayers = {
  "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }),
  "MapLibre Streets": L.tileLayer("https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=Z5VIeqPMzR9Mm2lcTT57", { maxZoom: 19 }),
  "Google Satellite": L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", { maxZoom: 20 }),
  "Google Terrain": L.tileLayer("https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}", { maxZoom: 20 }),
  "Google Street": L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", { maxZoom: 20 }),
  "Topographic": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20 })
};

// Default basemap
baseLayers["OpenStreetMap"].addTo(map);

// Minimap
new L.Control.MiniMap(
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"),
  { toggleDisplay: true, minimized: false, position: "bottomright" }
).addTo(map);

// Zoom
L.control.zoom({ position: "bottomright" }).addTo(map);

// Sidebar
const sidebar = document.getElementById("sidebar");
document.getElementById("toggleSidebar").onclick = () => sidebar.classList.toggle("collapsed");

// Basemap Selector (Dropdown dengan style)
const basemapControlDiv = document.getElementById("basemapControl");

// Buat elemen select
const select = document.createElement("select");
select.id = "basemapDropdown";

// Tambahkan opsi dari baseLayers
Object.keys(baseLayers).forEach(name => {
  const option = document.createElement("option");
  option.value = name;
  option.text = name;
  if (map.hasLayer(baseLayers[name])) {
    option.selected = true;
  }
  select.appendChild(option);
});

// Masukkan dropdown ke container
basemapControlDiv.appendChild(select);

// Event onchange untuk ganti basemap
select.onchange = e => {
  const selected = e.target.value;
  Object.values(baseLayers).forEach(layer => map.removeLayer(layer));
  baseLayers[selected].addTo(map);
};

// Layer WIUP (Vector Tile)
// Fungsi untuk generate warna dari string komoditas
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash → color hex
  let color = "#";
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).slice(-2);
  }
  return color;
}

let komoditasSet = new Set();
let activeFilter = "ALL";


// Layer WIUP (Vector Tile)
const wiupLayer = L.vectorGrid.protobuf(
  "https://api.maptiler.com/tiles/019ad094-0cbc-7979-9a4a-5a6b1e2c1ee1/{z}/{x}/{y}.pbf?key=Z5VIeqPMzR9Mm2lcTT57",
  {
    interactive: true,
    maxNativeZoom: 9,
    maxZoom: 22,

    vectorTileLayerStyles: {
      "WIUP_250612": properties => {
        const kom = (properties.komoditas || "").trim().toUpperCase();

        // Simpan komoditas untuk legend + filter
        if (kom) komoditasSet.add(kom);

        // FILTER: jika tidak cocok dengan dropdown → hide
        if (activeFilter !== "ALL" && kom !== activeFilter) {
          return {
            fill: false,
            stroke: false
          };
        }

        // warna otomatis
        const warna = stringToColor(kom);

        return {
          fill: true,
          fillOpacity: 0,
          color: warna,
          weight: 0.3
        };
      }
    }
  }
);

// WIUP Popup
wiupLayer.on("click", e => {
  let html = "<b>WIUP</b><br><hr>";
  const props = e.layer.properties;
  for (const k in props) html += `<b>${k}</b>: ${props[k]}<br>`;
  L.popup().setLatLng(e.latlng).setContent(html).openOn(map);
});

map.addLayer(wiupLayer);

//Dropdown Otomatis WIUP
function updateFilterOptions() {
  const select = document.getElementById("filterKomoditas");
  select.innerHTML = `<option value="ALL">Semua</option>`;

  [...komoditasSet].sort().forEach(kom => {
    const opt = document.createElement("option");
    opt.value = kom;
    opt.textContent = kom;
    select.appendChild(opt);
  });
}

// jalankan setelah map load
setTimeout(updateFilterOptions, 2000);

//Event Dropdown
document.getElementById("filterKomoditas").addEventListener("change", e => {
  activeFilter = e.target.value;
  wiupLayer.redraw();   // refresh layer
});


// Layer KLHK
const kLHKLayer = L.esri.tiledMapLayer({
  url: "https://geoportal.menlhk.go.id/server/rest/services/jsdgejawfvrdtasdt/KWS_HUTAN/MapServer",
  useCors: false
});

// Legend KLHK
const legendKLHK = document.getElementById("legendKLHK");

legendKLHK.innerHTML = `
  <b>Legend Kawasan Hutan KLHK</b>

  <div class="item"><span class="box" style="background:#AD40FF;"></span>Kawasan Konservasi</div>
  <div class="item"><span class="line" style="border-top:2px solid #AD40FF;"></span>Kawasan Konservasi Laut</div>
  <div class="item"><span class="box" style="background:#00AD00;"></span>Hutan Lindung</div>
  <div class="item"><span class="box" style="background:#FFFF00;"></span>Hutan Produksi Tetap</div>
  <div class="item"><span class="box" style="background:#8AF200;"></span>Hutan Produksi Terbatas</div>
  <div class="item"><span class="box" style="background:#FF5DFF;"></span>Hutan Produksi yang dapat di Konversi</div>
  <div class="item"><span class="box" style="background:#FFFFFF;border:1px solid #000;"></span>Area Penggunaan Lain</div>
  <div class="item"><span class="box" style="background:#00C5FF;"></span>Tubuh Air</div>
  <div class="item"><span class="box" style="background:#FF0000;"></span>Tidak Terdefinisi</div>
`;

legendKLHK.style.display = "none"; // awalnya disembunyikan

// Toggle Legend KLHK
document.getElementById("klhkCheck").addEventListener("change", function () {
  if (this.checked) {
    map.addLayer(kLHKLayer);
    legendKLHK.style.display = "block";
  } else {
    map.removeLayer(kLHKLayer);
    legendKLHK.style.display = "none";
  }
});

//Transparency
document.querySelectorAll(".expandBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        const li = btn.closest(".layer-item");              // cari parent LI
        const options = li.querySelector(".layer-options"); // ambil layer-options

        const shown = options.style.display === "block";
        options.style.display = shown ? "none" : "block";

        btn.textContent = shown ? "▼" : "▲";
    });
});

document.getElementById("wiupOpacity").addEventListener("input", function () {
  wiupLayer.setOpacity(parseFloat(this.value));
});

document.getElementById("klhkOpacity").addEventListener("input", function () {
  kLHKLayer.setOpacity(parseFloat(this.value));
});

document.getElementById("projectsOpacity").addEventListener("input", function () {
  const val = parseFloat(this.value);
  Object.values(projectsLayers).forEach(layerGroup => layerGroup.setStyle
    ? layerGroup.setStyle({ fillOpacity: val }) 
    : layerGroup.eachLayer(l => l.setStyle && l.setStyle({ fillOpacity: val }))
  );
});

// ===============================
// STYLE PROJECTS
// ===============================
function getProjectStyle(status) {
  switch (status) {
    case "desk studied":
      return { color: "#e91e63", fillOpacity: 0.5, weight: 1 };
    case "not yet desk studied":
      return { color: "#f44336", fillOpacity: 0.5, weight: 1 };
    case "mapping":
      return { color: "#2196f3", fillOpacity: 0.5, weight: 1 };
    case "survey":
      return { color: "#4caf50", fillOpacity: 0.5, weight: 1 };
    default:
      return { color: "#9e9e9e", fillOpacity: 0.3, weight: 1 };
  }
}

// ===============================
// POPUP PROJECTS
// ===============================
function onEachProjectFeature(feature, layer) {
  let html = "<b>PROJECT</b><hr><table>";

  for (const key in feature.properties) {
    if (key !== "geom" && feature.properties[key] !== null) {
      html += `
        <tr>
          <td><b>${key}</b></td>
          <td>${feature.properties[key]}</td>
        </tr>`;
    }
  }

  html += "</table>";
  layer.bindPopup(html);

  layer.on({
  mouseover: e => {
    e.target.setStyle({
      weight: 3,
      fillOpacity: 0.8
    });
  },
  mouseout: e => {
    layer.setStyle(getProjectStyle(feature.properties.status?.toLowerCase()));
  }
});
}

// === DRAG & DROP LAYER ORDER ===

//Layer Arrangement
document.querySelector("#wiupCheck").onchange = e => {
    const handle = document.querySelector('[data-layer="wiup"] .drag-handle');
    handle.style.display = e.target.checked ? "inline-block" : "none";

    // === tambah ini agar layer ikut tersembunyi ===
    if (e.target.checked) {
        map.addLayer(wiupLayer);
    } else {
        map.removeLayer(wiupLayer);
    }
};

document.querySelector("#klhkCheck").onchange = e => {
    const handle = document.querySelector('[data-layer="klhk"] .drag-handle');
    handle.style.display = e.target.checked ? "inline-block" : "none";

    // === tambah ini agar layer ikut tersembunyi ===
    if (e.target.checked) {
        map.addLayer(kLHKLayer);
    } else {
        map.removeLayer(kLHKLayer);
    }
};

document.querySelector("#projectsCheck").onchange = e => {
    const handle = document.querySelector('[data-layer="projects"] .drag-handle');
    handle.style.display = e.target.checked ? "inline-block" : "none";

    if (e.target.checked) {
        Object.values(projectsLayers).forEach(layer => map.addLayer(layer));
    } else {
        Object.values(projectsLayers).forEach(layer => map.removeLayer(layer));
    }
};


// inisialisasi handle sesuai status awal
document.querySelectorAll(".drag-handle").forEach(handle => {
    handle.setAttribute("draggable", true);
});

// 1. mulai drag
layerList.addEventListener("dragstart", e => {
    const handle = e.target.closest(".drag-handle");

    // kalau bukan handle → tidak bisa drag
    if (!handle) {
        e.preventDefault();
        return;
    }

    const li = handle.closest(".layer-item");
    draggingItem = li;
    li.classList.add("dragging");

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
});

// 2. drag bergerak
layerList.addEventListener("dragover", e => {
  e.preventDefault();
  const dragging = document.querySelector(".layer-item.dragging");
  const after = getDragAfterElement(layerList, e.clientY);

  if (!after) layerList.appendChild(dragging);
  else layerList.insertBefore(dragging, after);
});

// helper
function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll(".layer-item:not(.dragging)")];

  let closest = null;
  let closestOffset = -Infinity;

  els.forEach(el => {
    const box = el.getBoundingClientRect();
    const offset = y - (box.top + box.height / 2);

    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = el;
    }
  });

  return closest;
}

// 3. drag selesai
layerList.addEventListener("dragend", () => {
  if (draggingItem) {
    draggingItem.classList.remove("dragging");
    draggingItem = null;
    updateLayerOrder();
  }
});

// 4. apply ke Leaflet
function updateLayerOrder() {
  const items = [...layerList.querySelectorAll(".layer-item")];

  // dari bawah ke atas = z-index benar
  for (let i = items.length - 1; i >= 0; i--) {
    const id = items[i].dataset.layer;

    if (id === "wiup" && map.hasLayer(wiupLayer)) wiupLayer.bringToFront();
    if (id === "klhk" && map.hasLayer(kLHKLayer)) kLHKLayer.bringToFront();
    if (id === "projects") {
        Object.values(projectsLayers).forEach(layer => {
          if (map.hasLayer(layer)) layer.bringToFront();
        });
      }
  }
}

// ===============================
// LOAD PROJECTS FROM SUPABASE
// ===============================
const SUPABASE_URL = "https://jawzvjyfkewncsrxeefz.supabase.co";
const SUPABASE_KEY = "sb_publishable_QLgTh028XssSs5wZD2Tpqw_AC-wC_bv";

fetch(`${SUPABASE_URL}/rest/v1/projects?select=*`, {
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  }
})
.then(res => res.json())
.then(rows => {
  console.log("Rows:", rows);

  rows.forEach(row => {
    if (!row.geom) return;

    const feature = {
      type: "Feature",
      geometry: row.geom,
      properties: {
        ...row,
        geom: undefined
      }
    };

    const status = row.status?.toLowerCase();

    const layer = L.geoJSON(feature, {
      pane: "projectsPane",
      style: getProjectStyle(status),
      onEachFeature: onEachProjectFeature
    });

    if (status === "desk studied") projectsLayers.desk.addLayer(layer);
    else if (status === "not yet desk studied") projectsLayers.notDesk.addLayer(layer);
    else if (status === "mapping") projectsLayers.mapping.addLayer(layer);
    else if (status === "survey") projectsLayers.survey.addLayer(layer);

    const bounds = layer.getBounds();

    searchIndex.push({
      type: "PROJECT",
      code: feature.properties.code,
      name: feature.properties.company,
      layer: layer,
      bounds: bounds
    });
  });

  projectsLayers.desk.addTo(map);
  projectsLayers.notDesk.addTo(map);
  projectsLayers.mapping.addTo(map);
  projectsLayers.survey.addTo(map);
})
.catch(err => console.error("Supabase error:", err));

//Layer Project//
document.getElementById("projDesk").onchange = e => {
  e.target.checked
    ? map.addLayer(projectsLayers.desk)
    : map.removeLayer(projectsLayers.desk);
};

document.getElementById("projNotDesk").onchange = e => {
  e.target.checked
    ? map.addLayer(projectsLayers.notDesk)
    : map.removeLayer(projectsLayers.notDesk);
};

document.getElementById("projMapping").onchange = e => {
  e.target.checked
    ? map.addLayer(projectsLayers.mapping)
    : map.removeLayer(projectsLayers.mapping);
};

document.getElementById("projSurvey").onchange = e => {
  e.target.checked
    ? map.addLayer(projectsLayers.survey)
    : map.removeLayer(projectsLayers.survey);
};

//Autocomplete Search Engine
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase().trim();
  searchResults.innerHTML = "";

  if (q.length < 2) {
    searchResults.style.display = "none";
    return;
  }

  const matches = searchIndex.filter(item =>
    (item.code && item.code.toLowerCase().includes(q)) ||
    (item.name && item.name.toLowerCase().includes(q))
  ).slice(0, 15);

  if (!matches.length) {
    searchResults.style.display = "none";
    return;
  }

  matches.forEach(item => {
    const div = document.createElement("div");
    div.className = "search-item";

    div.innerHTML = `
      <b>${item.name}</b><br>
      <span class="search-type">
        ${item.type}${item.code ? " | " + item.code : ""}
      </span>
    `;

    div.onclick = () => {
      searchResults.style.display = "none";
      searchInput.value = item.name;

      if (item.bounds) {
        map.fitBounds(item.bounds, { maxZoom: 12 });
        item.layer.setStyle?.({ weight: 4, color: "#000" });
      } else if (item.latlng) {
        map.setView(item.latlng, 12);
      }
    };

    searchResults.appendChild(div);
  });

  searchResults.style.display = "block";
});

//UX fix
document.addEventListener("click", e => {
  if (!searchInput.contains(e.target)) {
    searchResults.style.display = "none";
  }
});

//KML Layer
const kmlLayers = [];

document.getElementById("kmlInput").addEventListener("change", e => {
  Array.from(e.target.files).forEach(file => {
    loadKMLWithOmnivore(file);
  });
});

function loadKMLWithOmnivore(file) {
  const reader = new FileReader();

  reader.onload = () => {
    const layer = omnivore.kml.parse(reader.result);

    layer.eachLayer(l => {
      l.bindPopup(file.name);
    });

    layer.addTo(map);
    map.fitBounds(layer.getBounds());

    kmlLayers.push({
      name: file.name,
      layer
    });

    updateKmlLayerList();
  };

  reader.readAsText(file);
}

// Geoman + Turf
map.pm.addControls({
  position: "topright",
  drawMarker: true,
  drawCircle: true,
  drawPolygon: true,
  drawPolyline: true,
  drawRectangle: true,
  editMode: true,
  dragMode: true,
  removalMode: true
});

// Turf.js Calculations
map.on("pm:create", (e) => {
  try {
    const layer = e.layer;
    const shape = e.shape;

    if (shape === "Polygon" || shape === "Rectangle") {
      const latlngs = layer.getLatLngs()[0].map(ll => [ll.lng, ll.lat]);
      latlngs.push(latlngs[0]);
      const polygon = turf.polygon([latlngs]);
      const areaHa = turf.area(polygon) / 10000;
      layer.bindPopup(`📏 Luas: ${areaHa.toFixed(2)} ha`).openPopup();
    }

    if (shape === "Line") {
      const latlngs = layer.getLatLngs().map(ll => [ll.lng, ll.lat]);
      const length = turf.length(turf.lineString(latlngs), { units: "kilometers" });
      layer.bindPopup(`📐 Panjang: ${length.toFixed(2)} km`).openPopup();
    }

    if (shape === "Circle") {
      const r = layer.getRadius();
      const area = Math.PI * r * r / 10000;
      layer.bindPopup(`🔵 Radius: ${(r/1000).toFixed(2)} km<br>Luas: ${area.toFixed(2)} ha`).openPopup();
    }

    if (shape === "Marker") {
      const latlng = layer.getLatLng();
      const lat = latlng.lat.toFixed(7);
      const lng = latlng.lng.toFixed(7);

      const popupHTML = `
        <b>Koordinat Marker</b><br>
        Latitude: ${lat}<br>
        Longitude: ${lng}<br><br>
        <button class="copyCoordBtn"
          style="
            padding:6px 10px;
            background:#ff8c00;
            color:#111;
            border:none;
            border-radius:5px;
            cursor:pointer;">
          Salin Koordinat
        </button>
      `;

      layer.bindPopup(popupHTML).openPopup();

      map.on("popupopen", (ev) => {
        if (ev.popup._source !== layer) return; // Pastikan popup punya marker ini

        setTimeout(() => {
          const popupEl = ev.popup.getElement();
          if (!popupEl) return;

          const btn = popupEl.querySelector(".copyCoordBtn");
          if (!btn) return;

          btn.addEventListener("click", () => {
            navigator.clipboard.writeText(`${lat}, ${lng}`);

            btn.innerText = "Tersalin!";
            btn.style.background = "#4caf50";

            setTimeout(() => {
              btn.innerText = "Salin Koordinat";
              btn.style.background = "#ff8c00";
            }, 1200);
          });
        }, 50);
      });
    }

  } catch (err) {
    console.error("Turf.js error:", err);
  }
});
