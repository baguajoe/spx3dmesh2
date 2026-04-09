import * as THREE from 'three';

// ── L-System grammar engine ───────────────────────────────────────────────────
const GRAMMARS = {
  oak:    { axiom:'F', rules:{ F:'FF+[+F-F-F]-[-F+F+F]' }, angle:25, iter:4 },
  pine:   { axiom:'F', rules:{ F:'F[+F]F[-F][F]' },        angle:20, iter:5 },
  willow: { axiom:'F', rules:{ F:'FF-[-F+F+F]+[+F-F-F]' }, angle:22, iter:4 },
  shrub:  { axiom:'F', rules:{ F:'F[+F][-F]F' },           angle:30, iter:3 },
  fern:   { axiom:'X', rules:{ X:'F+[[X]-X]-F[-FX]+X', F:'FF' }, angle:25, iter:5 },
  dead:   { axiom:'F', rules:{ F:'F[+F][-F]' },            angle:35, iter:4 },
};

function expand(axiom, rules, iter) {
  let s = axiom;
  for (let i=0; i<iter; i++) {
    let next = '';
    for (const c of s) next += rules[c] || c;
    s = next;
  }
  return s;
}

function buildTurtleMesh(str, angle, trunkRadius, trunkColor, leafColor, leafSize) {
  const group = new THREE.Group();
  const stack = [];
  const segments = [];

  let pos = new THREE.Vector3(0,0,0);
  let dir = new THREE.Vector3(0,1,0);
  let depth = 0;
  let segLen = 0.35;

  // Collect branch segments
  for (const c of str) {
    switch(c) {
      case 'F': {
        const next = pos.clone().addScaledVector(dir, segLen);
        segments.push({ from: pos.clone(), to: next.clone(), depth });
        pos.copy(next);
        segLen *= 0.92;
        break;
      }
      case '+': { const ax=new THREE.Vector3(0,0,1); dir.applyAxisAngle(ax, THREE.MathUtils.degToRad(angle*(0.8+Math.random()*0.4))); break; }
      case '-': { const ax=new THREE.Vector3(0,0,1); dir.applyAxisAngle(ax,-THREE.MathUtils.degToRad(angle*(0.8+Math.random()*0.4))); break; }
      case '[': { stack.push({pos:pos.clone(),dir:dir.clone(),depth,segLen}); depth++; break; }
      case ']': { const s=stack.pop(); pos=s.pos; dir=s.dir; depth=s.depth; segLen=s.segLen; break; }
    }
  }

  // Build branch geometry from segments
  const trunkMat = new THREE.MeshPhysicalMaterial({ color:new THREE.Color(trunkColor), roughness:0.95 });
  const maxDepth = Math.max(...segments.map(s=>s.depth));

  segments.forEach(seg => {
    const t = seg.depth / (maxDepth+1);
    const r = Math.max(0.012, trunkRadius * (1 - t*0.85));
    const vec = seg.to.clone().sub(seg.from);
    const len = vec.length();
    if (len < 0.001) return;

    const geo = new THREE.CylinderGeometry(r*0.8, r, len, 6, 1);
    const mesh = new THREE.Mesh(geo, trunkMat);
    const mid = seg.from.clone().add(seg.to).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), vec.normalize());
    mesh.castShadow = true;
    group.add(mesh);

    // Add leaf cluster at branch tips
    if (seg.depth >= maxDepth-1 && leafSize > 0.1) {
      const ls = leafSize * (0.6+Math.random()*0.4);
      const leafGeo = new THREE.SphereGeometry(ls, 7, 5);
      const leafMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(leafColor).offsetHSL(0,(Math.random()-0.5)*0.1,(Math.random()-0.5)*0.1),
        roughness:0.8, sheen:0.3
      });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.copy(seg.to);
      leaf.castShadow = true;
      group.add(leaf);
    }
  });

  return group;
}

export function buildLSystemTree(scene, params, meshesRef) {
  meshesRef.current.forEach(m=>{ scene.remove(m); m.traverse(o=>{ o.geometry?.dispose(); o.material?.dispose(); }); });
  meshesRef.current = [];

  const {
    grammarType='oak', trunkRadius=0.18, trunkColor='#5a3a1a',
    leafColor='#2a7a2a', leafSize=0.4, iterations=4,
    count=1, scatter=0, customAngle=null
  } = params;

  const grammar = GRAMMARS[grammarType] || GRAMMARS.oak;
  const angle = customAngle ?? grammar.angle;
  const iter  = Math.min(iterations, grammar.iter);
  const str   = expand(grammar.axiom, grammar.rules, iter);

  for (let i=0; i<Math.max(1,count); i++) {
    const tree = buildTurtleMesh(str, angle, trunkRadius, trunkColor, leafColor, leafSize);
    if (count > 1) {
      const s = scatter*10;
      tree.position.set((Math.random()-0.5)*s*2, 0, (Math.random()-0.5)*s*2);
    }
    tree.scale.setScalar(0.8 + Math.random()*0.4);
    scene.add(tree);
    meshesRef.current.push(tree);
  }
}

export const LSYSTEM_PRESETS = {
  'Oak':    { grammarType:'oak',   trunkRadius:0.22, trunkColor:'#5a3a1a', leafColor:'#2a7a2a', leafSize:0.45, iterations:4 },
  'Pine':   { grammarType:'pine',  trunkRadius:0.18, trunkColor:'#3a2010', leafColor:'#1a5a2a', leafSize:0.3,  iterations:5 },
  'Willow': { grammarType:'willow',trunkRadius:0.20, trunkColor:'#4a3820', leafColor:'#4a8a2a', leafSize:0.5,  iterations:4 },
  'Fern':   { grammarType:'fern',  trunkRadius:0.08, trunkColor:'#2a4a18', leafColor:'#3a8a1a', leafSize:0.15, iterations:4 },
  'Dead':   { grammarType:'dead',  trunkRadius:0.20, trunkColor:'#3a2a18', leafColor:'#4a3a2a', leafSize:0.05, iterations:4 },
  'Shrub':  { grammarType:'shrub', trunkRadius:0.10, trunkColor:'#4a3a1a', leafColor:'#3a6a2a', leafSize:0.35, iterations:3 },
  'Forest': { grammarType:'oak',   trunkRadius:0.18, trunkColor:'#4a2a10', leafColor:'#2a6a2a', leafSize:0.4,  iterations:4, count:12, scatter:0.8 },
  'Autumn': { grammarType:'oak',   trunkRadius:0.20, trunkColor:'#5a3a1a', leafColor:'#cc6622', leafSize:0.45, iterations:4 },
};
