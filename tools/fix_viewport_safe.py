#!/usr/bin/env python3
import subprocess, os, re

ROOT = '/workspaces/spx3dmesh2'

# ── 1. Restore all 4 files from git ──────────────────────────────────────────
files = [
    'src/components/panels/NodeMaterialEditor.jsx',
    'src/components/panels/AnimGraphPanel.jsx',
    'src/components/panels/MeshScriptPanel.jsx',
    'src/components/uv/UVEditorPanel.jsx',
]

for f in files:
    # Try HEAD first (before our bad commit)
    result = subprocess.run(
        ['git', 'show', f'HEAD~1:{f}'],
        capture_output=True, text=True, cwd=ROOT
    )
    if result.returncode == 0 and len(result.stdout) > 500:
        open(os.path.join(ROOT, f), 'w').write(result.stdout)
        print(f'✓ Restored {f} ({len(result.stdout)} chars)')
    else:
        result2 = subprocess.run(
            ['git', 'checkout', 'HEAD~1', '--', f],
            capture_output=True, text=True, cwd=ROOT
        )
        print(f'{"✓" if result2.returncode==0 else "✗"} git checkout {f}: {result2.stderr[:60] if result2.returncode!=0 else "ok"}')

# ── 2. Add viewport mirror SAFELY using append-only approach ─────────────────
# Instead of regex on the return statement, we add a wrapper component
# at the TOP of each file that wraps children with a live viewport on the left.
# This never touches existing JSX structure.

VIEWPORT_WRAPPER = '''
// ── Live viewport wrapper — mirrors main renderer on left side ────────────
function WithViewport({ rendererRef, open, children }) {
  const _vref = React.useRef(null);
  const _vaf  = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const tick = () => {
      const src = rendererRef?.current?.domElement;
      const dst = _vref.current;
      if (src && dst && dst.offsetWidth > 0) {
        dst.width  = dst.offsetWidth;
        dst.height = dst.offsetHeight;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      _vaf.current = requestAnimationFrame(tick);
    };
    _vaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(_vaf.current);
  }, [open, rendererRef]);
  return (
    <div style={{display:'flex',width:'100%',height:'100%',overflow:'hidden'}}>
      <div style={{flex:'0 0 45%',minWidth:0,display:'flex',flexDirection:'column',borderRight:'1px solid #21262d',background:'#060a10'}}>
        <div style={{fontSize:9,fontWeight:700,color:'#444',letterSpacing:'1.5px',padding:'5px 10px',background:'#0a0d13',borderBottom:'1px solid #21262d',flexShrink:0,textTransform:'uppercase'}}>3D Scene — Live</div>
        <canvas ref={_vref} style={{flex:1,width:'100%',display:'block',minHeight:0}} />
      </div>
      <div style={{flex:1,minWidth:0,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {children}
      </div>
    </div>
  );
}

'''

PANELS_TO_PATCH = {
    'src/components/panels/AnimGraphPanel.jsx': {
        'prop_pattern': r'export default function AnimGraphPanel\(\{([^}]*)\}\)',
        'wrap_pattern': r'(  if \(!open\) return null;\n\n  return \()\n(\s*)(<)',
        'name': 'AnimGraphPanel',
    },
    'src/components/panels/MeshScriptPanel.jsx': {
        'prop_pattern': r'export default function MeshScriptPanel\(\{([^}]*)\}\)',
        'wrap_pattern': r'(  if \(!open\) return null;\n\n  return \()\n(\s*)(<)',
        'name': 'MeshScriptPanel',
    },
    'src/components/uv/UVEditorPanel.jsx': {
        'prop_pattern': r'export default function UVEditorPanel\(\{([^}]*)\}\)',
        'wrap_pattern': r'(  return \()\n(\s*)(<)',
        'name': 'UVEditorPanel',
    },
    'src/components/panels/NodeMaterialEditor.jsx': {
        'prop_pattern': r'export default function NodeMaterialEditor\(\{([^}]*)\}\)',
        'wrap_pattern': r'(  return \()\n(\s*)(<)',
        'name': 'NodeMaterialEditor',
    },
}

for rel_path, config in PANELS_TO_PATCH.items():
    path = os.path.join(ROOT, rel_path)
    src  = open(path).read()

    if 'WithViewport' in src:
        print(f'✓ {config["name"]}: already patched')
        continue

    # Step 1: Add rendererRef to props
    new_src = re.sub(
        config['prop_pattern'],
        lambda m: f'export default function {config["name"]}({{{m.group(1).strip()}, rendererRef}})',
        src, count=1
    )

    # Step 2: Insert WithViewport component before the export default
    insert_before = f'export default function {config["name"]}'
    new_src = new_src.replace(
        insert_before,
        VIEWPORT_WRAPPER + insert_before,
        1
    )

    # Step 3: Wrap the return JSX with <WithViewport>
    # Find return ( and wrap first child
    def wrap_return(m):
        indent = m.group(2)
        tag    = m.group(3)
        return f'{m.group(1)}\n{indent}<WithViewport rendererRef={{rendererRef}} open={{open}}>\n{indent}{tag}'

    new_src2 = re.sub(config['wrap_pattern'], wrap_return, new_src, count=1)

    if new_src2 == new_src:
        print(f'⚠ {config["name"]}: wrap pattern not found — skipping JSX wrap')
        # Still save the prop + component addition
        open(path, 'w').write(new_src)
        print(f'  (saved with rendererRef prop + WithViewport component)')
        continue

    # Step 4: Close </WithViewport> before the last );
    # Find the last ); in the return block
    last_paren = new_src2.rfind('\n  );')
    if last_paren > 0:
        new_src2 = new_src2[:last_paren] + '\n  </WithViewport>\n  );' + new_src2[last_paren+5:]
        print(f'✓ {config["name"]}: WithViewport wrapper added')
    else:
        print(f'⚠ {config["name"]}: could not find closing ); — manual check needed')

    open(path, 'w').write(new_src2)

# ── 3. Pass rendererRef from App.jsx ─────────────────────────────────────────
app_path = os.path.join(ROOT, 'src/App.jsx')
app  = open(app_path).read()
orig = app

patches = [
    (
        '<AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} />',
        '<AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} />'
    ),
    (
        '<NodeMaterialEditor open={nodeEditorOpen} onClose={() => setNodeEditorOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} />',
        '<NodeMaterialEditor open={nodeEditorOpen} onClose={() => setNodeEditorOpen(false)} meshRef={meshRef} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />'
    ),
    (
        '<UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)} />',
        '<UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)} rendererRef={rendererRef} />'
    ),
    (
        "<UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)}\n              style={{width:'100%",
        "<UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)} rendererRef={rendererRef}\n              style={{width:'100%"
    ),
]

for old, new in patches:
    if old in app and old != new:
        app = app.replace(old, new)
        tag = old.split('<')[1].split(' ')[0]
        print(f'✓ App.jsx: rendererRef → {tag}')

if app != orig:
    open(app_path, 'w').write(app)
    print('✓ App.jsx updated')

print('\nRun: git add -A && git commit -m "fix: safe viewport mirror via WithViewport wrapper" && git push')
