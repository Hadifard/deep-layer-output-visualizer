/**
 * geometry.js
 * ------------
 * Defines the math and mesh-building utilities shared by every neuron
 * surface: the four activation functions, the sampling grid over the
 * (X1, X2) input domain, the blue/white/orange height-to-color mapping,
 * and the reusable helpers for creating and updating a surface mesh.
 *
 * Every neuron plane and the combined "sum" surface are built from the
 * same NxN grid, so they can be blended and compared directly.
 */

// ---------- Activation functions ----------
const ACTIVATIONS = {
  linear:  v => v,
  relu:    v => Math.max(0, v),
  tanh:    v => Math.tanh(v),
  sigmoid: v => 1 / (1 + Math.exp(-v))
};
const ACT_LABELS = { linear: 'Linear', relu: 'ReLU', tanh: 'Tanh', sigmoid: 'Sigmoid' };

const SIZE = 2.4;
const SEGMENTS = 30;
const N = SEGMENTS + 1;
const STEP = (SIZE * 2) / SEGMENTS;

const gridX1 = new Float32Array(N * N);
const gridX2 = new Float32Array(N * N);
for (let j = 0; j < N; j++){
  for (let i = 0; i < N; i++){
    const idx = j * N + i;
    gridX1[idx] = -SIZE + i * STEP;
    gridX2[idx] = -SIZE + j * STEP;
  }
}
const indices = [];
for (let j = 0; j < SEGMENTS; j++){
  for (let i = 0; i < SEGMENTS; i++){
    const a0 = j * N + i, a1 = a0 + 1, a2 = a0 + N, a3 = a2 + 1;
    indices.push(a0, a2, a1);
    indices.push(a1, a2, a3);
  }
}

const WHITE = new THREE.Color(0xffffff);
const BLUE = new THREE.Color(0x0000FF);
const ORANGE = new THREE.Color(0xFF3333);

// Lower = sharper/faster transition to full color (less "cloudy" fade near zero).
// Higher = softer, more gradual fade. 1.0 = linear (the old behavior).
const COLOR_GAMMA = 0.4;

function colorsForHeights(heights){
  let maxPos = 1e-6, maxNeg = 1e-6;
  for (let k = 0; k < heights.length; k++){
    const h = heights[k];
    if (h > maxPos) maxPos = h;
    if (-h > maxNeg) maxNeg = -h;
  }
  const colors = new Float32Array(heights.length * 3);
  const tmp = new THREE.Color();
  for (let k = 0; k < heights.length; k++){
    const h = heights[k];
    if (h >= 0){
      const t = Math.pow(h / maxPos, COLOR_GAMMA);
      tmp.copy(WHITE).lerp(BLUE, t);
    } else {
      const t = Math.pow((-h) / maxNeg, COLOR_GAMMA);
      tmp.copy(WHITE).lerp(ORANGE, t);
    }
    colors[k*3] = tmp.r; colors[k*3+1] = tmp.g; colors[k*3+2] = tmp.b;
  }
  return colors;
}

function drawSwatch(def){
  if (!def.swatchCtx) return;
  const colors = colorsForHeights(def.heights);
  const off = drawSwatch._off || (drawSwatch._off = document.createElement('canvas'));
  off.width = N; off.height = N;
  const octx = off.getContext('2d');
  const imgData = octx.createImageData(N, N);
  for (let j = 0; j < N; j++){
    for (let i = 0; i < N; i++){
      const k = j * N + i;            // source index (matches gridX1/gridX2/heights layout)
      const destRow = N - 1 - j;      // flip vertically: top of swatch = +X2
      const destIdx = (destRow * N + i) * 4;
      imgData.data[destIdx]   = Math.round(colors[k*3] * 255);
      imgData.data[destIdx+1] = Math.round(colors[k*3+1] * 255);
      imgData.data[destIdx+2] = Math.round(colors[k*3+2] * 255);
      imgData.data[destIdx+3] = 255;
    }
  }
  octx.putImageData(imgData, 0, 0);
  const ctx = def.swatchCtx;
  const w = def.swatchCanvas.width, h = def.swatchCanvas.height;
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(off, 0, 0, w, h);
}

const PLANE_MESH_OPACITY = 0.88;
const PLANE_WIRE_OPACITY = 0.2;
const HALO_MESH_OPACITY = 0.055;
const HALO_WIRE_OPACITY = 0.05;
const HALO_HOVER_OPACITY = 0.32;

function buildEmptyMesh(){
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N*N*3), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N*N*3), 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true,
    opacity: PLANE_MESH_OPACITY, roughness: 0.6, metalness: 0.05
  });
  const mesh = new THREE.Mesh(geometry, material);

  const wireMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: PLANE_WIRE_OPACITY });
  const wireGeo = new THREE.WireframeGeometry(geometry);
  const wire = new THREE.LineSegments(wireGeo, wireMat);

  const group = new THREE.Group();
  group.add(mesh);
  group.add(wire);
  scene.add(group);
  return { group, mesh, wire, geometry };
}

function updateMeshHeights(obj, heights){
  const posAttr = obj.geometry.getAttribute('position');
  for (let k = 0; k < heights.length; k++){
    posAttr.setXYZ(k, gridX1[k], heights[k], -gridX2[k]);
  }
  posAttr.needsUpdate = true;
  obj.geometry.computeVertexNormals();

  const colors = colorsForHeights(heights);
  obj.geometry.getAttribute('color').set(colors);
  obj.geometry.getAttribute('color').needsUpdate = true;

  obj.wire.geometry.dispose();
  obj.wire.geometry = new THREE.WireframeGeometry(obj.geometry);
}
