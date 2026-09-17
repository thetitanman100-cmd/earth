import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";


// ======================================================
// BASIC HELPERS
// ======================================================

const $ = (selector) => document.querySelector(selector);

const globeHost = $("#globe");
const loading = $("#globeLoading");


// ======================================================
// APPLICATION STATE
// ======================================================

const state = {
  lat: 20.5937,
  lon: 78.9629,

  map: null,
  mapMarker: null,
  mapCircle: null,

  weatherRequest: 0,
  streetRequest: 0,
  locationRequest: 0,

  downX: 0,
  downY: 0,
  moved: false,
  placeName: "India"
};


// ======================================================
// THREE.JS SCENE
// ======================================================

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  38,
  1,
  0.05,
  100
);

camera.position.set(
  0,
  0.12,
  3.05
);


// ======================================================
// RENDERER
// ======================================================

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, 2)
);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.12;

renderer.setClearColor(
  0x000000,
  0
);

globeHost.appendChild(
  renderer.domElement
);


// ======================================================
// ORBIT CONTROLS
// ======================================================

const controls = new OrbitControls(
  camera,
  renderer.domElement
);

// OrbitControls is used only for smooth zoom.
// Earth rotation is handled below so it has no left/right or
// up/down rotational limits and can keep spinning indefinitely.
controls.enablePan = false;
controls.enableRotate = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.zoomSpeed = 0.75;
controls.minDistance = 1.55;
controls.maxDistance = 5.25;
controls.target.set(0, 0, 0);

// ------------------------------------------------------
// UNLIMITED EARTH ROTATION / DRAG INERTIA
// ------------------------------------------------------
const rotationState = {
  dragging: false,
  pointerId: null,
  lastX: 0,
  lastY: 0,
  velocityX: 0,
  velocityY: 0,
  lastMoveTime: 0,
  moved: false,
  idleTime: 0
};

const ROTATION_SENSITIVITY = 0.0052;
const MAX_VELOCITY = 0.075;
const FRICTION = 0.94;
const IDLE_ROTATION = 0.00055;
const IDLE_DELAY = 900;

function wrapAngle(angle) {
  const twoPi = Math.PI * 2;
  return ((angle + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
}

function beginEarthDrag(event) {
  if (event.button !== 0 && event.pointerType !== "touch") return;

  rotationState.dragging = true;
  rotationState.pointerId = event.pointerId;
  rotationState.lastX = event.clientX;
  rotationState.lastY = event.clientY;
  rotationState.velocityX = 0;
  rotationState.velocityY = 0;
  rotationState.lastMoveTime = performance.now();
  rotationState.moved = false;
  rotationState.idleTime = 0;

  renderer.domElement.setPointerCapture?.(event.pointerId);
  renderer.domElement.style.cursor = "grabbing";
}

function moveEarthDrag(event) {
  if (!rotationState.dragging || event.pointerId !== rotationState.pointerId) return;

  const now = performance.now();
  const dt = Math.max(8, now - rotationState.lastMoveTime);
  const dx = event.clientX - rotationState.lastX;
  const dy = event.clientY - rotationState.lastY;

  if (Math.hypot(dx, dy) > 3) {
    rotationState.moved = true;
    state.moved = true;
  }

  // Horizontal and vertical movement both rotate the actual Earth.
  // There are deliberately NO angle clamps.
  const targetVX = dx * ROTATION_SENSITIVITY * (16.67 / dt);
  const targetVY = dy * ROTATION_SENSITIVITY * (16.67 / dt);

  rotationState.velocityX =
    THREE.MathUtils.clamp(targetVX, -MAX_VELOCITY, MAX_VELOCITY);

  rotationState.velocityY =
    THREE.MathUtils.clamp(targetVY, -MAX_VELOCITY, MAX_VELOCITY);

  globe.rotation.y += dx * ROTATION_SENSITIVITY;
  globe.rotation.x += dy * ROTATION_SENSITIVITY;

  // Keep the numerical angles small without creating a physical edge.
  globe.rotation.y = wrapAngle(globe.rotation.y);
  globe.rotation.x = wrapAngle(globe.rotation.x);

  rotationState.lastX = event.clientX;
  rotationState.lastY = event.clientY;
  rotationState.lastMoveTime = now;
  rotationState.idleTime = 0;
}

function endEarthDrag(event) {
  if (!rotationState.dragging) return;
  if (event.pointerId !== undefined && event.pointerId !== rotationState.pointerId) return;

  rotationState.dragging = false;
  rotationState.pointerId = null;
  rotationState.idleTime = 0;

  if (event.pointerId !== undefined) {
    renderer.domElement.releasePointerCapture?.(event.pointerId);
  }

  renderer.domElement.style.cursor = "grab";
renderer.domElement.style.touchAction = "none";
}

renderer.domElement.style.cursor = "grab";
renderer.domElement.addEventListener("pointerdown", beginEarthDrag);
renderer.domElement.addEventListener("pointermove", moveEarthDrag);
renderer.domElement.addEventListener("pointerup", endEarthDrag);
renderer.domElement.addEventListener("pointercancel", endEarthDrag);
renderer.domElement.addEventListener("lostpointercapture", () => {
  rotationState.dragging = false;
  rotationState.pointerId = null;
  renderer.domElement.style.cursor = "grab";
});


// ======================================================
// EARTH GROUP
// ======================================================

const globe = new THREE.Group();

scene.add(globe);


// ======================================================
// TEXTURES
// ======================================================

const loader = new THREE.TextureLoader();

loader.setCrossOrigin("anonymous");

const textureURL =
  "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";

const normalURL =
  "https://threejs.org/examples/textures/planets/earth_normal_2048.jpg";

const specularURL =
  "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg";


const earthTexture = loader.load(
  textureURL,

  () => {

    earthTexture.colorSpace =
      THREE.SRGBColorSpace;

    loading.classList.add("hidden");

  },

  undefined,

  () => {

    const span =
      loading.querySelector("span");

    if (span) {
      span.textContent =
        "EARTH TEXTURE UNAVAILABLE";
    }

  }
);


const normalTexture =
  loader.load(normalURL);

const specularTexture =
  loader.load(specularURL);


// ======================================================
// EARTH
// ======================================================

const earth = new THREE.Mesh(

  new THREE.SphereGeometry(
    1,
    128,
    128
  ),

  new THREE.MeshPhongMaterial({

    map: earthTexture,

    normalMap: normalTexture,

    normalScale:
      new THREE.Vector2(
        0.42,
        0.42
      ),

    specularMap:
      specularTexture,

    specular:
      new THREE.Color(
        0x496b9e
      ),

    shininess: 13

  })

);

earth.name = "Earth";

globe.add(earth);


// ======================================================
// CLOUD / ATMOSPHERE SHELL
// ======================================================

const cloudShell = new THREE.Mesh(

  new THREE.SphereGeometry(
    1.012,
    96,
    96
  ),

  new THREE.MeshPhongMaterial({

    map: earthTexture,

    transparent: true,

    opacity: 0.085,

    depthWrite: false,

    blending:
      THREE.AdditiveBlending

  })

);

globe.add(cloudShell);


// ======================================================
// ATMOSPHERE
// ======================================================

const atmosphere = new THREE.Mesh(

  new THREE.SphereGeometry(
    1.045,
    96,
    96
  ),

  new THREE.MeshBasicMaterial({

    color: 0x5d8dff,

    transparent: true,

    opacity: 0.105,

    side: THREE.BackSide,

    blending:
      THREE.AdditiveBlending,

    depthWrite: false

  })

);

globe.add(atmosphere);


// ======================================================
// OUTER RIM
// ======================================================

const rim = new THREE.Mesh(

  new THREE.SphereGeometry(
    1.055,
    96,
    96
  ),

  new THREE.MeshBasicMaterial({

    color: 0x86a8ff,

    transparent: true,

    opacity: 0.04,

    side: THREE.BackSide,

    blending:
      THREE.AdditiveBlending,

    depthWrite: false

  })

);

globe.add(rim);


// ======================================================
// LIGHTING
// ======================================================

scene.add(
  new THREE.AmbientLight(
    0x8ea3c9,
    1.25
  )
);


const sun =
  new THREE.DirectionalLight(
    0xffffff,
    2.8
  );

sun.position.set(
  4.5,
  2.5,
  4.2
);

scene.add(sun);


const fill =
  new THREE.DirectionalLight(
    0x516eff,
    0.65
  );

fill.position.set(
  -4,
  -1,
  -3
);

scene.add(fill);


// ======================================================
// LOCATION MARKER
// ======================================================

const markerGroup =
  new THREE.Group();

globe.add(markerGroup);


const markerDot =
  new THREE.Mesh(

    new THREE.SphereGeometry(
      0.022,
      24,
      24
    ),

    new THREE.MeshBasicMaterial({
      color: 0xffffff
    })

  );

markerGroup.add(markerDot);


const markerRing =
  new THREE.Mesh(

    new THREE.RingGeometry(
      0.038,
      0.046,
      48
    ),

    new THREE.MeshBasicMaterial({

      color: 0x8ea7ff,

      transparent: true,

      opacity: 0.95,

      side: THREE.DoubleSide

    })

  );

markerGroup.add(markerRing);

markerGroup.visible = false;


// ======================================================
// RESIZE
// ======================================================

function resizeRenderer() {

  const rect =
    globeHost.getBoundingClientRect();

  const width =
    Math.max(1, rect.width);

  const height =
    Math.max(1, rect.height);

  renderer.setSize(
    width,
    height,
    false
  );

  camera.aspect =
    width / height;

  camera.updateProjectionMatrix();
}


resizeRenderer();

window.addEventListener(
  "resize",
  resizeRenderer
);


// ======================================================
// LAT/LON → 3D
// ======================================================

function latLonToVector3(
  lat,
  lon,
  radius = 1.025
) {

  const phi =
    (90 - lat) *
    Math.PI /
    180;

  const theta =
    (lon + 180) *
    Math.PI /
    180;

  return new THREE.Vector3(

    -radius *
      Math.sin(phi) *
      Math.cos(theta),

    radius *
      Math.cos(phi),

    radius *
      Math.sin(phi) *
      Math.sin(theta)

  );
}


// ======================================================
// 3D → LAT/LON
// ======================================================

function vector3ToLatLon(
  vector
) {

  const n =
    vector.clone().normalize();

  const lat =
    Math.asin(n.y) *
    180 /
    Math.PI;

  const lon =
    Math.atan2(
      n.z,
      -n.x
    ) *
    180 /
    Math.PI -
    180;

  return {
    lat,
    lon: normalizeLon(lon)
  };
}


// ======================================================
// NORMALIZE LONGITUDE
// ======================================================

function normalizeLon(lon) {

  return (
    ((lon + 180) % 360 + 360) %
    360
  ) - 180;
}


// ======================================================
// FORMAT COORDINATES
// ======================================================

function formatCoord(
  lat,
  lon
) {

  const ns =
    lat >= 0 ? "N" : "S";

  const ew =
    lon >= 0 ? "E" : "W";

  return `${Math.abs(lat).toFixed(3)}° ${ns} · ${Math.abs(lon).toFixed(3)}° ${ew}`;
}


function displayLocation(
  lat,
  lon
) {

  const ns =
    lat >= 0 ? "N" : "S";

  const ew =
    lon >= 0 ? "E" : "W";

  return `${Math.abs(lat).toFixed(3)}° ${ns} · ${Math.abs(lon).toFixed(3)}° ${ew}`;
}


// ======================================================
// SET MARKER
// ======================================================

function setMarker(
  lat,
  lon
) {

  const position =
    latLonToVector3(
      lat,
      lon,
      1.028
    );

  markerGroup.position.copy(
    position
  );

  markerGroup.quaternion.setFromUnitVectors(

    new THREE.Vector3(
      0,
      0,
      1
    ),

    position
      .clone()
      .normalize()

  );

  markerGroup.visible = true;
}


// ======================================================
// LOCATION NAME / REVERSE GEOCODING
// ======================================================

function makePlaceName(address = {}, fallbackLat = state.lat, fallbackLon = state.lon) {
  const parts = [];

  const locality =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    address.state;

  if (locality) parts.push(locality);

  const country = address.country;
  if (country && country !== locality) parts.push(country);

  if (parts.length) return parts.join(", ");
  return formatCoord(fallbackLat, fallbackLon);
}

async function reverseGeocode(lat, lon) {
  const requestId = ++state.locationRequest;

  $("#targetName").textContent = "LOCATING…";
  $("#selectedTitle").textContent = "Locating selected point…";

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) throw new Error("Location lookup failed.");

    const data = await response.json();
    if (requestId !== state.locationRequest) return;

    const name = makePlaceName(data.address, lat, lon);
    state.placeName = name;

    $("#targetName").textContent = name;
    $("#selectedTitle").textContent = name;
    $("#selectedDescription").textContent =
      `Selected ${name}. Explore the satellite surroundings, street imagery and current conditions below.`;

    if (data.display_name) {
      $("#streetLocation").textContent =
        `Nearest area: ${data.display_name}`;
    }
  } catch (error) {
    if (requestId !== state.locationRequest) return;

    const fallback = formatCoord(lat, lon);
    state.placeName = fallback;
    $("#targetName").textContent = fallback;
    $("#selectedTitle").textContent = fallback;
    $("#selectedDescription").textContent =
      `Selected point at ${fallback}. Explore the satellite surroundings, street imagery and current conditions below.`;
  }
}


// ======================================================
// SET TARGET
// ======================================================

function setTarget(
  lat,
  lon,
  options = {}
) {

  state.lat =
    Number(lat);

  state.lon =
    normalizeLon(
      Number(lon)
    );

  setMarker(
    state.lat,
    state.lon
  );


  $("#lat").textContent =
    `${state.lat.toFixed(3)}°`;

  $("#lon").textContent =
    `${state.lon.toFixed(3)}°`;

  $("#targetCoords").textContent =
    displayLocation(
      state.lat,
      state.lon
    );

  $("#mapCoords").textContent =
    displayLocation(
      state.lat,
      state.lon
    );

  $("#selectedTitle").textContent =
    state.placeName || "Locating selected point…";

  $("#selectedDescription").textContent =
    `Selected point at ${formatCoord(
      state.lat,
      state.lon
    )}. Looking up the nearest named location…`;

  reverseGeocode(
    state.lat,
    state.lon
  );


  $("#mapsLink").href =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${state.lat},${state.lon}`
    )}`;


  if (
    options.loadWeather !== false
  ) {

    loadWeather(
      state.lat,
      state.lon
    );

  }


  updateMap(
    state.lat,
    state.lon
  );


  if (options.streetView) {

    loadStreetView(
      state.lat,
      state.lon
    );

  }

}


// ======================================================
// EARTH CLICKING
// ======================================================

const raycaster =
  new THREE.Raycaster();

const pointer =
  new THREE.Vector2();


renderer.domElement.addEventListener(
  "pointerdown",
  (event) => {
    state.downX = event.clientX;
    state.downY = event.clientY;
    state.moved = false;
  }
);

renderer.domElement.addEventListener(
  "pointermove",
  (event) => {
    if (
      Math.hypot(
        event.clientX - state.downX,
        event.clientY - state.downY
      ) > 8
    ) {
      state.moved = true;
    }
  }
);


renderer.domElement.addEventListener(
  "click",
  (event) => {

    // Don't select when the user was dragging
    if (state.moved) return;


    const rect =
      renderer.domElement.getBoundingClientRect();


    pointer.x =
      ((event.clientX - rect.left) /
        rect.width) *
      2 -
      1;


    pointer.y =
      -(
        (event.clientY - rect.top) /
        rect.height
      ) *
      2 +
      1;


    raycaster.setFromCamera(
      pointer,
      camera
    );


    const hit =
      raycaster.intersectObject(
        earth,
        false
      )[0];


    if (!hit) return;


    const local =
      globe.worldToLocal(
        hit.point.clone()
      );


    const coords =
      vector3ToLatLon(local);


    setTarget(
      coords.lat,
      coords.lon,
      {
        loadWeather: true,
        streetView: false
      }
    );


    $("#connection").textContent =
      "● LOCATION LOCKED";

  }
);


// ======================================================
// ZOOM DISPLAY
// ======================================================

controls.addEventListener(
  "change",
  () => {

    const distance =
      camera.position.distanceTo(
        controls.target
      );

    const zoom =
      Math.max(
        0.25,
        3.05 / distance
      );

    $("#zoom").textContent =
      `${zoom.toFixed(2)}×`;

  }
);


// ======================================================
// DESCEND BUTTON
// ======================================================

$("#descend").addEventListener(
  "click",
  () => {

    document
      .querySelector("#mission")
      .scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    loadStreetView(
      state.lat,
      state.lon
    );

  }
);


// ======================================================
// EXPLORE BUTTON
// ======================================================

$("#jumpTop").addEventListener(
  "click",
  () => {

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }
);


// ======================================================
// WEATHER
// ======================================================

async function loadWeather(
  lat,
  lon
) {

  const requestId =
    ++state.weatherRequest;


  $("#weatherStatus").textContent =
    "LOADING";

  $("#temp").textContent =
    "—";

  $("#wind").textContent =
    "—";

  $("#bigTemp").textContent =
    "—°";

  $("#condition").textContent =
    "Loading current conditions…";


  try {

    const url =
      new URL(
        "https://api.open-meteo.com/v1/forecast"
      );


    url.searchParams.set(
      "latitude",
      lat
    );

    url.searchParams.set(
      "longitude",
      lon
    );

    url.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
    );

    url.searchParams.set(
      "timezone",
      "auto"
    );


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        "Weather request failed"
      );

    }


    const data =
      await response.json();


    if (
      requestId !==
      state.weatherRequest
    ) {

      return;

    }


    const current =
      data.current;


    $("#temp").textContent =
      `${current.temperature_2m}°C`;

    $("#wind").textContent =
      `${current.wind_speed_10m} km/h`;

    $("#bigTemp").textContent =
      `${Math.round(
        current.temperature_2m
      )}°`;

    $("#wWind").textContent =
      `${current.wind_speed_10m} km/h`;

    $("#humidity").textContent =
      `${current.relative_humidity_2m}%`;

    $("#weatherCode").textContent =
      current.weather_code;

    $("#condition").textContent =
      weatherCodeName(
        current.weather_code
      );


    $("#localTime").textContent =
      new Date(
        current.time
      ).toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );


    $("#weatherStatus").textContent =
      "CURRENT";

  }

  catch (error) {

    if (
      requestId !==
      state.weatherRequest
    ) {

      return;

    }


    console.error(
      "Weather error:",
      error
    );


    $("#weatherStatus").textContent =
      "OFFLINE";

    $("#condition").textContent =
      "Weather unavailable right now";

  }

}


// ======================================================
// WEATHER CODE
// ======================================================

function weatherCodeName(
  code
) {

  if (code === 0)
    return "CLEAR SKY";

  if ([1, 2, 3].includes(code))
    return "PARTLY CLOUDY";

  if ([45, 48].includes(code))
    return "FOG";

  if (
    [51, 53, 55, 56, 57]
      .includes(code)
  )
    return "DRIZZLE";

  if (
    [61, 63, 65, 66, 67]
      .includes(code)
  )
    return "RAIN";

  if (
    [71, 73, 75, 77]
      .includes(code)
  )
    return "SNOW";

  if (
    [80, 81, 82]
      .includes(code)
  )
    return "SHOWERS";

  if (
    [95, 96, 99]
      .includes(code)
  )
    return "THUNDERSTORM";

  return "UNKNOWN";
}


// ======================================================
// LEAFLET MAP
// ======================================================

function initMap() {

  if (
    !window.L ||
    state.map
  ) {

    return;

  }


  state.map =
    L.map(
      "satelliteMap",
      {
        zoomControl: true,
        worldCopyJump: true
      }
    ).setView(
      [
        state.lat,
        state.lon
      ],
      5
    );


  // ====================================================
  // OPENSTREETMAP
  // ====================================================

  const osmLayer =
    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {

        maxZoom: 19,

        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'

      }
    );


  // ====================================================
  // ESRI SATELLITE
  // ====================================================

  const satelliteLayer =
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {

        maxZoom: 19,

        attribution:
          "Tiles &copy; Esri"

      }
    );


  // Start with satellite
  satelliteLayer.addTo(
    state.map
  );


  // ====================================================
  // MAP LAYER SWITCHER
  // ====================================================

  const baseMaps = {

    "🛰️ Satellite":
      satelliteLayer,

    "🗺️ OpenStreetMap":
      osmLayer

  };


  L.control
    .layers(
      baseMaps,
      null,
      {
        position: "topright"
      }
    )
    .addTo(
      state.map
    );


  // ====================================================
  // LOCATION MARKER
  // ====================================================

  state.mapMarker =
    L.circleMarker(
      [
        state.lat,
        state.lon
      ],
      {

        radius: 7,

        color: "#ffffff",

        weight: 2,

        fillColor: "#8d7aff",

        fillOpacity: 1

      }
    ).addTo(
      state.map
    );


  // ====================================================
  // LOCATION CIRCLE
  // ====================================================

  state.mapCircle =
    L.circle(
      [
        state.lat,
        state.lon
      ],
      {

        radius: 9000,

        color: "#8d7aff",

        weight: 1,

        opacity: 0.7,

        fill: false

      }
    ).addTo(
      state.map
    );


  // ====================================================
  // MAP CLICK
  // ====================================================

  state.map.on(
    "click",
    (event) => {

      setTarget(
        event.latlng.lat,
        event.latlng.lng,
        {
          loadWeather: true,
          streetView: false
        }
      );


      $("#connection").textContent =
        "● MAP LOCATION LOCKED";

    }
  );

}


// ======================================================
// UPDATE MAP
// ======================================================

function updateMap(
  lat,
  lon
) {

  if (!state.map) {

    initMap();

  }


  if (
    !state.map ||
    !state.mapMarker ||
    !state.mapCircle
  ) {

    return;

  }


  state.mapMarker.setLatLng(
    [
      lat,
      lon
    ]
  );


  state.mapCircle.setLatLng(
    [
      lat,
      lon
    ]
  );


  state.map.setView(
    [
      lat,
      lon
    ],
    Math.max(
      state.map.getZoom(),
      6
    ),
    {
      animate: true
    }
  );

}


// ======================================================
// GOOGLE STREET VIEW
// ======================================================

async function loadStreetView(
  lat,
  lon
) {

  const requestId =
    ++state.streetRequest;


  const frame =
    $("#streetFrame");

  const status =
    $("#streetStatus");


  status.textContent =
    "SEARCHING";


  frame.innerHTML =
    `
      <div class="street-placeholder">
        <div class="loading-ring"></div>
        <p>
          Finding the nearest Google Street View image…
        </p>
      </div>
    `;


  try {

    const response =
      await fetch(
        `/api/streetview?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
      );


    const data =
      await response.json();


    if (
      requestId !==
      state.streetRequest
    ) {

      return;

    }


    if (!response.ok) {

      throw new Error(
        data.error ||
        "No Street View image"
      );

    }


    const img =
      new Image();


    img.alt =
      `Google Street View near ${formatCoord(
        lat,
        lon
      )}`;


    img.loading =
      "eager";


    img.src =
      data.imageUrl;


    img.onload =
      () => {

        if (
          requestId !==
          state.streetRequest
        ) {

          return;

        }


        frame.innerHTML =
          "";


        frame.appendChild(
          img
        );


        status.textContent =
          "FOUND";


        $("#streetLocation").textContent =
          `Nearest imagery: ${formatCoord(
            data.location.lat,
            data.location.lng
          )}`;

      };


    img.onerror =
      () => {

        status.textContent =
          "ERROR";


        frame.innerHTML =
          `
            <div class="street-placeholder">
              <p>
                Street View image could not be displayed.
              </p>
            </div>
          `;

      };

  }

  catch (error) {

    if (
      requestId !==
      state.streetRequest
    ) {

      return;

    }


    console.error(
      "Street View error:",
      error
    );


    status.textContent =
      "NOT FOUND";


    frame.innerHTML =
      `
        <div class="street-placeholder">

          <div class="street-icon">
            ⌖
          </div>

          <p>
            ${escapeHTML(
              error.message
            )}
          </p>

          <a
            href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${lat},${lon}`
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >
            OPEN GOOGLE MAPS ↗
          </a>

        </div>
      `;


    $("#streetLocation").textContent =
      "No nearby static Street View image found";

  }

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(
  value
) {

  return String(value)
    .replace(
      /[&<>'"]/g,
      (char) => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"

      }[char])
    );

}


// ======================================================
// START APPLICATION
// ======================================================

initMap();


setTarget(
  state.lat,
  state.lon,
  {
    loadWeather: true,
    streetView: false
  }
);


// ======================================================
// ANIMATION LOOP
// ======================================================

let previousFrameTime = performance.now();

function animate(time) {
  requestAnimationFrame(animate);

  const dt = Math.min(
    2.5,
    Math.max(0.25, (time - previousFrameTime) / 16.67)
  );
  previousFrameTime = time;

  controls.update();

  // ----------------------------------------------------
  // DRAG RELEASE MOMENTUM
  // ----------------------------------------------------
  if (!rotationState.dragging) {
    const speed =
      Math.abs(rotationState.velocityX) +
      Math.abs(rotationState.velocityY);

    if (speed > 0.00001) {
      globe.rotation.y += rotationState.velocityX * dt;
      globe.rotation.x += rotationState.velocityY * dt;

      globe.rotation.y = wrapAngle(globe.rotation.y);
      globe.rotation.x = wrapAngle(globe.rotation.x);

      rotationState.velocityX *= Math.pow(FRICTION, dt);
      rotationState.velocityY *= Math.pow(FRICTION, dt);
      rotationState.idleTime += 16.67 * dt;
    } else {
      rotationState.velocityX = 0;
      rotationState.velocityY = 0;
      rotationState.idleTime += 16.67 * dt;
    }

    // After the thrown Earth slows down, keep it gently rotating
    // forever instead of stopping at an invisible boundary.
    if (rotationState.idleTime > IDLE_DELAY) {
      globe.rotation.y += IDLE_ROTATION * dt;
      globe.rotation.y = wrapAngle(globe.rotation.y);
    }
  } else {
    rotationState.idleTime = 0;
  }

  // Pulsing location marker
  const pulse =
    1 +
    Math.sin(time * 0.0024) * 0.08;

  markerRing.scale.setScalar(pulse);

  // Very subtle cloud movement
  cloudShell.rotation.y += 0.000055 * dt;

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);


