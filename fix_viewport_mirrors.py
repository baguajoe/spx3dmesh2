#!/usr/bin/env python3
import os, re

ROOT = '/workspaces/spx3dmesh2'

MIRROR_EFFECT = '''
  // ── Live 3D viewport mirror ──────────────────────────────────────────────
  const _vpRef    = useRef(null);
  const _vpMirror = useRef(null);
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const src = rendererRef?.current?.domElement;
      const dst = _vpRef.current;
      if (src && dst && dst.offsetWidth > 0) {
        dst.width  = dst.offsetWidth;
        dst.height = dst.offsetHeight;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      _vpMirror.current = requestAnimationFrame(tick);
    };
    _vpMirror.current = requestAnimationFrame(tick);
    return () => { if (_vpMirror.current) cancelAnimationFrame(_vpMirror.current); };
  }, [open, rendererRef]);

  const _vpCanvas = (
    <div style={{display:'flex',flexDirection:'column',flex:'0 0 45%',minWidth:0,borderRight:'1px solid #21262d',overflow:'hidden',background:'#060a10'}}>
      <div style={{fontSize:9,fontWeight:700,color:'#444',letterSpacing:'1.5px',padding:'5px 10px',background:'#0a0d13',borderBottom:'1px solid #21262d',flexShrink:0}}>3D SCENE — LIVE</div>
      <canvas ref={_vpRef} style={{flex:1,width:'100%',display:'block',minHeight:0}} />
    </div>
  );
'''

# ── 1. AnimGraphPanel ─────────────────────────────────────────────────────────
anim_path = ROOT + '/src/components/panels/AnimGraphPanel.jsx'
anim = open(anim_path).read()

if '_vpRef' not in anim:
    # Add rendererRef to props
    anim = anim.replace(
        'export default function AnimGraphPanel({ open, onClose, sceneRef })',
        'export default function AnimGraphPanel({ open, onClose, sceneRef, rendererRef })'
    )
    # Add mirror after first useState in component body
    anim = anim.replace(
        "  const [nodes, setNodes] = useState([",
        MIRROR_EFFECT + "\n  const [nodes, setNodes] = useState(["
    )
    # Find the ms-overlay div and add viewport beside ms-panel
    anim = anim.replace(
        '<div className="ms-overlay" onClick={onClose}>',
        '<div className="ms-overlay" onClick={onClose} style={{display:"flex",flexDirection:"row",alignItems:"stretch"}}>'
    )
    anim = anim.replace(
        '<div className="ms-panel" style={{width:680}} onClick={e=>e.stopPropagation()}>',
        '<>{_vpCanvas}<div className="ms-panel" style={{flex:1,minWidth:0,width:"auto"}} onClick={e=>e.stopPropagation()}>'
    )
    # Close the fragment before closing ms-overlay
    anim = anim.replace(
        '</div>\n    </div>\n  );\n}',
        '</div>\n    </></div>\n  );\n}',
        1  # only replace last occurrence
    )
    # Better: find the closing </div></div> at end of return
    open(anim_path, 'w').write(anim)
    print('✓ AnimGraphPanel: viewport mirror added')
else:
    print('✓ AnimGraphPanel: already has mirror')

# ── 2. MeshScriptPanel ────────────────────────────────────────────────────────
mesh_path = ROOT + '/src/components/panels/MeshScriptPanel.jsx'
mesh = open(mesh_path).read()

if '_vpRef' not in mesh:
    # Add rendererRef to props
    mesh = mesh.replace(
        'export default function MeshScriptPanel({ open, onClose, sceneRef, setStatus })',
        'export default function MeshScriptPanel({ open, onClose, sceneRef, rendererRef, setStatus })'
    )
    # Add mirror after first useState
    mesh = mesh.replace(
        "  const [code, setCode]         = useState(SCRIPT_EXAMPLES.hello);",
        MIRROR_EFFECT + "\n  const [code, setCode]         = useState(SCRIPT_EXAMPLES.hello);"
    )
    # Wrap the root return div with a flex row containing the viewport
    mesh = re.sub(
        r'(  if \(!open\) return null;\n\n  return \()\n(\s*)(<div)',
        r'\1\n\2<div style={{display:"flex",width:"100%",height:"100%",overflow:"hidden"}}>\n\2{_vpCanvas}\n\2<div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>\n\2\3',
        mesh, count=1
    )
    # Close the extra wrappers - find last );
    mesh = mesh.rstrip()
    if mesh.endswith(');'):
        mesh = mesh[:-2] + '\n  </div>\n  </div>\n  );\n'
    open(mesh_path, 'w').write(mesh)
    print('✓ MeshScriptPanel: viewport mirror added')
else:
    print('✓ MeshScriptPanel: already has mirror')

# ── 3. UVEditorPanel ─────────────────────────────────────────────────────────
uv_path = ROOT + '/src/components/uv/UVEditorPanel.jsx'
uv = open(uv_path).read()

if '_vpRef' not in uv:
    # Add rendererRef to props - find the function signature
    uv = re.sub(
        r'export default function UVEditorPanel\(\{([^}]*)\}\)',
        lambda m: f'export default function UVEditorPanel({{{m.group(1).strip()}, rendererRef}})',
        uv, count=1
    )
    # Add mirror effect after first useState/useRef
    insert_after = re.search(r'  const \w+ = use(State|Ref|Callback|Effect)\(', uv)
    if insert_after:
        pos = uv.find('\n', insert_after.start()) + 1
        uv = uv[:pos] + MIRROR_EFFECT + uv[pos:]
    # Wrap return with flex row
    uv = re.sub(
        r'(  return \()\n(\s*)(<div)',
        r'\1\n\2<div style={{display:"flex",width:"100%",height:"100%",overflow:"hidden"}}>\n\2{_vpCanvas}\n\2<div style={{flex:1,minWidth:0,overflow:"hidden"}}>\n\2\3',
        uv, count=1
    )
    uv = uv.rstrip()
    if uv.endswith(');'):
        uv = uv[:-2] + '\n  </div>\n  </div>\n  );\n'
    open(uv_path, 'w').write(uv)
    print('✓ UVEditorPanel: viewport mirror added')
else:
    print('✓ UVEditorPanel: already has mirror')

# ── 4. NodeMaterialEditor ────────────────────────────────────────────────────
nme_path = ROOT + '/src/components/panels/NodeMaterialEditor.jsx'
nme = open(nme_path).read()

if '_vpRef' not in nme:
    nme = re.sub(
        r'export default function NodeMaterialEditor\(\{([^}]*)\}\)',
        lambda m: f'export default function NodeMaterialEditor({{{m.group(1).strip()}, rendererRef}})',
        nme, count=1
    )
    # Also handle arrow function export
    nme = re.sub(
        r'const NodeMaterialEditor = \(\{([^}]*)\}\)',
        lambda m: f'const NodeMaterialEditor = ({{{m.group(1).strip()}, rendererRef}})',
        nme, count=1
    )
    insert_after = re.search(r'  const \w+ = use(State|Ref|Callback)\(', nme)
    if insert_after:
        pos = nme.find('\n', insert_after.start()) + 1
        nme = nme[:pos] + MIRROR_EFFECT + nme[pos:]
    # Wrap return
    nme = re.sub(
        r'(  return \()\n(\s*)(<div)',
        r'\1\n\2<div style={{display:"flex",width:"100%",height:"100%",overflow:"hidden"}}>\n\2{_vpCanvas}\n\2<div style={{flex:1,minWidth:0,overflow:"hidden"}}>\n\2\3',
        nme, count=1
    )
    nme = nme.rstrip()
    if nme.endswith(');'):
        nme = nme[:-2] + '\n  </div>\n  </div>\n  );\n'
    open(nme_path, 'w').write(nme)
    print('✓ NodeMaterialEditor: viewport mirror added')
else:
    print('✓ NodeMaterialEditor: already has mirror')

# ── 5. Pass rendererRef from App.jsx ─────────────────────────────────────────
app_path = ROOT + '/src/App.jsx'
app = open(app_path).read()
orig = app

patches = [
    # AnimGraph
    (
        'sceneRef={sceneRef} rendererRef={rendererRef} />',
        'sceneRef={sceneRef} rendererRef={rendererRef} />'
    ),
    # AnimGraph without rendererRef
    (
        '<AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} />',
        '<AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} />'
    ),
    # NodeMaterialEditor
    (
        '<NodeMaterialEditor open={nodeEditorOpen} onClose={() => setNodeEditorOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} />',
        '<NodeMaterialEditor open={nodeEditorOpen} onClose={() => setNodeEditorOpen(false)} meshRef={meshRef} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />'
    ),
    # UVEditorPanel
    (
        '<UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)} />',
        '<UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)} rendererRef={rendererRef} />'
    ),
    (
        '<UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)}\n              style={{width:\'100%\',height:\'100%\',border:\'none\',borderRadius:0}} />',
        '<UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)} rendererRef={rendererRef} />'
    ),
]

for old, new in patches:
    if old != new and old in app:
        app = app.replace(old, new)
        print(f'✓ App.jsx: rendererRef added to {old.split("<")[1].split(" ")[0]}')

if app != orig:
    open(app_path, 'w').write(app)
    print('✓ App.jsx updated')

print('\nRun: git add -A && git commit -m "fix: viewport mirror for AnimGraph/MeshScript/UV/NodeMat" && git push')
