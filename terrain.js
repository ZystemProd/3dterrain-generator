mapboxgl.accessToken = "YOUR_MAPBOX_ACCESS_TOKEN";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/satellite-v9",
  center: [10, 50],
  zoom: 6,
});

document.getElementById("generateBtn").addEventListener("click", () => {
  alert("Terrain generation coming soon!");
});
