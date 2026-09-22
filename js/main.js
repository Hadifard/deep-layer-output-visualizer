/**
 * main.js
 * --------
 * Entry point. Loaded last, after every other module has defined its
 * pieces of the scene and UI.
 *
 * Responsibilities:
 *   1. Run the first full computation so every neuron surface, the panel
 *      swatches and the sum formula all show correct values before the
 *      first frame is drawn.
 *   2. Keep the orthographic camera's frustum in sync with the canvas
 *      aspect ratio on window resize.
 *   3. Drive the render loop.
 */

// Compute every neuron surface once up front (equivalent to the call that,
// in the original single-file version, happened right after the panel and
// floating buttons were wired up).
recomputeAll();

// ---------- Resize ----------
function onResize(){
  const w = wrap.clientWidth, h = wrap.clientHeight;
  const aspect = w / h;
  camera.left = -ORTHO_FRUSTUM * aspect;
  camera.right = ORTHO_FRUSTUM * aspect;
  camera.top = ORTHO_FRUSTUM;
  camera.bottom = -ORTHO_FRUSTUM;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

// ---------- Animation loop ----------
function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
