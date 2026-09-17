import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.2/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.181.2/examples/jsm/controls/OrbitControls.js";

const $ = (selector) => document.querySelector(selector);
const globeHost = $("#globe");
const loading = $("#globeLoading");

const state = {
  lat: 20.5937,
  lon: 78.9629,
  map: null,
  mapMarker: null,
  mapCircle: null,
  weatherRequest: 0,
  streetRequest: 0,
  selectedPoint: null,
  downX: 0,
  downY: 0,
  moved: false
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
camera.position.set(0, 0.12, 3.05);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.setClearColor(0x000000, 0);
globeHost.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

controls.enablePan = false;

controls.enableDamping = true;
controls.dampingFactor = 0.055;

controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.75;

controls.minDistance = 1.55;
controls.maxDistance = 5.25;

controls.minPolarAngle = 0.18;
controls.maxPolarAngle = Math.PI - 0.18;

/* Continuous Earth rotation */
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;
controls.target.set(0, 0, 0);
controls.saveState();

const globe = new THREE.Group();
scene.add(globe);

const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");

const textureURL = "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";
const normalURL = "https://threejs.org/examples/textures/planets/earth_normal_2048.jpg";
const specularURL = "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg";

const earthTexture = loader.load(textureURL, () => {
  earthTexture.colorSpace = THREE.SRGBColorSpace;
  loading.classList.add("hidden");
}, undefined, () => {
  loading.querySelector("span").textContent = "EARTH TEXTURE UNAVAILABLE";
});
const normalTexture = loader.load(normalURL);
const specularTexture = loader.load(specularURL);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(1, 128, 128),
  new THREE.MeshPhongMaterial({
    map: earthTexture,
    normalMap: normalTexture,
    normalScale: new THREE.Vector2(0.42, 0.42),
    specularMap: specularTexture,
    specular: new THREE.Color(0x496b9e),
    shininess: 13
  })
);
earth.name = "Earth";
globe.add(earth);

// A subtle cloud-like shell gives the planet a more dimensional atmosphere.
const cloudShell = new THREE.Mesh(
  new THREE.SphereGeometry(1.012, 96, 96),
  new THREE.MeshPhongMaterial({
    map: earthTexture,
    transparent: true,
    opacity: 0.085,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
);
globe.add(cloudShell);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.045, 96, 96),
  new THREE.MeshBasicMaterial({
    color: 0x5d8dff,
    transparent: true,
    opacity: 0.105,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
);
globe.add(atmosphere);

const rim = new THREE.Mesh(
  new THREE.SphereGeometry(1.055, 96, 96),
  new THREE.MeshBasicMaterial({
    color: 0x86a8ff,
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
);
globe.add(rim);

scene.add(new THREE.AmbientLight(0x8ea3c9, 1.25));
const sun = new THREE.DirectionalLight(0xffffff, 2.8);
sun.position.set(4.5, 2.5, 4.2);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x516eff, 0.65);
fill.position.set(-4, -1, -3);
scene.add(fill);

const markerGroup = new THREE.Group();
globe.add(markerGroup);
const markerDot = new THREE.Mesh(
  new THREE.SphereGeometry(0.022, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
markerGroup.add(markerDot);
const markerRing = new THREE.Mesh(
  new THREE.RingGeometry(0.038, 0.046, 48),
  new THREE.MeshBasicMaterial({ color: 0x8ea7ff, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
);
markerGroup.add(markerRing);
markerGroup.visible = false;

function resizeRenderer() {
  const rect = globeHost.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
resizeRenderer();
window.addEventListener("resize", resizeRenderer);

function latLonToVector3(lat, lon, radius = 1.025) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function vector3ToLatLon(vector) {
  const n = vector.clone().normalize();
  const lat = Math.asin(n.y) * 180 / Math.PI;
  const lon = Math.atan2(n.z, -n.x) * 180 / Math.PI - 180;
  return { lat, lon: normalizeLon(lon) };
}

function normalizeLon(lon) {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

function formatCoord(lat, lon) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}° ${ns} · ${Math.abs(lon).toFixed(3)}° ${ew}`;
}

function displayLocation(lat, lon) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}° ${ns} · ${Math.abs(lon).toFixed(3)}° ${ew}`;
}

function setMarker(lat, lon) {
  const position = latLonToVector3(lat, lon, 1.028);
  markerGroup.position.copy(position);
  markerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize());
  markerGroup.visible = true;
}

function setTarget(lat, lon, options = {}) {
  state.lat = Number(lat);
  state.lon = normalizeLon(Number(lon));
  setMarker(state.lat, state.lon);

  $("#lat").textContent = `${state.lat.toFixed(3)}°`;
  $("#lon").textContent = `${state.lon.toFixed(3)}°`;
  $("#targetCoords").textContent = displayLocation(state.lat, state.lon);
  $("#mapCoords").textContent = displayLocation(state.lat, state.lon);
  $("#selectedTitle").textContent = formatCoord(state.lat, state.lon);
  $("#selectedDescription").textContent = `Selected point at ${formatCoord(state.lat, state.lon)}. Explore the satellite surroundings, street imagery and current conditions below.`;
  $("#mapsLink").href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${state.lat},${state.lon}`)}`;

  if (options.loadWeather !== false) loadWeather(state.lat, state.lon);
  updateMap(state.lat, state.lon);
  if (options.streetView) loadStreetView(state.lat, state.lon);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("pointerdown", (event) => {
  state.downX = event.clientX;
  state.downY = event.clientY;
  state.moved = false;
});
renderer.domElement.addEventListener("pointermove", (event) => {
  if (Math.hypot(event.clientX - state.downX, event.clientY - state.downY) > 8) state.moved = true;
});
renderer.domElement.addEventListener("click", (event) => {
  if (state.moved) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(earth, false)[0];
  if (!hit) return;
  const local = globe.worldToLocal(hit.point.clone());
  const coords = vector3ToLatLon(local);
  setTarget(coords.lat, coords.lon, { loadWeather: true, streetView: false });
  $("#connection").textContent = "● LOCATION LOCKED";
});

controls.addEventListener("change", () => {
  const distance = camera.position.distanceTo(controls.target);
  const zoom = Math.max(0.25, 3.05 / distance);
  $("#zoom").textContent = `${zoom.toFixed(2)}×`;
});

$("#descend").addEventListener("click", () => {
  document.querySelector("#mission").scrollIntoView({ behavior: "smooth", block: "start" });
  loadStreetView(state.lat, state.lon);
});

$("#jumpTop").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

async function loadWeather(lat, lon) {
  const requestId = ++state.weatherRequest;
  $("#weatherStatus").textContent = "LOADING";
  $("#temp").textContent = "—";
  $("#wind").textContent = "—";
  $("#bigTemp").textContent = "—°";
  $("#condition").textContent = "Loading current conditions…";

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lon);
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code");
    url.searchParams.set("timezone", "auto");
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather request failed");
    const data = await response.json();
    if (requestId !== state.weatherRequest) return;
    const current = data.current;
    $("#temp").textContent = `${current.temperature_2m}°C`;
    $("#wind").textContent = `${current.wind_speed_10m} km/h`;
    $("#bigTemp").textContent = `${Math.round(current.temperature_2m)}°`;
    $("#wWind").textContent = `${current.wind_speed_10m} km/h`;
    $("#humidity").textContent = `${current.relative_humidity_2m}%`;
    $("#weatherCode").textContent = current.weather_code;
    $("#condition").textContent = weatherCodeName(current.weather_code);
    $("#localTime").textContent = new Date(current.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $("#weatherStatus").textContent = "CURRENT";
  } catch {
    if (requestId !== state.weatherRequest) return;
    $("#weatherStatus").textContent = "OFFLINE";
    $("#condition").textContent = "Weather unavailable right now";
  }
}

function weatherCodeName(code) {
  if (code === 0) return "CLEAR SKY";
  if ([1, 2, 3].includes(code)) return "PARTLY CLOUDY";
  if ([45, 48].includes(code)) return "FOG";
  if ([51, 53, 55, 56, 57].includes(code)) return "DRIZZLE";
  if ([61, 63, 65, 66, 67].includes(code)) return "RAIN";
  if ([71, 73, 75, 77].includes(code)) return "SNOW";
  if ([80, 81, 82].includes(code)) return "SHOWERS";
  if ([95, 96, 99].includes(code)) return "THUNDERSTORM";
  return "UNKNOWN";
}

function initMap() {
  if (!window.L || state.map) return;
  state.map = L.map("satelliteMap", { zoomControl: true, worldCopyJump: true }).setView([state.lat, state.lon], 5);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Tiles © Esri"
  }).addTo(state.map);
  state.mapMarker = L.circleMarker([state.lat, state.lon], {
    radius: 7,
    color: "#ffffff",
    weight: 2,
    fillColor: "#8d7aff",
    fillOpacity: 1
  }).addTo(state.map);
  state.mapCircle = L.circle([state.lat, state.lon], {
    radius: 9000,
    color: "#8d7aff",
    weight: 1,
    opacity: 0.7,
    fill: false
  }).addTo(state.map);
  state.map.on("click", (event) => {
    setTarget(event.latlng.lat, event.latlng.lng, { loadWeather: true, streetView: false });
    $("#connection").textContent = "● MAP LOCATION LOCKED";
  });
}

function updateMap(lat, lon) {
  if (!state.map) {
    initMap();
  }
  if (!state.map || !state.mapMarker || !state.mapCircle) return;
  state.mapMarker.setLatLng([lat, lon]);
  state.mapCircle.setLatLng([lat, lon]);
  state.map.setView([lat, lon], Math.max(state.map.getZoom(), 6), { animate: true });
}

async function loadStreetView(lat, lon) {
  const requestId = ++state.streetRequest;
  const frame = $("#streetFrame");
  const status = $("#streetStatus");
  status.textContent = "SEARCHING";
  frame.innerHTML = '<div class="street-placeholder"><div class="loading-ring"></div><p>Finding the nearest Google Street View image…</p></div>';

  try {
    const response = await fetch(`/api/streetview?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
    const data = await response.json();
    if (requestId !== state.streetRequest) return;
    if (!response.ok) throw new Error(data.error || "No Street View image");

    const img = new Image();
    img.alt = `Google Street View near ${formatCoord(lat, lon)}`;
    img.loading = "eager";
    img.src = data.imageUrl;
    img.onload = () => {
      if (requestId !== state.streetRequest) return;
      frame.innerHTML = "";
      frame.appendChild(img);
      status.textContent = "FOUND";
      $("#streetLocation").textContent = `Nearest imagery: ${formatCoord(data.location.lat, data.location.lng)}`;
    };
    img.onerror = () => {
      status.textContent = "ERROR";
      frame.innerHTML = '<div class="street-placeholder"><p>Street View image could not be displayed.</p></div>';
    };
  } catch (error) {
    if (requestId !== state.streetRequest) return;
    status.textContent = "NOT FOUND";
    frame.innerHTML = `<div class="street-placeholder"><div class="street-icon">⌖</div><p>${escapeHTML(error.message)}</p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}" target="_blank" rel="noopener noreferrer">OPEN GOOGLE MAPS ↗</a></div>`;
    $("#streetLocation").textContent = "No nearby static Street View image found";
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

initMap();
setTarget(state.lat, state.lon, { loadWeather: true, streetView: false });

function animate(time) {
  requestAnimationFrame(animate);
  controls.update();
  const pulse = 1 + Math.sin(time * 0.0024) * 0.08;
  markerRing.scale.setScalar(pulse);
  cloudShell.rotation.y += 0.000055;
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
