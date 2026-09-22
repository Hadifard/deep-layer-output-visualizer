/**
 * scene-setup.js
 * ----------------
 * Builds the core Three.js scene: the orthographic camera, the WebGL
 * renderer, orbit controls, lighting, the six world axes and their labels,
 * and the base reference grid.
 *
 * A single orthographic camera is used for every view (including free
 * rotation) so that surfaces are never stretched or foreshortened, no
 * matter which angle they are viewed from.
 *
 * This file must load before geometry.js, planes.js, ui-panel.js and
 * probes.js, since they all rely on the `scene`, `camera`, `renderer`
 * and `controls` objects created here.
 */

const wrap = document.getElementById('canvas-wrap');

// ---------- Scene setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0b);
scene.fog = new THREE.Fog(0x0a0a0b, 16, 55);

// A single orthographic (parallel-projection) camera is used for every view —
// free rotation included — so nothing gets stretched or foreshortened at any angle.
const DEFAULT_CAM_POS = new THREE.Vector3(8.5, 9.5, 8.5);
const ORTHO_FRUSTUM = 6.5; // half-height of the visible area, in world units
const startAspect = wrap.clientWidth / wrap.clientHeight;
const camera = new THREE.OrthographicCamera(
  -ORTHO_FRUSTUM * startAspect, ORTHO_FRUSTUM * startAspect,
  ORTHO_FRUSTUM, -ORTHO_FRUSTUM,
  0.1, 1000
);
camera.position.copy(DEFAULT_CAM_POS);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(wrap.clientWidth, wrap.clientHeight);
wrap.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.95));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
dirLight.position.set(4, 6, 3);
scene.add(dirLight);

// ---------- Axes ----------
const AXIS_LEN = 3.2;
function makeAxis(dir, color){
  const mat = new THREE.LineBasicMaterial({ color });
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,0,0),
    dir.clone().multiplyScalar(AXIS_LEN)
  ]);
  scene.add(new THREE.Line(geo, mat));
}
makeAxis(new THREE.Vector3(1,0,0), 0xd45a5a);
makeAxis(new THREE.Vector3(-1,0,0), 0x3a2626);
makeAxis(new THREE.Vector3(0,0,-1), 0x4fa3c9);
makeAxis(new THREE.Vector3(0,0,1), 0x223038);
makeAxis(new THREE.Vector3(0,1,0), 0x6fae6f);
makeAxis(new THREE.Vector3(0,-1,0), 0x223a22);

const grid = new THREE.GridHelper(6.4, 16, 0x38383e, 0x202024);
scene.add(grid);

function makeLabel(text, color, pos){
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 48);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.1, 0.42, 1);
  sprite.position.copy(pos);
  scene.add(sprite);
}
makeLabel('X1', '#e08888', new THREE.Vector3(AXIS_LEN + 0.4, 0, 0));
makeLabel('X2', '#8fc7e0', new THREE.Vector3(0, 0, -(AXIS_LEN + 0.4)));
makeLabel('Z',  '#9fd49f', new THREE.Vector3(0, AXIS_LEN + 0.4, 0));
