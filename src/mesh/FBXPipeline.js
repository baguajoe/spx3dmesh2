import * as THREE from "three";

// ── OBJ exporter (browser-side, no deps) ─────────────────────────────────────
export function exportOBJ(scene, options = {}) {
  const { filename="export.obj", includeNormals=true, includeUVs=true } = options;
  const lines = ["# SPX Mesh Editor OBJ Export", `# ${new Date().toISOString()}`, ""];
  const mtlLines = ["# SPX Mesh Editor MTL Export", ""];
  const materials = new Map();
  let vertexOffset = 1;

  scene.traverse(obj => {
    if (!obj.isMesh) return;
    const geo  = obj.geometry;
    const mat  = obj.material;
    const pos  = geo.attributes.position;
    const nor  = geo.attributes.normal;
    const uv   = geo.attributes.uv;
    const idx  = geo.index;
    if (!pos) return;

    const name = obj.name || "Object_" + vertexOffset;
    lines.push(`o ${name}`);

    // Material
    if (mat) {
      const matName = mat.name || "Material_" + materials.size;
      if (!materials.has(matName)) {
        materials.set(matName, mat);
        mtlLines.push(`newmtl ${matName}`);
        mtlLines.push(`Ka 0.2 0.2 0.2`);
        const c = mat.color || new THREE.Color(0.8,0.8,0.8);
        mtlLines.push(`Kd ${c.r.toFixed(4)} ${c.g.toFixed(4)} ${c.b.toFixed(4)}`);
        mtlLines.push(`Ks 0.5 0.5 0.5`);
        mtlLines.push(`Ns ${(1-((mat.roughness||0.5)))*100}`);
        mtlLines.push(`d ${mat.opacity || 1.0}`);
        mtlLines.push("");
      }
      lines.push(`usemtl ${matName}`);
    }

    const mat4 = obj.matrixWorld;

    // Vertices
    for (let i=0; i<pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat4);
      lines.push(`v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`);
    }

    // Normals
    if (includeNormals && nor) {
      const nm = new THREE.Matrix3().getNormalMatrix(mat4);
      for (let i=0; i<nor.count; i++) {
        const n = new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)).applyMatrix3(nm).normalize();
        lines.push(`vn ${n.x.toFixed(6)} ${n.y.toFixed(6)} ${n.z.toFixed(6)}`);
      }
    }

    // UVs
    if (includeUVs && uv) {
      for (let i=0; i<uv.count; i++) {
        lines.push(`vt ${uv.getX(i).toFixed(6)} ${uv.getY(i).toFixed(6)}`);
      }
    }

    // Faces
    lines.push("s off");
    const hasNor = includeNormals && nor;
    const hasUV  = includeUVs && uv;

    if (idx) {
      for (let i=0; i<idx.count; i+=3) {
        const a=idx.getX(i)+vertexOffset, b=idx.getX(i+1)+vertexOffset, c=idx.getX(i+2)+vertexOffset;
        if (hasNor && hasUV)      lines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
        else if (hasNor)          lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
        else if (hasUV)           lines.push(`f ${a}/${a} ${b}/${b} ${c}/${c}`);
        else                      lines.push(`f ${a} ${b} ${c}`);
      }
    } else {
      for (let i=0; i<pos.count; i+=3) {
        const a=i+vertexOffset, b=i+1+vertexOffset, c=i+2+vertexOffset;
        lines.push(`f ${a} ${b} ${c}`);
      }
    }
    lines.push("");
    vertexOffset += pos.count;
  });

  const objText = `mtllib ${filename.replace(".obj",".mtl")}\n` + lines.join("\n");
  const mtlText = mtlLines.join("\n");

  downloadText(objText, filename);
  downloadText(mtlText, filename.replace(".obj",".mtl"));
  return { obj: objText, mtl: mtlText };
}

// ── OBJ importer (browser-side) ───────────────────────────────────────────────
export function parseOBJ(text) {
  const positions = [], normals = [], uvs = [], faces = [];
  const objects   = [];
  let currentObj  = { name:"Default", faces:[] };
  objects.push(currentObj);

  text.split("\n").forEach(line => {
    line = line.trim();
    if (!line || line.startsWith("#")) return;
    const parts = line.split(/\s+/);
    switch(parts[0]) {
      case "v":  positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])); break;
      case "vn": normals.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])); break;
      case "vt": uvs.push(parseFloat(parts[1]), parseFloat(parts[2]||0)); break;
      case "o":  currentObj = { name:parts[1], faces:[] }; objects.push(currentObj); break;
      case "f":
        const verts = parts.slice(1).map(v => {
          const [vi,ti,ni] = v.split("/").map(x => x ? parseInt(x)-1 : -1);
          return { vi, ti, ni };
        });
        for (let i=1; i<verts.length-1; i++) {
          currentObj.faces.push([verts[0], verts[i], verts[i+1]]);
        }
        break;
    }
  });

  // Build THREE geometries
  const group = new THREE.Group();
  objects.forEach(obj => {
    if (!obj.faces.length) return;
    const posArr=[], norArr=[], uvArr=[];
    obj.faces.forEach(([a,b,c]) => {
      [a,b,c].forEach(v => {
        posArr.push(positions[v.vi*3], positions[v.vi*3+1], positions[v.vi*3+2]);
        if (v.ni >= 0 && normals.length) norArr.push(normals[v.ni*3], normals[v.ni*3+1], normals[v.ni*3+2]);
        if (v.ti >= 0 && uvs.length)     uvArr.push(uvs[v.ti*2], uvs[v.ti*2+1]);
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(posArr), 3));
    if (norArr.length) geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(norArr), 3));
    else geo.computeVertexNormals();
    if (uvArr.length)  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvArr), 2));
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness:0.6, metalness:0.0 }));
    mesh.name  = obj.name;
    group.add(mesh);
  });
  return group;
}

// ── FBX via Railway backend ───────────────────────────────────────────────────
export async function importFBXFromBackend(file, apiBase="https://streampirex.com/api") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("format", "fbx");
  formData.append("target", "glb");

  try {
    const res = await fetch(`${apiBase}/mesh/convert`, {
      method: "POST",
      body:   formData,
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    return { success:true, url, blob };
  } catch(e) {
    console.warn("FBX backend convert failed:", e.message);
    return { success:false, error:e.message, offline:true };
  }
}

export async function exportFBXToBackend(scene, filename="export.fbx", apiBase="https://streampirex.com/api") {
  // Export as GLB first, then convert server-side
  const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js").catch(()=>({}));
  if (!GLTFExporter) return { success:false, error:"GLTFExporter not available" };

  return new Promise((resolve) => {
    const exporter = new GLTFExporter();
    exporter.parse(scene, async (glb) => {
      const formData = new FormData();
      formData.append("file", new Blob([glb], { type:"model/gltf-binary" }), "scene.glb");
      formData.append("format", "glb");
      formData.append("target", "fbx");
      formData.append("filename", filename);

      try {
        const res = await fetch(`${apiBase}/mesh/convert`, { method:"POST", body:formData });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url; a.download = filename; a.click();
        resolve({ success:true });
      } catch(e) {
        // Fallback: download as GLB
        const url = URL.createObjectURL(new Blob([glb]));
        const a   = document.createElement("a");
        a.href    = url; a.download = filename.replace(".fbx",".glb"); a.click();
        resolve({ success:false, error:e.message, fallback:"glb" });
      }
    }, { binary:true });
  });
}

// ── Alembic stub (requires backend) ──────────────────────────────────────────
export async function exportAlembic(scene, filename="export.abc", apiBase="https://streampirex.com/api") {
  return { success:false, error:"Alembic export requires Railway backend — coming soon", pending:true };
}

// ── USD stub ──────────────────────────────────────────────────────────────────
export async function exportUSD(scene, filename="export.usd", apiBase="https://streampirex.com/api") {
  return { success:false, error:"USD export requires Railway backend — coming soon", pending:true };
}

// ── Helper ────────────────────────────────────────────────────────────────────
function downloadText(text, filename) {
  const blob = new Blob([text], { type:"text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const SUPPORTED_IMPORT_FORMATS = [
  { ext:".glb",  label:"GLB",        native:true,   desc:"Binary GLTF" },
  { ext:".gltf", label:"GLTF",       native:true,   desc:"JSON GLTF" },
  { ext:".obj",  label:"OBJ",        native:true,   desc:"Wavefront OBJ" },
  { ext:".fbx",  label:"FBX",        native:false,  desc:"Autodesk FBX (via backend)" },
  { ext:".abc",  label:"Alembic",    native:false,  desc:"Alembic (via backend)" },
  { ext:".usd",  label:"USD",        native:false,  desc:"USD (via backend)" },
  { ext:".spx",  label:"SPX Scene",  native:true,   desc:"Native SPX format" },
];

export const SUPPORTED_EXPORT_FORMATS = [
  { ext:".glb",  label:"GLB",        native:true,   desc:"Binary GLTF — recommended" },
  { ext:".obj",  label:"OBJ + MTL",  native:true,   desc:"Universal — browser-side" },
  { ext:".fbx",  label:"FBX",        native:false,  desc:"Maya/Max (via backend)" },
  { ext:".abc",  label:"Alembic",    native:false,  desc:"VFX pipeline (via backend)" },
  { ext:".spx",  label:"SPX Scene",  native:true,   desc:"Native SPX format" },
];


// ── Draco-compressed GLB export ──────────────────────────────────────────────
export async function exportGLBWithDraco(scene, options = {}) {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const { DRACOExporter } = await import('three/examples/jsm/exporters/DRACOExporter.js');

  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    const dracoExporter = new DRACOExporter();

    const exportOptions = {
      binary: true,
      dracoOptions: {
        compressionLevel: options.compressionLevel || 7,
        quantizePosition: options.quantizePosition || 14,
        quantizeNormal: options.quantizeNormal || 10,
        quantizeTexcoord: options.quantizeTexcoord || 12,
        exportUvs: true,
        exportNormals: true,
        exportColor: options.exportColor || false,
      },
      ...options,
    };

    exporter.parse(
      scene,
      (result) => {
        const blob = new Blob([result], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = options.filename || 'spx_export_draco.glb';
        a.click();
        URL.revokeObjectURL(url);
        resolve(blob);
      },
      (error) => reject(error),
      exportOptions
    );
  });
}

export function getDracoCompressionStats(geometry) {
  const vertexCount = geometry.attributes?.position?.count || 0;
  const indexCount = geometry.index?.count || 0;
  const estimatedOriginal = (vertexCount * 12 + indexCount * 4) / 1024;
  const estimatedDraco = estimatedOriginal * 0.15; // ~85% reduction typical
  return {
    vertexCount,
    indexCount,
    estimatedOriginalKB: Math.round(estimatedOriginal),
    estimatedDracoKB: Math.round(estimatedDraco),
    estimatedSavingsPct: 85,
  };
}
