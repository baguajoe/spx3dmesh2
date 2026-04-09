import React, { useState } from "react";

// ── SVG Primitive Icons ─────────────────────────────────────────────
const PrimIcon = ({ id }) => {
  const s = { stroke: "var(--ac-text)", strokeWidth: 1.2, fill: "none", strokeLinejoin: "round", strokeLinecap: "round" };
  const icons = {
    box: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <polyline points="7,9 14,5 21,9 21,19 14,23 7,19 7,9" {...s}/>
        <line x1="14" y1="5"  x2="14" y2="15" {...s}/>
        <line x1="7"  y1="9"  x2="14" y2="13" {...s}/>
        <line x1="21" y1="9"  x2="14" y2="13" {...s}/>
        <line x1="14" y1="15" x2="14" y2="23" {...s} strokeOpacity="0.3"/>
        <line x1="14" y1="15" x2="7"  y2="19" {...s} strokeOpacity="0.3"/>
        <line x1="14" y1="15" x2="21" y2="19" {...s} strokeOpacity="0.3"/>
      </svg>
    ),
    sphere: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <circle cx="14" cy="14" r="8" {...s}/>
        <ellipse cx="14" cy="14" rx="8" ry="3.2" {...s} strokeOpacity="0.4"/>
        <ellipse cx="14" cy="14" rx="3.2" ry="8" {...s} strokeOpacity="0.4"/>
      </svg>
    ),
    cylinder: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <ellipse cx="14" cy="8"  rx="7" ry="2.5" {...s}/>
        <ellipse cx="14" cy="20" rx="7" ry="2.5" {...s}/>
        <line x1="7"  y1="8" x2="7"  y2="20" {...s}/>
        <line x1="21" y1="8" x2="21" y2="20" {...s}/>
      </svg>
    ),
    torus: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <ellipse cx="14" cy="15" rx="9" ry="4"   {...s}/>
        <ellipse cx="14" cy="13" rx="9" ry="4"   {...s} strokeOpacity="0.35"/>
        <path d="M5,14 Q5,6 14,6 Q23,6 23,14"    {...s} strokeOpacity="0.3"/>
      </svg>
    ),
    plane: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <polygon points="4,20 14,16 24,20 14,24"  {...s}/>
        <polygon points="4,20 4,14 14,10 14,16"   {...s} strokeOpacity="0.4"/>
        <polygon points="24,20 24,14 14,10 14,16" {...s} strokeOpacity="0.4"/>
        <line x1="4" y1="17" x2="24" y2="17"     {...s} strokeOpacity="0.25"/>
      </svg>
    ),
    icosphere: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <polygon points="14,5 21,11 18,20 10,20 7,11" {...s}/>
        <line x1="14" y1="5"  x2="14" y2="20" {...s} strokeOpacity="0.4"/>
        <line x1="7"  y1="11" x2="21" y2="11" {...s} strokeOpacity="0.4"/>
        <line x1="7"  y1="11" x2="18" y2="20" {...s} strokeOpacity="0.4"/>
        <line x1="21" y1="11" x2="10" y2="20" {...s} strokeOpacity="0.4"/>
        <circle cx="14" cy="13" r="8.5"        {...s} strokeOpacity="0.2"/>
      </svg>
    ),
    gear: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <circle cx="14" cy="14" r="4" {...s}/>
        {[0,45,90,135,180,225,270,315].map(a => {
          const r1=7.5, r2=9.5, ra=a*Math.PI/180, rb=(a+20)*Math.PI/180;
          return <polyline key={a} points={`${14+r1*Math.cos(ra)},${14+r1*Math.sin(ra)} ${14+r2*Math.cos(ra)},${14+r2*Math.sin(ra)} ${14+r2*Math.cos(rb)},${14+r2*Math.sin(rb)} ${14+r1*Math.cos(rb)},${14+r1*Math.sin(rb)}`} {...s}/>;
        })}
        <circle cx="14" cy="14" r="7.5" {...s} strokeOpacity="0.3"/>
      </svg>
    ),
    pipe: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <ellipse cx="14" cy="7"  rx="5" ry="2" {...s}/>
        <ellipse cx="14" cy="21" rx="5" ry="2" {...s}/>
        <ellipse cx="14" cy="7"  rx="2.5" ry="1" {...s} strokeOpacity="0.5"/>
        <ellipse cx="14" cy="21" rx="2.5" ry="1" {...s} strokeOpacity="0.5"/>
        <line x1="9"  y1="7" x2="9"  y2="21" {...s}/>
        <line x1="19" y1="7" x2="19" y2="21" {...s}/>
      </svg>
    ),
    helix: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <path d="M10,5 Q20,7 20,11 Q20,15 10,17 Q4,19 8,23"  {...s}/>
        <path d="M18,5 Q8,7 8,11 Q8,15 18,17 Q24,19 20,23"   {...s} strokeOpacity="0.35"/>
      </svg>
    ),
    staircase: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <polyline points="5,22 5,17 10,17 10,13 15,13 15,9 20,9 20,5 23,5 23,22 5,22" {...s}/>
      </svg>
    ),
    arch: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <path d="M6,22 L6,13 Q6,5 14,5 Q22,5 22,13 L22,22"   {...s}/>
        <path d="M10,22 L10,13 Q10,9 14,9 Q18,9 18,13 L18,22" {...s} strokeOpacity="0.45"/>
        <line x1="6"  y1="22" x2="10" y2="22" {...s}/>
        <line x1="18" y1="22" x2="22" y2="22" {...s}/>
      </svg>
    ),
    lathe: (
      <svg viewBox="0 0 28 28" width="28" height="28">
        <path d="M14,5 Q18,7 19,10 Q20,14 18,18 Q16,22 14,23"  {...s}/>
        <path d="M14,5 Q10,7 9,10 Q8,14 10,18 Q12,22 14,23"    {...s} strokeOpacity="0.4"/>
        <line x1="14" y1="5" x2="14" y2="23" {...s} strokeDasharray="2,2" strokeOpacity="0.3"/>
      </svg>
    ),
  };
  return icons[id] || null;
};

// ── Data ────────────────────────────────────────────────────────────
const PRIMS = [
  { id:"box",       label:"Cube"     },
  { id:"sphere",    label:"Sphere"   },
  { id:"cylinder",  label:"Cylinder" },
  { id:"torus",     label:"Torus"    },
  { id:"plane",     label:"Plane"    },
  { id:"icosphere", label:"Ico"      },
  { id:"gear",      label:"Gear"     },
  { id:"pipe",      label:"Pipe"     },
  { id:"helix",     label:"Helix"    },
  { id:"staircase", label:"Stairs"   },
  { id:"arch",      label:"Arch"     },
  { id:"lathe",     label:"Lathe"    },
];

const EDIT_TOOLS = [
  { id:"select",     label:"Select",     key:"S"   },
  { id:"grab",       label:"Grab",       key:"G"   },
  { id:"rotate",     label:"Rotate",     key:"R"   },
  { id:"scale",      label:"Scale",      key:"S"   },
  { id:"extrude",    label:"Extrude",    key:"E"   },
  { id:"loop_cut",   label:"Loop Cut",   key:"^R"  },
  { id:"knife",      label:"Knife",      key:"K"   },
  { id:"edge_slide", label:"Edge Slide", key:"GG"  },
  { id:"bevel",      label:"Bevel",      key:"^B"  },
  { id:"inset",      label:"Inset",      key:"I"   },
];

// ── Transform / Properties panel (right-side N-panel style) ─────────
export function PropertiesPanel({ stats, activeObj }) {
  const [section, setSection] = useState("transform");

  const loc  = activeObj?.position  || { x:0, y:0, z:0 };
  const rot  = activeObj?.rotation  || { x:0, y:0, z:0 };
  const scl  = activeObj?.scale     || { x:1, y:1, z:1 };

  const fmt = (v) => (typeof v === "number" ? v.toFixed(4) : "0.0000");

  return (
    <div className="props-root">
      {/* section tabs */}
      <div className="props-tabs">
        {[["transform","Transform"],["object","Object"],["stats","Stats"]].map(([id,lbl]) => (
          <button key={id}
            className={`props-tab${section===id?" props-tab--active":""}`}
            onClick={() => setSection(id)}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Transform */}
      {section === "transform" && (
        <div className="props-body">
          <div className="props-group-label">Location</div>
          {["x","y","z"].map(ax => (
            <div key={ax} className="props-row">
              <span className={`props-axis props-axis--${ax}`}>{ax.toUpperCase()}</span>
              <input className="props-input" type="number" step="0.01"
                defaultValue={fmt(loc[ax])} />
              <span className="props-unit">m</span>
            </div>
          ))}

          <div className="props-group-label">Rotation</div>
          {["x","y","z"].map(ax => (
            <div key={ax} className="props-row">
              <span className={`props-axis props-axis--${ax}`}>{ax.toUpperCase()}</span>
              <input className="props-input" type="number" step="1"
                defaultValue={fmt(rot[ax])} />
              <span className="props-unit">°</span>
            </div>
          ))}

          <div className="props-group-label">Scale</div>
          {["x","y","z"].map(ax => (
            <div key={ax} className="props-row">
              <span className={`props-axis props-axis--${ax}`}>{ax.toUpperCase()}</span>
              <input className="props-input" type="number" step="0.01"
                defaultValue={fmt(scl[ax])} />
            </div>
          ))}

          <div className="props-group-label">Mode</div>
          <div className="props-row">
            <select className="props-select">
              <option>XYZ Euler</option>
              <option>Quaternion</option>
              <option>Axis Angle</option>
            </select>
          </div>
        </div>
      )}

      {/* Object info */}
      {section === "object" && (
        <div className="props-body">
          <div className="props-group-label">Relations</div>
          <div className="props-kv"><span>Parent</span><span>—</span></div>
          <div className="props-kv"><span>Collection</span><span>Scene</span></div>

          <div className="props-group-label">Visibility</div>
          <div className="props-kv"><span>Viewport</span><span className="props-val-on">●</span></div>
          <div className="props-kv"><span>Render</span><span className="props-val-on">●</span></div>

          <div className="props-group-label">Instancing</div>
          <div className="props-kv"><span>Type</span><span>None</span></div>

          <div className="props-group-label">Shading</div>
          <div className="props-kv"><span>Color</span><span>#888888</span></div>
          <div className="props-kv"><span>Wire</span><span>Off</span></div>
        </div>
      )}

      {/* Stats */}
      {section === "stats" && (
        <div className="props-body">
          <div className="props-group-label">Mesh Stats</div>
          <div className="props-kv"><span>Vertices</span><span>{(stats?.vertices||0).toLocaleString()}</span></div>
          <div className="props-kv"><span>Edges</span><span>{(stats?.edges||0).toLocaleString()}</span></div>
          <div className="props-kv"><span>Faces</span><span>{(stats?.faces||0).toLocaleString()}</span></div>
          <div className="props-kv"><span>Half-Edges</span><span>{(stats?.halfEdges||0).toLocaleString()}</span></div>
          <div className="props-group-label">Render</div>
          <div className="props-kv"><span>Triangles</span><span>{((stats?.faces||0)*2).toLocaleString()}</span></div>
          <div className="props-kv"><span>Draw Calls</span><span>1</span></div>
        </div>
      )}
    </div>
  );
}

// ── Main left panel ─────────────────────────────────────────────────
export const MeshEditorPanel = ({ stats, onApplyFunction, onAddPrimitive }) => {
  const [section, setSection] = useState("tools");
  const [mode, setMode] = useState("object"); // object | edit | sculpt

  const switchMode = (m) => {
    setMode(m);
    onApplyFunction(m === "edit" ? "select" : m === "sculpt" ? "brush_draw" : "select");
  };

  return (
    <div className="mep-root">

      {/* mode switcher */}
      <div className="mep-mode-bar">
        {[["object","OBJECT"],["edit","EDIT"],["sculpt","SCULPT"]].map(([m,lbl]) => (
          <button key={m}
            className={`mep-mode-switch${mode===m?" mep-mode-switch--active":""}`}
            onClick={() => switchMode(m)}>
            {lbl}
          </button>
        ))}
      </div>

      {/* file actions */}
      <div className="mep-actions">
        <button className="mep-act mep-act--save"
          onClick={() => onApplyFunction("exportSpxScene")}>Save</button>
        <label className="mep-act mep-act--open">
          Open
          <input type="file" accept=".json,.spx"
            onChange={(e) => onApplyFunction("importSpxScene", e.target.files[0])}/>
        </label>
        <button className="mep-act"
          onClick={() => onApplyFunction("takeSnapshot")}>Snap</button>
        <button className="mep-act"
          onClick={() => onApplyFunction("exportGLB")}>GLB</button>
      </div>

      {/* import row */}
      <div className="mep-import-row">
        <label className="mep-import-btn">
          ↑ Import GLB
          <input type="file" accept=".glb,.gltf"
            onChange={(e) => onApplyFunction("importGLB", e.target.files[0])}/>
        </label>
        <label className="mep-import-btn">
          ↑ Import OBJ
          <input type="file" accept=".obj"
            onChange={(e) => onApplyFunction("importOBJ", e.target.files[0])}/>
        </label>
        <label className="mep-import-btn">
          ↑ FBX
          <input type="file" accept=".fbx"
            onChange={(e) => onApplyFunction("importFBX", e.target.files[0])}/>
        </label>
      </div>

      {/* section tabs */}
      <div className="mep-tabs">
        {[["tools","Tools"],["prims","Add"],["mesh","Mesh"]].map(([id,lbl]) => (
          <button key={id}
            className={`mep-tab${section===id?" mep-tab--active":""}`}
            onClick={() => setSection(id)}>{lbl}
          </button>
        ))}
      </div>

      {/* ── TOOLS ── */}
      {section === "tools" && (
        <div className="mep-section">
          <div className="mep-section-title">Edit Tools</div>
          {EDIT_TOOLS.map(t => (
            <button key={t.id} className="mep-tool-row"
              onClick={() => onApplyFunction(t.id)}>
              <span className="mep-tool-label">{t.label}</span>
              <span className="mep-tool-key">{t.key}</span>
            </button>
          ))}

          <div className="mep-divider"/>
          <div className="mep-section-title">Select Mode</div>
          <div className="mep-btn-row">
            {["Vert","Edge","Face"].map(m => (
              <button key={m} className="mep-mode-btn"
                onClick={() => onApplyFunction("selectMode_"+m.toLowerCase())}>{m}
              </button>
            ))}
          </div>

          <div className="mep-divider"/>
          <div className="mep-section-title">Boolean</div>
          <div className="mep-btn-row">
            {[["bool_union","Union"],["bool_subtract","Sub"],["bool_intersect","Isect"]].map(([id,lbl]) => (
              <button key={id} className="mep-mode-btn"
                onClick={() => onApplyFunction(id)}>{lbl}
              </button>
            ))}
          </div>

          <div className="mep-divider"/>
          <div className="mep-section-title">Gizmo</div>
          <div className="mep-btn-row">
            {[["gizmo_move","Move"],["gizmo_rotate","Rot"],["gizmo_scale","Scale"]].map(([id,lbl]) => (
              <button key={id} className="mep-mode-btn"
                onClick={() => onApplyFunction(id)}>{lbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ADD ── */}
      {section === "prims" && (
        <div className="mep-section">
          <div className="mep-section-title">Primitives</div>
          <div className="mep-prim-grid">
            {PRIMS.map(p => (
              <button key={p.id} className="mep-prim-btn"
                onClick={() => onAddPrimitive(p.id)}>
                <PrimIcon id={p.id}/>
                <span className="mep-prim-label">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MESH ── */}
      {section === "mesh" && (
        <div className="mep-section">
          <div className="mep-section-title">Repair</div>
          {[["fix_normals","Fix Normals"],["rm_doubles","Merge by Distance"],
            ["fill_holes","Fill Holes"],["rm_degenerate","Remove Degens"],
            ["full_repair","Full Repair"]].map(([id,lbl]) => (
            <button key={id} className="mep-tool-row"
              onClick={() => onApplyFunction(id)}>
              <span className="mep-tool-label">{lbl}</span>
            </button>
          ))}

          <div className="mep-divider"/>
          <div className="mep-section-title">Remesh</div>
          {[["voxel_remesh","Voxel Remesh"],["quad_remesh","Quad Remesh"],
            ["auto_retopo","Auto Retopo"],["marching_cubes","Marching Cubes"]].map(([id,lbl]) => (
            <button key={id} className="mep-tool-row"
              onClick={() => onApplyFunction(id)}>
              <span className="mep-tool-label">{lbl}</span>
            </button>
          ))}

          <div className="mep-divider"/>
          <div className="mep-section-title">UV</div>
          {[["uv_box","Box Project"],["uv_sphere","Sphere Project"],
            ["uv_planar","Planar Project"]].map(([id,lbl]) => (
            <button key={id} className="mep-tool-row"
              onClick={() => onApplyFunction(id)}>
              <span className="mep-tool-label">{lbl}</span>
            </button>
          ))}

          <div className="mep-divider"/>
          <div className="mep-section-title">Export</div>
          {[["exportGLB","Export GLB"],["exportOBJ","Export OBJ"],
            ["exportFBX","Export FBX"],["exportAlembic","Export Alembic"],
            ["exportUSD","Export USD"],["exportToStreamPireX","Export → StreamPireX"]].map(([id,lbl]) => (
            <button key={id} className="mep-tool-row"
              onClick={() => onApplyFunction(id)}>
              <span className="mep-tool-label">{lbl}</span>
            </button>
          ))}
        </div>
      )}

    </div>
  );
};
