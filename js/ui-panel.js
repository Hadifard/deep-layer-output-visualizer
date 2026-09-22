/**
 * ui-panel.js
 * ------------
 * Builds the right-hand control panel and wires it up to the model in
 * planes.js:
 *
 *   - One row per neuron, with a live color swatch, an editable
 *     "Z = w1*X1 + w2*X2 + b" equation, and the four activation buttons
 *     (Linear / ReLU / Tanh / Sigmoid).
 *   - The "Show Sum" floating button, which toggles the combined surface
 *     and its formula readout.
 *   - The "Top View" floating button, which snaps the camera to a
 *     straight-down orthographic view of the X1-X2 plane and restores the
 *     previous camera state when toggled off.
 *
 * Depends on the shared state from planes.js (planeDefs, recomputePlane,
 * recomputeSum, applyVisibility) and calls refreshAllProbes() from
 * probes.js so any active probes stay accurate as values change.
 */

// ---------- UI: plane list ----------
const planeList = document.getElementById('plane-list');
planeDefs.forEach((def, idx) => {
  const row = document.createElement('div');
  row.className = 'plane-row';
  row.innerHTML = `
    <div class="plane-row-top">
      <input type="checkbox" checked id="plane-${idx}">
      <canvas class="swatch" width="32" height="32"></canvas>
      <div class="eq-label">
        Z =
        <input class="w-input" data-role="a" type="number" step="0.1" value="${def.a}">
        X1 +
        <input class="w-input" data-role="b" type="number" step="0.1" value="${def.b}">
        X2 +
        <input class="w-input" data-role="c" type="number" step="0.1" value="${def.bias}">
      </div>
    </div>
    <div class="act-group">
      <div class="act-btn" data-act="linear">Linear</div>
      <div class="act-btn" data-act="relu">ReLU</div>
      <div class="act-btn" data-act="tanh">Tanh</div>
      <div class="act-btn" data-act="sigmoid">Sigmoid</div>
    </div>
  `;
  planeList.appendChild(row);

  def.swatchCanvas = row.querySelector('.swatch');
  def.swatchCtx = def.swatchCanvas.getContext('2d');

  function refreshActButtons(){
    row.querySelectorAll('.act-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.act === def.activation);
    });
  }
  refreshActButtons();

  row.querySelector('input[type=checkbox]').addEventListener('change', (e) => {
    def.active = e.target.checked;
    row.classList.toggle('off', !def.active);
    recomputeSum();
    applyVisibility();
    refreshAllProbes();
  });

  row.querySelectorAll('.w-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const val = parseFloat(inp.value);
      const v = isNaN(val) ? 0 : val;
      if (inp.dataset.role === 'a') def.a = v;
      else if (inp.dataset.role === 'b') def.b = v;
      else def.bias = v;
      recomputePlane(def);
      recomputeSum();
      refreshAllProbes();
    });
  });

  row.querySelectorAll('.act-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      def.activation = btn.dataset.act;
      refreshActButtons();
      recomputePlane(def);
      recomputeSum();
      applyVisibility();
      refreshAllProbes();
    });
  });
});

// ---------- Sum FAB ----------
const sumFab = document.getElementById('sum-fab');
const sumFormula = document.getElementById('sum-formula');
sumFab.addEventListener('click', () => {
  sumVisible = !sumVisible;
  sumFab.classList.toggle('active', sumVisible);
  sumFormula.classList.toggle('show', sumVisible);
  applyVisibility();
});

// ---------- Top view FAB ----------
const topViewFab = document.getElementById('topview-fab');
let topViewActive = false;
let savedCamState = null;
topViewFab.addEventListener('click', () => {
  topViewActive = !topViewActive;
  topViewFab.classList.toggle('active', topViewActive);
  if (topViewActive){
    savedCamState = {
      pos: camera.position.clone(),
      up: camera.up.clone(),
      target: controls.target.clone(),
      zoom: camera.zoom
    };
    camera.position.set(0, 13, 0.0001);
    camera.up.set(0, 0, -1);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.enableRotate = false;
  } else {
    if (savedCamState){
      camera.position.copy(savedCamState.pos);
      camera.up.copy(savedCamState.up);
      camera.zoom = savedCamState.zoom;
      camera.updateProjectionMatrix();
      controls.target.copy(savedCamState.target);
    }
    controls.enableRotate = true;
  }
  controls.update();
});

