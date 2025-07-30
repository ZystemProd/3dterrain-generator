let map;
let rectangle;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 50, lng: 10 },
    zoom: 6,
    mapTypeId: "satellite",
  });

  rectangle = new google.maps.Rectangle({
    bounds: {
      north: 50.5,
      south: 49.5,
      east: 10.5,
      west: 9.5,
    },
    editable: true,
    draggable: true,
    map,
  });
}

async function fetchElevationGrid(bounds, rows = 10, cols = 10) {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const latStep = (ne.lat() - sw.lat()) / (rows - 1);
  const lngStep = (ne.lng() - sw.lng()) / (cols - 1);
  const locations = [];
  for (let y = 0; y < rows; y++) {
    const lat = sw.lat() + latStep * y;
    for (let x = 0; x < cols; x++) {
      const lng = sw.lng() + lngStep * x;
      locations.push(`${lat},${lng}`);
    }
  }
  const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${locations.join("|")}&key=YOUR_API_KEY`;
  const res = await fetch(url);
  const json = await res.json();
  const heights = json.results.map((r) => r.elevation);
  const grid = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      row.push(heights[y * cols + x]);
    }
    grid.push(row);
  }
  return grid;
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
      const tris = trianglesForCell(
        h00,
        h10,
        h01,
        h11,
        x * cellSize,
        y * cellSize,
        cellSize
      );
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
  const bounds = rectangle.getBounds();
  const heightmap = await fetchElevationGrid(bounds, 10, 10);
  const stl = heightmapToSTL(heightmap, 1);
  downloadSTL(stl, "terrain.stl");
});
