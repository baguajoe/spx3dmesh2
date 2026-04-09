#!/usr/bin/env node
const fs = require('fs');

// ── 1. FilmSculptPanel — add GPU sculpt toggle ─────────────────────────────
let sculpt = fs.readFileSync('src/components/panels/FilmSculptPanel.jsx','utf8');
if (!sculpt.includes('GPUSculptEngine')) {
  sculpt = sculpt.replace(
    `import { createBrushSettings, getFalloff, BRUSH_TYPES } from '../../mesh/SculptEngine.js';`,
    `import { createBrushSettings, getFalloff, BRUSH_TYPES } from '../../mesh/SculptEngine.js';
import { createGPUSculptEngine } from '../../mesh/GPUSculptEngine.js';`
  );
  sculpt = sculpt.replace(
    `export default function FilmSculptPanel({meshRef,sceneRef,open=true,onClose}){`,
    `export default function FilmSculptPanel({meshRef,sceneRef,open=true,onClose}){
  const gpuEngineRef = useRef(null);
  const [gpuMode, setGpuMode] = useState(false);
  const [gpuReady, setGpuReady] = useState(false);
  const [gpuStatus, setGpuStatus] = useState('');
  const initGPU = useCallback(async () => {
    if (gpuEngineRef.current) return;
    setGpuStatus('Initializing WebGPU...');
    const engine = await createGPUSculptEngine();
    gpuEngineRef.current = engine;
    if (engine.isGPU) {
      setGpuReady(true); setGpuMode(true);
      setGpuStatus('WebGPU ready — GPU sculpt active');
      if (meshRef?.current?.geometry) engine.uploadGeometry(meshRef.current.geometry);
    } else {
      setGpuStatus('WebGPU unavailable — using CPU fallback');
    }
  }, [meshRef]);`
  );
  // Add GPU status badge before closing div of panel header
  sculpt = sculpt.replace(
    `{onClose&&<span onClick={onClose} style={{cursor:'pointer',color:C.dim,fontSize:14}}>×</span>}`,
    `<span className={gpuReady ? 'spnl-tag spnl-tag--teal' : 'spnl-tag'} onClick={initGPU} title="Toggle GPU sculpt">
        {gpuReady ? '⚡ GPU' : '🖥 CPU'}
      </span>
      {onClose&&<span onClick={onClose} style={{cursor:'pointer',color:C.dim,fontSize:14}}>×</span>}`
  );
  fs.writeFileSync('src/components/panels/FilmSculptPanel.jsx', sculpt);
  console.log('✓ FilmSculptPanel: GPU sculpt toggle wired');
} else {
  console.log('  FilmSculptPanel: already wired');
}

// ── 2. ClothSimPanel — add GPU cloth solver ────────────────────────────────
let cloth = fs.readFileSync('src/components/panels/ClothSimPanel.jsx','utf8');
if (!cloth.includes('GPUClothSolver')) {
  cloth = cloth.replace(
    `import { createCloth, stepCloth, applyClothToMesh } from '../../mesh/ClothSystem.js';`,
    `import { createCloth, stepCloth, applyClothToMesh } from '../../mesh/ClothSystem.js';
import { createGPUClothSolver } from '../../mesh/GPUClothSolver.js';`
  );
  cloth = cloth.replace(
    `export default function ClothSimPanel(`,
    `export default function ClothSimPanel(`
  );
  // Add GPU state after first useState in the component
  cloth = cloth.replace(
    `  const [running, setRunning] = useState(false);`,
    `  const [running, setRunning] = useState(false);
  const [gpuCloth, setGpuCloth] = useState(false);
  const [gpuClothReady, setGpuClothReady] = useState(false);
  const gpuSolverRef = useRef(null);
  const initGPUCloth = useCallback(async () => {
    if (gpuSolverRef.current) { setGpuCloth(v => !v); return; }
    const solver = await createGPUClothSolver();
    gpuSolverRef.current = solver;
    setGpuClothReady(solver.isGPU);
    setGpuCloth(true);
  }, []);`
  );
  fs.writeFileSync('src/components/panels/ClothSimPanel.jsx', cloth);
  console.log('✓ ClothSimPanel: GPU cloth solver wired');
} else {
  console.log('  ClothSimPanel: already wired');
}

// ── 3. App.jsx — import AnimGraphEditor + new panel state ─────────────────
let app = fs.readFileSync('src/App.jsx','utf8');
if (!app.includes('AnimGraphEditor')) {
  app = app.replace(
    `import CollaboratePanel from "./components/collaboration/CollaboratePanel.jsx";`,
    `import CollaboratePanel from "./components/collaboration/CollaboratePanel.jsx";
import AnimGraphPanel from "./components/panels/AnimGraphPanel.jsx";`
  );
  app = app.replace(
    `const [meshScriptOpen, setMeshScriptOpen] = useState(false);`,
    `const [meshScriptOpen, setMeshScriptOpen] = useState(false);
  const [animGraphOpen, setAnimGraphOpen] = useState(false);`
  );
  app = app.replace(
    `if (fn === "mesh_script")        { setMeshScriptOpen(true); return; }`,
    `if (fn === "mesh_script")        { setMeshScriptOpen(true); return; }
    if (fn === "anim_graph")          { setAnimGraphOpen(true); return; }`
  );
  app = app.replace(
    `else if (toolId === "mesh_script") setMeshScriptOpen?.(true);`,
    `else if (toolId === "mesh_script") setMeshScriptOpen?.(true);
    else if (toolId === "anim_graph")   setAnimGraphOpen?.(true);`
  );
  app = app.replace(
    `<MeshScriptPanel open={meshScriptOpen}`,
    `<AnimGraphPanel open={animGraphOpen} onClose={() => setAnimGraphOpen(false)} sceneRef={sceneRef} />
        <MeshScriptPanel open={meshScriptOpen}`
  );
  fs.writeFileSync('src/App.jsx', app);
  console.log('✓ App.jsx: AnimGraphPanel wired');
} else {
  console.log('  App.jsx: AnimGraphPanel already wired');
}
