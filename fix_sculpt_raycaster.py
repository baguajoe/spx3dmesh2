#!/usr/bin/env python3
import os, re, subprocess

ROOT = '/workspaces/spx3dmesh2'

# ── 1. Fix SculptEngine.js — getSculptHit signature ──────────────────────────
# Current:  getSculptHit(raycaster, mesh)  — expects THREE.Raycaster
# App calls: getSculptHit(e, canvas, camera, mesh) — passing mouse event
# Fix: update getSculptHit to accept (e, canvas, camera, mesh) and build raycaster internally

sculpt_path = ROOT + '/src/mesh/SculptEngine.js'
sculpt = open(sculpt_path).read()

OLD_GETSCULPTHIT = '''export function getSculptHit(raycaster, mesh) {
  const hits = raycaster.intersectObject(mesh, false);
  const hit = hits[0];
  return { point: hit.point, normal: hit.face ? hit.face.normal.clone().transformDirection(mesh.matrixWorld) : new THREE.Vector3(0,1,0), distance: hit.distance, faceIndex: hit.faceIndex };
}'''

NEW_GETSCULPTHIT = '''export function getSculptHit(e, canvas, camera, mesh) {
  if (!canvas || !camera || !mesh) return null;
  try {
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
    const my = ((e.clientY - rect.top)  / rect.height) * -2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);
    // Ensure mesh geometry has up-to-date BVH / bounding sphere
    if (mesh.geometry) {
      mesh.geometry.computeBoundingSphere?.();
      mesh.geometry.computeBoundingBox?.();
    }
    const hits = raycaster.intersectObject(mesh, false);
    if (!hits || hits.length === 0) return null;
    const hit = hits[0];
    if (!hit) return null;
    return {
      point:     hit.point,
      normal:    hit.face ? hit.face.normal.clone().transformDirection(mesh.matrixWorld) : new THREE.Vector3(0,1,0),
      distance:  hit.distance,
      faceIndex: hit.faceIndex
    };
  } catch(err) {
    console.warn('[SculptEngine] getSculptHit error:', err.message);
    return null;
  }
}'''

if OLD_GETSCULPTHIT in sculpt:
    sculpt = sculpt.replace(OLD_GETSCULPTHIT, NEW_GETSCULPTHIT)
    open(sculpt_path, 'w').write(sculpt)
    print('✓ SculptEngine.js: getSculptHit signature fixed')
else:
    print('⚠ getSculptHit exact match failed — patching by line')
    lines = sculpt.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        if 'export function getSculptHit' in lines[i]:
            # Replace until closing }
            new_lines.append(NEW_GETSCULPTHIT)
            depth = 0
            while i < len(lines):
                for ch in lines[i]:
                    if ch == '{': depth += 1
                    elif ch == '}': depth -= 1
                i += 1
                if depth <= 0 and i > 0:
                    break
        else:
            new_lines.append(lines[i])
            i += 1
    open(sculpt_path, 'w').write('\n'.join(new_lines))
    print('✓ SculptEngine.js: getSculptHit replaced via line scan')

# ── 2. Fix App.jsx — .side undefined on material ─────────────────────────────
# The error is at line 4132 where ray.intersectObjects(candidates) is called
# Some meshes in scene have no material or undefined material
# Fix: filter candidates to only meshes with valid material

app_path = ROOT + '/src/App.jsx'
app = open(app_path).read()
orig = app

# Fix the candidates filter — exclude meshes without material
app = app.replace(
    'sceneRef.current?.traverse(c => { if (c.isMesh && c.type === "Mesh") candidates.push(c); });',
    'sceneRef.current?.traverse(c => { if (c.isMesh && c.type === "Mesh" && c.material && c.visible) candidates.push(c); });'
)
if app != orig:
    print('✓ App.jsx: candidates filter — added material + visible guard')
else:
    # Try alternate pattern
    app = app.replace(
        'sceneRef.current?.traverse(c => { if (c.isMesh && c.type === "Mesh") candidates.push(c) })',
        'sceneRef.current?.traverse(c => { if (c.isMesh && c.type === "Mesh" && c.material && c.visible) candidates.push(c) })'
    )
    if app != orig:
        print('✓ App.jsx: candidates filter fixed (alt pattern)')
    else:
        print('⚠ candidates filter not found — trying broader patch')
        app = re.sub(
            r'(sceneRef\.current\?\.traverse\(c\s*=>\s*\{[^}]*c\.isMesh[^}]*candidates\.push\(c\)[^}]*\}\))',
            lambda m: m.group(0).replace('candidates.push(c)', 'c.material && c.visible && candidates.push(c)'),
            app
        )

# Also fix raycaster.intersectObject calls in App.jsx that might hit meshes without material
# Line 2511 and 2634 — add null check on meshRef
app = app.replace(
    'const hits = raycaster.intersectObject(meshRef.current, true);',
    'const hits = meshRef.current?.material ? raycaster.intersectObject(meshRef.current, true) : [];'
)

# Fix sculpt mouse move — also needs canvas/camera guards already there
# Check getSculptHit call at line 2575
old_call = 'const hit = getSculptHit(e, canvas, camera, mesh);'
if old_call in app:
    print('✓ App.jsx: getSculptHit call already correct')
else:
    # Find the getSculptHit call and check its args
    idx = app.find('getSculptHit(')
    if idx > 0:
        snippet = app[idx:idx+80]
        print(f'Current getSculptHit call: {snippet}')

if app != orig:
    open(app_path, 'w').write(app)
    print(f'✓ App.jsx updated ({len(app)-len(orig):+d} chars)')

# ── 3. Also fix THREE import in SculptEngine if missing ──────────────────────
sculpt = open(sculpt_path).read()
if 'THREE.Vector2' in sculpt and 'import * as THREE' not in sculpt and "import THREE" not in sculpt:
    sculpt = "import * as THREE from 'three';\n" + sculpt
    open(sculpt_path, 'w').write(sculpt)
    print('✓ SculptEngine.js: THREE import added')
elif 'import * as THREE' in sculpt or 'import THREE' in sculpt:
    print('✓ SculptEngine.js: THREE already imported')

print('\nRun: git add -A && git commit -m "fix: sculpt raycaster signature, material.side undefined" && git push')
