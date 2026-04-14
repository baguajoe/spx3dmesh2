#!/usr/bin/env python3
import os, re

ROOT = '/workspaces/spx3dmesh2'
APP  = ROOT + '/src/App.jsx'
app  = open(APP).read()
orig = app

# ── Find the animate() function and add the fullscreen check ─────────────────
# The animate loop looks like:
#     const animate = () => {
#       rafRef.current = requestAnimationFrame(animate);
#       const _composer = ...
#       if (_composer && ...) { _composer.render(); }
#       else { renderViewportSet(...) }
#     };

OLD_ANIMATE = '''    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const _composer = rendererRef.current?._composer;'''

NEW_ANIMATE = '''    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      // ── Pause render when fullscreen panel is covering the canvas ──
      // This prevents the canvas from blinking through React overlays
      if (typeof window.__spxFullscreenOpen !== 'undefined' && window.__spxFullscreenOpen) {
        return;
      }

      const _composer = rendererRef.current?._composer;'''

if OLD_ANIMATE in app:
    app = app.replace(OLD_ANIMATE, NEW_ANIMATE)
    print('✓ Render loop: fullscreen pause added')
else:
    print('⚠ Could not find exact animate pattern — trying alternate')
    # Try finding it differently
    alt = app.find('rafRef.current = requestAnimationFrame(animate);')
    if alt > 0:
        # Insert after the requestAnimationFrame line
        end_of_line = app.find('\n', alt) + 1
        pause_code = '''
      // Pause render when fullscreen panel is open
      if (window.__spxFullscreenOpen) return;
'''
        app = app[:end_of_line] + pause_code + app[end_of_line:]
        print('✓ Render loop pause added via alternate method')

# ── Set window.__spxFullscreenOpen when any fullscreen panel opens ────────────
# Find the fullscreen panels and add the flag setter
# We do this by patching the state variables that control fullscreen panels

FULLSCREEN_PANELS = [
    'uvPanelOpen',
    'nodeEditorOpen', 
    'animGraphOpen',
    'meshScriptOpen',
    'gamepadOpen',
    'mocapWorkspaceOpen',
    'showPerformancePanel',
    'compositorOpen',
    'style3DTo2DOpen',
    'filmPTOpen',
    'envGenOpen',
    'terrainOpen',
    'cityGenOpen',
    'crowdGenOpen',
]

# Add a useEffect that syncs the flag
SYNC_EFFECT = '''
  // ── Sync fullscreen panel state to render loop pause flag ────────────────
  useEffect(() => {
    const anyOpen = ''' + ' ||\n      '.join(FULLSCREEN_PANELS) + ''';
    window.__spxFullscreenOpen = anyOpen;
  }, [''' + ', '.join(FULLSCREEN_PANELS) + ''']);

'''

# Insert before the render return
if 'window.__spxFullscreenOpen' not in app:
    # Find a good insertion point — before the return (
    return_idx = app.find('  // ── Render ─────────────────')
    if return_idx < 0:
        return_idx = app.find('  return (\n    <>\n    <ProfessionalShell')
    if return_idx < 0:
        return_idx = app.rfind('  return (')
    
    if return_idx > 0:
        app = app[:return_idx] + SYNC_EFFECT + app[return_idx:]
        print('✓ Fullscreen sync effect added')
    else:
        print('⚠ Could not find return statement')
else:
    print('✓ Fullscreen sync already present')

if app != orig:
    open(APP, 'w').write(app)
    print(f'✓ App.jsx updated ({len(app)-len(orig):+d} chars)')

print('\nRun: git add -A && git commit -m "fix: pause render loop when fullscreen panel open, stops blinking" && git push')
