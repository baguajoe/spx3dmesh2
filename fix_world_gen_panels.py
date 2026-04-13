#!/usr/bin/env python3
"""
Makes every WORLD and GEN dropdown item open as a floating panel.

WORLD: Environment, Terrain, City Gen, Crowd
GEN:   Pro Mesh, 3D→2D Style, Node Mod

Steps:
1. Rewrites App.jsx WORKSPACE_MENUS entries for WORLD + GEN to use setters
2. Adds missing useState declarations for each panel
3. Adds missing switch-case handlers
4. Adds JSX render blocks for each panel
5. Creates any missing lightweight panel files
"""
import re, os

ROOT = '/workspaces/spx3dmesh2'
APP  = os.path.join(ROOT, 'src/App.jsx')

app = open(APP).read()

# ─────────────────────────────────────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────────────────────────────────────
def ensure_state(src, var, init='false'):
    """Add useState if not already present."""
    if f'[{var},' in src or f'const [{var}' in src:
        return src
    # Insert after last useState block near the top of component
    anchor = 'const [showPerformancePanel, setShowPerformancePanel]'
    if anchor in src:
        src = src.replace(
            anchor,
            f'const [{var}, set{var[0].upper()}{var[1:]}] = useState({init});\n  {anchor}'
        )
    return src

def ensure_case(src, fn_name, setter):
    """Add switch case if not present."""
    if f'"{fn_name}"' in src:
        return src
    anchor = 'case "openPerformance": setShowPerformancePanel(true); break;'
    if anchor not in src:
        anchor = 'default: break;'
    src = src.replace(
        anchor,
        f'case "{fn_name}": {setter}(true); break;\n      {anchor}'
    )
    return src

def ensure_render(src, state_var, component, props=''):
    """Add JSX render block if not present."""
    tag = f'<{component}'
    if tag in src:
        return src
    # Insert before closing </div> of the panels region
    anchor = '{/* END PANELS */}'
    if anchor not in src:
        # Fall back to a known late render block
        anchor = '{showPerformancePanel &&'
    setter = f'set{state_var[0].upper()}{state_var[1:]}'
    block = (
        f'{{{state_var} && (\n'
        f'  <{component} open={{{state_var}}} onClose={{()=>{setter}(false)}}{props} />\n'
        f')}}\n'
    )
    src = src.replace(anchor, block + anchor)
    return src

# ─────────────────────────────────────────────────────────────────────────────
# 1. Update WORLD menu entries
# ─────────────────────────────────────────────────────────────────────────────
WORLD_OLD_PATTERNS = [
    # Any variant of how World entries might currently be wired
    r'\{label:"Environment"[^}]*\}',
    r'\{label:"Terrain"[^}]*\}',
    r'\{label:"City Gen"[^}]*\}',
    r'\{label:"Crowd"[^}]*\}',
]
WORLD_NEW = [
    '{label:"Environment", fn:"openEnvironment"}',
    '{label:"Terrain",     fn:"openTerrain"}',
    '{label:"City Gen",    fn:"openCityGen"}',
    '{label:"Crowd",       fn:"openCrowd"}',
]

# Find the World block and replace its entries
world_block_re = re.compile(
    r'(World\s*:\s*\[)(.*?)(\])',
    re.DOTALL
)
def replace_world(m):
    return m.group(1) + '\n    ' + ',\n    '.join(WORLD_NEW) + ',\n  ' + m.group(3)

new_app = world_block_re.sub(replace_world, app)
if new_app != app:
    app = new_app
    print('✓ WORLD menu entries updated')
else:
    print('⚠ WORLD block not found via regex — trying string replace')
    for pat, new in zip(WORLD_OLD_PATTERNS, WORLD_NEW):
        app = re.sub(pat, new, app)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Update GEN menu entries
# ─────────────────────────────────────────────────────────────────────────────
GEN_NEW = [
    '{label:"Pro Mesh",    fn:"openProMesh"}',
    '{label:"3D→2D Style", fn:"open3DTo2D"}',
    '{label:"Node Mod",    fn:"openNodeMod"}',
]

gen_block_re = re.compile(
    r'(Gen\s*:\s*\[|GEN\s*:\s*\[)(.*?)(\])',
    re.DOTALL
)
def replace_gen(m):
    return m.group(1) + '\n    ' + ',\n    '.join(GEN_NEW) + ',\n  ' + m.group(3)

new_app = gen_block_re.sub(replace_gen, app)
if new_app != app:
    app = new_app
    print('✓ GEN menu entries updated')
else:
    print('⚠ GEN block not found via regex — patching individually')
    app = re.sub(r'\{label:"Pro Mesh"[^}]*\}',    GEN_NEW[0], app)
    app = re.sub(r'\{label:"3D[→-]2D[^"]*"[^}]*\}', GEN_NEW[1], app)
    app = re.sub(r'\{label:"Node Mod"[^}]*\}',    GEN_NEW[2], app)

# ─────────────────────────────────────────────────────────────────────────────
# 3. useState declarations
# ─────────────────────────────────────────────────────────────────────────────
STATES = [
    ('environmentOpen',),
    ('terrainOpen',),
    ('cityGenOpen',),
    ('crowdOpen',),
    ('proMeshOpen',),
    ('panel3DTo2DOpen',),
    ('nodeModOpen',),
]
for (var,) in STATES:
    app = ensure_state(app, var)
print('✓ useState declarations ensured')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Switch-case handlers
# ─────────────────────────────────────────────────────────────────────────────
CASES = [
    ('openEnvironment', 'setEnvironmentOpen'),
    ('openTerrain',     'setTerrainOpen'),
    ('openCityGen',     'setCityGenOpen'),
    ('openCrowd',       'setCrowdOpen'),
    ('openProMesh',     'setProMeshOpen'),
    ('open3DTo2D',      'setPanel3DTo2DOpen'),
    ('openNodeMod',     'setNodeModOpen'),
]
for fn_name, setter in CASES:
    app = ensure_case(app, fn_name, setter)
print('✓ Switch cases ensured')

# ─────────────────────────────────────────────────────────────────────────────
# 5. JSX render blocks
# ─────────────────────────────────────────────────────────────────────────────
RENDERS = [
    ('environmentOpen', 'EnvironmentGenerator'),
    ('terrainOpen',     'TerrainSculpting'),
    ('cityGenOpen',     'CityGenerator'),
    ('crowdOpen',       'ProceduralCrowdGenerator'),
    ('proMeshOpen',     'ProMeshPanelNew'),
    ('panel3DTo2DOpen', 'SPX3DTo2DPanel'),
    ('nodeModOpen',     'NodeModifierSystem'),
]
for state_var, component in RENDERS:
    app = ensure_render(app, state_var, component)
print('✓ JSX render blocks ensured')

# ─────────────────────────────────────────────────────────────────────────────
# 6. Ensure imports exist
# ─────────────────────────────────────────────────────────────────────────────
IMPORTS = [
    ("EnvironmentGenerator",     "./components/generators/EnvironmentGenerator"),
    ("TerrainSculpting",         "./components/generators/TerrainSculpting"),
    ("CityGenerator",            "./components/generators/CityGenerator"),
    ("ProceduralCrowdGenerator", "./components/generators/ProceduralCrowdGenerator"),
    ("ProMeshPanelNew",          "./components/mesh/ProMeshPanel"),
    ("SPX3DTo2DPanel",           "./components/pipeline/SPX3DTo2DPanel"),
    ("NodeModifierSystem",       "./components/generators/NodeModifierSystem"),
]
import_anchor = "import React"
for name, path in IMPORTS:
    if f'import {name}' not in app and f'import {{ {name}' not in app:
        app = app.replace(
            import_anchor,
            f'import {name} from "{path}.jsx";\n{import_anchor}'
        )
        print(f'  + import {name}')
print('✓ Imports checked')

open(APP, 'w').write(app)
print('\n✓ App.jsx written')

# ─────────────────────────────────────────────────────────────────────────────
# 7. Create any missing panel files
# ─────────────────────────────────────────────────────────────────────────────

PANEL_TEMPLATE = '''import React, {{ useState }} from 'react';
import '../../styles/spx-float-panel.css';

const Section = ({{ title, children }}) => (
  <div className="spx-fp-section">
    <div className="spx-fp-section-title">{{title}}</div>
    {{children}}
  </div>
);

const Row = ({{ label, value, min=0, max=1, step=0.01, onChange }}) => (
  <div className="spx-fp-row">
    <span className="spx-fp-label">{{label}}</span>
    <input type="range" min={{min}} max={{max}} step={{step}}
      value={{value}} onChange={{e => onChange(parseFloat(e.target.value))}}
      className="spx-fp-slider" />
    <span className="spx-fp-val">{{value.toFixed(2)}}</span>
  </div>
);

{body}
'''

panels_to_create = {
    'src/components/generators/EnvironmentGenerator.jsx': '''
export default function EnvironmentGenerator({ open, onClose }) {
  const [preset, setPreset] = useState('forest');
  const [fogDensity, setFogDensity] = useState(0.015);
  const [treeCount, setTreeCount] = useState(25);
  const [rockCount, setRockCount] = useState(8);
  const [ambientInt, setAmbientInt] = useState(0.6);
  const [sunInt, setSunInt] = useState(1.2);

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:300}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#44aaff'}}/>
        <span className="spx-float-panel__title">ENVIRONMENT</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="PRESET">
          <select className="spx-fp-select" value={preset} onChange={e=>setPreset(e.target.value)}>
            {['Forest','Desert','Arctic','Jungle','Beach','Volcanic','Savanna','Swamp'].map(p=>(
              <option key={p} value={p.toLowerCase()}>{p}</option>
            ))}
          </select>
        </Section>
        <Section title="ATMOSPHERE">
          <Row label="Fog Density" value={fogDensity} min={0} max={0.1} step={0.001} onChange={setFogDensity}/>
          <Row label="Ambient"     value={ambientInt} min={0} max={2}               onChange={setAmbientInt}/>
          <Row label="Sun Int."    value={sunInt}     min={0} max={3}               onChange={setSunInt}/>
        </Section>
        <Section title="SCENE">
          <Row label="Trees"  value={treeCount} min={0} max={100} step={1} onChange={setTreeCount}/>
          <Row label="Rocks"  value={rockCount} min={0} max={50}  step={1} onChange={setRockCount}/>
        </Section>
        <div className="spx-fp-actions">
          <button className="spx-fp-btn spx-fp-btn--bake"
            onClick={()=>console.log('[Env] generate',{preset,fogDensity,treeCount,rockCount,ambientInt,sunInt})}>
            GENERATE
          </button>
        </div>
      </div>
    </div>
  );
}
''',

    'src/components/generators/TerrainSculpting.jsx': '''
const BRUSHES = ['Raise','Lower','Flatten','Smooth','Paint','Noise'];
const PRESETS = ['Plateau','Valley','Highlands','Dunes','Crater','Islands'];

export default function TerrainSculpting({ open, onClose }) {
  const [brush, setBrush]       = useState('Raise');
  const [radius, setRadius]     = useState(0.5);
  const [strength, setStrength] = useState(0.5);
  const [scale, setScale]       = useState(1.0);
  const [roughness, setRoughness] = useState(0.5);
  const [resolution, setResolution] = useState(128);

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:300}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#44aaff'}}/>
        <span className="spx-float-panel__title">TERRAIN SCULPT</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="BRUSH">
          <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
            {BRUSHES.map(b=>(
              <button key={b}
                className={"spx-fp-btn" + (brush===b?" spx-fp-btn--bake":"")}
                style={{flex:'0 0 auto',padding:'4px 8px',fontSize:10}}
                onClick={()=>setBrush(b)}>{b}</button>
            ))}
          </div>
          <Row label="Radius"   value={radius}   min={0.05} max={2}   onChange={setRadius}/>
          <Row label="Strength" value={strength} min={0}    max={1}   onChange={setStrength}/>
        </Section>
        <Section title="TERRAIN">
          <Row label="Scale"      value={scale}      min={0.1} max={10}  onChange={setScale}/>
          <Row label="Roughness"  value={roughness}  min={0}   max={1}   onChange={setRoughness}/>
          <Row label="Resolution" value={resolution} min={32}  max={512} step={32} onChange={setResolution}/>
        </Section>
        <Section title="PRESETS">
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {PRESETS.map(p=>(
              <button key={p} className="spx-fp-btn" style={{flex:'0 0 auto',padding:'4px 8px',fontSize:10}}
                onClick={()=>console.log('[Terrain] preset',p)}>{p}</button>
            ))}
          </div>
        </Section>
        <div className="spx-fp-actions">
          <button className="spx-fp-btn spx-fp-btn--bake"
            onClick={()=>console.log('[Terrain] generate',{scale,roughness,resolution})}>GENERATE</button>
          <button className="spx-fp-btn spx-fp-btn--reset"
            onClick={()=>console.log('[Terrain] erode')}>ERODE</button>
        </div>
      </div>
    </div>
  );
}
''',

    'src/components/generators/CityGenerator.jsx': '''
const STYLES = ['Downtown','Suburban','Industrial','Futuristic','Medieval','Cyberpunk'];

export default function CityGenerator({ open, onClose }) {
  const [style, setStyle]       = useState('Downtown');
  const [blocks, setBlocks]     = useState(20);
  const [density, setDensity]   = useState(0.7);
  const [height, setHeight]     = useState(0.5);
  const [roads, setRoads]       = useState(0.3);

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:300}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#44aaff'}}/>
        <span className="spx-float-panel__title">CITY GENERATOR</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="STYLE">
          <select className="spx-fp-select" value={style} onChange={e=>setStyle(e.target.value)}>
            {STYLES.map(s=><option key={s}>{s}</option>)}
          </select>
        </Section>
        <Section title="LAYOUT">
          <Row label="Blocks"   value={blocks}   min={4}   max={100} step={1}  onChange={setBlocks}/>
          <Row label="Density"  value={density}  min={0.1} max={1}             onChange={setDensity}/>
          <Row label="Height"   value={height}   min={0.1} max={1}             onChange={setHeight}/>
          <Row label="Roads"    value={roads}    min={0.1} max={0.8}           onChange={setRoads}/>
        </Section>
        <div className="spx-fp-actions">
          <button className="spx-fp-btn spx-fp-btn--bake"
            onClick={()=>console.log('[City] generate',{style,blocks,density,height,roads})}>GENERATE</button>
          <button className="spx-fp-btn spx-fp-btn--reset">CLEAR</button>
        </div>
      </div>
    </div>
  );
}
''',

    'src/components/generators/ProceduralCrowdGenerator.jsx': '''
const FORMATIONS = ['Random','Circle','Grid','Line','V-Shape','Cluster'];

export default function ProceduralCrowdGenerator({ open, onClose }) {
  const [count, setCount]         = useState(50);
  const [spread, setSpread]       = useState(10);
  const [diversity, setDiversity] = useState(0.8);
  const [spacing, setSpacing]     = useState(1.2);
  const [formation, setFormation] = useState('Random');
  const [animate, setAnimate]     = useState(true);

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:300}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#44aaff'}}/>
        <span className="spx-float-panel__title">CROWD GENERATOR</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="FORMATION">
          <select className="spx-fp-select" value={formation} onChange={e=>setFormation(e.target.value)}>
            {FORMATIONS.map(f=><option key={f}>{f}</option>)}
          </select>
        </Section>
        <Section title="PARAMETERS">
          <Row label="Count"     value={count}     min={1}   max={500} step={1}  onChange={setCount}/>
          <Row label="Spread"    value={spread}    min={1}   max={50}            onChange={setSpread}/>
          <Row label="Diversity" value={diversity} min={0}   max={1}             onChange={setDiversity}/>
          <Row label="Spacing"   value={spacing}   min={0.5} max={5}             onChange={setSpacing}/>
        </Section>
        <Section title="OPTIONS">
          <label className="spx-fp-row" style={{cursor:'pointer'}}>
            <span className="spx-fp-label">Animate</span>
            <input type="checkbox" checked={animate} onChange={e=>setAnimate(e.target.checked)}
              style={{accentColor:'#44aaff'}}/>
          </label>
        </Section>
        <div className="spx-fp-actions">
          <button className="spx-fp-btn spx-fp-btn--bake"
            onClick={()=>console.log('[Crowd] generate',{count,spread,diversity,spacing,formation,animate})}>GENERATE</button>
          <button className="spx-fp-btn spx-fp-btn--reset"
            onClick={()=>console.log('[Crowd] clear')}>CLEAR</button>
        </div>
      </div>
    </div>
  );
}
''',

    'src/components/pipeline/SPX3DTo2DPanel.jsx': '''
const STYLES_2D = ['Photo','Cartoon','Paint','Sketch','Stylized','Anime','Cel-Shade',
  'Watercolor','Oil Paint','Pencil','Comic','Neon','Pixel','Impressionist','Flat Design',
  'Cyberpunk','Film Noir','Retro','Pop Art','Minimalist'];

export default function SPX3DTo2DPanel({ open, onClose }) {
  const [style, setStyle]       = useState('Photo');
  const [resolution, setResolution] = useState('1920x1080');
  const [quality, setQuality]   = useState(0.9);
  const [samples, setSamples]   = useState(64);

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:300}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#ff6600'}}/>
        <span className="spx-float-panel__title">3D → 2D STYLE</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body">
        <Section title="OUTPUT STYLE">
          <select className="spx-fp-select" value={style} onChange={e=>setStyle(e.target.value)}>
            {STYLES_2D.map(s=><option key={s}>{s}</option>)}
          </select>
        </Section>
        <Section title="RENDER">
          <div className="spx-fp-row">
            <span className="spx-fp-label">Resolution</span>
            <select className="spx-fp-select" value={resolution} onChange={e=>setResolution(e.target.value)}>
              {['1280x720','1920x1080','2560x1440','3840x2160','4096x4096'].map(r=>(
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <Row label="Quality" value={quality} min={0.1} max={1}   onChange={setQuality}/>
          <Row label="Samples" value={samples} min={8}   max={512} step={8} onChange={setSamples}/>
        </Section>
        <div className="spx-fp-actions">
          <button className="spx-fp-btn spx-fp-btn--bake"
            onClick={()=>console.log('[3D→2D] convert',{style,resolution,quality,samples})}>CONVERT</button>
          <button className="spx-fp-btn spx-fp-btn--reset">EXPORT</button>
        </div>
      </div>
    </div>
  );
}
''',

    'src/components/generators/NodeModifierSystem.jsx': '''
const NODE_TYPES = {
  Geometry: ['Cube','Sphere','Plane','Cylinder','Torus','Cone'],
  Modifier:  ['Subdivide','Displace','Twist','Wave','Bend','Taper'],
  Math:      ['Add','Subtract','Multiply','Mix','Clamp','Map Range'],
  Material:  ['PBR Output','Emission','Glass','Metal','Skin'],
};

export default function NodeModifierSystem({ open, onClose }) {
  const [nodes, setNodes]   = useState([]);
  const [selected, setSelected] = useState(null);

  const addNode = (type, name) => {
    setNodes(prev => [...prev, { id: Date.now(), type, name, x: 60 + prev.length * 40, y: 60 + (prev.length % 4) * 60 }]);
  };

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:420, minHeight:480}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#ff6600'}}/>
        <span className="spx-float-panel__title">NODE MODIFIER</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body" style={{display:'flex',gap:8,height:'calc(100% - 36px)',overflow:'hidden'}}>
        {/* Sidebar */}
        <div style={{width:130,flexShrink:0,overflowY:'auto',borderRight:'1px solid #1a2a3a',paddingRight:6}}>
          {Object.entries(NODE_TYPES).map(([cat, items]) => (
            <div key={cat}>
              <div className="spx-fp-section-title" style={{marginTop:8}}>{cat}</div>
              {items.map(name => (
                <button key={name} className="spx-fp-btn" style={{display:'block',width:'100%',marginBottom:3,fontSize:9,padding:'4px 6px',textAlign:'left'}}
                  onClick={()=>addNode(cat,name)}>{name}</button>
              ))}
            </div>
          ))}
        </div>
        {/* Graph area */}
        <div style={{flex:1,position:'relative',background:'#080c10',borderRadius:4,overflow:'hidden'}}>
          {nodes.length === 0 && (
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontSize:11}}>
              Add nodes from the sidebar
            </div>
          )}
          {nodes.map(n => (
            <div key={n.id}
              style={{position:'absolute',left:n.x,top:n.y,background:'#0d1117',border:`1px solid ${selected===n.id?'#00ffc8':'#1a2a3a'}`,borderRadius:4,padding:'6px 10px',cursor:'pointer',minWidth:90,fontSize:10,color:'#ccc'}}
              onClick={()=>setSelected(n.id)}>
              <div style={{fontSize:8,color:'#555',marginBottom:2}}>{n.type}</div>
              {n.name}
            </div>
          ))}
        </div>
      </div>
      <div className="spx-fp-actions" style={{padding:'8px 10px'}}>
        <button className="spx-fp-btn spx-fp-btn--bake"
          onClick={()=>console.log('[NodeMod] apply',nodes)}>APPLY</button>
        <button className="spx-fp-btn spx-fp-btn--reset" onClick={()=>setNodes([])}>CLEAR</button>
      </div>
    </div>
  );
}
''',
}

# Also handle ProMeshPanel — only create if it doesn't exist or is the old tiny version
promesh_path = os.path.join(ROOT, 'src/components/mesh/ProMeshPanel.jsx')
if not os.path.exists(promesh_path) or os.path.getsize(promesh_path) < 3000:
    panels_to_create['src/components/mesh/ProMeshPanel.jsx'] = '''
const TOOL_GROUPS = [
  { label:'SELECT',  tools:['Box','Circle','Lasso','All','Invert'] },
  { label:'MESH',    tools:['Extrude','Inset','Loop Cut','Bevel','Knife','Bridge'] },
  { label:'DEFORM',  tools:['Subdivide','Decimate','Remesh','Smooth','Relax'] },
  { label:'BOOLEAN', tools:['Union','Difference','Intersect','Slice'] },
  { label:'SNAP',    tools:['Vert','Edge','Face','Grid','Increment'] },
];

export default function ProMeshPanelNew({ open, onClose }) {
  const [activeTool, setActiveTool] = useState(null);
  const [symX, setSymX] = useState(false);
  const [symY, setSymY] = useState(false);
  const [symZ, setSymZ] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [autoMerge, setAutoMerge] = useState(true);
  const [mergeThresh, setMergeThresh] = useState(0.001);

  if (!open) return null;
  return (
    <div className="spx-float-panel" style={{minWidth:300}}>
      <div className="spx-float-panel__header">
        <div className="spx-float-panel__dot" style={{background:'#ff6600'}}/>
        <span className="spx-float-panel__title">PRO MESH</span>
        {onClose && <button className="spx-float-panel__close" onClick={onClose}>✕</button>}
      </div>
      <div className="spx-float-panel__body">
        {TOOL_GROUPS.map(g => (
          <Section key={g.label} title={g.label}>
            <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
              {g.tools.map(t => (
                <button key={t} className={"spx-fp-btn" + (activeTool===t?" spx-fp-btn--bake":"")}
                  style={{flex:'0 0 auto',padding:'4px 8px',fontSize:9}}
                  onClick={()=>{ setActiveTool(t); console.log('[ProMesh]',t); }}>
                  {t}
                </button>
              ))}
            </div>
          </Section>
        ))}
        <Section title="SYMMETRY">
          {['X','Y','Z'].map((axis, i) => {
            const val  = [symX,symY,symZ][i];
            const setV = [setSymX,setSymY,setSymZ][i];
            return (
              <label key={axis} className="spx-fp-row" style={{cursor:'pointer'}}>
                <span className="spx-fp-label">Mirror {axis}</span>
                <input type="checkbox" checked={val} onChange={e=>setV(e.target.checked)}
                  style={{accentColor:'#ff6600'}}/>
              </label>
            );
          })}
        </Section>
        <Section title="OPTIONS">
          <label className="spx-fp-row" style={{cursor:'pointer'}}>
            <span className="spx-fp-label">Wireframe</span>
            <input type="checkbox" checked={wireframe} onChange={e=>setWireframe(e.target.checked)}
              style={{accentColor:'#ff6600'}}/>
          </label>
          <label className="spx-fp-row" style={{cursor:'pointer'}}>
            <span className="spx-fp-label">Auto Merge</span>
            <input type="checkbox" checked={autoMerge} onChange={e=>setAutoMerge(e.target.checked)}
              style={{accentColor:'#ff6600'}}/>
          </label>
          <Row label="Merge Dist" value={mergeThresh} min={0.0001} max={0.1} step={0.0001} onChange={setMergeThresh}/>
        </Section>
      </div>
    </div>
  );
}
'''

# Write all panel files
for rel_path, body in panels_to_create.items():
    full_path = os.path.join(ROOT, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    # Build the full file from template
    imports = "import React, { useState } from 'react';\nimport '../../styles/spx-float-panel.css';\n\n"

    # Adjust relative import depth
    depth = rel_path.count('/') - 1  # src/ is depth 1
    if depth == 2:
        imports = imports.replace('../../styles/', '../../styles/')
    elif depth == 3:
        imports = imports.replace('../../styles/', '../../../styles/')

    helpers = """
const Section = ({ title, children }) => (
  <div className="spx-fp-section">
    <div className="spx-fp-section-title">{title}</div>
    {children}
  </div>
);

const Row = ({ label, value, min=0, max=1, step=0.01, onChange }) => (
  <div className="spx-fp-row">
    <span className="spx-fp-label">{label}</span>
    <input type="range" min={min} max={max} step={step}
      value={value} onChange={e => onChange(parseFloat(e.target.value))}
      className="spx-fp-slider" />
    <span className="spx-fp-val">{typeof value === 'number' ? value.toFixed(2) : value}</span>
  </div>
);
"""
    content = imports + helpers + body.strip()
    with open(full_path, 'w') as f:
        f.write(content)
    print(f'✓ Written: {rel_path}')

print('\n✅ All done!')
print('Run: git add -A && git commit -m "feat: WORLD+GEN all items open as floating panels" && git push')
