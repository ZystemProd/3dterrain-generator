mapboxgl.accessToken = "YOUR_MAPBOX_ACCESS_TOKEN";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/satellite-v9",
  center: [10, 50],
  zoom: 6,
});

// Enable drawing of a bounding box
const draw = new MapboxDraw({
  displayControlsDefault: false,
  controls: {
    polygon: true,
    trash: true,
  },
});
map.addControl(draw);

// Simple placeholder heightmap
function generatePlaceholderHeightmap(width, height) {
  const data = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push(Math.random() * 10);
    }
    data.push(row);
  }
  return data;
}

function computeBBox(feature) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  feature.geometry.coordinates[0].forEach((c) => {
    if (c[0] < minX) minX = c[0];
    if (c[0] > maxX) maxX = c[0];
    if (c[1] < minY) minY = c[1];
    if (c[1] > maxY) maxY = c[1];
  });
  return [minX, minY, maxX, maxY];
}

function trianglesForCell(h00, h10, h01, h11, x, y, size) {
  const v00 = [x, y, h00];
  const v10 = [x + size, y, h10];
  const v01 = [x, y + size, h01];
  const v11 = [x + size, y + size, h11];
  return [
    [v00, v10, v01],
    [v10, v11, v01],
  ];
}

function normal(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
}

function heightmapToSTL(heightmap, cellSize = 1) {
  const width = heightmap.length - 1;
  const height = heightmap[0].length - 1;
  let stl = "solid terrain\n";
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const h00 = heightmap[x][y];
      const h10 = heightmap[x + 1][y];
      const h01 = heightmap[x][y + 1];
      const h11 = heightmap[x + 1][y + 1];
      const tris = trianglesForCell(h00, h10, h01, h11, x * cellSize, y * cellSize, cellSize);
      tris.forEach((tri) => {
        const n = normal(tri[0], tri[1], tri[2]);
        stl += `facet normal ${n[0]} ${n[1]} ${n[2]}\n`;
        stl += "  outer loop\n";
        tri.forEach((v) => {
          stl += `    vertex ${v[0]} ${v[1]} ${v[2]}\n`;
        });
        stl += "  endloop\n";
        stl += "endfacet\n";
      });
    }
  }
  stl += "endsolid terrain";
  return stl;
}

function downloadSTL(data, filename) {
  const blob = new Blob([data], { type: "application/vnd.ms-pki.stl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById("generateBtn").addEventListener("click", async () => {
  let bbox;
  const drawn = draw.getAll();
  if (drawn.features.length > 0) {
    bbox = computeBBox(drawn.features[0]);
  } else {
    const b = map.getBounds();
    bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  }
  console.log("Using bounding box", bbox);
  const heightmap = generatePlaceholderHeightmap(10, 10);
  const stl = heightmapToSTL(heightmap, 1);
  downloadSTL(stl, "terrain.stl");
});

