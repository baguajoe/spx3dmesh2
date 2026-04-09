
export const COMPOSITOR_NODE_TYPES = {
  INPUT:     ["RenderLayer", "Image", "Texture", "Value", "RGB", "Vector"],
  OUTPUT:    ["Composite", "Viewer", "FileOutput"],
  COLOR:     ["AlphaOver", "BrightContrast", "ColorBalance", "HueSat", "Mix", "Invert", "Gamma", "Tonemap", "Exposure"],
  FILTER:    ["Blur", "Defocus", "Glare", "Bokeh", "Sharpen", "Denoise"],
  MATTE:     ["AlphaConvert", "SetAlpha", "IDMask", "BoxMask", "EllipseMask"],
  TRANSFORM: ["Scale", "Transform", "Rotate", "Flip", "Crop"],
  UTILITIES: ["Math", "SeparateRGBA", "CombineRGBA", "SeparateXYZ", "CombineXYZ"],
};

function buildInputs(type) {
  const m = {
    Mix:           [{ name:"Fac", type:"value" }, { name:"Image1", type:"image" }, { name:"Image2", type:"image" }],
    Blur:          [{ name:"Image", type:"image" }, { name:"Size", type:"value" }],
    AlphaOver:     [{ name:"Fac", type:"value" }, { name:"Image1", type:"image" }, { name:"Image2", type:"image" }],
    BrightContrast:[{ name:"Image", type:"image" }, { name:"Bright", type:"value" }, { name:"Contrast", type:"value" }],
    Glare:         [{ name:"Image", type:"image" }],
    Denoise:       [{ name:"Image", type:"image" }, { name:"Normal", type:"image" }, { name:"Albedo", type:"image" }],
    ColorBalance:  [{ name:"Fac", type:"value" }, { name:"Image", type:"image" }],
    HueSat:        [{ name:"Hue", type:"value" }, { name:"Sat", type:"value" }, { name:"Val", type:"value" }, { name:"Image", type:"image" }],
    Composite:     [{ name:"Image", type:"image" }, { name:"Alpha", type:"value" }, { name:"Z", type:"value" }],
    Viewer:        [{ name:"Image", type:"image" }, { name:"Alpha", type:"value" }],
    Invert:        [{ name:"Fac", type:"value" }, { name:"Color", type:"image" }],
    Gamma:         [{ name:"Image", type:"image" }, { name:"Gamma", type:"value" }],
    Tonemap:       [{ name:"Image", type:"image" }],
    Exposure:      [{ name:"Image", type:"image" }, { name:"Exposure", type:"value" }],
  };
  return (m[type] || [{ name:"Image", type:"image" }]).map(i => ({ ...i, id: crypto.randomUUID(), connected: null }));
}

function buildOutputs(type) {
  const m = {
    RenderLayer: [{ name:"Image" }, { name:"Alpha" }, { name:"Z" }, { name:"Normal" }, { name:"Diffuse" }],
    Mix:         [{ name:"Image" }],
    Blur:        [{ name:"Image" }],
    Glare:       [{ name:"Image" }],
    Denoise:     [{ name:"Image" }],
    Invert:      [{ name:"Color" }],
    Gamma:       [{ name:"Image" }],
    Composite:   [],
    Viewer:      [],
  };
  return (m[type] || [{ name:"Image" }]).map(o => ({ ...o, id: crypto.randomUUID(), type: "image" }));
}

function buildParams(type, overrides = {}) {
  const d = {
    Mix:           { blendType:"MIX",    use_alpha: false },
    Blur:          { sizeX: 3,  sizeY: 3, filterType:"GAUSS" },
    Glare:         { glareType:"BLOOM",  quality:"MEDIUM", threshold: 1.0, size: 8 },
    BrightContrast:{ bright: 0, contrast: 0 },
    HueSat:        { hue: 0.5,  saturation: 1, value: 1 },
    ColorBalance:  { lift:[1,1,1], gamma:[1,1,1], gain:[1,1,1] },
    Denoise:       { use_hdr: false },
    Gamma:         { gamma: 1.0 },
    Exposure:      { exposure: 0.0 },
    Tonemap:       { key: 0.18, offset: 1.0, gamma: 1.0 },
  };
  return { ...(d[type] || {}), ...overrides };
}

export function createCompositorNode(type, opts = {}) {
  return {
    id:       crypto.randomUUID(),
    type,
    label:    opts.label    || type,
    position: opts.position || { x: 0, y: 0 },
    inputs:   buildInputs(type),
    outputs:  buildOutputs(type),
    params:   buildParams(type, opts.params || {}),
    mute:     false,
    preview:  null,
  };
}

export function createCompositorGraph() {
  return { id: crypto.randomUUID(), nodes: [], connections: [], active: true };
}

export function addCompositorNode(graph, type, opts = {}) {
  const node = createCompositorNode(type, opts);
  graph.nodes.push(node);
  return node;
}

export function removeCompositorNode(graph, id) {
  graph.nodes       = graph.nodes.filter(n => n.id !== id);
  graph.connections = graph.connections.filter(c => c.fromNodeId !== id && c.toNodeId !== id);
  return graph;
}

export function connectCompositorNodes(graph, fromNodeId, fromOutput, toNodeId, toInput) {
  const conn = { id: crypto.randomUUID(), fromNodeId, fromOutput, toNodeId, toInput };
  graph.connections.push(conn);
  const toNode = graph.nodes.find(n => n.id === toNodeId);
  if (toNode) {
    const inp = toNode.inputs.find(i => i.name === toInput);
    if (inp) inp.connected = conn.id;
  }
  return conn;
}

export function disconnectInput(graph, toNodeId, toInput) {
  graph.connections = graph.connections.filter(c => !(c.toNodeId === toNodeId && c.toInput === toInput));
  const toNode = graph.nodes.find(n => n.id === toNodeId);
  if (toNode) {
    const inp = toNode.inputs.find(i => i.name === toInput);
    if (inp) inp.connected = null;
  }
  return graph;
}

export function muteCompositorNode(graph, id, mute = true) {
  const node = graph.nodes.find(n => n.id === id);
  if (node) node.mute = mute;
  return graph;
}

export function evaluateCompositorGraph(graph) {
  const composite = graph.nodes.find(n => n.type === "Composite");
  if (!composite) return null;
  const input = graph.connections.find(c => c.toNodeId === composite.id && c.toInput === "Image");
  return { evaluated: true, outputNode: composite.id, inputConnection: input };
}

export function getCompositorStats(graph) {
  return {
    nodes:       graph.nodes.length,
    connections: graph.connections.length,
    active:      graph.active,
    muted:       graph.nodes.filter(n => n.mute).length,
  };
}

export function applyCompositorPreset(presetName) {
  const graph = createCompositorGraph();
  const presets = {
    bloom: g => {
      const rl   = addCompositorNode(g, "RenderLayer", { position: { x:   0, y: 0 } });
      const gl   = addCompositorNode(g, "Glare",       { position: { x: 200, y: 0 }, params: { glareType:"BLOOM", threshold: 0.8, size: 6 } });
      const mx   = addCompositorNode(g, "Mix",         { position: { x: 400, y: 0 }, params: { blendType:"ADD" } });
      const out  = addCompositorNode(g, "Composite",   { position: { x: 600, y: 0 } });
      connectCompositorNodes(g, rl.id, "Image",  gl.id,  "Image");
      connectCompositorNodes(g, rl.id, "Image",  mx.id,  "Image1");
      connectCompositorNodes(g, gl.id, "Image",  mx.id,  "Image2");
      connectCompositorNodes(g, mx.id, "Image",  out.id, "Image");
    },
    denoise: g => {
      const rl  = addCompositorNode(g, "RenderLayer", { position: { x:   0, y: 0 } });
      const dn  = addCompositorNode(g, "Denoise",     { position: { x: 200, y: 0 } });
      const out = addCompositorNode(g, "Composite",   { position: { x: 400, y: 0 } });
      connectCompositorNodes(g, rl.id, "Image",   dn.id,  "Image");
      connectCompositorNodes(g, rl.id, "Normal",  dn.id,  "Normal");
      connectCompositorNodes(g, rl.id, "Diffuse", dn.id,  "Albedo");
      connectCompositorNodes(g, dn.id, "Image",   out.id, "Image");
    },
    colorGrade: g => {
      const rl  = addCompositorNode(g, "RenderLayer",  { position: { x:   0, y: 0 } });
      const cb  = addCompositorNode(g, "ColorBalance", { position: { x: 200, y: 0 } });
      const hs  = addCompositorNode(g, "HueSat",       { position: { x: 400, y: 0 } });
      const out = addCompositorNode(g, "Composite",    { position: { x: 600, y: 0 } });
      connectCompositorNodes(g, rl.id, "Image", cb.id,  "Image");
      connectCompositorNodes(g, cb.id, "Image", hs.id,  "Image");
      connectCompositorNodes(g, hs.id, "Image", out.id, "Image");
    },
    sharpen: g => {
      const rl  = addCompositorNode(g, "RenderLayer", { position: { x:   0, y: 0 } });
      const sh  = addCompositorNode(g, "Sharpen",     { position: { x: 200, y: 0 } });
      const out = addCompositorNode(g, "Composite",   { position: { x: 400, y: 0 } });
      connectCompositorNodes(g, rl.id, "Image", sh.id,  "Image");
      connectCompositorNodes(g, sh.id, "Image", out.id, "Image");
    },
  };
  if (presets[presetName]) presets[presetName](graph);
  return graph;
}
