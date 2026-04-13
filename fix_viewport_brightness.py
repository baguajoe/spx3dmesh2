#!/usr/bin/env python3
import os, re

ROOT = '/workspaces/spx3dmesh2'
APP  = ROOT + '/src/App.jsx'
app  = open(APP).read()
orig = app

# ── 1. Fix Mesh Script viewport — make it lighter ────────────────────────────
# The LiveViewportMirror has background:#060a10 which is very dark
# Change to show grid by making bg transparent / lighter
app = app.replace(
    '''<LiveViewportMirror rendererRef={rendererRef} open={meshScriptOpen} label="3D SCENE — SCRIPT OUTPUT" />''',
    '''<LiveViewportMirror rendererRef={rendererRef} open={meshScriptOpen} label="3D SCENE — SCRIPT OUTPUT" bright={true} />'''
)
print('✓ MeshScript: bright prop added')

# ── 2. Update LiveViewportMirror to support bright prop ──────────────────────
app = app.replace(
    'function LiveViewportMirror({ rendererRef, open, label }) {',
    'function LiveViewportMirror({ rendererRef, open, label, bright }) {'
)
app = app.replace(
    "background:'#060a10'",
    "background: bright ? '#0d1117' : '#060a10'"
)
print('✓ LiveViewportMirror: bright mode added')

# ── 3. Wire UV Editor viewport mirror ────────────────────────────────────────
# Find the UV fullscreen overlay block
uv_idx = app.find('{uvPanelOpen &&')
if uv_idx > 0:
    # Find the overlay-body div within this block
    body_idx = app.find('<div className="spx-overlay-body">', uv_idx)
    end_idx  = app.find('</div>\n        </div>\n      )}', body_idx)
    
    if body_idx > 0 and end_idx > 0 and 'LiveViewportMirror' not in app[uv_idx:end_idx]:
        old = app[body_idx:end_idx + len('</div>\n        </div>\n      )}')]
        new = '''<div className="spx-overlay-body" style={{flexDirection:'row',padding:0}}>
            <LiveViewportMirror rendererRef={rendererRef} open={uvPanelOpen} label="UV — 3D SCENE" />
            <div style={{flex:1,minWidth:0,overflow:'hidden',display:'flex',flexDirection:'column'}}>
''' + old[old.find('\n')+1:].replace('</div>\n        </div>\n      )}', '</div>\n            </div>\n          </div>\n        </div>\n      )}')
        app = app[:body_idx] + new
        print('✓ UV Editor: viewport mirror added')
    elif 'LiveViewportMirror' in app[uv_idx:uv_idx+500]:
        print('✓ UV Editor: already has mirror')
    else:
        print('⚠ UV Editor: could not find exact pattern — using simple inject')
        # Simple: just add mirror right after overlay-body opening tag
        app = app[:body_idx] + '<div className="spx-overlay-body" style={{flexDirection:"row",padding:0}}>\n            <LiveViewportMirror rendererRef={rendererRef} open={uvPanelOpen} label="UV — 3D SCENE" />\n            <div style={{flex:1,minWidth:0,overflow:"hidden"}}>' + app[body_idx + len('<div className="spx-overlay-body">'):end_idx] + '</div>\n          </div>\n        </div>\n      )}'
        # Find and close extra div
        print('  Applied simple inject')

# ── 4. Wire Node Material Editor viewport mirror ──────────────────────────────
nme_idx = app.find('{nodeEditorOpen &&')
if nme_idx > 0:
    body_idx2 = app.find('<div className="spx-overlay-body"', nme_idx)
    
    if body_idx2 > 0 and 'LiveViewportMirror' not in app[nme_idx:nme_idx+1000]:
        # Find end of the opening div tag
        tag_end = app.find('>', body_idx2) + 1
        old_tag = app[body_idx2:tag_end]
        
        # Replace with flex row version + mirror
        new_open = '<div className="spx-overlay-body" style={{flexDirection:"row",padding:0,overflow:"hidden"}}>\n            <LiveViewportMirror rendererRef={rendererRef} open={nodeEditorOpen} label="NODE MAT — 3D SCENE" />\n            <div style={{flex:1,minWidth:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>'
        
        # Find the closing of this overlay-body
        # Count from body_idx2 to find matching </div>
        depth = 0
        i = body_idx2
        close_pos = -1
        while i < len(app):
            if app[i:i+4] == '<div':
                depth += 1
            elif app[i:i+6] == '</div>':
                depth -= 1
                if depth == 0:
                    close_pos = i
                    break
            i += 1
        
        if close_pos > 0:
            inner = app[tag_end:close_pos]
            new_block = new_open + inner + '\n            </div>\n          </div>'
            app = app[:body_idx2] + new_block + app[close_pos + 6:]
            print('✓ Node Material Editor: viewport mirror added')
        else:
            print('⚠ Node Mat: could not find closing div')
    elif 'LiveViewportMirror' in app[nme_idx:nme_idx+1000]:
        print('✓ Node Mat: already has mirror')

# ── 5. Write ──────────────────────────────────────────────────────────────────
if app != orig:
    open(APP, 'w').write(app)
    print(f'✓ App.jsx updated ({len(app)-len(orig):+d} chars)')

print('\nRun: git add -A && git commit -m "fix: MeshScript brighter viewport, UV+NodeMat mirrors" && git push')
