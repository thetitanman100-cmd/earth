# VIEW YOUR EARTH — v3

A futuristic interactive Earth explorer for VS Code and Node.js.

## What is fixed

- Large realistic 3D Earth using Three.js.
- Drag to orbit the Earth.
- Mouse wheel / trackpad to zoom.
- Click the Earth to select any visible point.
- Pulsing location marker.
- Current weather from Open-Meteo.
- Interactive Esri satellite map.
- Click the satellite map to select another location.
- Google Maps link for the selected coordinates.
- Optional Google Street View Static image through a server-side proxy.
- Google credential stays in `.env` and is never placed in browser JavaScript.
- Responsive futuristic purple/blue interface.

The 3D interaction uses Three.js OrbitControls, and the Earth texture is loaded with Three.js TextureLoader. See the official Three.js documentation for those APIs.

## Run

1. Install Node.js LTS.
2. Open this folder in VS Code.
3. Open Terminal → New Terminal.
4. Run:

```powershell
npm install
npm start
```

5. Open:

http://localhost:3000

## Google Street View

The globe, satellite map and weather work without a Google key.

To enable the Street View button:

1. Copy `.env.example` to `.env`.
2. Put your Google Maps Platform server key into `.env`:

```env
GOOGLE_MAPS_API_KEY=YOUR_KEY
```

3. Enable the Street View Static API / required Maps Platform APIs in Google Cloud.
4. Restart `npm start`.

Do not paste your private key into `app.js` or `index.html`.

## Notes

The Street View section currently uses Google's Static Street View image endpoint through the Node server. It is not a full interactive 360° panorama.

The satellite map uses Esri World Imagery. It is satellite-style imagery and is not Google Earth tiles.


## v4 loading fix

This version includes a browser import map so Three.js `OrbitControls` can resolve the `three` module correctly when the app is served by the Node server. Open the app at `http://localhost:3000` rather than opening `index.html` directly.
