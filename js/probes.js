/**
 * probes.js
 * ----------
 * Implements the "Probe Point" tool: click anywhere on the base grid to
 * drop a fixed vertical connector line that reads off the exact output of
 * every active neuron (and their sum) at that (X1, X2) point.
 *
 * Each probe is a self-contained group: a vertical guide line, a small
 * marker sphere on every surface it crosses, a floating numeric label per
 * value, a highlighted sum marker/label, and a flat "x" decal on the base
 * grid. Right-clicking a probe removes just that one; turning the tool
 * off clears all of them.
 *
 * While the tool is active, camera rotation is suspended only while the
 * pointer is directly over the finite grid square, so the rest of the
 * canvas still orbits normally.
 */

// ---------- Vertical probes / connectors ----------
const PROBE_COLOR_POS = '#3b82f6';
const PROBE_COLOR_NEG = '#f97316';
const PROBE_COLOR_SUM = '#ffe082';

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function createValueSprite(){
  const canvas = document.createElement('canvas');
  canvas.width = 240; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.3, 0.52, 1);
  sprite.renderOrder = 999;
  sprite.visible = false;
  sprite.userData.canvas = canvas;
  sprite.userData.ctx = ctx;
  sprite.userData.tex = tex;
  return sprite;
}

// boxed=false -> plain number with a soft translucent backdrop (always legible).
// boxed=true  -> bold bordered box used for the sum marker.
function updateValueSprite(sprite, text, color, boxed){
  const canvas = sprite.userData.canvas, ctx = sprite.userData.ctx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = boxed ? 'rgba(10,10,11,0.95)' : 'rgba(8,8,10,0.72)';
  ctx.strokeStyle = boxed ? color : 'rgba(255,255,255,0.18)';
  ctx.lineWidth = boxed ? 5 : 2;
  roundRect(ctx, 6, 12, canvas.width - 12, canvas.height - 24, 14);
  ctx.fill();
  ctx.stroke();
  ctx.font = boxed ? 'bold 40px "Consolas", monospace' : 'bold 38px "Consolas", monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  sprite.userData.tex.needsUpdate = true;
}

// Small sphere markers pinned exactly where the vertical line pierces each
// surface, so it's obvious *where* on the plane the probe hit.
const markerGeo = new THREE.SphereGeometry(0.06, 16, 16);
function createMarkerSphere(color, radius){
  const mat = new THREE.MeshBasicMaterial({ color, depthTest: false });
  const mesh = new THREE.Mesh(radius ? new THREE.SphereGeometry(radius, 16, 16) : markerGeo, mat);
  mesh.renderOrder = 996;
  mesh.visible = false;
  return mesh;
}

// A flat, red "×" decal lying directly on the Z = 0 base plane (not a
// billboard) so it visibly rests on the surface from any camera angle,
// marking exactly where the probe crosses X1/X2.
function createBaseCross(){
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xff2d2d, depthTest: true });
  const barGeo = new THREE.BoxGeometry(0.34, 0.008, 0.07);
  const bar1 = new THREE.Mesh(barGeo, mat);
  bar1.rotation.y = Math.PI / 4;
  const bar2 = new THREE.Mesh(barGeo.clone(), mat);
  bar2.rotation.y = -Math.PI / 4;
  group.add(bar1, bar2);
  group.renderOrder = 998;
  return group;
}

// Builds one fully self-contained probe (line + base cross + per-plane
// value/marker pairs + sum value/marker), fixed at (x1, x2).
function createProbe(x1, x2){
  const group = new THREE.Group();

  const valueSprites = planeDefs.map(() => createValueSprite());
  valueSprites.forEach(s => group.add(s));

  const markerSpheres = planeDefs.map(() => createMarkerSphere(0xffffff));
  markerSpheres.forEach(m => group.add(m));

  const sumSprite = createValueSprite();
  sumSprite.scale.set(1.55, 0.6, 1);
  group.add(sumSprite);

  const sumMarker = createMarkerSphere(0xffffff, 0.085);
  group.add(sumMarker);

  const baseCross = createBaseCross();
  group.add(baseCross);

  const lineMat = new THREE.LineBasicMaterial({ color: 0xd8dce6, transparent: true, opacity: 0.55, depthTest: false });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(lineGeo, lineMat);
  line.renderOrder = 997;
  group.add(line);

  scene.add(group);

  const probe = { x1, x2, group, valueSprites, markerSpheres, sumSprite, sumMarker, baseCross, line };
  updateProbeVisual(probe);
  return probe;
}

function updateProbeVisual(probe){
  const { x1, x2 } = probe;
  const worldZ = -x2;
  probe.baseCross.position.set(x1, 0.006, worldZ);

  let sum = 0, minY = 0, maxY = 0, anyActive = false;

  planeDefs.forEach((def, idx) => {
    const sprite = probe.valueSprites[idx];
    const marker = probe.markerSpheres[idx];
    if (!def.active){
      sprite.visible = false;
      marker.visible = false;
      return;
    }
    anyActive = true;
    const fn = ACTIVATIONS[def.activation];
    const z = fn(def.a * x1 + def.b * x2 + def.bias);
    sum += z;
    if (z < minY) minY = z;
    if (z > maxY) maxY = z;

    const color = z >= 0 ? PROBE_COLOR_POS : PROBE_COLOR_NEG;

    marker.visible = true;
    marker.position.set(x1, z, worldZ);
    marker.material.color.set(color);

    sprite.visible = true;
    sprite.position.set(x1 + 0.75, z, worldZ);
    updateValueSprite(sprite, fmt(z), color, false);
  });

  if (minY > sum) minY = sum;
  if (maxY < sum) maxY = sum;

  probe.sumSprite.visible = anyActive;
  probe.sumMarker.visible = anyActive;
  if (anyActive){
    probe.sumMarker.position.set(x1, sum, worldZ);
    probe.sumSprite.position.set(x1 - 0.95, sum, worldZ);
    updateValueSprite(probe.sumSprite, 'sum ' + fmt(sum), PROBE_COLOR_SUM, true);
  }

  const bottom = Math.min(0, minY) - 0.25;
  const top = Math.max(0, maxY) + 0.25;
  probe.line.geometry.setFromPoints([
    new THREE.Vector3(x1, bottom, worldZ),
    new THREE.Vector3(x1, top, worldZ)
  ]);
}

function disposeProbe(probe){
  scene.remove(probe.group);
  probe.group.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material){
      if (obj.material.map) obj.material.map.dispose();
      obj.material.dispose();
    }
  });
}

let probes = [];

function clearAllProbes(){
  probes.forEach(disposeProbe);
  probes = [];
}

function refreshAllProbes(){
  probes.forEach(updateProbeVisual);
}

function findNearestProbe(x1, x2, maxDist){
  let best = null, bestD = Infinity;
  probes.forEach(p => {
    const d = Math.hypot(p.x1 - x1, p.x2 - x2);
    if (d < bestD){ bestD = d; best = p; }
  });
  return bestD <= maxDist ? best : null;
}

const probeRaycaster = new THREE.Raycaster();
const probeBasePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const probeNDC = new THREE.Vector2();

function raycastToBase(clientX, clientY){
  const rect = renderer.domElement.getBoundingClientRect();
  probeNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  probeNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  probeRaycaster.setFromCamera(probeNDC, camera);
  const hit = new THREE.Vector3();
  return probeRaycaster.ray.intersectPlane(probeBasePlane, hit) ? hit : null;
}

let connectorActive = false;

const probeFab = document.getElementById('probe-fab');
const probeHint = document.getElementById('probe-hint');

probeFab.addEventListener('click', () => {
  connectorActive = !connectorActive;
  probeFab.classList.toggle('active', connectorActive);
  probeHint.classList.toggle('show', connectorActive);
  controls.enableRotate = true;
  if (!connectorActive) clearAllProbes();
});

// Rotation is only ever blocked while the pointer is directly over the
// finite X1/X2 grid square — anywhere else on the canvas the camera still
// rotates normally.
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!connectorActive) return;
  const hit = raycastToBase(e.clientX, e.clientY);
  const overGrid = !!hit && Math.abs(hit.x) <= SIZE && Math.abs(hit.z) <= SIZE;
  controls.enableRotate = !overGrid;
});

renderer.domElement.addEventListener('pointerleave', () => {
  if (connectorActive) controls.enableRotate = true;
});

// Left click on the grid drops a new, fixed probe.
renderer.domElement.addEventListener('click', (e) => {
  if (!connectorActive) return;
  const hit = raycastToBase(e.clientX, e.clientY);
  if (!hit) return;
  const x1 = hit.x, x2 = -hit.z;
  if (Math.abs(x1) > SIZE || Math.abs(x2) > SIZE) return;
  probes.push(createProbe(x1, x2));
});

// Right click on (or near) an existing probe removes just that one.
renderer.domElement.addEventListener('contextmenu', (e) => {
  if (!connectorActive) return;
  e.preventDefault();
  const hit = raycastToBase(e.clientX, e.clientY);
  if (!hit) return;
  const target = findNearestProbe(hit.x, -hit.z, 0.35);
  if (target){
    disposeProbe(target);
    probes = probes.filter(p => p !== target);
  }
});

