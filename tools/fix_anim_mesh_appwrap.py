#!/usr/bin/env python3
import os, re

ROOT = '/workspaces/spx3dmesh2'
APP  = ROOT + '/src/App.jsx'
app  = open(APP).read()
orig = app

# ── CSS fix for ms-overlay to allow flex row ─────────────────────────────────
layout_path = ROOT + '/src/styles/spx-app-layout.css'
layout = open(layout_path).read()

MS_CSS = """
/* ── AnimGraph/MeshScript ms-overlay fills fullscreen ── */
.ms-overlay {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
  background: rgba(0,0,0,0.0) !important;
  display: flex !important;
  align-items: stretch !important;
}
.ms-panel {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  max-height: none !important;
  border-radius: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  flex: 1 !important;
}
"""

if '.ms-overlay {' not in layout:
    layout += MS_CSS
    open(layout_path, 'w').write(layout)
    print('✓ ms-overlay CSS added')
else:
    layout = re.sub(
        r'/\* ── AnimGraph/MeshScript.*?\.ms-panel \{[^}]*\}',
        MS_CSS.strip(), layout, flags=re.DOTALL
    )
    open(layout_path, 'w').write(layout)
    print('✓ ms-overlay CSS updated')

# ── Wrap AnimGraph and MeshScript in App.jsx with a live viewport div ─────────
# Instead of touching the panel files, we wrap the overlay render block
# with a flex container that has the live canvas on the left

ANIM_OLD = '''{animGraphOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🔗 ANIMATION GRAPH</span>
            <button onClick={() => setAnimGraphOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} />
          </div>
        </div>
      )}'''

ANIM_NEW = '''{animGraphOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🔗 ANIMATION GRAPH</span>
            <button onClick={() => setAnimGraphOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body" style={{flexDirection:'row'}}>
            <LiveViewportMirror rendererRef={rendererRef} open={animGraphOpen} label="3D SCENE — LIVE" />
            <div style={{flex:1,minWidth:0,overflow:'hidden',display:'flex',flexDirection:'column'}}>
              <AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} />
            </div>
          </div>
        </div>
      )}'''

MESH_OLD = '''{meshScriptOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">📝 MESH SCRIPT</span>
            <button onClick={() => setMeshScriptOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <MeshScriptPanel open={meshScriptOpen} onClose={() => setMeshScriptOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />
          </div>
        </div>
      )}'''

MESH_NEW = '''{meshScriptOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">📝 MESH SCRIPT</span>
            <button onClick={() => setMeshScriptOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body" style={{flexDirection:'row'}}>
            <LiveViewportMirror rendererRef={rendererRef} open={meshScriptOpen} label="3D SCENE — SCRIPT OUTPUT" />
            <div style={{flex:1,minWidth:0,overflow:'hidden',display:'flex',flexDirection:'column'}}>
              <MeshScriptPanel open={meshScriptOpen} onClose={() => setMeshScriptOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} />
            </div>
          </div>
        </div>
      )}'''

# Add LiveViewportMirror component near the top of App.jsx (after imports)
LIVE_MIRROR_COMPONENT = '''
// ── Reusable live viewport mirror for fullscreen panels ───────────────────────
function LiveViewportMirror({ rendererRef, open, label }) {
  const canvasRef = React.useRef(null);
  const rafRef    = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const tick = () => {
      const src = rendererRef?.current?.domElement;
      const dst = canvasRef.current;
      if (src && dst && dst.offsetWidth > 0) {
        dst.width  = dst.offsetWidth;
        dst.height = dst.offsetHeight;
        dst.getContext('2d').drawImage(src, 0, 0, dst.width, dst.height);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [open, rendererRef]);
  return (
    <div style={{flex:'0 0 45%',minWidth:0,display:'flex',flexDirection:'column',borderRight:'1px solid #21262d',background:'#060a10'}}>
      <div style={{fontSize:9,fontWeight:700,color:'#444',letterSpacing:'1.5px',padding:'5px 10px',background:'#0a0d13',borderBottom:'1px solid #21262d',flexShrink:0,textTransform:'uppercase'}}>{label}</div>
      <canvas ref={canvasRef} style={{flex:1,width:'100%',display:'block',minHeight:0}} />
    </div>
  );
}

'''

# Add component before export default function App()
if 'LiveViewportMirror' not in app:
    app = app.replace(
        'export default function App() {',
        LIVE_MIRROR_COMPONENT + 'export default function App() {'
    )
    print('✓ LiveViewportMirror component added to App.jsx')

# Apply the render block replacements
for old, new, name in [(ANIM_OLD, ANIM_NEW, 'AnimGraph'), (MESH_OLD, MESH_NEW, 'MeshScript')]:
    if old in app:
        app = app.replace(old, new)
        print(f'✓ {name}: viewport mirror added via App.jsx wrapper')
    else:
        # Try without rendererRef in old pattern
        old2 = old.replace(' rendererRef={rendererRef}', '')
        if old2 in app:
            app = app.replace(old2, new)
            print(f'✓ {name}: viewport mirror added (no rendererRef variant)')
        else:
            print(f'⚠ {name}: render block not found — checking current form')
            # Find the block
            idx = app.find(f'<AnimGraphPanel' if 'Anim' in name else '<MeshScriptPanel')
            if idx > 0:
                print(f'  Found at char {idx}: ...{app[max(0,idx-100):idx+50]}...')

if app != orig:
    open(APP, 'w').write(app)
    print(f'✓ App.jsx updated ({len(app)-len(orig):+d} chars)')

print('\nRun: git add -A && git commit -m "fix: AnimGraph+MeshScript live viewport via App.jsx wrapper" && git push')
