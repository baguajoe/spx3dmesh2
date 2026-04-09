// ═══════════════════════════════════════════════════════════════════
// SPX MESH — Workspace & Feature Map
// 69 systems · 616 exported functions → 8 workspaces
// ═══════════════════════════════════════════════════════════════════

export const WORKSPACES_MAP = {
  MODELING:     "Modeling",
  SCULPT:       "Sculpt",
  ANIMATION:    "Animation",
  SHADING:      "Shading",
  PERFORMANCE:  "Performance",
};

export const WORKSPACES = Object.values(WORKSPACES_MAP);
export const DEFAULT_WORKSPACE = WORKSPACES_MAP.MODELING;

// ── Each workspace has folders; each folder has items ───────────────
// item: { id, label, system }  — system = source file name
export const WORKSPACE_TREE = {
  Performance: [
    {
      folder: "MoCap Capture",
      items: [
        { id: "mocap_live",      label: "Live Capture",      system: "SPXPerformance" },
        { id: "mocap_video",     label: "Video MoCap",       system: "SPXPerformance" },
        { id: "mocap_face",      label: "Face Capture",      system: "SPXPerformance" },
        { id: "mocap_hands",     label: "Hand Capture",      system: "SPXPerformance" },
        { id: "mocap_multicam",  label: "Multi-Camera",      system: "SPXPerformance" },
      ],
    },
    {
      folder: "MoCap Pipeline",
      items: [
        { id: "mocap_retarget",  label: "Retarget Frame",    system: "MocapRetarget"  },
        { id: "mocap_bake",      label: "Bake Animation",    system: "MocapRetarget"  },
        { id: "mocap_footfix",   label: "Fix Foot Sliding",  system: "MocapRetarget"  },
        { id: "mocap_automap",   label: "Auto Bone Map",     system: "MocapRetarget"  },
        { id: "mocap_bvh_import",label: "Import BVH",        system: "BVHImporter"    },
        { id: "mocap_bvh_export",label: "Export BVH",        system: "MocapRetarget"  },
      ],
    },
    {
      folder: "Avatar",
      items: [
        { id: "avatar_ybot",     label: "Y Bot (Default)",   system: "SPXPerformance" },
        { id: "avatar_load",     label: "Load GLB Avatar",   system: "SPXPerformance" },
        { id: "avatar_export",   label: "Export Baked GLB",  system: "SPXPerformance" },
      ],
    },
    {
      folder: "AI Animation",
      items: [
        { id: "ai_anim_assist",  label: "AI Assistant",      system: "AIAnimationAssistant" },
        { id: "ai_walk_gen",     label: "Walk Cycle Gen",    system: "WalkCycleGenerator"   },
        { id: "ai_pose_match",   label: "Pose Matching",     system: "SPXPerformance"       },
      ],
    },
  ],

  Modeling: [
    {
      folder: "Mesh Edit",
      items: [
        { id: "select",      label: "Select",         system: "HalfEdgeMesh" },
        { id: "loop_cut",    label: "Loop Cut",       system: "HalfEdgeMesh" },
        { id: "edge_slide",  label: "Edge Slide",     system: "HalfEdgeMesh" },
        { id: "knife",       label: "Knife",          system: "HalfEdgeMesh" },
        { id: "extrude",     label: "Extrude",        system: "HalfEdgeMesh" },
        { id: "bevel",       label: "Bevel",          system: "HalfEdgeMesh" },
        { id: "inset",       label: "Inset Face",     system: "NgonSupport"  },
        { id: "poke_face",   label: "Poke Face",      system: "NgonSupport"  },
        { id: "bridge",      label: "Bridge Faces",   system: "NgonSupport"  },
        { id: "grid_fill",   label: "Grid Fill",      system: "HalfEdgeMesh" },
        { id: "dissolve",    label: "Dissolve Edge",  system: "NgonSupport"  },
      ],
    },
    {
      folder: "Transform",
      items: [
        { id: "grab",        label: "Grab",           system: "TransformGizmo" },
        { id: "proportional_toggle", label: "Proportional (O)", system: "HalfEdgeMesh" },
        { id: "snap_toggle",         label: "Snap Toggle",      system: "HalfEdgeMesh" },
        { id: "rotate",      label: "Rotate",         system: "TransformGizmo" },
        { id: "scale",       label: "Scale",          system: "TransformGizmo" },
        { id: "mirror",      label: "Mirror",         system: "RemeshSystem"   },
        { id: "symmetrize",  label: "Symmetrize",     system: "RemeshSystem"   },
      ],
    },
    {
      folder: "Primitives",
      items: [
        { id: "box",         label: "Cube",           system: "ProceduralMesh" },
        { id: "sphere",      label: "Sphere",         system: "ProceduralMesh" },
        { id: "cylinder",    label: "Cylinder",       system: "ProceduralMesh" },
        { id: "torus",       label: "Torus",          system: "ProceduralMesh" },
        { id: "plane",       label: "Plane",          system: "ProceduralMesh" },
        { id: "icosphere",   label: "Icosphere",      system: "ProceduralMesh" },
        { id: "gear",        label: "Gear",           system: "ProceduralMesh" },
        { id: "pipe",        label: "Pipe",           system: "ProceduralMesh" },
        { id: "helix",       label: "Helix",          system: "ProceduralMesh" },
        { id: "staircase",   label: "Staircase",      system: "ProceduralMesh" },
        { id: "arch",        label: "Arch",           system: "ProceduralMesh" },
        { id: "lathe",       label: "Lathe",          system: "ProceduralMesh" },
      ],
    },
    {
      folder: "Boolean Ops",
      items: [
        { id: "bool_union",    label: "Union",        system: "BooleanOps" },
        { id: "cloth_sim_start", label: "Cloth Sim Start", system: "ClothSystem" },
        { id: "cloth_sim_stop",  label: "Cloth Sim Stop",  system: "ClothSystem" },
        { id: "fluid_sim_start", label: "Fluid Sim Start", system: "FLIPFluid"   },
        { id: "fluid_sim_stop",  label: "Fluid Sim Stop",  system: "FLIPFluid"   },
        { id: "modifier_add",    label: "Add Modifier",    system: "ModifierStack"},
        { id: "modifier_apply_all", label: "Apply All Mods", system: "ModifierStack"},
        { id: "particle_emit",   label: "Particle Burst",  system: "GPUParticles" },
        { id: "particle_fire",   label: "Fire Emitter",    system: "VFXSystem"   },
        { id: "particle_smoke",  label: "Smoke Emitter",   system: "VFXSystem"   },
        { id: "particle_sparks", label: "Sparks Emitter",  system: "VFXSystem"   },
        { id: "smart_uv",        label: "Smart UV Unwrap", system: "UVUnwrap"    },
        { id: "displace_perlin",   label: "Displace: Perlin",   system: "SmartMaterials" },
        { id: "displace_voronoi",  label: "Displace: Voronoi",  system: "SmartMaterials" },
        { id: "displace_cellular", label: "Displace: Cellular", system: "SmartMaterials" },
        { id: "mat_clearcoat",     label: "Clearcoat",          system: "SmartMaterials" },
        { id: "mat_wet_clearcoat", label: "Wet Clearcoat",      system: "SmartMaterials" },
        { id: "mat_anisotropy",    label: "Anisotropy",         system: "SmartMaterials" },
        { id: "mat_sss_skin",      label: "SSS Skin",           system: "SmartMaterials" },
        { id: "skin_apply",        label: "Apply Skin Material",  system: "SmartMaterials" },
        { id: "skin_gen_textures", label: "Gen Full Skin Textures",system: "SmartMaterials" },
        { id: "skin_lighting",     label: "Setup Skin Lighting",  system: "SmartMaterials" },
        { id: "skin_lip",          label: "Lip Material",         system: "SmartMaterials" },
        { id: "skin_eye",          label: "Eye Material",         system: "SmartMaterials" },
        { id: "skin_tone_porcelain", label: "Tone: Porcelain",    system: "SmartMaterials" },
        { id: "skin_tone_fair",      label: "Tone: Fair",         system: "SmartMaterials" },
        { id: "skin_tone_light",     label: "Tone: Light",        system: "SmartMaterials" },
        { id: "skin_tone_medium",    label: "Tone: Medium",       system: "SmartMaterials" },
        { id: "skin_tone_olive",     label: "Tone: Olive",        system: "SmartMaterials" },
        { id: "skin_tone_tan",       label: "Tone: Tan",          system: "SmartMaterials" },
        { id: "skin_tone_brown",     label: "Tone: Brown",        system: "SmartMaterials" },
        { id: "skin_tone_deep_brown",label: "Tone: Deep Brown",   system: "SmartMaterials" },
        { id: "skin_tone_dark",      label: "Tone: Dark",         system: "SmartMaterials" },
        { id: "skin_tone_ebony",     label: "Tone: Ebony",        system: "SmartMaterials" },
        { id: "skin_tone_albino",    label: "Tone: Albino",       system: "SmartMaterials" },
        { id: "skin_tone_aged",      label: "Tone: Aged",         system: "SmartMaterials" },
        { id: "mat_sss_wax",       label: "SSS Wax",            system: "SmartMaterials" },
        { id: "add_area_light",    label: "Add Area Light",     system: "SmartMaterials" },
        { id: "gen_skin_tex",      label: "Gen Skin Texture",   system: "SmartMaterials" },
        { id: "gen_scale_tex",     label: "Gen Scale Texture",  system: "SmartMaterials" },
        { id: "gen_wrinkle_tex",   label: "Gen Wrinkle Normal", system: "SmartMaterials" },
        { id: "bool_subtract", label: "Subtract",     system: "BooleanOps" },
        { id: "bool_intersect",label: "Intersect",    system: "BooleanOps" },
      ],
    },
    {
      folder: "Vertex Tools",
      items: [
        { id: "target_weld",   label: "Target Weld",      system: "HalfEdgeMesh" },
        { id: "chamfer_vertex",label: "Chamfer Vertex",    system: "HalfEdgeMesh" },
        { id: "average_vertex",label: "Average Vertex",    system: "HalfEdgeMesh" },
        { id: "circularize",   label: "Circularize",       system: "HalfEdgeMesh" },
        { id: "reorder_verts", label: "Reorder Vertices",  system: "HalfEdgeMesh" },
        { id: "connect_comps", label: "Connect Components",system: "HalfEdgeMesh" },
        { id: "poke_face",     label: "Poke Face",         system: "NgonSupport"  },
        { id: "bridge",        label: "Bridge Faces",      system: "NgonSupport"  },
        { id: "multi_cut",     label: "Multi-Cut",         system: "HalfEdgeMesh" },
      ],
    },
    {
      folder: "Curves",
      items: [
        { id: "spline",        label: "Spline",       system: "CurveSystem" },
        { id: "pipe_curve",    label: "Pipe Along Curve", system: "CurveSystem" },
        { id: "loft",          label: "Loft Curves",  system: "CurveSystem" },
        { id: "extrude_curve", label: "Extrude Along", system: "CurveSystem" },
      ],
    },
    {
      folder: "Geometry Nodes",
      items: [
        { id: "gn_graph",    label: "Node Graph",     system: "GeometryNodes" },
        { id: "gn_scatter",  label: "Scatter",        system: "GeometryNodes" },
        { id: "gn_instance", label: "Instances",      system: "Instancing"    },
      ],
    },
    {
      folder: "Mesh Repair",
      items: [
        { id: "fix_normals",   label: "Fix Normals",  system: "MeshRepair" },
        { id: "rm_doubles",    label: "Merge by Distance", system: "MeshRepair" },
        { id: "fill_holes",    label: "Fill Holes",   system: "MeshRepair" },
        { id: "rm_degenerate", label: "Remove Degens", system: "MeshRepair" },
        { id: "full_repair",   label: "Full Repair",  system: "MeshRepair" },
      ],
    },
  ],

  Sculpt: [
    {
      folder: "Brushes",
      items: [
        { id: "brush_draw",    label: "Draw",         system: "SculptEngine" },
        { id: "brush_trim",    label: "Trim",         system: "SculptBrushes" },
        { id: "brush_pose",    label: "Pose",         system: "SculptBrushes" },
        { id: "brush_clay",    label: "Clay",         system: "SculptEngine" },
        { id: "brush_smooth",  label: "Smooth",       system: "SculptEngine" },
        { id: "brush_crease",  label: "Crease",       system: "SculptEngine" },
        { id: "brush_flatten", label: "Flatten",      system: "SculptEngine" },
        { id: "brush_inflate", label: "Inflate",      system: "SculptEngine" },
        { id: "brush_grab",    label: "Grab",         system: "SculptEngine" },
        { id: "brush_mask",    label: "Mask",         system: "SculptEngine" },
      ],
    },
    {
      folder: "Alpha Brushes",
      items: [
        { id: "alpha_load",    label: "Load Alpha",   system: "AlphaBrush" },
        { id: "alpha_circle",  label: "Circle",       system: "AlphaBrush" },
        { id: "alpha_stars",   label: "Stars",        system: "AlphaBrush" },
        { id: "alpha_noise",   label: "Noise",        system: "AlphaBrush" },
      ],
    },
    {
      folder: "Dynamic Topology",
      items: [
        { id: "dyntopo",       label: "Dyntopo On/Off", system: "DynamicTopology" },
        { id: "dyntopo_flood", label: "Flood Fill",   system: "DynamicTopology" },
        { id: "smooth_topo",   label: "Smooth Topo",  system: "DynamicTopology" },
      ],
    },
    {
      folder: "Multires",
      items: [
        { id: "multires_add",  label: "Subdivide",    system: "MultiresSystem" },
        { id: "multires_bake", label: "Bake Down",    system: "MultiresSystem" },
        { id: "multires_level",label: "Set Level",    system: "MultiresSystem" },
      ],
    },
    {
      folder: "Remesh",
      items: [
        { id: "voxel_remesh",  label: "Voxel Remesh", system: "RemeshSystem"   },
        { id: "quad_remesh",   label: "Quad Remesh",  system: "RemeshSystem"   },
        { id: "auto_retopo",   label: "Auto Retopo",  system: "AutoRetopo"     },
        { id: "marching_cubes",label: "Marching Cubes", system: "MarchingCubes" },
      ],
    },
    {
      folder: "Vertex Paint",
      items: [
        { id: "vc_init",       label: "Init Colors",  system: "VertexColorPainter"  },
        { id: "vc_paint",      label: "Paint",        system: "VertexColorPainter"  },
        { id: "vc_fill",       label: "Fill",         system: "VertexColorPainter"  },
        { id: "vc_gradient",   label: "Gradient",     system: "VertexColorPainter"  },
        { id: "vc_layers",     label: "Layer Stack",  system: "VertexColorAdvanced" },
        { id: "vc_smear",      label: "Smear",        system: "VertexColorAdvanced" },
        { id: "vc_blur",       label: "Blur Layer",   system: "VertexColorAdvanced" },
        { id: "vc_flatten",    label: "Flatten",      system: "VertexColorAdvanced" },
      ],
    },
    {
      folder: "Grease Pencil",
      items: [
        { id: "gp_stroke",     label: "Draw Stroke",  system: "GreasePencil" },
        { id: "gp_layer",      label: "Add Layer",    system: "GreasePencil" },
        { id: "gp_onion",      label: "Onion Skin",   system: "GreasePencil" },
        { id: "gp_interp",     label: "Interpolate",  system: "GreasePencil" },
      ],
    },
  ],

  Rigging: [
    {
      folder: "Armature",
      items: [
        { id: "create_armature", label: "New Armature",   system: "ArmatureSystem"  },
        { id: "add_bone",        label: "Add Bone",       system: "ArmatureSystem"  },
        { id: "parent_bone",     label: "Parent Bone",    system: "ArmatureSystem"  },
        { id: "bone_display",    label: "Bone Display",   system: "ArmatureSystem"  },
      ],
    },
    {
      folder: "Pose Mode",
      items: [
        { id: "enter_pose",      label: "Enter Pose Mode", system: "PoseMode" },
        { id: "capture_pose",    label: "Capture Pose",    system: "PoseMode" },
        { id: "apply_pose",      label: "Apply Pose",      system: "PoseMode" },
        { id: "reset_pose",      label: "Rest Pose",       system: "PoseMode" },
        { id: "pose_library",    label: "Pose Library",    system: "PoseMode" },
        { id: "fk_chain",        label: "Rotate FK Chain", system: "PoseMode" },
      ],
    },
    {
      folder: "IK / Constraints",
      items: [
        { id: "ik_chain",        label: "IK Chain",        system: "IKSystem"        },
        { id: "ik_fabrik",       label: "FABRIK Solve",    system: "IKSystem"        },
        { id: "ik_two_bone",     label: "Two-Bone IK",     system: "IKSystem"        },
        { id: "spline_ik",       label: "Spline IK",       system: "AnimationUpgrade"},
        { id: "ikfk_blend",      label: "IK/FK Blend",     system: "AnimationUpgrade"},
        { id: "con_lookat",      label: "Look At",         system: "ConstraintSystem"},
        { id: "con_floor",       label: "Floor",           system: "ConstraintSystem"},
        { id: "con_stretch",     label: "Stretch To",      system: "ConstraintSystem"},
        { id: "con_copy_loc",    label: "Copy Location",   system: "ConstraintSystem"},
        { id: "con_copy_rot",    label: "Copy Rotation",   system: "ConstraintSystem"},
        { id: "con_limit_loc",   label: "Limit Location",  system: "ConstraintSystem"},
        { id: "con_damped",      label: "Damped Track",    system: "ConstraintSystem"},
      ],
    },
    {
      folder: "Skinning",
      items: [
        { id: "heat_weights",    label: "Heat Map Weights", system: "SkeletalBinding" },
        { id: "envelope_weigh", label: "Envelope Weights", system: "SkeletalBinding" },
        { id: "bind_skeleton",   label: "Bind Skeleton",    system: "SkeletalBinding" },
        { id: "norm_weights",    label: "Normalize Weights",system: "SkeletalBinding" },
        { id: "paint_weights",   label: "Paint Weights",    system: "SkeletalBinding" },
        { id: "dual_quat",       label: "Dual Quat Skin",   system: "SkeletalBinding" },
      ],
    },
    {
      folder: "Doppelflex Rig",
      items: [
        { id: "dfx_build",       label: "Build from Landmarks", system: "DoppelflexRig" },
        { id: "dfx_apply",       label: "Apply Frame",          system: "DoppelflexRig" },
        { id: "dfx_retarget",    label: "Retarget to SPX",      system: "DoppelflexRig" },
        { id: "dfx_skeleton",    label: "Build Three Skeleton",  system: "DoppelflexRig" },
      ],
    },
    {
      folder: "Drivers",
      items: [
        { id: "create_driver",   label: "New Driver",      system: "DriverSystem" },
        { id: "driver_expr",     label: "Expression",      system: "DriverSystem" },
        { id: "driver_presets",  label: "Presets",         system: "DriverSystem" },
        { id: "apply_drivers",   label: "Apply All",       system: "DriverSystem" },
      ],
    },
  ],

  Animation: [
    {
      folder: "Keyframes",
      items: [
        { id: "add_keyframe",    label: "Add Keyframe",    system: "NLASystem"       },
        { id: "auto_key",        label: "Auto Key",        system: "NLASystem"       },
        { id: "push_action",     label: "Push Down Action",system: "NLASystem"       },
        { id: "bake_nla",        label: "Bake NLA",        system: "NLASystem"       },
      ],
    },
    {
      folder: "NLA Editor",
      items: [
        { id: "nla_track",       label: "New Track",       system: "NLASystem"        },
        { id: "nla_strip",       label: "New Strip",       system: "NLASystem"        },
        { id: "nla_eval",        label: "Evaluate NLA",    system: "AnimationUpgrade" },
        { id: "nla_gltf",        label: "Export GLTF Clip",system: "AnimationUpgrade" },
      ],
    },
    {
      folder: "Shape Keys",
      items: [
        { id: "shapekey_new",    label: "New Shape Key",   system: "ShapeKeys"         },
        { id: "shapekey_apply",  label: "Apply Keys",      system: "ShapeKeys"         },
        { id: "shapekey_morph",  label: "Build Morphs",    system: "ShapeKeys"         },
        { id: "shapekey_adv",    label: "Advanced Keys",   system: "ShapeKeysAdvanced" },
        { id: "shapekey_mirror", label: "Mirror Key",      system: "ShapeKeysAdvanced" },
        { id: "shapekey_blend",  label: "Blend Keys",      system: "ShapeKeysAdvanced" },
        { id: "shapekey_driver", label: "Driver Key",      system: "ShapeKeysAdvanced" },
      ],
    },
    {
      folder: "MoCap",
      items: [
        { id: "mocap_retarget",  label: "Retarget Frame",  system: "MocapRetarget" },
        { id: "mocap_bake",      label: "Bake Animation",  system: "MocapRetarget" },
        { id: "mocap_footfix",   label: "Fix Foot Sliding",system: "MocapRetarget" },
        { id: "mocap_automap",   label: "Auto Bone Map",   system: "MocapRetarget" },
      ],
    },
    {
      folder: "Walk Cycles",
      items: [
        { id: "walk_gen",        label: "Generate Walk",   system: "WalkCycleGenerator" },
        { id: "idle_gen",        label: "Idle Cycle",      system: "WalkCycleGenerator" },
        { id: "breath_gen",      label: "Breathing",       system: "WalkCycleGenerator" },
      ],
    },
    {
      folder: "Procedural Anim",
      items: [
        { id: "proc_float",      label: "Float",           system: "AssetLibrary" },
        { id: "proc_spin",       label: "Spin",            system: "AssetLibrary" },
        { id: "proc_pulse",      label: "Pulse",           system: "AssetLibrary" },
        { id: "proc_audio",      label: "Audio Reactive",  system: "AssetLibrary" },
      ],
    },
  ],

  Shading: [
    {
      folder: "Materials",
      items: [
        { id: "mat_pbr",         label: "PBR Material",    system: "RenderSystem"   },
        { id: "mat_sss",         label: "SSS (Skin)",      system: "RenderSystem"   },
        { id: "mat_glass",       label: "Transmission",    system: "RenderSystem"   },
        { id: "mat_smart",       label: "Smart Material",  system: "SmartMaterials" },
        { id: "mat_edge_wear",   label: "Edge Wear",       system: "SmartMaterials" },
        { id: "mat_cavity",      label: "Cavity Dirt",     system: "SmartMaterials" },
        { id: "mat_displacement",label: "Displacement",    system: "RenderSystem"   },
      ],
    },
    {
      folder: "GLSL Shaders",
      items: [
        { id: "sh_toon",         label: "Toon Shader",     system: "GLSLShaders" },
        { id: "sh_hair",         label: "Hair Shader",     system: "GLSLShaders" },
        { id: "sh_holo",         label: "Holographic",     system: "GLSLShaders" },
        { id: "sh_dissolve",     label: "Dissolve",        system: "GLSLShaders" },
        { id: "sh_outline",      label: "NPR Outline",     system: "GLSLShaders" },
        { id: "sh_pbr_adv",      label: "PBR Advanced",    system: "GLSLShaders" },
      ],
    },
    {
      folder: "Texture Paint",
      items: [
        { id: "tp_canvas",       label: "New Canvas",      system: "TexturePainter" },
        { id: "tp_paint",        label: "Paint at UV",     system: "TexturePainter" },
        { id: "tp_fill",         label: "Fill",            system: "TexturePainter" },
        { id: "tp_layer",        label: "Add Layer",       system: "TexturePainter" },
        { id: "tp_flatten",      label: "Flatten Layers",  system: "TexturePainter" },
        { id: "tp_export",       label: "Export Maps",     system: "TexturePainter" },
      ],
    },
    {
      folder: "UDIM",
      items: [
        { id: "udim_layout",     label: "UDIM Layout",     system: "UDIMSystem" },
        { id: "udim_paint",      label: "Paint Tile",      system: "UDIMSystem" },
        { id: "udim_atlas",      label: "Build Atlas",     system: "UDIMSystem" },
        { id: "udim_remap",      label: "Remap UVs",       system: "UDIMSystem" },
        { id: "udim_export",     label: "Export Tiles",    system: "UDIMSystem" },
      ],
    },
    {
      folder: "UV Unwrap",
      items: [
        { id: "mark_seam",       label: "Mark Seam",       system: "UVUnwrap" },
        { id: "clear_seams",     label: "Clear Seams",     system: "UVUnwrap" },
        { id: "pack_islands",    label: "Pack Islands",    system: "UVUnwrap" },
        { id: "live_unwrap",     label: "Live Unwrap",     system: "UVUnwrap" },
        { id: "uv_box",          label: "Box Project",     system: "UVUnwrap" },
        { id: "uv_sphere",       label: "Sphere Project",  system: "UVUnwrap" },
        { id: "uv_planar",       label: "Planar Project",  system: "UVUnwrap" },
        { id: "uv_islands",      label: "Get Islands",     system: "UVUnwrap" },
      ],
    },
    {
      folder: "Texture Bake",
      items: [
        { id: "bake_ao",         label: "Bake AO",         system: "TextureBaker" },
        { id: "bake_normal",     label: "Bake Normal",     system: "TextureBaker" },
        { id: "bake_curvature",  label: "Bake Curvature",  system: "TextureBaker" },
        { id: "bake_all",        label: "Bake All Maps",   system: "TextureBaker" },
      ],
    },
    {
      folder: "Hair Shading",
      items: [
        { id: "hair_mat",        label: "Hair Material",   system: "HairShader"  },
        { id: "hair_aniso",      label: "Anisotropic",     system: "HairShader"  },
        { id: "hair_gradient",   label: "Root-Tip Gradient",system: "HairShader" },
        { id: "hair_alpha_tex",  label: "Alpha Texture",   system: "HairShader"  },
      ],
    },
  ],

  Rendering: [
    {
      folder: "Path Tracer",
      items: [
        { id: "pt_start",        label: "Start Tracing",   system: "PathTracer" },
        { id: "pt_stop",         label: "Stop",            system: "PathTracer" },
        { id: "pt_reset",        label: "Reset",           system: "PathTracer" },
        { id: "pt_export",       label: "Export Frame",    system: "PathTracer" },
        { id: "pt_stats",        label: "PT Stats",        system: "PathTracer" },
      ],
    },
    {
      folder: "Render Settings",
      items: [
        { id: "render_preset",   label: "Quality Preset",  system: "RenderSystem" },
        { id: "tone_mapping",    label: "Tone Mapping",    system: "RenderSystem" },
        { id: "capture_frame",   label: "Capture Frame",   system: "RenderSystem" },
        { id: "denoiser",        label: "Denoiser",        system: "RenderSystem" },
        { id: "render_queue",    label: "Render Queue",    system: "RenderSystem" },
      ],
    },
    {
      folder: "Post Processing",
      items: [
        { id: "pp_bloom",        label: "Bloom",           system: "PostPassShaders" },
        { id: "pp_ssao",         label: "SSAO",            system: "PostPassShaders" },
        { id: "pp_dof",          label: "Depth of Field",  system: "PostPassShaders" },
        { id: "pp_chromatic",    label: "Chromatic Aberr.",system: "PostPassShaders" },
        { id: "pp_vignette",     label: "Vignette",        system: "PostProcessing"  },
        { id: "pp_grain",        label: "Film Grain",      system: "PostProcessing"  },
        { id: "pp_lut",          label: "LUT Color Grade", system: "PostProcessing"  },
        { id: "pp_sharpen",      label: "Sharpen",         system: "PostProcessing"  },
      ],
    },
    {
      folder: "Render Passes",
      items: [
        { id: "pass_beauty",     label: "Beauty",          system: "RenderPasses" },
        { id: "pass_normal",     label: "Normal",          system: "RenderPasses" },
        { id: "pass_depth",      label: "Depth",           system: "RenderPasses" },
        { id: "pass_wire",       label: "Wireframe",       system: "RenderPasses" },
        { id: "pass_crypto",     label: "Cryptomatte",     system: "RenderPasses" },
        { id: "pass_emission",   label: "Emission",        system: "RenderPasses" },
        { id: "pass_composite",  label: "Composite",       system: "RenderPasses" },
      ],
    },
    {
      folder: "Lighting & Camera",
      toolId: "lighting_camera",
      items: [
        { id: "light_point",     label: "Point Light",     system: "LightSystem" },
        { id: "light_spot",      label: "Spot Light",      system: "LightSystem" },
        { id: "light_area",      label: "Area Light",      system: "LightSystem" },
        { id: "light_3pt",       label: "Three-Point Rig", system: "LightSystem" },
        { id: "light_hdri",      label: "HDRI",            system: "LightSystem" },
        { id: "light_fog",       label: "Volumetric Fog",  system: "LightSystem" },
        { id: "light_temp",      label: "Color Temp",      system: "LightSystem" },
      ],
    },
    {
      folder: "Volumetrics",
      items: [
        { id: "vol_fog",         label: "Volumetric Fog",  system: "VolumetricSystem" },
        { id: "vol_height_fog",  label: "Height Fog",      system: "VolumetricSystem" },
        { id: "vol_godrays",     label: "God Rays",        system: "VolumetricSystem" },
        { id: "vol_atmosphere",  label: "Atmosphere",      system: "VolumetricSystem" },
        { id: "vol_shafts",      label: "Light Shafts",    system: "VolumetricSystem" },
      ],
    },
    {
      folder: "Environment",
      items: [
        { id: "env_probe",       label: "Reflection Probe",system: "EnvironmentProbes" },
        { id: "env_irradiance",  label: "Irradiance Probe",system: "EnvironmentProbes" },
        { id: "env_ssr",         label: "SSR",             system: "EnvironmentProbes" },
        { id: "env_bake",        label: "Bake Environment",system: "EnvironmentProbes" },
        { id: "env_ibl",         label: "IBL Setup",       system: "RenderFarm"        },
      ],
    },
    {
      folder: "Camera",
      items: [
        { id: "cam_new",         label: "New Camera",      system: "CameraSystem" },
        { id: "cam_bookmark",    label: "Save Bookmark",   system: "CameraSystem" },
        { id: "cam_dof",         label: "Depth of Field",  system: "CameraSystem" },
        { id: "cam_shake",       label: "Camera Shake",    system: "CameraSystem" },
        { id: "cam_dolly",       label: "Dolly Zoom",      system: "CameraSystem" },
        { id: "cam_rackfocus",   label: "Rack Focus",      system: "CameraSystem" },
      ],
    },
  ],

  VFX: [
    {
      folder: "Particles",
      items: [
        { id: "vfx_fire",        label: "Fire",            system: "VFXSystem"     },
        { id: "vfx_smoke",       label: "Smoke",           system: "VFXSystem"     },
        { id: "vfx_sparks",      label: "Sparks",          system: "VFXSystem"     },
        { id: "vfx_rain",        label: "Rain",            system: "VFXSystem"     },
        { id: "vfx_burst",       label: "Burst",           system: "GPUParticles"  },
        { id: "vfx_continuous",  label: "Continuous Emit", system: "GPUParticles"  },
        { id: "vfx_trails",      label: "Trails",          system: "VFXSystem"     },
        { id: "vfx_destruct",    label: "Destruction",     system: "VFXSystem"     },
      ],
    },
    {
      folder: "Force Fields",
      items: [
        { id: "ff_vortex",       label: "Vortex",          system: "GPUParticles" },
        { id: "ff_wind",         label: "Wind",            system: "GPUParticles" },
        { id: "ff_gravity",      label: "Gravity",         system: "GPUParticles" },
        { id: "ff_turbulence",   label: "Turbulence",      system: "GPUParticles" },
        { id: "ff_attractor",    label: "Attractor",       system: "GPUParticles" },
      ],
    },
    {
      folder: "Fluids",
      items: [
        { id: "fluid_water",     label: "Water",           system: "FluidSystem" },
        { id: "fluid_lava",      label: "Lava",            system: "FluidSystem" },
        { id: "fluid_honey",     label: "Honey",           system: "FluidSystem" },
        { id: "fluid_pyro",      label: "Pyro Emitter",    system: "FluidSystem" },
        { id: "fluid_surface",   label: "Fluid Surface",   system: "FluidSystem" },
        { id: "fluid_mc",        label: "Marching Cubes Surface", system: "MarchingCubes" },
      ],
    },
    {
      folder: "Cloth",
      items: [
        { id: "cloth_cotton",    label: "Cotton",          system: "ClothSystem"    },
        { id: "cloth_silk",      label: "Silk",            system: "ClothSystem"    },
        { id: "cloth_rubber",    label: "Rubber",          system: "ClothSystem"    },
        { id: "cloth_pin",       label: "Pin Vertices",    system: "ClothPinning"   },
        { id: "cloth_collide",   label: "Colliders",       system: "ClothCollision" },
        { id: "cloth_self",      label: "Self Collision",  system: "ClothCollision" },
      ],
    },
    {
      folder: "Hair & Groom",
      items: [
        { id: "hair_emit",       label: "Emit Hair",       system: "HairSystem"   },
        { id: "hair_tubes",      label: "Hair Tubes",      system: "HairSystem"   },
        { id: "hair_clump",      label: "Clump",           system: "HairSystem"   },
        { id: "hair_preset",     label: "Preset",          system: "HairSystem"   },
        { id: "hair_physics",    label: "Hair Physics",    system: "HairPhysics"  },
        { id: "hair_wind",       label: "Wind Force",      system: "HairPhysics"  },
        { id: "hair_cards",      label: "Hair Cards",      system: "HairCards"    },
        { id: "hair_upgrade",    label: "Braid Preset",    system: "HairUpgrade"  },
        { id: "hair_bun",        label: "Bun Preset",      system: "HairUpgrade"  },
        { id: "hair_ponytail",   label: "Ponytail Preset", system: "HairUpgrade"  },
      ],
    },
    {
      folder: "Rigid Body",
      items: [
        { id: "rb_create",       label: "New Rigid Body",  system: "PhysicsBake" },
        { id: "rb_bake",         label: "Bake Physics",    system: "PhysicsBake" },
        { id: "rb_fracture",     label: "Fracture Mesh",   system: "PhysicsBake" },
      ],
    },
  ],

  Pipeline: [
    {
      folder: "Import / Export",
      items: [
        { id: "io_glb_import",   label: "Import GLB",      system: "App"         },
        { id: "io_glb_export",   label: "Export GLB",      system: "App"         },
        { id: "io_obj_export",   label: "Export OBJ",      system: "FBXPipeline" },
        { id: "io_obj_import",   label: "Import OBJ",      system: "FBXPipeline" },
        { id: "io_fbx_import",   label: "Import FBX",      system: "FBXPipeline" },
        { id: "io_fbx_export",   label: "Export FBX",      system: "FBXPipeline" },
        { id: "io_abc_export",   label: "Export Alembic",  system: "FBXPipeline" },
        { id: "io_usd_export",   label: "Export USD",      system: "FBXPipeline" },
        { id: "io_spx_save",     label: "Save .SPX",       system: "UISystem"    },
        { id: "io_spx_export",   label: "Export to StreamPireX", system: "UISystem" },
      ],
    },
    {
      folder: "LOD & Instancing",
      items: [
        { id: "lod_gen",         label: "Generate LOD",    system: "LODSystem"   },
        { id: "lod_level",       label: "Set LOD Level",   system: "LODSystem"   },
        { id: "lod_auto",        label: "Auto LOD",        system: "LODSystem"   },
        { id: "inst_scatter",    label: "Scatter Instances",system: "Instancing" },
        { id: "inst_grid",       label: "Grid Instances",  system: "Instancing"  },
        { id: "inst_flatten",    label: "Flatten Instances",system: "Instancing" },
      ],
    },
    {
      folder: "Scene Management",
      items: [
        { id: "scene_new",       label: "New Scene",       system: "SceneCreator" },
        { id: "scene_collect",   label: "Collection",      system: "SceneCreator" },
        { id: "scene_duplicate", label: "Duplicate Object",system: "SceneCreator" },
        { id: "scene_parent",    label: "Parent",          system: "SceneCreator" },
        { id: "scene_lighting",  label: "Lighting Setup",  system: "SceneCreator" },
        { id: "scene_env",       label: "Environment",     system: "SceneCreator" },
        { id: "scene_optimize",  label: "Optimize Scene",  system: "AssetLibrary" },
        { id: "scene_stats",     label: "Scene Stats",     system: "AssetLibrary" },
      ],
    },
    {
      folder: "Asset Library",
      items: [
        { id: "asset_add",       label: "Add Asset",       system: "AssetLibrary" },
        { id: "asset_search",    label: "Search",          system: "AssetLibrary" },
        { id: "asset_thumbnail", label: "Thumbnail",       system: "AssetLibrary" },
        { id: "asset_r2",        label: "Upload to R2",    system: "AssetLibrary" },
        { id: "asset_favorite",  label: "Favorites",       system: "AssetLibrary" },
      ],
    },
    {
      folder: "Plugin System",
      items: [
        { id: "plugin_register", label: "Register Plugin", system: "PluginSystem" },
        { id: "plugin_load_url", label: "Load from URL",   system: "PluginSystem" },
        { id: "plugin_load_file",label: "Load from File",  system: "PluginSystem" },
        { id: "plugin_market",   label: "Marketplace",     system: "PluginSystem" },
        { id: "plugin_presets",  label: "Community Presets",system: "PluginSystem"},
      ],
    },
    {
      folder: "Collaboration",
      items: [
        { id: "collab_session",  label: "New Session",     system: "CollaborationSystem" },
        { id: "collab_connect",  label: "Connect",         system: "CollaborationSystem" },
        { id: "collab_comment",  label: "Comment Pin",     system: "CollaborationSystem" },
        { id: "collab_snapshot", label: "Version Snapshot",system: "CollaborationSystem" },
        { id: "collab_restore",  label: "Restore Version", system: "CollaborationSystem" },
      ],
    },
    {
      folder: "Render Farm",
      items: [
        { id: "farm_job",        label: "Add Job",         system: "RenderFarm" },
        { id: "farm_run",        label: "Run Next Job",    system: "RenderFarm" },
        { id: "farm_cancel",     label: "Cancel Job",      system: "RenderFarm" },
        { id: "farm_webgpu",     label: "WebGPU Detect",   system: "RenderFarm" },
        { id: "farm_shadows",    label: "Cascade Shadows", system: "RenderFarm" },
        { id: "farm_npr",        label: "NPR Outline",     system: "RenderFarm" },
      ],
    },
    {
      folder: "Workers",
      items: [
        { id: "worker_cloth",    label: "Cloth Worker",    system: "WorkerBridge" },
        { id: "worker_sph",      label: "SPH Worker",      system: "WorkerBridge" },
        { id: "worker_pool",     label: "Worker Pool",     system: "WorkerBridge" },
      ],
    },
  ],
};

// Flat feature list per workspace (for legacy FeatureIndexPanel)
export const WORKSPACE_FEATURES = Object.fromEntries(
  Object.entries(WORKSPACE_TREE).map(([ws, folders]) => [
    ws,
    folders.flatMap(f => f.items.map(i => i.label)),
  ])
);

export default {
  WORKSPACES,
  WORKSPACES_MAP,
  WORKSPACE_TREE,
  WORKSPACE_FEATURES,
  DEFAULT_WORKSPACE,
};
