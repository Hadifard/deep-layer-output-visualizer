/**
 * planes.js
 * ----------
 * Owns the four neuron definitions (weights, bias, activation, mesh) and
 * the logic that keeps every surface in sync with the current values:
 *
 *   - recomputePlane(def)   samples one neuron over the grid and repaints
 *                            its mesh + side-panel swatch.
 *   - recomputeSum()         adds up every active neuron and renders the
 *                            combined surface, plus the live equation
 *                            shown next to the "Show Sum" button.
 *   - applyVisibility()      switches between normal mode and "halo" mode
 *                            (translucent individual planes) once the sum
 *                            surface is shown.
 *   - recomputeAll()         convenience wrapper used on load and whenever
 *                            a value changes.
 *
 * It also implements the hover "halo" effect: whichever individual plane
 * the mouse is over gets brighter while the combined sum is visible.
 */

// ---------- Plane definitions ----------
const planeDefs = [
  { a: 1,  b: 1  },
  { a: 1,  b: -1 },
  { a: -1, b: 1  },
  { a: -1, b: -1 }
];

planeDefs.forEach(def => {
  def.bias = 0;
  def.active = true;
  def.activation = 'linear';
  def.mesh = buildEmptyMesh();
  def.heights = new Float32Array(N * N);
});

const sumMesh = buildEmptyMesh();
let sumVisible = false;

function recomputePlane(def){
  const fn = ACTIVATIONS[def.activation];
  for (let k = 0; k < N*N; k++){
    def.heights[k] = fn(def.a * gridX1[k] + def.b * gridX2[k] + def.bias);
  }
  updateMeshHeights(def.mesh, def.heights);
  drawSwatch(def);
}

function fmt(v){
  return (Math.round(v * 100) / 100).toString();
}

// Bright, readable-on-dark colors, one per plane (cycles if more planes are added later).
const SUM_COLORS = ['#ff8a80', '#82caff', '#ffd54f', '#b39ddb', '#a5d6a7', '#f48fb1'];

// Builds a clean "2X1-3X2-6" style string: no explicit '+', no '*1',
// zero terms dropped, negative coefficients merge their '-' into the term.
function formatLinear(a, b, c){
  const terms = [];
  function pushTerm(coef, label){
    if (coef === 0) return;
    const sign = coef < 0 ? '-' : (terms.length ? '+' : '');
    const mag = Math.abs(coef);
    const magStr = (mag === 1 && label) ? '' : fmt(mag);
    terms.push(sign + magStr + label);
  }
  pushTerm(a, 'X1');
  pushTerm(b, 'X2');
  pushTerm(c, '');
  return terms.length ? terms.join('') : '0';
}

// Full equation string for one plane: wraps in the activation name only
// when it isn't linear, so plain planes show just "2X1-3X2-6".
function planeEquationStr(d){
  const lin = formatLinear(d.a, d.b, d.bias);
  return d.activation === 'linear' ? lin : `${ACT_LABELS[d.activation]}(${lin})`;
}

function recomputeSum(){
  const activeDefs = planeDefs.filter(d => d.active);
  const heights = new Float32Array(N*N);
  if (activeDefs.length > 0){
    for (let k = 0; k < N*N; k++){
      let s = 0;
      for (const d of activeDefs) s += d.heights[k];
      heights[k] = s;
    }
  }
  updateMeshHeights(sumMesh, heights);

  const formulaEl = document.getElementById('sum-formula');
  if (activeDefs.length === 0){
    formulaEl.textContent = '(no active neurons selected)';
  } else {
    const lines = activeDefs.map((d) => {
      const idx = planeDefs.indexOf(d);
      const color = SUM_COLORS[idx % SUM_COLORS.length];
      return `<div class="sum-line" style="color:${color}">${planeEquationStr(d)}</div>`;
    });
    let html = lines.join('');

    if (activeDefs.length > 1){
      const allLinear = activeDefs.every(d => d.activation === 'linear');
      if (allLinear){
        const aSum = activeDefs.reduce((s,d) => s + d.a, 0);
        const bSum = activeDefs.reduce((s,d) => s + d.b, 0);
        const cSum = activeDefs.reduce((s,d) => s + d.bias, 0);
        html += `<div class="sum-eq-line">=</div>`
              + `<div class="sum-result">${formatLinear(aSum, bSum, cSum)}</div>`;
      } else {
        html += `<div class="sum-note">(algebraic sum not shown — includes a non-linear activation)</div>`;
      }
    }
    formulaEl.innerHTML = html;
  }
}

function applyVisibility(){
  planeDefs.forEach(def => {
    def.mesh.group.visible = def.active;
    if (sumVisible){
      def.mesh.mesh.material.opacity = HALO_MESH_OPACITY;
      def.mesh.mesh.material.depthWrite = false;
      def.mesh.wire.visible = false;
    } else {
      def.mesh.mesh.material.opacity = PLANE_MESH_OPACITY;
      def.mesh.wire.material.opacity = PLANE_WIRE_OPACITY;
      def.mesh.mesh.material.depthWrite = true;
      def.mesh.wire.visible = true;
    }
  });
  sumMesh.group.visible = sumVisible;
}

// ---------- Halo hover: brighten whichever glass plane the cursor is over ----------
const haloRaycaster = new THREE.Raycaster();
const haloNDC = new THREE.Vector2();
let hoveredHaloDef = null;

function resetHaloDef(def){
  if (sumVisible && def.active) def.mesh.mesh.material.opacity = HALO_MESH_OPACITY;
}

function updateHaloHover(clientX, clientY){
  if (!sumVisible){
    if (hoveredHaloDef){ resetHaloDef(hoveredHaloDef); hoveredHaloDef = null; }
    return;
  }
  const rect = renderer.domElement.getBoundingClientRect();
  haloNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  haloNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  haloRaycaster.setFromCamera(haloNDC, camera);

  const candidates = planeDefs.filter(d => d.active);
  const hits = haloRaycaster.intersectObjects(candidates.map(d => d.mesh.mesh), false);
  const hitDef = hits.length ? candidates.find(d => d.mesh.mesh === hits[0].object) : null;

  if (hoveredHaloDef && hoveredHaloDef !== hitDef) resetHaloDef(hoveredHaloDef);
  if (hitDef) hitDef.mesh.mesh.material.opacity = HALO_HOVER_OPACITY;
  hoveredHaloDef = hitDef || null;
}

renderer.domElement.addEventListener('pointermove', (e) => updateHaloHover(e.clientX, e.clientY));
renderer.domElement.addEventListener('pointerleave', () => {
  if (hoveredHaloDef){ resetHaloDef(hoveredHaloDef); hoveredHaloDef = null; }
});

function recomputeAll(){
  planeDefs.forEach(recomputePlane);
  recomputeSum();
  applyVisibility();
}
