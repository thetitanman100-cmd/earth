require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

app.use(express.static(path.join(__dirname)));

app.get("/api/streetview", async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: "Invalid coordinates." });
  }

  if (!GOOGLE_KEY) {
    return res.status(503).json({ error: "Google Street View is not configured. Add GOOGLE_MAPS_API_KEY to .env." });
  }

  const metadataUrl = new URL("https://maps.googleapis.com/maps/api/streetview/metadata");
  metadataUrl.searchParams.set("location", `${lat},${lon}`);
  metadataUrl.searchParams.set("radius", "100");
  metadataUrl.searchParams.set("key", GOOGLE_KEY);

  try {
    const metaRes = await fetch(metadataUrl);
    const meta = await metaRes.json();

    if (meta.status !== "OK") {
      return res.status(404).json({ error: "No Google Street View imagery was found near this point." });
    }

    const imageUrl = new URL("https://maps.googleapis.com/maps/api/streetview");
    imageUrl.searchParams.set("size", "1200x650");
    imageUrl.searchParams.set("location", `${meta.location.lat},${meta.location.lng}`);
    imageUrl.searchParams.set("fov", "90");
    imageUrl.searchParams.set("heading", "0");
    imageUrl.searchParams.set("pitch", "0");
    imageUrl.searchParams.set("key", GOOGLE_KEY);

    res.json({
      imageUrl: imageUrl.toString(),
      location: { lat: meta.location.lat, lng: meta.location.lng }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Street View service error." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`View Your Earth running on port ${PORT}`);
});
