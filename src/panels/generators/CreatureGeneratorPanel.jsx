import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';

function Slider({label,value,min=0,max=1,step=0.01,onChange,unit=''}) {
  return <div style={{marginBottom:5}}>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#8b949e'}}>
      <span>{label}</span><span style={{color:'#00ffc8',fontWeight:700}}>{step<0.1?value.toFixed(2):Math.round(value)}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(parseFloat(e.target.value))} style={{width:'100%',accentColor:'#00ffc8',cursor:'pointer'}}/>
  </div>;
}
function ColorRow({label,value,onChange}) {
  return <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
    <span style={{fontSize:10,color:'#8b949e',flex:1}}>{label}</span>
    <input type="color" value={value} onChange={e=>onChange(e.target.value)} style={{width:32,height:22,border:'none',cursor:'pointer',borderRadius:3}}/>
  </div>;
}
function Section({title,children,defaultOpen=true}) {
  const [open,setOpen]=useState(defaultOpen);
  return <div style={{marginBottom:6,border:'1px solid #21262d',borderRadius:5,overflow:'hidden'}}>
    <div onClick={()=>setOpen(o=>!o)} style={{padding:'5px 8px',cursor:'pointer',background:'#0d1117',display:'flex',justifyContent:'space-between',fontSize:11,fontWeight:600,color:'#00ffc8',userSelect:'none'}}>
      <span>{title}</span><span style={{fontSize:9,opacity:0.7}}>{open?'▲':'▼'}</span>
    </div>
    {open&&<div style={{padding:'6px 8px',background:'#06060f'}}>{children}</div>}
  </div>;
}
function Badges({items,active,onSelect}) {
  return <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:6}}>
    {items.map(item=><button key={item} onClick={()=>onSelect(item)} style={{padding:'3px 8px',fontSize:9,borderRadius:4,cursor:'pointer',fontWeight:600,background:active===item?'#00ffc8':'#21262d',color:active===item?'#0d1117':'#8b949e',border:`1px solid ${active===item?'#00ffc8':'#30363d'}`}}>{item}</button>)}
  </div>;
}

const PRESETS = {
  "Dragon":   {bodyScale:1.0,bodyLen:0.85,headSz:0.55,neckLen:0.7,armLen:0.7,legLen:0.7,tailLen:0.9,horns:4,wings:0.9,spines:8,skinColor:"#4a1008",accentColor:"#cc3300",scaleDetail:true},
  "Kaiju":    {bodyScale:1.4,bodyLen:0.95,headSz:0.65,neckLen:0.5,armLen:0.8,legLen:0.8,tailLen:0.8,horns:6,wings:0.0,spines:10,skinColor:"#1a2a18",accentColor:"#00ff44",scaleDetail:true},
  "Demon":    {bodyScale:0.9,bodyLen:0.7, headSz:0.55,neckLen:0.4,armLen:0.8,legLen:0.65,tailLen:0.7,horns:3,wings:0.7,spines:5,skinColor:"#2a0808",accentColor:"#ff2200",scaleDetail:false},
  "Alien":    {bodyScale:0.7,bodyLen:0.6, headSz:0.75,neckLen:0.6,armLen:0.9,legLen:0.55,tailLen:0.4,horns:0,wings:0.0,spines:0,skinColor:"#0a1a14",accentColor:"#00ffaa",scaleDetail:false},
  "Werewolf": {bodyScale:0.95,bodyLen:0.7,headSz:0.65,neckLen:0.35,armLen:0.85,legLen:0.75,tailLen:0.55,horns:0,wings:0.0,spines:0,skinColor:"#1a1008",accentColor:"#3a1a08",scaleDetail:false},
  "Serpent":  {bodyScale:0.8,bodyLen:1.0, headSz:0.5, neckLen:0.9,armLen:0.0,legLen:0.0,tailLen:1.0,horns:2,wings:0.0,spines:6,skinColor:"#0a2a10",accentColor:"#44aa22",scaleDetail:true},
  "Mech":     {bodyScale:1.0,bodyLen:0.75,headSz:0.5, neckLen:0.3,armLen:0.8,legLen:0.7,tailLen:0.0,horns:0,wings:0.0,spines:0,skinColor:"#1a2a3a",accentColor:"#00aaff",scaleDetail:false},
};

// ── Smooth geometry helpers ───────────────────────────────────────────────────
function smoothSphere(r, segs=32) { return new THREE.SphereGeometry(r, segs, segs*0.75); }
function smoothCyl(rt, rb, h, segs=20) { return new THREE.CylinderGeometry(rt, rb, h, segs, 3); }
function smoothCone(r, h, segs=16) { return new THREE.ConeGeometry(r, h, segs, 4); }

function createLatheProfile(points, segs=24) {
  const pts = points.map(([x,y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, segs);
}

function buildOrganicTorso(sc, skinCol, accCol, bL, bG, baseY) {
  const meshes = [];
  // Use lathe for smooth organic torso
  const torsoProfile = [
    [bG*0.6, -bL*0.35],
    [bG*1.1, -bL*0.2],
    [bG*1.2,  bL*0.0],
    [bG*1.15, bL*0.1],
    [bG*1.0,  bL*0.2],
    [bG*0.8,  bL*0.28],
    [bG*0.6,  bL*0.35],
  ];
  const torsoGeo = createLatheProfile(torsoProfile, 20);
  const torsoMat = new THREE.MeshPhysicalMaterial({color:skinCol, roughness:0.75, metalness:0.05});
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = baseY; torso.castShadow = true;
  meshes.push(torso);

  // Chest muscle definition - two pectoral masses
  for(const sx of [-1,1]) {
    const pec = new THREE.Mesh(smoothSphere(bG*0.55, 16), new THREE.MeshPhysicalMaterial({color:skinCol,roughness:0.7,metalness:0.05}));
    pec.position.set(sx*bG*0.55, baseY+bL*0.1, bG*0.7);
    pec.scale.set(1,0.7,0.6); pec.castShadow=true;
    meshes.push(pec);
  }
  // Abs definition
  for(let row=0;row<3;row++) for(const sx of [-1,1]) {
    const ab = new THREE.Mesh(smoothSphere(bG*0.25,12), new THREE.MeshPhysicalMaterial({color:new THREE.Color(skinCol).multiplyScalar(0.8),roughness:0.8}));
    ab.position.set(sx*bG*0.35, baseY-bL*0.05-row*bG*0.28, bG*0.85);
    ab.scale.set(0.9, 0.6, 0.4); ab.castShadow=true;
    meshes.push(ab);
  }
  return meshes;
}

function buildOrganicHead(scene, sc, skinCol, accCol, hS, hy, preset) {
  const meshes = [];
  const mat = (c,r=0.65,me=0.05) => new THREE.MeshPhysicalMaterial({color:c,roughness:r,metalness:me});

  // Cranium - elongated for menacing look
  const crania = new THREE.Mesh(smoothSphere(hS, 28), mat(skinCol));
  crania.scale.set(0.9, 1.15, 1.1); crania.position.set(0, hy+hS*0.1, 0); crania.castShadow=true;
  meshes.push(crania);

  // Prominent brow ridge
  const browGeo = new THREE.BoxGeometry(hS*1.6, hS*0.28, hS*0.35);
  const brow = new THREE.Mesh(browGeo, mat(new THREE.Color(skinCol).multiplyScalar(0.7)));
  brow.position.set(0, hy+hS*0.35, hS*0.65);
  // Curve the brow
  const browPos = brow.geometry.attributes.position;
  for(let i=0;i<browPos.count;i++) {
    const x = browPos.getX(i);
    browPos.setZ(i, browPos.getZ(i) + Math.abs(x)*0.15);
  }
  brow.geometry.computeVertexNormals();
  brow.castShadow=true; meshes.push(brow);

  // Cheekbones - sharp and prominent
  for(const sx of [-1,1]) {
    const cheek = new THREE.Mesh(smoothSphere(hS*0.38,14), mat(new THREE.Color(skinCol).multiplyScalar(0.75)));
    cheek.position.set(sx*hS*0.72, hy-hS*0.08, hS*0.45);
    cheek.scale.set(0.6,0.55,0.85); cheek.castShadow=true;
    meshes.push(cheek);
  }

  // Jaw - wide and angular
  const jawGeo = createLatheProfile([[hS*0.1,-hS*0.3],[hS*0.5,-hS*0.15],[hS*0.6,hS*0.1],[hS*0.4,hS*0.25]], 14);
  const jaw = new THREE.Mesh(jawGeo, mat(new THREE.Color(skinCol).multiplyScalar(0.65)));
  jaw.position.set(0,hy-hS*0.2,0); jaw.castShadow=true; meshes.push(jaw);

  // Snout - elongated predator snout
  const snout = new THREE.Mesh(smoothSphere(hS*0.52,20), mat(skinCol));
  snout.scale.set(0.55, 0.45, 0.85);
  snout.position.set(0, hy-hS*0.18, hS*0.72); snout.castShadow=true;
  meshes.push(snout);

  // Nostrils
  for(const sx of [-1,1]) {
    const nos = new THREE.Mesh(smoothSphere(hS*0.09,8), mat(new THREE.Color(0x111111),0.9));
    nos.position.set(sx*hS*0.22, hy-hS*0.22, hS*1.02); meshes.push(nos);
  }

  // Eyes - deep-set predator eyes with glow
  for(const sx of [-1,1]) {
    const ex = sx*hS*0.42, ey = hy+hS*0.22, ez = hS*0.7;
    // Eye socket (dark recess)
    const socket = new THREE.Mesh(smoothSphere(hS*0.3,12), mat(new THREE.Color(0x080808),0.9));
    socket.position.set(ex, ey, ez-0.02); socket.scale.set(1,0.85,0.5); meshes.push(socket);
    // Iris with emissive glow
    const irisCol = preset==='Alien'?0x00ffaa:preset==='Mech'?0x00aaff:0xff4400;
    const iris = new THREE.Mesh(smoothSphere(hS*0.22,12), new THREE.MeshPhysicalMaterial({color:irisCol,emissive:new THREE.Color(irisCol),emissiveIntensity:0.6,roughness:0.1}));
    iris.position.set(ex, ey, ez+0.02); meshes.push(iris);
    // Slit pupil
    const pupil = new THREE.Mesh(smoothSphere(hS*0.1,10), mat(new THREE.Color(0x000000),0.0));
    pupil.position.set(ex, ey, ez+0.06); pupil.scale.set(0.4,1,1); meshes.push(pupil);
  }

  // Upper teeth/fangs
  for(let i=0;i<4;i++) {
    const fa = (i/3-0.5)*hS*0.7;
    const fang = new THREE.Mesh(smoothCone(hS*0.06, hS*0.22+i*0.01, 8), mat(new THREE.Color(0xeeeedd),0.2));
    fang.position.set(fa, hy-hS*0.35, hS*0.88);
    fang.rotation.x = -0.2; fang.castShadow=true; meshes.push(fang);
  }
  // Lower fangs (longer, protruding)
  for(const sx of [-1,1]) {
    const fang = new THREE.Mesh(smoothCone(hS*0.07, hS*0.3, 8), mat(new THREE.Color(0xeeeedd),0.2));
    fang.position.set(sx*hS*0.25, hy-hS*0.42, hS*0.82);
    fang.rotation.x = 0.3; fang.castShadow=true; meshes.push(fang);
  }

  return meshes;
}

function buildOrganicLimb(skinCol, upper, lower, thickness, digitigrade=true) {
  const meshes = [];
  const mat = new THREE.MeshPhysicalMaterial({color:skinCol, roughness:0.72, metalness:0.04});

  // Upper segment - tapered with muscle bulk
  const upperGeo = smoothCyl(thickness*1.1, thickness*0.85, upper, 16);
  const upperMesh = new THREE.Mesh(upperGeo, mat.clone());
  upperMesh.castShadow=true; meshes.push({mesh:upperMesh, offset:[0,0,0]});

  // Knee/elbow joint
  const joint = new THREE.Mesh(smoothSphere(thickness*0.9, 14), mat.clone());
  joint.castShadow=true; meshes.push({mesh:joint, offset:[0,-upper/2,0]});

  // Lower segment
  const lowerGeo = smoothCyl(thickness*0.85, thickness*0.6, lower, 14);
  const lowerMesh = new THREE.Mesh(lowerGeo, mat.clone());
  lowerMesh.castShadow=true; meshes.push({mesh:lowerMesh, offset:[0,-upper/2-lower/2,0]});

  return meshes;
}

function buildCreature(scene, p, meshesRef) {
  meshesRef.current.forEach(m=>{scene.remove(m);m.traverse?.(c=>{c.geometry?.dispose();c.material?.dispose();});});
  meshesRef.current=[];
  const ms=[];

  // Cinematic 3-point lighting
  if(!scene.getObjectByName('cr_key')){
    const key=new THREE.DirectionalLight(0xfff5e0,1.8); key.name='cr_key'; key.position.set(8,12,6); key.castShadow=true; key.shadow.mapSize.width=2048; key.shadow.mapSize.height=2048; scene.add(key); ms.push(key);
    const fill=new THREE.DirectionalLight(0x8899cc,0.5); fill.name='cr_fill'; fill.position.set(-6,4,-4); scene.add(fill); ms.push(fill);
    const rim=new THREE.DirectionalLight(0xff4400,0.4); rim.name='cr_rim'; rim.position.set(-2,8,-10); scene.add(rim); ms.push(rim);
    const amb=new THREE.AmbientLight(0x223344,0.3); amb.name='cr_amb'; scene.add(amb); ms.push(amb);
  }

  // Ground with reflection-like dark surface
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(50,50), new THREE.MeshPhysicalMaterial({color:0x080c10,roughness:0.8,metalness:0.2}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground); ms.push(ground);
  scene.add(new THREE.GridHelper(30,15,0x1a2a3a,0x111a22));

  const add=(mesh,x,y,z,rx=0,ry=0,rz=0)=>{mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);scene.add(mesh);ms.push(mesh);return mesh;};

  const sc=0.55+p.bodyScale*1.5;
  const bL=(0.45+p.bodyLen*0.85)*sc;
  const bG=0.26*sc;
  const hS=(0.16+p.headSz*0.28)*sc;
  const nL=(0.1+p.neckLen*0.38)*sc;
  const aL=(0.22+p.armLen*0.55)*sc;
  const lL=(0.32+p.legLen*0.65)*sc;
  const baseY=lL+bG*0.5;

  const skinCol=new THREE.Color(p.skinColor);
  const accCol=new THREE.Color(p.accentColor);
  const isMech = p.skinColor === '#1a2a3a';

  const mat=(c=skinCol,r=0.7,me=0.05)=>new THREE.MeshPhysicalMaterial({color:c,roughness:r,metalness:me});

  // ── TORSO ─────────────────────────────────────────────────────────────────
  const torsoMeshes = buildOrganicTorso(sc, skinCol, accCol, bL, bG, baseY);
  torsoMeshes.forEach(m=>{ scene.add(m); ms.push(m); });

  // ── NECK ──────────────────────────────────────────────────────────────────
  // Curved neck using tube geometry
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, baseY+bL*0.32, 0),
    new THREE.Vector3(0, baseY+bL*0.35+nL*0.4, bG*0.3),
    new THREE.Vector3(0, baseY+bL*0.35+nL, bG*0.5),
  ]);
  const neckGeo = new THREE.TubeGeometry(neckCurve, 12, bG*0.42, 12, false);
  const neck = new THREE.Mesh(neckGeo, mat(skinCol, 0.7));
  neck.castShadow=true; scene.add(neck); ms.push(neck);

  // Neck muscle strands
  for(const sx of [-1,1]) {
    const muscleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx*bG*0.3, baseY+bL*0.32, bG*0.1),
      new THREE.Vector3(sx*bG*0.25, baseY+bL*0.35+nL*0.5, bG*0.4),
      new THREE.Vector3(sx*hS*0.3, baseY+bL*0.35+nL+hS*0.5, bG*0.3),
    ]);
    const muscleGeo = new THREE.TubeGeometry(muscleCurve, 8, bG*0.15, 8, false);
    const muscle = new THREE.Mesh(muscleGeo, mat(new THREE.Color(skinCol).multiplyScalar(0.7)));
    muscle.castShadow=true; scene.add(muscle); ms.push(muscle);
  }

  // ── HEAD ──────────────────────────────────────────────────────────────────
  const hy=baseY+bL*0.35+nL+hS;
  const headMeshes = buildOrganicHead(scene, sc, skinCol, accCol, hS, hy, Object.keys(PRESETS).find(k=>PRESETS[k].skinColor===p.skinColor)||'Dragon');
  headMeshes.forEach(m=>{ scene.add(m); ms.push(m); });

  // ── ARMS ──────────────────────────────────────────────────────────────────
  if(p.armLen>0.05) {
    for(const sx of [-1,1]) {
      const shoulderX = sx*(bG*1.15);
      // Shoulder ball - large deltoid mass
      const shoulder = new THREE.Mesh(smoothSphere(bG*0.65,16), mat(skinCol,0.7));
      shoulder.position.set(shoulderX, baseY+bL*0.22, 0); shoulder.scale.set(0.85,0.75,0.8); shoulder.castShadow=true; scene.add(shoulder); ms.push(shoulder);

      // Bicep curve
      const bicepCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(shoulderX, baseY+bL*0.15, 0),
        new THREE.Vector3(shoulderX+sx*aL*0.15, baseY+bL*0.02, bG*0.1),
        new THREE.Vector3(shoulderX+sx*aL*0.28, baseY-bL*0.08, 0),
      ]);
      const bicepGeo = new THREE.TubeGeometry(bicepCurve, 10, bG*0.28, 12, false);
      const bicep = new THREE.Mesh(bicepGeo, mat(skinCol,0.7)); bicep.castShadow=true; scene.add(bicep); ms.push(bicep);

      // Forearm
      const forearmCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(shoulderX+sx*aL*0.28, baseY-bL*0.1, 0),
        new THREE.Vector3(shoulderX+sx*aL*0.42, baseY-bL*0.22, bG*0.05),
        new THREE.Vector3(shoulderX+sx*aL*0.52, baseY-bL*0.38, 0),
      ]);
      const forearmGeo = new THREE.TubeGeometry(forearmCurve, 10, bG*0.22, 10, false);
      const forearm = new THREE.Mesh(forearmGeo, mat(skinCol,0.72)); forearm.castShadow=true; scene.add(forearm); ms.push(forearm);

      // Hand/palm
      const hand = new THREE.Mesh(smoothSphere(bG*0.32,12), mat(skinCol,0.75));
      hand.position.set(shoulderX+sx*aL*0.55, baseY-bL*0.45, 0); hand.scale.set(1.1,0.7,0.6); hand.castShadow=true; scene.add(hand); ms.push(hand);

      // Claws - 3 curved claws
      for(let c=0;c<3;c++) {
        const ca=(c/2-0.5)*bG*0.5;
        const clawCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(shoulderX+sx*aL*0.55+ca, baseY-bL*0.46, bG*0.15),
          new THREE.Vector3(shoulderX+sx*aL*0.55+ca*0.5, baseY-bL*0.52, bG*0.35),
          new THREE.Vector3(shoulderX+sx*aL*0.55, baseY-bL*0.58, bG*0.4),
        ]);
        const clawGeo = new THREE.TubeGeometry(clawCurve, 6, bG*0.04+c*0.002, 6, false);
        const claw = new THREE.Mesh(clawGeo, mat(accCol,0.3,0.3)); claw.castShadow=true; scene.add(claw); ms.push(claw);
      }

      // Forearm spikes
      if(p.spines>2) {
        for(let i=0;i<3;i++) {
          const spike = new THREE.Mesh(smoothCone(bG*0.06, bG*0.35+i*0.02, 8), mat(accCol,0.35,0.1));
          spike.position.set(shoulderX+sx*aL*(0.3+i*0.07), baseY-bL*(0.12+i*0.08), -bG*0.28);
          spike.rotation.x=-0.6; spike.castShadow=true; scene.add(spike); ms.push(spike);
        }
      }
    }
  }

  // ── LEGS ──────────────────────────────────────────────────────────────────
  if(p.legLen>0.05) {
    for(const sx of [-1,1]) {
      const lx=sx*bG*0.85;
      // Hip mass
      const hip = new THREE.Mesh(smoothSphere(bG*0.6,14), mat(skinCol,0.75));
      hip.position.set(lx, baseY-bL*0.28, 0); hip.scale.set(0.9,0.85,0.85); hip.castShadow=true; scene.add(hip); ms.push(hip);

      // Thigh - thick with muscle definition
      const thighCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(lx, lL*0.9, 0),
        new THREE.Vector3(lx+sx*bG*0.1, lL*0.55, bG*0.1),
        new THREE.Vector3(lx, lL*0.42, 0),
      ]);
      const thighGeo = new THREE.TubeGeometry(thighCurve, 12, bG*0.38, 14, false);
      const thigh = new THREE.Mesh(thighGeo, mat(skinCol,0.72)); thigh.castShadow=true; scene.add(thigh); ms.push(thigh);

      // Knee spike
      const kneePt = new THREE.Mesh(smoothCone(bG*0.1, bG*0.4, 8), mat(accCol,0.3));
      kneePt.position.set(lx, lL*0.42, -bG*0.4); kneePt.rotation.x=0.6; kneePt.castShadow=true; scene.add(kneePt); ms.push(kneePt);

      // Shin - digitigrade bend
      const shinCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(lx, lL*0.42, 0),
        new THREE.Vector3(lx, lL*0.22, bG*0.15),
        new THREE.Vector3(lx, bG*0.2, bG*0.3),
      ]);
      const shinGeo = new THREE.TubeGeometry(shinCurve, 10, bG*0.28, 12, false);
      const shin = new THREE.Mesh(shinGeo, mat(skinCol,0.72)); shin.castShadow=true; scene.add(shin); ms.push(shin);

      // Foot with clawed toes
      const foot = new THREE.Mesh(smoothSphere(bG*0.38,12), mat(skinCol,0.75));
      foot.position.set(lx, bG*0.18, bG*0.38); foot.scale.set(0.8,0.5,1.2); foot.castShadow=true; scene.add(foot); ms.push(foot);
      for(let c=0;c<3;c++) {
        const toeAngle=(c/2-0.5)*0.4;
        const toeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(lx+Math.sin(toeAngle)*bG*0.2, bG*0.15, bG*0.4),
          new THREE.Vector3(lx+Math.sin(toeAngle)*bG*0.3, bG*0.05, bG*0.65),
          new THREE.Vector3(lx+Math.sin(toeAngle)*bG*0.28, bG*0.02, bG*0.85),
        ]);
        const toeGeo = new THREE.TubeGeometry(toeCurve, 5, bG*0.05, 6, false);
        const toe = new THREE.Mesh(toeGeo, mat(accCol,0.3)); toe.castShadow=true; scene.add(toe); ms.push(toe);
      }
    }
  }

  // ── TAIL ──────────────────────────────────────────────────────────────────
  if(p.tailLen>0.1) {
    const segs=16;
    const tailPts=[];
    for(let i=0;i<segs;i++) {
      const t=i/(segs-1);
      tailPts.push(new THREE.Vector3(
        Math.sin(t*Math.PI*0.4)*bG*0.8,
        baseY-bL*0.32-t*p.tailLen*1.8*sc,
        -t*p.tailLen*0.9*sc-bG*0.7
      ));
    }
    const tailCurve = new THREE.CatmullRomCurve3(tailPts);
    // Tail gets thinner toward tip
    const tailGeo = new THREE.TubeGeometry(tailCurve, segs*2, bG*0.45, 12, false);
    // Taper by modifying radius - use tube then scale
    const tail = new THREE.Mesh(tailGeo, mat(skinCol,0.72)); tail.castShadow=true; scene.add(tail); ms.push(tail);

    // Tail spines
    for(let i=0;i<Math.min(p.spines,8);i++) {
      const t=(i+1)/(p.spines+1);
      const pt=tailCurve.getPoint(t*0.7);
      const spine = new THREE.Mesh(smoothCone(bG*0.08, bG*0.5*(1-t*0.5), 8), mat(accCol,0.3,0.1));
      spine.position.copy(pt); spine.rotation.x=-0.5; spine.castShadow=true; scene.add(spine); ms.push(spine);
    }

    // Tail tip spike
    const tipPt = tailCurve.getPoint(1);
    const tipSpike = new THREE.Mesh(smoothCone(bG*0.12, bG*0.7, 10), mat(accCol,0.25,0.15));
    tipSpike.position.copy(tipPt); tipSpike.rotation.x=0.3; tipSpike.castShadow=true; scene.add(tipSpike); ms.push(tipSpike);
  }

  // ── WINGS ─────────────────────────────────────────────────────────────────
  if(p.wings>0.15) {
    const wS=p.wings*3.5*sc;
    for(const sx of [-1,1]) {
      // Wing membrane using custom BufferGeometry with smooth curves
      const wingPts = [
        new THREE.Vector3(0,0,0),
        new THREE.Vector3(sx*wS*0.3, wS*0.2, -wS*0.1),
        new THREE.Vector3(sx*wS*0.7, wS*0.1, -wS*0.3),
        new THREE.Vector3(sx*wS, -wS*0.1, -wS*0.5),
        new THREE.Vector3(sx*wS*0.8, -wS*0.5, -wS*0.3),
        new THREE.Vector3(sx*wS*0.4, -wS*0.4, 0),
        new THREE.Vector3(sx*wS*0.1, -wS*0.2, wS*0.1),
      ];
      // Triangulate wing
      const wGeo = new THREE.BufferGeometry();
      const verts=[], uvs=[];
      const origin=new THREE.Vector3(0,0,0);
      for(let i=0;i<wingPts.length-1;i++) {
        verts.push(origin.x,origin.y,origin.z, wingPts[i].x,wingPts[i].y,wingPts[i].z, wingPts[i+1].x,wingPts[i+1].y,wingPts[i+1].z);
        uvs.push(0,0, i/wingPts.length,0.5, (i+1)/wingPts.length,1);
      }
      wGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
      wGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
      wGeo.computeVertexNormals();
      const wMat=new THREE.MeshPhysicalMaterial({color:accCol,side:THREE.DoubleSide,transparent:true,opacity:0.82,roughness:0.55,metalness:0.05});
      const wing=new THREE.Mesh(wGeo,wMat);
      wing.position.set(sx*bG, baseY+bL*0.2, -bG*0.5); wing.castShadow=true; scene.add(wing); ms.push(wing);

      // Wing bones - 3 finger bones
      for(let b=0;b<3;b++) {
        const t=(b+1)/4;
        const boneCurve=new THREE.LineCurve3(new THREE.Vector3(sx*bG,baseY+bL*0.2,-bG*0.5), new THREE.Vector3(sx*bG+wingPts[b+1].x, baseY+bL*0.2+wingPts[b+1].y, -bG*0.5+wingPts[b+1].z));
        const boneGeo=new THREE.TubeGeometry(boneCurve, 4, bG*0.055, 6, false);
        const bone=new THREE.Mesh(boneGeo, mat(new THREE.Color(skinCol).multiplyScalar(0.6),0.6)); bone.castShadow=true; scene.add(bone); ms.push(bone);
      }
    }
  }

  // ── HORNS ─────────────────────────────────────────────────────────────────
  for(let i=0;i<Math.min(p.horns,6);i++) {
    const a=(i/Math.max(1,p.horns-1))*Math.PI*0.9-Math.PI*0.45;
    const hornBase=new THREE.Vector3(Math.cos(a)*hS*0.58, hy+hS*0.85, Math.sin(a)*hS*0.25);
    // Curved horn using tube
    const hornCurve=new THREE.CatmullRomCurve3([
      hornBase,
      new THREE.Vector3(hornBase.x*1.1, hornBase.y+hS*0.4, hornBase.z-hS*0.1),
      new THREE.Vector3(hornBase.x*0.9, hornBase.y+hS*0.9, hornBase.z-hS*0.15),
    ]);
    const hornGeo=new THREE.TubeGeometry(hornCurve, 8, hS*(0.09-i*0.008), 8, false);
    const horn=new THREE.Mesh(hornGeo, mat(accCol,0.35,0.15)); horn.castShadow=true; scene.add(horn); ms.push(horn);
  }

  // ── BACK SPINES ───────────────────────────────────────────────────────────
  for(let i=0;i<p.spines;i++) {
    const t=i/Math.max(1,p.spines-1);
    const sy=baseY+bL*0.28-t*bL*0.6;
    const spineH=bG*(0.6-t*0.3);
    const spineCurve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, sy, -bG*0.55),
      new THREE.Vector3(0, sy+spineH*0.5, -bG*0.7),
      new THREE.Vector3(0, sy+spineH, -bG*0.6),
    ]);
    const spineGeo=new THREE.TubeGeometry(spineCurve, 5, bG*(0.065-t*0.02), 7, false);
    const spine=new THREE.Mesh(spineGeo, mat(accCol,0.3,0.1)); spine.castShadow=true; scene.add(spine); ms.push(spine);
  }

  // ── MECH DETAILS ──────────────────────────────────────────────────────────
  if(isMech) {
    // Panel lines and mechanical details
    for(let i=0;i<6;i++) {
      const panel=new THREE.Mesh(new THREE.BoxGeometry(bG*0.15,bL*0.08,bG*0.05), new THREE.MeshPhysicalMaterial({color:0x00aaff,emissive:0x0066aa,emissiveIntensity:0.8,roughness:0.1,metalness:0.9}));
      panel.position.set((i%2===0?1:-1)*bG*(0.8+Math.random()*0.3), baseY+bL*(0.2-i*0.08), bG*0.9);
      scene.add(panel); ms.push(panel);
    }
  }

  meshesRef.current=ms;
  return ms.filter(m=>m.isMesh).length;
}

export default function CreatureGeneratorPanel({ sceneRef, setStatus, onGenerate }) {
  const scene=sceneRef?.current;
  const meshesRef=useRef([]);
  const [activePreset, setActivePreset]=useState("Dragon");
  const [bodyScale,    setBodyScale]=useState(1.0);
  const [bodyLen,      setBodyLen]=useState(0.85);
  const [headSz,       setHeadSz]=useState(0.55);
  const [neckLen,      setNeckLen]=useState(0.7);
  const [armLen,       setArmLen]=useState(0.7);
  const [legLen,       setLegLen]=useState(0.7);
  const [tailLen,      setTailLen]=useState(0.9);
  const [horns,        setHorns]=useState(4);
  const [wings,        setWings]=useState(0.9);
  const [spines,       setSpines]=useState(8);
  const [skinColor,    setSkinColor]=useState("#4a1008");
  const [accentColor,  setAccentColor]=useState("#cc3300");

  function getParams(){return{bodyScale,bodyLen,headSz,neckLen,armLen,legLen,tailLen,horns,wings,spines,skinColor,accentColor};}

  function applyPreset(name){
    const p=PRESETS[name];if(!p)return;setActivePreset(name);
    setBodyScale(p.bodyScale);setBodyLen(p.bodyLen);setHeadSz(p.headSz);setNeckLen(p.neckLen);
    setArmLen(p.armLen);setLegLen(p.legLen);setTailLen(p.tailLen);setHorns(p.horns);
    setWings(p.wings);setSpines(p.spines);setSkinColor(p.skinColor);setAccentColor(p.accentColor);
    if(sceneRef?.current) setTimeout(()=>buildCreature(sceneRef.current,{...p},meshesRef),10);
  }

  function generate(){
    if(!scene){setStatus?.('No scene');return;}
    const n=buildCreature(scene,getParams(),meshesRef);
    setStatus?.(`✓ ${activePreset} — ${n} parts`);
    onGenerate?.(getParams());
  }

  function clear(){meshesRef.current.forEach(m=>{scene?.remove(m);m.traverse?.(c=>{c.geometry?.dispose();c.material?.dispose();});});meshesRef.current=[];setStatus?.('Cleared');}

  const randomize=useCallback(()=>{
    const keys=Object.keys(PRESETS);applyPreset(keys[Math.floor(Math.random()*keys.length)]);
  },[]);

  useEffect(()=>{applyPreset("Dragon");},[]);
  useEffect(()=>{if(sceneRef?.current)buildCreature(sceneRef.current,getParams(),meshesRef);},[bodyScale,bodyLen,headSz,neckLen,armLen,legLen,tailLen,horns,wings,spines,skinColor,accentColor]);

  const P={fontFamily:'JetBrains Mono,monospace',color:'#e0e0e0',fontSize:12,userSelect:'none',width:'100%'};
  return (
    <div style={P}>
      <Section title="👾 Presets"><Badges items={Object.keys(PRESETS)} active={activePreset} onSelect={applyPreset}/></Section>
      <Section title="🧬 Body">
        <Slider label="Body Scale"  value={bodyScale} onChange={setBodyScale}/>
        <Slider label="Body Length" value={bodyLen}   onChange={setBodyLen}/>
        <Slider label="Head Size"   value={headSz}    onChange={setHeadSz}/>
        <Slider label="Neck Length" value={neckLen}   onChange={setNeckLen}/>
      </Section>
      <Section title="💪 Limbs">
        <Slider label="Arm Length"  value={armLen}  onChange={setArmLen}/>
        <Slider label="Leg Length"  value={legLen}  onChange={setLegLen}/>
        <Slider label="Tail Length" value={tailLen} onChange={setTailLen}/>
      </Section>
      <Section title="✨ Features">
        <Slider label="Wings"  value={wings}  onChange={setWings}/>
        <Slider label="Horns"  value={horns}  min={0} max={6} step={1} onChange={setHorns}/>
        <Slider label="Spines" value={spines} min={0} max={12} step={1} onChange={setSpines}/>
      </Section>
      <Section title="🎨 Colors">
        <ColorRow label="Skin Color"   value={skinColor}   onChange={setSkinColor}/>
        <ColorRow label="Accent Color" value={accentColor} onChange={setAccentColor}/>
      </Section>
      <div style={{display:'flex',gap:6,marginTop:8}}>
        <button onClick={randomize} style={{background:'#1a1f2c',color:'#888',border:'1px solid #21262d',borderRadius:4,padding:'6px 10px',cursor:'pointer',fontSize:11}}>🎲</button>
        <button onClick={generate} style={{flex:1,background:'#00ffc8',color:'#06060f',border:'none',borderRadius:4,padding:'7px 0',cursor:'pointer',fontWeight:700,fontSize:12}}>⚡ Generate Creature</button>
      </div>
      <button onClick={clear} style={{width:'100%',marginTop:6,background:'#1a1f2c',color:'#ff4444',border:'1px solid #ff4444',borderRadius:4,padding:'5px 0',cursor:'pointer',fontSize:11}}>🗑 Clear</button>
    </div>
  );
}
