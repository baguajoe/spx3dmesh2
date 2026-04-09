
import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";

const T={bg:"#06060f",panel:"#0d0d1a",border:"#1a1a2e",teal:"#00ffc8",orange:"#FF6600",text:"#e0e0e0",muted:"#aaa",font:"JetBrains Mono,monospace"};
const S={
  root:{background:T.bg,color:T.text,fontFamily:T.font,padding:16,height:"100%",overflowY:"auto"},
  h2:{color:T.teal,fontSize:14,marginBottom:12,letterSpacing:1},
  h3:{color:T.orange,fontSize:12,marginBottom:8,marginTop:8},
  lbl:{fontSize:11,color:T.muted,display:"block",marginBottom:4},
  btn:{background:T.teal,color:T.bg,border:"none",borderRadius:4,padding:"6px 14px",fontFamily:T.font,fontSize:11,fontWeight:700,cursor:"pointer",marginRight:6,marginBottom:6},
  btnO:{background:T.orange,color:"#fff",border:"none",borderRadius:4,padding:"6px 14px",fontFamily:T.font,fontSize:11,fontWeight:700,cursor:"pointer",marginRight:6,marginBottom:6},
  btnSm:{background:T.panel,color:T.teal,border:"1px solid "+T.teal,borderRadius:4,padding:"3px 8px",fontFamily:T.font,fontSize:10,cursor:"pointer",marginRight:4,marginBottom:4},
  sec:{background:T.panel,border:"1px solid "+T.border,borderRadius:6,padding:12,marginBottom:12},
  stat:{fontSize:11,color:T.teal,marginBottom:4},
  meshRow:(sel)=>({display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",borderRadius:4,marginBottom:3,background:sel?"#001a14":"transparent",border:"1px solid "+(sel?T.teal:"transparent"),cursor:"pointer"}),
  meshName:(sel)=>({fontSize:11,color:sel?T.teal:T.text,fontWeight:sel?700:400}),
  tag:{fontSize:9,color:T.orange,background:"#1a0800",border:"1px solid "+T.orange,borderRadius:3,padding:"1px 4px",marginLeft:4},
};

export default function CharacterTargetingPanel({ scene, onTargetChange }) {
  const [meshList, setMeshList]     = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filterText, setFilterText] = useState("");
  const [showAll, setShowAll]       = useState(false);
  const outlineRef = useRef(null);

  // Scan scene for meshes
  function scanScene() {
    if (!scene) return;
    const found = [];
    scene.traverse(obj => {
      if (!obj.isMesh) return;
      found.push({
        id:       obj.uuid,
        name:     obj.name || `Mesh_${found.length}`,
        hasSkeleton: !!obj.skeleton,
        hasMorphs:   !!(obj.morphTargetInfluences?.length),
        polyCount:   obj.geometry?.attributes?.position?.count || 0,
        userData:    obj.userData,
      });
    });
    setMeshList(found);
  }

  useEffect(() => { scanScene(); }, [scene]);

  function selectMesh(id) {
    setSelectedId(id);
    if (!scene) return;
    // Highlight selected
    scene.traverse(obj => {
      if (!obj.isMesh) return;
      if (obj.uuid === id) {
        obj.userData.spxSelected = true;
        // Add outline effect via emissive
        if (obj.material) {
          obj.material.emissive = new THREE.Color(0x003322);
          obj.material.emissiveIntensity = 0.3;
          obj.material.needsUpdate = true;
        }
        onTargetChange && onTargetChange({ mesh: obj, name: obj.name, uuid: obj.uuid, skeleton: obj.skeleton });
      } else {
        if (obj.userData.spxSelected) {
          obj.userData.spxSelected = false;
          if (obj.material) {
            obj.material.emissive = new THREE.Color(0x000000);
            obj.material.emissiveIntensity = 0;
            obj.material.needsUpdate = true;
          }
        }
      }
    });
  }

  function clearSelection() {
    setSelectedId(null);
    scene?.traverse(obj => {
      if (obj.isMesh && obj.material) {
        obj.material.emissive = new THREE.Color(0x000000);
        obj.material.emissiveIntensity = 0;
        obj.material.needsUpdate = true;
        obj.userData.spxSelected = false;
      }
    });
    onTargetChange && onTargetChange(null);
  }

  function tagAsCharacter(id) {
    scene?.traverse(obj => {
      if (obj.isMesh && obj.uuid === id) {
        obj.userData.isCharacter = true;
        obj.name = obj.name || "Character";
      }
    });
    scanScene();
  }

  const filtered = meshList.filter(m =>
    (showAll || m.hasSkeleton || m.hasMorphs || m.userData?.isCharacter) &&
    m.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const selected = meshList.find(m => m.id === selectedId);

  return (
    <div style={S.root}>
      <div style={S.h2}>🎯 CHARACTER TARGETING</div>

      <div style={S.sec}>
        <div style={S.stat}>
          {selectedId ? `✓ Target: ${selected?.name}` : "No target selected — click mesh below"}
        </div>
        {selectedId && (
          <div style={{marginBottom:8}}>
            {selected?.hasSkeleton && <span style={S.tag}>RIGGED</span>}
            {selected?.hasMorphs   && <span style={S.tag}>MORPHS</span>}
            {selected?.userData?.isCharacter && <span style={S.tag}>CHARACTER</span>}
            <div style={{fontSize:10,color:T.muted,marginTop:4}}>{selected?.polyCount?.toLocaleString()} verts</div>
          </div>
        )}
        <button style={S.btn} onClick={scanScene}>🔍 Scan Scene</button>
        {selectedId && <button style={S.btnO} onClick={clearSelection}>✕ Clear Target</button>}
      </div>

      <div style={S.sec}>
        <input
          style={{...S.stat,width:"100%",background:T.panel,border:"1px solid "+T.border,color:T.text,padding:"4px 8px",borderRadius:4,fontFamily:T.font,fontSize:11,marginBottom:8,boxSizing:"border-box"}}
          placeholder="Filter meshes..."
          value={filterText}
          onChange={e=>setFilterText(e.target.value)}
        />
        <label style={{...S.lbl,cursor:"pointer",marginBottom:8}}>
          <input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/> Show all meshes
        </label>

        {filtered.length === 0 && (
          <div style={{fontSize:11,color:T.muted}}>
            {showAll ? "No meshes in scene" : "No rigged/morph meshes found — enable 'Show all meshes'"}
          </div>
        )}

        {filtered.map(m => (
          <div key={m.id} style={S.meshRow(m.id===selectedId)} onClick={()=>selectMesh(m.id)}>
            <div>
              <span style={S.meshName(m.id===selectedId)}>{m.name}</span>
              {m.hasSkeleton && <span style={S.tag}>RIG</span>}
              {m.hasMorphs   && <span style={S.tag}>MORPH</span>}
              {m.userData?.isCharacter && <span style={S.tag}>CHAR</span>}
            </div>
            <button style={S.btnSm} onClick={e=>{e.stopPropagation();tagAsCharacter(m.id);}}>Tag</button>
          </div>
        ))}
      </div>

      <div style={S.sec}>
        <div style={S.h3}>How to Use</div>
        <div style={{fontSize:10,color:"#888",lineHeight:1.7}}>
          1. Click "Scan Scene" to list meshes<br/>
          2. Click a mesh to select it as target<br/>
          3. Open any generator panel — it will apply to this mesh only<br/>
          4. "Tag" marks a mesh as a character for quick filtering<br/>
          5. Import GLB/FBX → scan → select → apply generators<br/>
          6. Rigged meshes show RIG tag — generators pass skeleton prop
        </div>
      </div>
    </div>
  );
}
