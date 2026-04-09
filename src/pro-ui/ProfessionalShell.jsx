import React, { useState, useRef, useEffect } from "react";
import { WORKSPACES } from "./workspaceMap";
import WorkspaceToolsDock from "../components/workspace/WorkspaceToolsDock";

// ── Menu definitions ─────────────────────────────────────────────────────────
const MENU_ITEMS = {
  File: [
    { label: "New Scene",            fn: "newScene",           key: "Ctrl+N" },
    { label: "Open Project…",        fn: "importSpxScene",     key: "Ctrl+O" },
    { label: "Save Project",         fn: "exportSpxScene",     key: "Ctrl+S" },
    { label: "Save As…",             fn: "saveAs",             key: "Ctrl+Shift+S" },
    { label: "─", fn: null },
    { label: "Import GLB…",          fn: "importGLB",          key: "" },
    { label: "Import OBJ…",          fn: "importOBJ",          key: "" },
    { label: "Import FBX…",          fn: "importFBX",          key: "" },
    { label: "─", fn: null },
    { label: "Export GLB",           fn: "exportGLB",          key: "Ctrl+E" },
    { label: "─", fn: null },
    { label: "Cloth Sim Start",      fn: "cloth_sim_start",    key: "" },
    { label: "Cloth Sim Stop",       fn: "cloth_sim_stop",     key: "" },
    { label: "Fluid Sim Start",      fn: "fluid_sim_start",    key: "" },
    { label: "FILM Fluid (Surface+Foam)", fn: "fluid_film_start",  key: "" },
    { label: "APIC GPU Fluid (WebGPU)",  fn: "apic_fluid_start",  key: "" },
    { label: "APIC GPU Fluid Stop",      fn: "apic_fluid_stop",   key: "" },
    { label: "Film Fluid Stop",          fn: "fluid_film_stop",   key: "" },
    { label: "Apply Water Material",     fn: "fluid_apply_water_mat", key: "" },
    { label: "Fluid Sim Stop",       fn: "fluid_sim_stop",     key: "" },
    { label: "─", fn: null },
    { label: "Add Subdivide Mod",    fn: "modifier_add",       key: "" },
    { label: "Apply All Modifiers",  fn: "modifier_apply_all", key: "" },
    { label: "─", fn: null },
    { label: "Particle Burst",       fn: "particle_emit",      key: "" },
    { label: "Fire Emitter",         fn: "particle_fire",      key: "" },
    { label: "Smoke Emitter",        fn: "particle_smoke",     key: "" },
    { label: "Smart UV Unwrap",      fn: "smart_uv",           key: "" },
    { label: "Export OBJ",           fn: "exportOBJ",          key: "" },
    { label: "Export FBX",           fn: "exportFBX",          key: "" },
    { label: "Export Alembic",       fn: "exportAlembic",      key: "" },
    { label: "Export USD",           fn: "exportUSD",          key: "" },
    { label: "Export → StreamPireX", fn: "exportToStreamPireX",key: "" },
    { label: "─", fn: null },
    { label: "Snapshot / Render",    fn: "takeSnapshot",       key: "F12" },
  ],
  Edit: [
    { label: "Undo",                 fn: "undo",               key: "Ctrl+Z" },
    { label: "Redo",                 fn: "redo",               key: "Ctrl+Y" },
    { label: "─", fn: null },
    { label: "Select All",           fn: "selectAll",          key: "A" },
    { label: "Deselect All",         fn: "deselectAll",        key: "Alt+A" },
    { label: "─", fn: null },
    { label: "Duplicate",            fn: "duplicateObject",    key: "Shift+D" },
    { label: "Delete",               fn: "deleteSelected",     key: "X" },
    { label: "Group",                fn: "groupSelected",      key: "Ctrl+G" },
    { label: "Ungroup",              fn: "ungroupSelected",    key: "" },
  ],
  Add: [
    { label: "Cube",                 fn: "prim_box",           key: "" },
    { label: "Sphere",               fn: "prim_sphere",        key: "" },
    { label: "Cylinder",             fn: "prim_cylinder",      key: "" },
    { label: "Torus",                fn: "prim_torus",         key: "" },
    { label: "Plane",                fn: "prim_plane",         key: "" },
    { label: "Icosphere",            fn: "prim_icosphere",     key: "" },
    { label: "─", fn: null },
    { label: "Gear",                 fn: "prim_gear",          key: "" },
    { label: "Pipe",                 fn: "prim_pipe",          key: "" },
    { label: "Helix",                fn: "prim_helix",         key: "" },
    { label: "Staircase",            fn: "prim_staircase",     key: "" },
    { label: "Arch",                 fn: "prim_arch",          key: "" },
    { label: "─", fn: null },
    { label: "Point Light",          fn: "light_point",        key: "" },
    { label: "Spot Light",           fn: "light_spot",         key: "" },
    { label: "Area Light",           fn: "light_area",         key: "" },
    { label: "Camera",               fn: "cam_new",            key: "" },
  ],
  Mesh: [
    { label: "Extrude",              fn: "extrude",            key: "E" },
    { label: "Loop Cut",             fn: "loop_cut",           key: "Ctrl+R" },
    { label: "Bevel",                fn: "bevel",              key: "Ctrl+B" },
    { label: "Inset Faces",          fn: "inset",              key: "I" },
    { label: "Knife",                fn: "knife",              key: "K" },
    { label: "Edge Slide",           fn: "edge_slide",         key: "G G" },
    { label: "─", fn: null },
    { label: "Merge by Distance",    fn: "rm_doubles",         key: "" },
    { label: "Fix Normals",          fn: "fix_normals",        key: "" },
    { label: "Fill Holes",           fn: "fill_holes",         key: "" },
    { label: "Full Repair",          fn: "full_repair",        key: "" },
    { label: "─", fn: null },
    { label: "Boolean Union",        fn: "bool_union",         key: "" },
    { label: "Boolean Subtract",     fn: "bool_subtract",      key: "" },
    { label: "Boolean Intersect",    fn: "bool_intersect",     key: "" },
    { label: "─", fn: null },
    { label: "Mirror X",             fn: "mirror_x",           key: "" },
    { label: "Symmetrize",           fn: "symmetrize",         key: "" },
  ],
  Sculpt: [
    { label: "Draw",                 fn: "brush_draw",         key: "" },
    { label: "Clay",                 fn: "brush_clay",         key: "" },
    { label: "Smooth",               fn: "brush_smooth",       key: "S" },
    { label: "Crease",               fn: "brush_crease",       key: "" },
    { label: "Flatten",              fn: "brush_flatten",      key: "" },
    { label: "Inflate",              fn: "brush_inflate",      key: "" },
    { label: "Grab",                 fn: "brush_grab",         key: "G" },
    { label: "Mask",                 fn: "brush_mask",         key: "" },
    { label: "─", fn: null },
    { label: "Dyntopo On/Off",       fn: "dyntopo",            key: "Ctrl+D" },
    { label: "Voxel Remesh",         fn: "voxel_remesh",       key: "Ctrl+Alt+R" },
    { label: "Quad Remesh",          fn: "quad_remesh",        key: "" },
    { label: "Multires Subdivide",   fn: "multires_add",       key: "" },
  ],
  UV: [
    { label: "Mark Seam",           fn: "mark_seam",          key: "Ctrl+E" },
    { label: "Clear Seams",         fn: "clear_seams",        key: "" },
    { label: "Pack Islands",        fn: "pack_islands",       key: "" },
    { label: "Live Unwrap",         fn: "live_unwrap",        key: "" },
    { label: "─", fn: null },
    { label: "Box Project",          fn: "uv_box",             key: "" },
    { label: "Sphere Project",       fn: "uv_sphere",          key: "" },
    { label: "Planar Project",       fn: "uv_planar",          key: "" },
    { label: "─", fn: null },
    { label: "Open UV Editor",       fn: "openUVEditor",       key: "" },
    { label: "UDIM Layout",          fn: "udim_layout",        key: "" },
    { label: "Build Atlas",          fn: "udim_atlas",         key: "" },
  ],
  Material: [
    { label: "PBR Material",         fn: "mat_pbr",            key: "" },
    { label: "SSS (Skin)",           fn: "mat_sss",            key: "" },
    { label: "Glass",                fn: "mat_glass",          key: "" },
    { label: "Toon Shader",          fn: "sh_toon",            key: "" },
    { label: "Holographic",          fn: "sh_holo",            key: "" },
    { label: "Dissolve",             fn: "sh_dissolve",        key: "" },
    { label: "NPR Outline",          fn: "sh_outline",         key: "" },
    { label: "─", fn: null },
    { label: "Open Material Editor", fn: "openMatEditor",      key: "" },
    { label: "─", fn: null },
    { label: "Bake AO",              fn: "bake_ao",            key: "" },
    { label: "Bake Normal",          fn: "bake_normal",        key: "" },
    { label: "Bake All Maps",        fn: "bake_all",           key: "" },
  ],
  Rig: [
    { label: "New Armature",         fn: "create_armature",    key: "" },
    { label: "Add Bone",             fn: "add_bone",           key: "" },
    { label: "Enter Pose Mode",      fn: "enter_pose",         key: "Ctrl+Tab" },
    { label: "─", fn: null },
    { label: "IK Chain",             fn: "ik_chain",           key: "" },
    { label: "Two-Bone IK",          fn: "ik_two_bone",        key: "" },
    { label: "Spline IK",            fn: "spline_ik",          key: "" },
    { label: "IK/FK Blend",          fn: "ikfk_blend",         key: "" },
    { label: "─", fn: null },
    { label: "Heat Map Weights",     fn: "heat_weights",       key: "" },
    { label: "Paint Weights",        fn: "paint_weights",      key: "" },
    { label: "Normalize Weights",    fn: "norm_weights",       key: "" },
    { label: "─", fn: null },
    { label: "MoCap Retarget",       fn: "mocap_retarget",     key: "" },
    { label: "Bake Animation",       fn: "mocap_bake",         key: "" },
    { label: "Fix Foot Sliding",     fn: "mocap_footfix",      key: "" },
  ],
  Animate: [
    { label: "Add Keyframe",         fn: "add_keyframe",       key: "I" },
    { label: "Auto Key On/Off",      fn: "auto_key",           key: "" },
    { label: "─", fn: null },
    { label: "NLA Editor",           fn: "showNLA",            key: "" },
    { label: "Push Down Action",     fn: "push_action",        key: "" },
    { label: "Bake NLA",             fn: "bake_nla",           key: "" },
    { label: "─", fn: null },
    { label: "New Shape Key",        fn: "shapekey_new",       key: "" },
    { label: "Apply Shape Keys",     fn: "shapekey_apply",     key: "" },
    { label: "─", fn: null },
    { label: "Generate Walk Cycle",  fn: "walk_gen",           key: "" },
    { label: "Idle Cycle",           fn: "idle_gen",           key: "" },
    { label: "Breathing",            fn: "breath_gen",         key: "" },
  ],
  Render: [
    { label: "Render Frame",         fn: "takeSnapshot",       key: "F12" },
    { label: "Start Path Tracing",   fn: "pt_start",           key: "" },
    { label: "Stop Path Tracing",    fn: "pt_stop",            key: "" },
    { label: "─", fn: null },
    { label: "Toggle Bloom",         fn: "pp_bloom",           key: "" },
    { label: "Toggle SSAO",          fn: "pp_ssao",            key: "" },
    { label: "Toggle DOF",           fn: "pp_dof",             key: "" },
    { label: "Film Grain",           fn: "pp_grain",           key: "" },
    { label: "Chromatic Aberration", fn: "pp_chromatic",       key: "" },
    { label: "─", fn: null },
    { label: "Beauty Pass",          fn: "pass_beauty",        key: "" },
    { label: "Normal Pass",          fn: "pass_normal",        key: "" },
    { label: "Depth Pass",           fn: "pass_depth",         key: "" },
    { label: "Cryptomatte",          fn: "pass_crypto",        key: "" },
    { label: "─", fn: null },
    { label: "Three-Point Lighting", fn: "light_3pt",          key: "" },
    { label: "HDRI",                 fn: "light_hdri",         key: "" },
  ],
  Window: [
    { label: "Toggle N-Panel",       fn: "toggleNPanel",       key: "N" },
    { label: "Toggle Wireframe",     fn: "toggleWireframe",    key: "W" },
    { label: "Toggle X-Ray",         fn: "toggleXRay",         key: "X" },
    { label: "Toggle Grid",          fn: "toggleGrid",         key: "G" },
    { label: "─", fn: null },
    { label: "UV Editor",            fn: "openUVEditor",       key: "" },
    { label: "Material Editor",      fn: "openMatEditor",      key: "" },
    { label: "─", fn: null },
    { label: "Run Benchmark",        fn: "runBenchmark",       key: "" },
    { label: "Scene Stats",          fn: "scene_stats",        key: "" },
  ],
  Help: [
    { label: "Keyboard Shortcuts",   fn: "showShortcuts",      key: "?" },
    { label: "Feature Index",        fn: "toggleNPanel",       key: "N" },
    { label: "About SPX Mesh",       fn: "showAbout",          key: "" },
  ],
};

// ── Dropdown ──────────────────────────────────────────────────────────────────
function MenuDropdown({ label, items, onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="menu-item" ref={ref}>
      <button
        className={`menu-btn${open ? " menu-btn--open" : ""}`}
        onClick={() => setOpen(v => !v)}
      >{label}</button>
      {open && (
        <div className="menu-dropdown">
          {items.map((item, i) =>
            item.fn === null ? (
              <div key={i} className="menu-sep" />
            ) : (
              <button key={i} className="menu-drop-item"
                onClick={() => { onAction(item.fn); setOpen(false); }}>
                <span className="menu-drop-label">{item.label}</span>
                {item.key && <span className="menu-drop-key">{item.key}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────
export default function ProfessionalShell({
  activeWorkspace, setActiveWorkspace,
  leftPanel, centerPanel, rightPanel,
  bottomPanel, onMenuAction,
}) {
  return (
    <div className="spx-shell">
      {/* Menu bar */}
      <div className="spx-menubar">
        <span className="spx-brand">SPX MESH</span>
        <nav className="spx-menus">
          {Object.entries(MENU_ITEMS).map(([label, items]) => (
            <MenuDropdown key={label} label={label} items={items}
              onAction={(fn) => onMenuAction?.(fn)} />
          ))}
        </nav>
        <div className="spx-menubar-right">
          <span className="spx-engine-badge">WebGL2</span>
          <span className="spx-engine-badge">v1.0</span>
        </div>
      </div>

      {/* Workspace tabs */}
      <div className="spx-workspaces">
        {WORKSPACES.map((ws) => (
          <button key={ws} type="button"
            className={`spx-workspace${ws === activeWorkspace ? " active" : ""}`}
            onClick={() => setActiveWorkspace(ws)}>{ws}
          </button>
        ))}
      </div>

      <WorkspaceToolsDock />
      {/* Main 3-col */}
      <div className="spx-main">
        <aside className="spx-left">{leftPanel}</aside>
        <div className="spx-tool-strip">
          {[
            { icon: "cursor", label: "Select (S)", fn: "select", svg: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 2 L4 18 L8 14 L11 21 L13 20 L10 13 L15 13 Z"/></svg> },
            { icon: "move",   label: "Move (G)",   fn: "grab",   svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 4 L12 20 M4 12 L20 12 M12 4 L10 7 M12 4 L14 7 M12 20 L10 17 M12 20 L14 17 M4 12 L7 10 M4 12 L7 14 M20 12 L17 10 M20 12 L17 14"/></svg> },
            { icon: "rotate", label: "Rotate (R)", fn: "rotate", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 12 A8 8 0 1 1 14 4.5"/><polyline points="14,2 14,5 17,5"/></svg> },
            { icon: "scale",  label: "Scale (S)",  fn: "scale",  svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 12 L20 4 M20 4 L16 4 M20 4 L20 8 M12 12 L4 20 M4 20 L8 20 M4 20 L4 16"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg> },
            { divider: true },
            { icon: "extrude",   label: "Extrude (E)",    fn: "extrude",   svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="13" width="12" height="7" rx="1"/><path d="M12 13 L12 4 M9 7 L12 4 L15 7"/></svg> },
            { icon: "loop_cut",  label: "Loop Cut (Ctrl+R)", fn: "loop_cut", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="6" width="16" height="12" rx="1"/><line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="2"/></svg> },
            { icon: "knife",     label: "Knife (K)",      fn: "knife",     svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 18 L18 6 M14 4 L20 10 L8 20 L4 20 L4 16 Z"/></svg> },
            { icon: "edge_slide",label: "Edge Slide (GG)",fn: "edge_slide",svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="12" x2="20" y2="12"/><circle cx="9" cy="12" r="2.5" fill="currentColor"/><polyline points="16,9 20,12 16,15"/></svg> },
            { icon: "bevel",     label: "Bevel (Ctrl+B)", fn: "bevel",     svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 20 L4 8 L8 4 L20 4"/><path d="M4 20 L20 4" strokeDasharray="2,2"/></svg> },
            { icon: "inset",     label: "Inset (I)",      fn: "inset",     svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="1"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg> },
            { divider: true },
            { icon: "annotate",  label: "Annotate",       fn: "annotate",  svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 20 Q8 12 12 14 Q16 16 20 4"/></svg> },
            { icon: "measure",   label: "Measure",        fn: "measure",   svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="20" x2="20" y2="4"/><line x1="4" y1="20" x2="7" y2="17"/><line x1="20" y1="4" x2="17" y2="7"/></svg> },
          ].map((t, i) => {
            if (t.divider) return <div key={i} style={{width:2,height:1,background:"#3a3a3a",margin:"4px 4px"}} />;
            return (
              <button key={t.icon} title={t.label}
                onClick={() => onMenuAction?.(t.fn)}
                style={{
                  width:32, height:32, background:"transparent", border:"none",
                  borderRadius:4, cursor:"pointer", display:"flex",
                  alignItems:"center", justifyContent:"center",
                  color:"#aaa", padding:4
                }}
                onMouseEnter={e => e.currentTarget.style.background="#333"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}
              >
                {React.cloneElement(t.svg, { width:20, height:20 })}
              </button>
            );
          })}
        </div>
        <main  className="spx-center">{centerPanel}</main>
        <aside className="spx-right">{rightPanel}</aside>
      </div>

      {/* Timeline / bottom panel */}
      <div className="spx-bottom">{bottomPanel}</div>

      {/* Status bar */}
      <div className="spx-statusbar">
        <span className="spx-status-workspace">{activeWorkspace.toUpperCase()}</span>
        <span className="spx-status-sep">|</span>
        <span id="spx-status-text">Viewport Ready</span>
        <div className="spx-statusbar-right">
          <span>69 Systems</span>
          <span className="spx-status-sep">·</span>
          <span>616 Functions</span>
        </div>
      </div>
    </div>
  );
}
