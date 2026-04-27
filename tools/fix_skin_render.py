#!/usr/bin/env python3
import re

ROOT = '/workspaces/spx3dmesh2'
APP  = ROOT + '/src/App.jsx'
src  = open(APP).read()
orig = src

# Check if render block already exists in any form
if 'customSkinPanelOpen &&' in src or 'CustomSkinBuilderPanel' in src.split('return (')[1]:
    print('✓ Already rendered — checking exact form')
    # Find it
    idx = src.find('CustomSkinBuilderPanel', src.find('return ('))
    print(f'  Found at char {idx}: ...{src[max(0,idx-50):idx+80]}...')
else:
    print('✗ Not in render section — adding now')
    # Add before the closing </> of the render
    anchor = '<CustomSkinBuilderPanel'
    # Find the existing CustomSkinBuilderPanel JSX (it's already in App.jsx render)
    # but check if it's guarded by customSkinPanelOpen
    pos = src.rfind('<CustomSkinBuilderPanel')
    if pos > 0:
        # Check what's before it
        before = src[max(0,pos-60):pos]
        print(f'  Existing block context: ...{before}...')
        if 'customSkinPanelOpen' not in before:
            # Wrap it
            end = src.find('/>', pos) + 2
            old_block = src[pos:end]
            new_block = f'{{customSkinPanelOpen && (\n      {old_block}\n      )}}'
            src = src[:pos] + new_block + src[end:]
            print('✓ Wrapped existing CustomSkinBuilderPanel in conditional')
    else:
        # Add fresh render block near other panel renders
        anchor = '{/* ProMesh renders via FloatPanel above */}'
        if anchor not in src:
            anchor = '{showPerformancePanel &&'
        block = '''{customSkinPanelOpen && (
        <div className="spx-fullscreen-overlay">
          <div className="spx-overlay-header">
            <span className="spx-overlay-title">🎨 SKIN GENERATOR</span>
            <button onClick={()=>setCustomSkinPanelOpen(false)} className="spx-overlay-close">✕ CLOSE</button>
          </div>
          <div className="spx-overlay-body">
            <CustomSkinBuilderPanel
              open={customSkinPanelOpen}
              onClose={()=>setCustomSkinPanelOpen(false)}
              onApply={(params)=>{ if(meshRef.current && typeof buildCustomSkin==='function'){ buildCustomSkin(meshRef.current,params); setStatus('Custom skin applied'); }}}
              onDownload={(params)=>{ if(typeof generateFullSkinTextures==='function'){ const t=generateFullSkinTextures({size:params.textureSize||1024}); ['color','roughness','normal','ao'].forEach(k=>{const a=document.createElement('a');a.href=t[k].toDataURL('image/png');a.download='spx_skin_'+k+'.png';a.click();}); setStatus('Textures downloaded'); }}}
            />
          </div>
        </div>
      )}
      '''
        src = src.replace(anchor, block + anchor)
        print('✓ CustomSkinBuilderPanel render block added')

if src != orig:
    open(APP, 'w').write(src)
    print(f'\n✅ App.jsx updated')
else:
    print('\n⚠ No changes needed')

print('\nRun: git add -A && git commit -m "fix: CustomSkinBuilderPanel render block" && git push')
