#!/usr/bin/env python3
import os, re

ROOT = '/workspaces/spx3dmesh2'

MIRROR_HOOK = '''
  // Mirror main renderer into preview canvas
  const mirrorRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const src = rendererRef?.current?.domElement;
      const dst = canvasRef.current;
      if (src && dst && dst.offsetWidth > 0) {
        dst.width  = dst.offsetWidth;
        dst.height = dst.offsetHeight;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      mirrorRef.current = requestAnimationFrame(tick);
    };
    mirrorRef.current = requestAnimationFrame(tick);
    return () => { if (mirrorRef.current) cancelAnimationFrame(mirrorRef.current); };
  }, [open, rendererRef]);
'''

PANELS = [
    'src/components/generators/EnvironmentGenerator.jsx',
    'src/components/generators/TerrainSculpting.jsx',
    'src/components/generators/CityGenerator.jsx',
    'src/components/generators/ProceduralCrowdGenerator.jsx',
]

for rel_path in PANELS:
    path = os.path.join(ROOT, rel_path)
    if not os.path.exists(path):
        print(f'⚠ Not found: {rel_path}')
        continue

    src = open(path).read()
    name = os.path.basename(rel_path)

    # Skip if already wired
    if 'mirrorRef' in src:
        print(f'✓ {name}: already has mirror')
        continue

    # Add rendererRef to props destructuring
    src = re.sub(
        r'export default function (\w+)\(\{([^}]*)\}\)',
        lambda m: f'export default function {m.group(1)}({{{m.group(2).rstrip()}, rendererRef}})',
        src, count=1
    )

    # Inject mirror hook after canvasRef declaration
    src = src.replace(
        '  const canvasRef = useRef(null);',
        '  const canvasRef = useRef(null);\n' + MIRROR_HOOK
    )

    open(path, 'w').write(src)
    print(f'✓ {name}: renderer mirror wired')

# ── Pass rendererRef from App.jsx to all 4 WORLD panels ──────────────────────
app_path = os.path.join(ROOT, 'src/App.jsx')
app = open(app_path).read()
orig = app

REPLACEMENTS = [
    (
        '<EnvironmentGenerator open={envGenOpen} onClose={()=>setEnvGenOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />',
        '<EnvironmentGenerator open={envGenOpen} onClose={()=>setEnvGenOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />'
    ),
    (
        '<TerrainSculpting open={terrainOpen} onClose={()=>setTerrainOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />',
        '<TerrainSculpting open={terrainOpen} onClose={()=>setTerrainOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />'
    ),
    (
        '<CityGenerator open={cityGenOpen} onClose={()=>setCityGenOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />',
        '<CityGenerator open={cityGenOpen} onClose={()=>setCityGenOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />'
    ),
    (
        '<ProceduralCrowdGenerator open={crowdGenOpen} onClose={()=>setCrowdGenOpen(false)} sceneRef={sceneRef} setStatus={setStatus} />',
        '<ProceduralCrowdGenerator open={crowdGenOpen} onClose={()=>setCrowdGenOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />'
    ),
]

for old, new in REPLACEMENTS:
    if old in app:
        app = app.replace(old, new)
        print(f'✓ App.jsx: rendererRef added to {old.split("<")[1].split(" ")[0]}')
    else:
        print(f'⚠ No match: {old[:60]}...')

if app != orig:
    open(app_path, 'w').write(app)
    print('✓ App.jsx updated')

print('\nRun: git add -A && git commit -m "fix: WORLD panels renderer mirror wired" && git push')
