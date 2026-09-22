# Deep Layer Output Visualizer

An interactive 3D tool for watching how a small layer of neurons turns two
inputs into a curved decision surface — built with plain JavaScript and
[Three.js](https://threejs.org/), no build step, no framework, no
dependencies to install.

![Deep Layer Output Visualizer — overview](assets/screenshots/screenshot-overview.png)

## Why this exists

Every explanation of a neural network eventually draws the same picture:
a neuron computes a **weighted sum** of its inputs, adds a bias, and
passes the result through an **activation function**. It's easy to write
that formula down. It's much harder to *see* what it actually does to the
input space — especially the part that matters most: why stacking plain
linear neurons can never do anything a single line can't, and why a tiny
dose of non-linearity changes everything.

This tool makes that visible. Four neurons, each taking two inputs
(`X1`, `X2`), are rendered as literal surfaces in 3D. Change a weight and
the surface tilts. Change the activation and it bends. Turn on all four
and sum them, and you can watch, in real time, four flat planes either
collapse into one more flat plane (if they're all linear) or fold
themselves into a genuinely curved surface (as soon as one of them isn't).

## Features

- **Four independent neurons**, each computing `Z = w1·X1 + w2·X2 + b`
- **Four activation functions per neuron** — Linear, ReLU, Tanh, Sigmoid —
  switchable with one click
- **Live editing** of every weight and bias, with the 3D surface and the
  side-panel color swatch updating instantly
- **Sum mode** — overlay the combined output of every active neuron as a
  fifth surface, together with a live equation panel that shows the
  algebraic sum (and collapses to a single flat-plane equation when every
  active neuron is linear)
- **Orthographic camera** — a single parallel-projection camera is used
  for every angle, including free rotation, so surfaces are never
  stretched or foreshortened no matter how you look at them
- **Top View** — snap straight down onto the `X1`–`X2` plane for a clean,
  undistorted read of where each surface crosses zero
- **Probe Point tool** — click anywhere on the base grid to drop a fixed
  vertical marker that reads off the exact value of every active neuron,
  and their sum, at that point
- Full orbit controls: drag to rotate, scroll to zoom, right-drag to pan

## How it works

Each of the four rows in the side panel is one neuron. It computes an
affine function of the two inputs:

```
Z = w1 · X1 + w2 · X2 + b
```

That function is sampled over a grid of `(X1, X2)` points spanning a fixed
square domain and rendered as a mesh, so the neuron becomes a literal
tilted plane in space. The plane is then passed through the neuron's
activation function — `Linear` leaves it untouched, `ReLU` clips
everything below zero flat, `Tanh` and `Sigmoid` squash it into an
S-shaped surface. Color follows the sign and magnitude of the output: the
surface fades from white at `Z = 0` toward **blue** as it rises above
zero and toward **orange** as it drops below, so the zero-crossing — the
neuron's decision boundary — is always the sharp white seam running
through the surface.

Pressing **Σ Show Sum** adds together the output of every active neuron
at every grid point and draws the result as its own surface. This is the
heart of the tool: if every active neuron is set to `Linear`, the sum is
provably still just one flat plane — adding linear functions only ever
produces another linear function, so the equation panel collapses the
whole sum into a single `aX1 + bX2 + c` line. The instant any neuron
switches to `ReLU`, `Tanh`, or `Sigmoid`, that's no longer true, and the
combined surface visibly folds or curves — a direct, hands-on
demonstration of why activation functions are what give neural networks
the ability to represent anything beyond a straight line.

| Sum of four linear neurons (still flat) | Sum including one ReLU neuron (folds) |
|---|---|
| ![All neurons linear — the sum is still a flat plane](assets/screenshots/screenshot-sum-linear.png) | ![One neuron set to ReLU — the sum folds](assets/screenshots/screenshot-sum-nonlinear.png) |

## Case study: folding one layer into an XOR-like boundary

A single neuron can only ever draw a straight line (a flat hyperplane, in
higher dimensions) through its input space. No matter how its weights and
bias are tuned, the boundary where it crosses zero stays straight — so a
lone neuron can separate two groups of points that sit cleanly on either
side of a line, but it can never separate groups that sit in *diagonally
opposite* corners of the input space. The textbook example of that is
**XOR**: one class occupies the bottom-left and top-right corners, the
other occupies the bottom-right and top-left, and no single straight line
can put all of one class on one side. This is a real, well-known limit of
a single linear classifier, and it's tempting to assume the fix requires
stacking several hidden layers.

It doesn't. A **single layer** containing a handful of non-linear
neurons, added together, is already enough — and it's easy to build and
watch that happen directly in this tool. The example below uses four
neurons from the side panel:

```
Neuron 1 (Linear):  Z = 1·X1   + 1·X2   + 0
Neuron 2 (Tanh):     Z = Tanh(-4.4·X1 - 4.5·X2)
Neuron 3 (Tanh):     Z = Tanh(-4.6·X1 + 1·X2)
Neuron 4 (Tanh):     Z = Tanh( 1.8·X1 - 5.1·X2 + 0.5)
```

Each `Tanh` neuron draws its own straight line through the plane
(wherever its own `w1·X1 + w2·X2 + b = 0`) and folds the surface along
it: far from that line the neuron flattens out toward +1 or −1, and only
close to the line does it curve smoothly between the two. Looked at on
its own, one `Tanh` neuron is just a single soft step. Press **Σ Show
Sum** and let the tool add three differently-angled steps together,
though, and their flat plateaus reinforce each other in some regions and
cancel out in others — producing a surface with several distinct peaks
and valleys instead of one simple tilt:

| Isometric view of the combined surface | Live sum formula panel |
|---|---|
| ![Four neurons summed together, folding into several peaks and valleys](assets/screenshots/screenshot-xor-isometric.png) | ![The Show Sum formula panel listing each neuron's contribution](assets/screenshots/screenshot-xor-sum-formula.png) |

That's already a genuinely non-linear surface, and it came from a single
hidden layer — no second layer of neurons was added, only enough neurons
in the first one, combined together.

The clearest way to read the result is from directly above. Press **Top
View**, and the zero-crossing — the seam separating blue from orange —
traces out the exact *decision boundary* this little network would use
to classify the plane:

![Top-down view showing the boundary bent into an X-shaped, four-quadrant pattern](assets/screenshots/screenshot-xor-topview.png)

Notice the shape: it's no longer a single straight line. It bends into
an X, splitting the plane into four alternating regions — blue, orange,
blue, orange — arranged diagonally across from each other. That
diagonal, non-linearly-separable layout is exactly the shape of the XOR
problem, solved here with nothing more exotic than four neurons in one
layer and a plain sum.

It's worth trying by hand: set every neuron to `Linear`, press Show Sum,
then switch neurons in one at a time to `Tanh`, `ReLU`, or `Sigmoid` and
watch how each additional fold reshapes the boundary. That's really the
whole trick behind why solving a non-linear problem doesn't require
"deep" in the sense of many stacked layers. **Width** — enough neurons in
one layer — combined with **non-linearity** — any activation that isn't
flat — is what makes complex, non-convex boundaries possible in the
first place. Depth (stacking additional layers) is a separate tool for
representing even more intricate structure *efficiently*, not a
prerequisite for basic non-linear separability.

## Getting started

No installation, no package manager, no build step.

1. Clone or download this repository.
2. Open `index.html` in any modern desktop browser (Chrome, Edge, or
   Firefox recommended — the scene needs WebGL).

That's it — the page loads Three.js and `OrbitControls` from a CDN and
runs entirely client-side.

If your browser restricts local script loading when opening files
directly (some strict privacy setups do), serve the folder with any
static file server instead, for example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

### Deploying with GitHub Pages

Since this is a fully static site, GitHub Pages works out of the box:

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick
   your default branch and the `/ (root)` folder.
4. Save — your live demo will be at
   `https://<your-username>.github.io/<repository-name>/`.

## Controls

**Camera**
| Input | Action |
|---|---|
| Left-click + drag | Rotate the camera around the scene |
| Scroll wheel | Zoom in / out |
| Right-click + drag | Pan the camera |

**Per-neuron controls (side panel)**
| Control | Action |
|---|---|
| Checkbox | Turn that neuron on or off — affects its own surface, the halo view, the sum, and every active probe |
| `w1`, `w2`, `b` fields | Edit the neuron's weights and bias live |
| `Linear` / `ReLU` / `Tanh` / `Sigmoid` | Choose the neuron's activation function |

**Floating buttons (top-left, over the scene)**
| Button | Action |
|---|---|
| **Σ Show Sum** | Toggle the combined output surface and its live equation panel. Individual planes become translucent "halos" that brighten as you hover over them, so you can still see how each one contributes |
| **⌃ Top View** | Snap to a straight-down orthographic view of the `X1`–`X2` plane; click again to return to your previous camera angle |
| **⌖ Probe Point** | Toggle the probe tool. While active, click anywhere on the base grid to drop a fixed marker reading off every active neuron's value (and the sum) at that point. Right-click an existing probe to remove just that one. Turning the tool off clears every probe |

![Probe Point tool reading exact values at a clicked location](assets/screenshots/screenshot-probe.png)

![Top View — a clean, undistorted look straight down the X1–X2 plane](assets/screenshots/screenshot-topview.png)

## Project structure

```
.
├── index.html                          # Page structure and layout only
├── css/
│   └── style.css                       # All styling for the panel, canvas overlays and controls
├── js/
│   ├── scene-setup.js                  # Camera, renderer, controls, lights, axes, base grid
│   ├── geometry.js                     # Activation functions, sampling grid, color mapping, mesh helpers
│   ├── planes.js                       # Neuron state, per-neuron and sum recomputation, halo hover effect
│   ├── ui-panel.js                     # Side panel (neuron rows) and the Show Sum / Top View buttons
│   ├── probes.js                       # The Probe Point tool: markers, labels, raycasting, click handling
│   └── main.js                         # Entry point: initial computation, resize handling, render loop
└── assets/
    └── screenshots/                    # Images used in this README
```

The JavaScript is deliberately split by responsibility rather than bundled
into one file, so each script has a single, clearly-named job and can be
read top to bottom on its own. Load order matters — `index.html` includes
the scripts in the sequence above, since each one builds on state set up
by the ones before it.

## Technology

- [Three.js](https://threejs.org/) r128 (WebGL rendering)
- [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls) for camera interaction
- Vanilla HTML, CSS and JavaScript — no build tooling, no framework, no package manager required

## Browser support

Any modern desktop browser with WebGL support (Chrome, Edge, Firefox,
Safari). A mouse or trackpad is recommended for the drag/scroll/pan
camera controls.

## License

Released under the [MIT License](LICENSE) — see the `LICENSE` file for
the full text.

## Author

**Hadi Sarhangi Fard**
GitHub: [github.com/Hadifard](https://github.com/Hadifard)
