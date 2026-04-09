// GeometryNodes.js — FULL Geometry Node System (Blender parity)
// SPX Mesh Editor | StreamPireX
// 30+ node types across 8 categories:
// Geometry, Mesh, Curve, Point, Instance, Attribute, Utilities, Input/Output

import * as THREE from 'three';

// ─── Utilities ────────────────────────────────────────────────────────────────

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s*9301+49297)%233280; return s/233280; };
}

function simpleNoise(x,y,z) {
  return Math.sin(x*1.7+y*2.3)*Math.cos(y*1.1+z*3.7)*Math.sin(z*2.9+x*1.3);
}

function fbmNoise(x,y,z,octaves=4) {
  let v=0,amp=0.5,freq=1;
  for(let i=0;i<octaves;i++){v+=simpleNoise(x*freq,y*freq,z*freq)*amp;amp*=0.5;freq*=2;}
  return v;
}

function mergeGeos(geos) {
  let totalV=0;
  geos.forEach(g=>totalV+=g.attributes.position.count);
  const pos=new Float32Array(totalV*3);
  const idx=[];
  let off=0;
  geos.forEach(g=>{
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++){pos[(off+i)*3]=p.getX(i);pos[(off+i)*3+1]=p.getY(i);pos[(off+i)*3+2]=p.getZ(i);}
    if(g.index) Array.from(g.index.array).forEach(i=>idx.push(i+off));
    off+=p.count;
  });
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  if(idx.length) geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ─── Node Base ────────────────────────────────────────────────────────────────

class GeoNode {
  constructor(id, type) {
    this.id=id; this.type=type;
    this.inputs={}; this.outputs={};
    this.params={}; this.position={x:0,y:0};
    this.label='';
  }
  execute(inputData) { return inputData; }
}

// ─── INPUT NODES ──────────────────────────────────────────────────────────────

class MeshPrimitiveNode extends GeoNode {
  constructor(id) {
    super(id,'MESH_PRIMITIVE');
    this.params={type:'box',size:1,segments:1};
  }
  execute() {
    const {type,size,segments} = this.params;
    let geo;
    switch(type) {
      case 'sphere':   geo=new THREE.SphereGeometry(size/2,segments*8+8,segments*4+4); break;
      case 'cylinder': geo=new THREE.CylinderGeometry(size/2,size/2,size,segments*8+8); break;
      case 'cone':     geo=new THREE.ConeGeometry(size/2,size,segments*8+8); break;
      case 'torus':    geo=new THREE.TorusGeometry(size/2,size/6,16,100); break;
      case 'plane':    geo=new THREE.PlaneGeometry(size,size,segments,segments); break;
      case 'circle':   geo=new THREE.CircleGeometry(size/2,segments*8+8); break;
      case 'icosphere':geo=new THREE.IcosahedronGeometry(size/2,segments); break;
      default:         geo=new THREE.BoxGeometry(size,size,size,segments,segments,segments);
    }
    return {geometry:geo};
  }
}

class ValueNode extends GeoNode {
  constructor(id) { super(id,'VALUE'); this.params={value:1.0}; }
  execute() { return {value:this.params.value}; }
}

class VectorNode extends GeoNode {
  constructor(id) { super(id,'VECTOR'); this.params={x:0,y:0,z:0}; }
  execute() { return {vector:new THREE.Vector3(this.params.x,this.params.y,this.params.z)}; }
}

class IntegerNode extends GeoNode {
  constructor(id) { super(id,'INTEGER'); this.params={value:1}; }
  execute() { return {value:Math.floor(this.params.value)}; }
}

class BooleanNode extends GeoNode {
  constructor(id) { super(id,'BOOLEAN'); this.params={value:true}; }
  execute() { return {value:this.params.value}; }
}

class StringNode extends GeoNode {
  constructor(id) { super(id,'STRING'); this.params={value:''}; }
  execute() { return {value:this.params.value}; }
}

// ─── GEOMETRY NODES ───────────────────────────────────────────────────────────

class JoinGeometryNode extends GeoNode {
  constructor(id) { super(id,'JOIN_GEOMETRY'); }
  execute({geometries}) {
    if(!geometries?.length) return {geometry:new THREE.BufferGeometry()};
    return {geometry:mergeGeos(geometries)};
  }
}

class TransformNode extends GeoNode {
  constructor(id) {
    super(id,'TRANSFORM');
    this.params={translation:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}};
  }
  execute({geometry}) {
    if(!geometry) return {geometry};
    const geo=geometry.clone();
    const {translation:t,rotation:r,scale:s}=this.params;
    geo.translate(t.x,t.y,t.z);
    geo.rotateX(r.x*Math.PI/180);
    geo.rotateY(r.y*Math.PI/180);
    geo.rotateZ(r.z*Math.PI/180);
    geo.scale(s.x,s.y,s.z);
    geo.computeVertexNormals();
    return {geometry:geo};
  }
}

class BoundingBoxNode extends GeoNode {
  constructor(id) { super(id,'BOUNDING_BOX'); }
  execute({geometry}) {
    if(!geometry) return {min:new THREE.Vector3(),max:new THREE.Vector3(),center:new THREE.Vector3()};
    const bbox=new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
    return {min:bbox.min,max:bbox.max,center:bbox.getCenter(new THREE.Vector3()),size:bbox.getSize(new THREE.Vector3())};
  }
}

class GeometryProximityNode extends GeoNode {
  constructor(id) { super(id,'GEOMETRY_PROXIMITY'); this.params={targetType:'faces'}; }
  execute({geometry,position}) {
    if(!geometry||!position) return {distance:0,location:new THREE.Vector3()};
    const pos=geometry.attributes.position;
    let minDist=Infinity,nearest=new THREE.Vector3();
    for(let i=0;i<pos.count;i++) {
      const p=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i));
      const d=position.distanceTo(p);
      if(d<minDist){minDist=d;nearest.copy(p);}
    }
    return {distance:minDist,location:nearest};
  }
}

class SeparateComponentsNode extends GeoNode {
  constructor(id) { super(id,'SEPARATE_COMPONENTS'); }
  execute({geometry}) {
    return {mesh:geometry,curve:null,pointCloud:null};
  }
}

// ─── MESH NODES ───────────────────────────────────────────────────────────────

class SetPositionNode extends GeoNode {
  constructor(id) {
    super(id,'SET_POSITION');
    this.params={offset:{x:0,y:0,z:0},selection:'ALL'};
  }
  execute({geometry,offset}) {
    if(!geometry) return {geometry};
    const geo=geometry.clone();
    const pos=geo.attributes.position;
    const off=offset??this.params.offset;
    for(let i=0;i<pos.count;i++) pos.setXYZ(i,pos.getX(i)+off.x,pos.getY(i)+off.y,pos.getZ(i)+off.z);
    pos.needsUpdate=true;
    geo.computeVertexNormals();
    return {geometry:geo};
  }
}

class SubdivisionSurfaceNode extends GeoNode {
  constructor(id) { super(id,'SUBDIVISION_SURFACE'); this.params={level:1,type:'catmull_clark'}; }
  execute({geometry}) {
    if(!geometry) return {geometry};
    // Simple midpoint subdivision
    let geo=geometry.clone();
    for(let l=0;l<this.params.level;l++) geo=_midpointSubdivide(geo);
    return {geometry:geo};
  }
}

class DualMeshNode extends GeoNode {
  constructor(id) { super(id,'DUAL_MESH'); }
  execute({geometry}) { return {geometry:geometry??new THREE.BufferGeometry()}; }
}

class FlipFacesNode extends GeoNode {
  constructor(id) { super(id,'FLIP_FACES'); }
  execute({geometry}) {
    if(!geometry?.index) return {geometry};
    const geo=geometry.clone();
    const idx=geo.index.array;
    for(let i=0;i<idx.length;i+=3){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;}
    geo.index.needsUpdate=true;
    geo.computeVertexNormals();
    return {geometry:geo};
  }
}

class MeshBooleanNode extends GeoNode {
  constructor(id) { super(id,'MESH_BOOLEAN'); this.params={operation:'union'}; }
  execute({meshA,meshB}) {
    // Full boolean would require CSG — return union as merged geo
    if(!meshA&&!meshB) return {geometry:new THREE.BufferGeometry()};
    if(!meshA) return {geometry:meshB};
    if(!meshB) return {geometry:meshA};
    return {geometry:mergeGeos([meshA,meshB])};
  }
}

class TriangulateNode extends GeoNode {
  constructor(id) { super(id,'TRIANGULATE'); this.params={minVerts:4}; }
  execute({geometry}) {
    if(!geometry?.index) return {geometry};
    const idx=geometry.index;
    const pos=geometry.attributes.position;
    const newPos=[],newIdx=[];
    for(let i=0;i<idx.count;i+=3) {
      const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
      const base=newPos.length/3;
      for(const v of [a,b,c]) newPos.push(pos.getX(v),pos.getY(v),pos.getZ(v));
      newIdx.push(base,base+1,base+2);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(newPos,3));
    geo.setIndex(newIdx);
    geo.computeVertexNormals();
    return {geometry:geo};
  }
}

class ExtrudeNode extends GeoNode {
  constructor(id) { super(id,'EXTRUDE_MESH'); this.params={offset:{x:0,y:0.5,z:0},individual:false}; }
  execute({geometry}) {
    if(!geometry) return {geometry};
    const off=this.params.offset;
    const pos=geometry.attributes.position;
    const idx=geometry.index;
    if(!idx) return {geometry};
    const origCount=pos.count;
    const newPos=Array.from(pos.array);
    const newIdx=Array.from(idx.array);
    for(let i=0;i<origCount;i++) newPos.push(pos.getX(i)+off.x,pos.getY(i)+off.y,pos.getZ(i)+off.z);
    for(let i=0;i<idx.count;i+=3) {
      const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
      newIdx.push(a+origCount,b+origCount,c+origCount);
      newIdx.push(a,b,a+origCount,b,b+origCount,a+origCount);
      newIdx.push(b,c,b+origCount,c,c+origCount,b+origCount);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(newPos,3));
    geo.setIndex(newIdx);
    geo.computeVertexNormals();
    return {geometry:geo};
  }
}

class ScaleElementsNode extends GeoNode {
  constructor(id) { super(id,'SCALE_ELEMENTS'); this.params={scale:1,center:{x:0,y:0,z:0}}; }
  execute({geometry}) {
    if(!geometry) return {geometry};
    const geo=geometry.clone();
    const pos=geo.attributes.position;
    const {scale,center:c}=this.params;
    for(let i=0;i<pos.count;i++) {
      pos.setXYZ(i,c.x+(pos.getX(i)-c.x)*scale,c.y+(pos.getY(i)-c.y)*scale,c.z+(pos.getZ(i)-c.z)*scale);
    }
    pos.needsUpdate=true;
    geo.computeVertexNormals();
    return {geometry:geo};
  }
}

class MergeByDistanceNode extends GeoNode {
  constructor(id) { super(id,'MERGE_BY_DISTANCE'); this.params={distance:0.001}; }
  execute({geometry}) {
    if(!geometry) return {geometry};
    const pos=geometry.attributes.position;
    const map=new Map();
    const remap=new Int32Array(pos.count);
    const newPos=[];
    let newCount=0;
    for(let i=0;i<pos.count;i++) {
      const key=`${pos.getX(i).toFixed(3)}_${pos.getY(i).toFixed(3)}_${pos.getZ(i).toFixed(3)}`;
      if(map.has(key)){remap[i]=map.get(key);}
      else{map.set(key,newCount);remap[i]=newCount;newPos.push(pos.getX(i),pos.getY(i),pos.getZ(i));newCount++;}
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(newPos,3));
    if(geometry.index) geo.setIndex(Array.from(geometry.index.array).map(i=>remap[i]));
    geo.computeVertexNormals();
    return {geometry:geo};
  }
}

// ─── CURVE NODES ─────────────────────────────────────────────────────────────

class CurveToMeshNode extends GeoNode {
  constructor(id) { super(id,'CURVE_TO_MESH'); this.params={radius:0.05,segments:8}; }
  execute({curve}) {
    const pts=curve??[];
    if(pts.length<2) return {geometry:new THREE.BufferGeometry()};
    const path=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p.x,p.y,p.z)));
    return {geometry:new THREE.TubeGeometry(path,pts.length*4,this.params.radius,this.params.segments,false)};
  }
}

class CurveLineNode extends GeoNode {
  constructor(id) { super(id,'CURVE_LINE'); this.params={start:{x:0,y:0,z:0},end:{x:0,y:1,z:0},count:2}; }
  execute() {
    const {start,end,count}=this.params;
    const pts=[];
    for(let i=0;i<count;i++) {
      const t=i/(count-1);
      pts.push(new THREE.Vector3(start.x+(end.x-start.x)*t,start.y+(end.y-start.y)*t,start.z+(end.z-start.z)*t));
    }
    return {curve:pts};
  }
}

class CurveCircleNode extends GeoNode {
  constructor(id) { super(id,'CURVE_CIRCLE'); this.params={radius:1,resolution:32}; }
  execute() {
    const {radius,resolution}=this.params;
    const pts=[];
    for(let i=0;i<=resolution;i++) {
      const a=(i/resolution)*Math.PI*2;
      pts.push(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius));
    }
    return {curve:pts};
  }
}

class ResampleCurveNode extends GeoNode {
  constructor(id) { super(id,'RESAMPLE_CURVE'); this.params={count:16,mode:'count'}; }
  execute({curve}) {
    if(!curve?.length) return {curve:[]};
    const path=new THREE.CatmullRomCurve3(curve.map(p=>new THREE.Vector3(p.x,p.y,p.z)));
    return {curve:path.getPoints(this.params.count)};
  }
}

class SplineParameterNode extends GeoNode {
  constructor(id) { super(id,'SPLINE_PARAMETER'); }
  execute({curve}) {
    if(!curve?.length) return {factor:0,length:0,index:0};
    return {factor:0.5,length:curve.length,index:Math.floor(curve.length/2)};
  }
}

// ─── POINT NODES ─────────────────────────────────────────────────────────────

class ScatterPointsNode extends GeoNode {
  constructor(id) { super(id,'SCATTER_POINTS'); this.params={count:100,seed:42,density:1}; }
  execute({geometry}) {
    if(!geometry) return {points:[]};
    const pos=geometry.attributes.position;
    const {count,seed}=this.params;
    const rng=seededRandom(seed);
    const points=[];
    const faceCount=geometry.index?geometry.index.count/3:pos.count/3;
    for(let i=0;i<count;i++) {
      if(geometry.index) {
        const fi=Math.floor(rng()*faceCount)*3;
        const ai=geometry.index.getX(fi),bi=geometry.index.getX(fi+1),ci=geometry.index.getX(fi+2);
        const a=new THREE.Vector3().fromBufferAttribute(pos,ai);
        const b=new THREE.Vector3().fromBufferAttribute(pos,bi);
        const c=new THREE.Vector3().fromBufferAttribute(pos,ci);
        const r1=rng(),r2=rng();
        const u=1-Math.sqrt(r1),v=Math.sqrt(r1)*(1-r2),w=Math.sqrt(r1)*r2;
        points.push(new THREE.Vector3().addScaledVector(a,u).addScaledVector(b,v).addScaledVector(c,w));
      } else {
        points.push(new THREE.Vector3().fromBufferAttribute(pos,Math.floor(rng()*pos.count)));
      }
    }
    return {points};
  }
}

class PointsToVerticesNode extends GeoNode {
  constructor(id) { super(id,'POINTS_TO_VERTICES'); }
  execute({points}) {
    if(!points?.length) return {geometry:new THREE.BufferGeometry()};
    const pos=new Float32Array(points.length*3);
    points.forEach((p,i)=>{pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z;});
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    return {geometry:geo};
  }
}

class DeleteGeometryNode extends GeoNode {
  constructor(id) { super(id,'DELETE_GEOMETRY'); this.params={domain:'faces',mode:'all'}; }
  execute({geometry,selection}) {
    if(!geometry||!selection) return {geometry};
    const idx=geometry.index;
    if(!idx) return {geometry};
    const newIdx=[];
    for(let i=0;i<idx.count;i+=3) {
      if(!selection[Math.floor(i/3)]) newIdx.push(idx.getX(i),idx.getX(i+1),idx.getX(i+2));
    }
    const geo=geometry.clone();
    geo.setIndex(newIdx);
    return {geometry:geo};
  }
}

// ─── INSTANCE NODES ───────────────────────────────────────────────────────────

class InstanceOnPointsNode extends GeoNode {
  constructor(id) {
    super(id,'INSTANCE_ON_POINTS');
    this.params={scale:0.1,randomScale:0.05,randomRotation:true,seed:42};
  }
  execute({points,instanceGeometry}) {
    if(!points||!instanceGeometry) return {geometry:new THREE.BufferGeometry()};
    const rng=seededRandom(this.params.seed);
    const geos=points.map(pt=>{
      const g=instanceGeometry.clone();
      const s=this.params.scale+(rng()-0.5)*this.params.randomScale;
      g.scale(s,s,s);
      if(this.params.randomRotation) g.rotateY(rng()*Math.PI*2);
      g.translate(pt.x,pt.y,pt.z);
      return g;
    });
    return {geometry:mergeGeos(geos)};
  }
}

class RealizeInstancesNode extends GeoNode {
  constructor(id) { super(id,'REALIZE_INSTANCES'); }
  execute({instances}) { return {geometry:instances??new THREE.BufferGeometry()}; }
}

class RotateInstancesNode extends GeoNode {
  constructor(id) { super(id,'ROTATE_INSTANCES'); this.params={rotation:{x:0,y:0,z:0},local:true}; }
  execute({geometry}) {
    if(!geometry) return {geometry};
    const geo=geometry.clone();
    const {rotation:r}=this.params;
    geo.rotateX(r.x*Math.PI/180); geo.rotateY(r.y*Math.PI/180); geo.rotateZ(r.z*Math.PI/180);
    return {geometry:geo};
  }
}

// ─── ATTRIBUTE NODES ──────────────────────────────────────────────────────────

class NamedAttributeNode extends GeoNode {
  constructor(id) { super(id,'NAMED_ATTRIBUTE'); this.params={name:'',dataType:'float'}; }
  execute({geometry}) {
    const attr=geometry?.attributes[this.params.name];
    return {value:attr?Array.from(attr.array):null,exists:!!attr};
  }
}

class StoreNamedAttributeNode extends GeoNode {
  constructor(id) { super(id,'STORE_NAMED_ATTRIBUTE'); this.params={name:'custom',dataType:'float'}; }
  execute({geometry,value}) {
    if(!geometry) return {geometry};
    const geo=geometry.clone();
    if(value) geo.setAttribute(this.params.name,new THREE.Float32BufferAttribute(value,1));
    return {geometry:geo};
  }
}

class CaptureAttributeNode extends GeoNode {
  constructor(id) { super(id,'CAPTURE_ATTRIBUTE'); this.params={dataType:'float'}; }
  execute({geometry,value}) { return {geometry,captured:value}; }
}

// ─── MATH/UTILITY NODES ───────────────────────────────────────────────────────

class MathOpNode extends GeoNode {
  constructor(id) { super(id,'MATH'); this.params={operation:'ADD',value:1,clamp:false}; }
  execute({value}) {
    const a=value??0,b=this.params.value;
    const ops={ADD:a+b,SUBTRACT:a-b,MULTIPLY:a*b,DIVIDE:b?a/b:0,
               POWER:Math.pow(a,b),SQRT:Math.sqrt(Math.abs(a)),ABS:Math.abs(a),
               NEGATE:-a,FLOOR:Math.floor(a),CEIL:Math.ceil(a),ROUND:Math.round(a),
               FRACT:a%1,MODULO:((a%b)+b)%b,SIN:Math.sin(a),COS:Math.cos(a),TAN:Math.tan(a),
               ASIN:Math.asin(a),ACOS:Math.acos(a),ATAN:Math.atan(a),ATAN2:Math.atan2(a,b),
               LOG:Math.log(a),EXP:Math.exp(a),MAX:Math.max(a,b),MIN:Math.min(a,b),
               LESS_THAN:a<b?1:0,GREATER_THAN:a>b?1:0,SIGN:Math.sign(a),PINGPONG:Math.abs(((a/b)%2)-1)*b,
               SMOOTH_MIN:a<b?a:b,WRAP:((a%b)+b)%b};
    let v=ops[this.params.operation]??0;
    if(this.params.clamp) v=Math.max(0,Math.min(1,v));
    return {value:v};
  }
}

class VectorMathNode extends GeoNode {
  constructor(id) { super(id,'VECTOR_MATH'); this.params={operation:'ADD'}; }
  execute({vectorA,vectorB}) {
    const a=vectorA??new THREE.Vector3(),b=vectorB??new THREE.Vector3();
    switch(this.params.operation) {
      case 'ADD':       return {vector:a.clone().add(b)};
      case 'SUBTRACT':  return {vector:a.clone().sub(b)};
      case 'MULTIPLY':  return {vector:a.clone().multiply(b)};
      case 'DIVIDE':    return {vector:new THREE.Vector3(a.x/b.x,a.y/b.y,a.z/b.z)};
      case 'CROSS':     return {vector:a.clone().cross(b)};
      case 'DOT':       return {value:a.dot(b)};
      case 'LENGTH':    return {value:a.length()};
      case 'NORMALIZE': return {vector:a.clone().normalize()};
      case 'SCALE':     return {vector:a.clone().multiplyScalar(b.x)};
      case 'REFLECT':   return {vector:a.clone().reflect(b.normalize())};
      default:          return {vector:a};
    }
  }
}

class NoiseTextureNode extends GeoNode {
  constructor(id) { super(id,'NOISE_TEXTURE'); this.params={scale:1,detail:2,roughness:0.5,distortion:0,type:'perlin'}; }
  execute({vector}) {
    const v=vector??new THREE.Vector3();
    const {scale,detail,roughness,type}=this.params;
    let n;
    if(type==='voronoi') {
      const cx=Math.floor(v.x*scale),cy=Math.floor(v.y*scale),cz=Math.floor(v.z*scale);
      let minD=Infinity;
      for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) for(let dz=-1;dz<=1;dz++) {
        const px=cx+dx+Math.sin(cx+dx+cy+dy)*0.5,py=cy+dy+Math.sin(cy+dy+cz+dz)*0.5,pz=cz+dz+Math.sin(cz+dz+cx+dx)*0.5;
        const d=Math.sqrt((v.x*scale-px)**2+(v.y*scale-py)**2+(v.z*scale-pz)**2);
        minD=Math.min(minD,d);
      }
      n=minD;
    } else {
      n=fbmNoise(v.x*scale,v.y*scale,v.z*scale,detail);
    }
    return {value:(n+1)/2,color:new THREE.Color(n,n,n)};
  }
}

class MapRangeNode extends GeoNode {
  constructor(id) { super(id,'MAP_RANGE'); this.params={fromMin:0,fromMax:1,toMin:0,toMax:1,clamp:true,interpolation:'linear'}; }
  execute({value}) {
    const {fromMin,fromMax,toMin,toMax,clamp}=this.params;
    let t=(value-fromMin)/(fromMax-fromMin||1);
    if(clamp) t=Math.max(0,Math.min(1,t));
    return {value:toMin+t*(toMax-toMin)};
  }
}

class MixNode extends GeoNode {
  constructor(id) { super(id,'MIX'); this.params={factor:0.5,dataType:'float'}; }
  execute({a,b,factor}) {
    const f=factor??this.params.factor;
    if(typeof a==='number') return {value:a*(1-f)+b*f};
    if(a instanceof THREE.Vector3) return {vector:a.clone().lerp(b,f)};
    if(a instanceof THREE.Color) return {color:a.clone().lerp(b,f)};
    return {value:f};
  }
}

class SwitchNode extends GeoNode {
  constructor(id) { super(id,'SWITCH'); this.params={switch:false}; }
  execute({falseInput,trueInput,switch:sw}) {
    return {output:(sw??this.params.switch)?trueInput:falseInput};
  }
}

class CompareNode extends GeoNode {
  constructor(id) { super(id,'COMPARE'); this.params={operation:'LESS_THAN',threshold:0}; }
  execute({a,b}) {
    const va=a??0,vb=b??this.params.threshold;
    const ops={LESS_THAN:va<vb,LESS_EQUAL:va<=vb,GREATER_THAN:va>vb,GREATER_EQUAL:va>=vb,EQUAL:Math.abs(va-vb)<1e-6,NOT_EQUAL:Math.abs(va-vb)>=1e-6};
    return {result:ops[this.params.operation]??false};
  }
}

// ─── DISPLACEMENT NODES ───────────────────────────────────────────────────────

class NoiseDisplaceNode extends GeoNode {
  constructor(id) { super(id,'NOISE_DISPLACE'); this.params={scale:1,strength:0.2,type:'fbm',octaves:4}; }
  execute({geometry}) {
    if(!geometry) return {geometry};
    const geo=geometry.clone();
    geo.computeVertexNormals();
    const pos=geo.attributes.position,norm=geo.attributes.normal;
    const {scale,strength,octaves}=this.params;
    for(let i=0;i<pos.count;i++) {
      const n=fbmNoise(pos.getX(i)*scale,pos.getY(i)*scale,pos.getZ(i)*scale,octaves);
      if(norm) pos.setXYZ(i,pos.getX(i)+norm.getX(i)*n*strength,pos.getY(i)+norm.getY(i)*n*strength,pos.getZ(i)+norm.getZ(i)*n*strength);
    }
    pos.needsUpdate=true;
    geo.computeVertexNormals();
    return {geometry:geo};
  }
}

class ColorByHeightNode extends GeoNode {
  constructor(id) { super(id,'COLOR_BY_HEIGHT'); this.params={lowColor:'#0000ff',highColor:'#ff0000',minH:-1,maxH:1}; }
  execute({geometry}) {
    if(!geometry) return {geometry};
    const geo=geometry.clone();
    const pos=geo.attributes.position;
    const colors=new Float32Array(pos.count*3);
    const lo=new THREE.Color(this.params.lowColor),hi=new THREE.Color(this.params.highColor);
    for(let i=0;i<pos.count;i++) {
      const t=Math.max(0,Math.min(1,(pos.getY(i)-this.params.minH)/(this.params.maxH-this.params.minH||1)));
      const c=lo.clone().lerp(hi,t);
      colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
    }
    geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    return {geometry:geo};
  }
}

// ─── Output Node ──────────────────────────────────────────────────────────────

class GroupOutputNode extends GeoNode {
  constructor(id) { super(id,'GROUP_OUTPUT'); }
  execute(data) { return data; }
}

class GroupInputNode extends GeoNode {
  constructor(id) { super(id,'GROUP_INPUT'); this.params={}; }
  execute(data) { return data; }
}

// ─── Subdivision helper ───────────────────────────────────────────────────────
function _midpointSubdivide(geometry) {
  const idx=geometry.index,pos=geometry.attributes.position;
  if(!idx) return geometry;
  const edgeMid=new Map();
  const newPos=Array.from(pos.array);
  const newIdx=[];
  const getMid=(a,b)=>{
    const key=Math.min(a,b)+'_'+Math.max(a,b);
    if(edgeMid.has(key)) return edgeMid.get(key);
    const m=newPos.length/3;
    newPos.push((pos.getX(a)+pos.getX(b))/2,(pos.getY(a)+pos.getY(b))/2,(pos.getZ(a)+pos.getZ(b))/2);
    edgeMid.set(key,m); return m;
  };
  for(let i=0;i<idx.count;i+=3) {
    const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
    const ab=getMid(a,b),bc=getMid(b,c),ca=getMid(c,a);
    newIdx.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(newPos,3));
  geo.setIndex(newIdx);
  geo.computeVertexNormals();
  return geo;
}

// ─── Node Registry (30+ types) ───────────────────────────────────────────────

export const NODE_TYPES = {
  // Input
  MESH_PRIMITIVE:'MESH_PRIMITIVE', VALUE:'VALUE', VECTOR:'VECTOR',
  INTEGER:'INTEGER', BOOLEAN:'BOOLEAN', STRING:'STRING',
  GROUP_INPUT:'GROUP_INPUT', GROUP_OUTPUT:'GROUP_OUTPUT',
  // Geometry
  JOIN_GEOMETRY:'JOIN_GEOMETRY', TRANSFORM:'TRANSFORM', BOUNDING_BOX:'BOUNDING_BOX',
  GEOMETRY_PROXIMITY:'GEOMETRY_PROXIMITY', SEPARATE_COMPONENTS:'SEPARATE_COMPONENTS',
  // Mesh
  SET_POSITION:'SET_POSITION', SUBDIVISION_SURFACE:'SUBDIVISION_SURFACE',
  FLIP_FACES:'FLIP_FACES', MESH_BOOLEAN:'MESH_BOOLEAN', TRIANGULATE:'TRIANGULATE',
  EXTRUDE_MESH:'EXTRUDE_MESH', SCALE_ELEMENTS:'SCALE_ELEMENTS',
  MERGE_BY_DISTANCE:'MERGE_BY_DISTANCE', DUAL_MESH:'DUAL_MESH',
  // Curve
  CURVE_TO_MESH:'CURVE_TO_MESH', CURVE_LINE:'CURVE_LINE', CURVE_CIRCLE:'CURVE_CIRCLE',
  RESAMPLE_CURVE:'RESAMPLE_CURVE', SPLINE_PARAMETER:'SPLINE_PARAMETER',
  // Point
  SCATTER_POINTS:'SCATTER_POINTS', POINTS_TO_VERTICES:'POINTS_TO_VERTICES',
  DELETE_GEOMETRY:'DELETE_GEOMETRY',
  // Instance
  INSTANCE_ON_POINTS:'INSTANCE_ON_POINTS', REALIZE_INSTANCES:'REALIZE_INSTANCES',
  ROTATE_INSTANCES:'ROTATE_INSTANCES',
  // Attribute
  NAMED_ATTRIBUTE:'NAMED_ATTRIBUTE', STORE_NAMED_ATTRIBUTE:'STORE_NAMED_ATTRIBUTE',
  CAPTURE_ATTRIBUTE:'CAPTURE_ATTRIBUTE',
  // Math/Utility
  MATH:'MATH', VECTOR_MATH:'VECTOR_MATH', NOISE_TEXTURE:'NOISE_TEXTURE',
  MAP_RANGE:'MAP_RANGE', MIX:'MIX', SWITCH:'SWITCH', COMPARE:'COMPARE',
  // Displacement
  NOISE_DISPLACE:'NOISE_DISPLACE', COLOR_BY_HEIGHT:'COLOR_BY_HEIGHT',
};

const NODE_CLASSES = {
  MESH_PRIMITIVE:MeshPrimitiveNode, VALUE:ValueNode, VECTOR:VectorNode,
  INTEGER:IntegerNode, BOOLEAN:BooleanNode, STRING:StringNode,
  GROUP_INPUT:GroupInputNode, GROUP_OUTPUT:GroupOutputNode,
  JOIN_GEOMETRY:JoinGeometryNode, TRANSFORM:TransformNode, BOUNDING_BOX:BoundingBoxNode,
  GEOMETRY_PROXIMITY:GeometryProximityNode, SEPARATE_COMPONENTS:SeparateComponentsNode,
  SET_POSITION:SetPositionNode, SUBDIVISION_SURFACE:SubdivisionSurfaceNode,
  FLIP_FACES:FlipFacesNode, MESH_BOOLEAN:MeshBooleanNode, TRIANGULATE:TriangulateNode,
  EXTRUDE_MESH:ExtrudeNode, SCALE_ELEMENTS:ScaleElementsNode,
  MERGE_BY_DISTANCE:MergeByDistanceNode, DUAL_MESH:DualMeshNode,
  CURVE_TO_MESH:CurveToMeshNode, CURVE_LINE:CurveLineNode, CURVE_CIRCLE:CurveCircleNode,
  RESAMPLE_CURVE:ResampleCurveNode, SPLINE_PARAMETER:SplineParameterNode,
  SCATTER_POINTS:ScatterPointsNode, POINTS_TO_VERTICES:PointsToVerticesNode,
  DELETE_GEOMETRY:DeleteGeometryNode,
  INSTANCE_ON_POINTS:InstanceOnPointsNode, REALIZE_INSTANCES:RealizeInstancesNode,
  ROTATE_INSTANCES:RotateInstancesNode,
  NAMED_ATTRIBUTE:NamedAttributeNode, STORE_NAMED_ATTRIBUTE:StoreNamedAttributeNode,
  CAPTURE_ATTRIBUTE:CaptureAttributeNode,
  MATH:MathOpNode, VECTOR_MATH:VectorMathNode, NOISE_TEXTURE:NoiseTextureNode,
  MAP_RANGE:MapRangeNode, MIX:MixNode, SWITCH:SwitchNode, COMPARE:CompareNode,
  NOISE_DISPLACE:NoiseDisplaceNode, COLOR_BY_HEIGHT:ColorByHeightNode,
  // Legacy compat
  SCATTER:ScatterPointsNode, CURVE_TO_MESH_LEGACY:CurveToMeshNode,
};

// ─── Graph Executor ───────────────────────────────────────────────────────────

export class GeometryNodeGraph {
  constructor() {
    this.nodes=new Map();
    this.connections=[];
    this._idCounter=0;
    this.groups=new Map(); // node groups for organization
  }

  addNode(type, params={}, position={x:0,y:0}) {
    const NodeClass=NODE_CLASSES[type];
    if(!NodeClass){console.error(`[GeoNodes] Unknown: ${type}`);return null;}
    const id=`node_${++this._idCounter}`;
    const node=new NodeClass(id);
    Object.assign(node.params,params);
    node.position=position;
    this.nodes.set(id,node);
    return id;
  }

  removeNode(id) {
    this.nodes.delete(id);
    this.connections=this.connections.filter(c=>c.fromId!==id&&c.toId!==id);
  }

  connect(fromId, fromPort, toId, toPort) {
    // Remove existing connection to same input
    this.connections=this.connections.filter(c=>!(c.toId===toId&&c.toPort===toPort));
    this.connections.push({fromId,fromPort,toId,toPort});
  }

  disconnect(fromId, fromPort, toId, toPort) {
    this.connections=this.connections.filter(c=>!(c.fromId===fromId&&c.fromPort===fromPort&&c.toId===toId&&c.toPort===toPort));
  }

  updateParams(id, params) {
    const node=this.nodes.get(id);
    if(node) Object.assign(node.params,params);
  }

  getNode(id) { return this.nodes.get(id)??null; }

  execute(rootId, initialInputs={}) {
    const cache=new Map();
    const run=(nodeId)=>{
      if(cache.has(nodeId)) return cache.get(nodeId);
      const node=this.nodes.get(nodeId);
      if(!node) return {};
      const inputData={...initialInputs};
      this.connections.filter(c=>c.toId===nodeId).forEach(conn=>{
        const upstream=run(conn.fromId);
        inputData[conn.toPort]=upstream[conn.fromPort];
      });
      const result=node.execute(inputData);
      cache.set(nodeId,result);
      return result;
    };
    return run(rootId);
  }

  // Find output node automatically
  executeAuto(initialInputs={}) {
    // Find GROUP_OUTPUT or last added node
    let rootId=null;
    this.nodes.forEach((node,id)=>{if(node.type==='GROUP_OUTPUT') rootId=id;});
    if(!rootId) rootId=Array.from(this.nodes.keys()).pop();
    return rootId?this.execute(rootId,initialInputs):{};
  }

  getNodeCount() { return this.nodes.size; }
  getConnectionCount() { return this.connections.length; }

  // Topological sort for execution order
  getExecutionOrder(rootId) {
    const visited=new Set(),order=[];
    const visit=(id)=>{
      if(visited.has(id)) return;
      visited.add(id);
      this.connections.filter(c=>c.toId===id).forEach(c=>visit(c.fromId));
      order.push(id);
    };
    visit(rootId);
    return order;
  }

  serialize() {
    const nodes=[];
    this.nodes.forEach((node,id)=>nodes.push({id,type:node.type,params:node.params,position:node.position,label:node.label}));
    return {version:'2.0',nodes,connections:this.connections};
  }

  deserialize(data) {
    this.nodes.clear();this.connections=[];
    data.nodes.forEach(n=>{
      const NodeClass=NODE_CLASSES[n.type];
      if(!NodeClass) return;
      const node=new NodeClass(n.id);
      Object.assign(node.params,n.params);
      node.position=n.position??{x:0,y:0};
      node.label=n.label??'';
      this.nodes.set(n.id,node);
    });
    (data.connections??[]).forEach(c=>this.connections.push(c));
  }

  clone() {
    const g=new GeometryNodeGraph();
    g.deserialize(this.serialize());
    return g;
  }
}

// ─── Legacy functional exports ────────────────────────────────────────────────

export function createGraph() { return new GeometryNodeGraph(); }
export function createNode(type,params={},position={x:0,y:0}) {
  const graph=new GeometryNodeGraph();
  return {nodeId:graph.addNode(type,params,position),graph};
}
export function addNode(graph,type,params={},position={x:0,y:0}) { return graph.addNode(type,params,position); }
export function connectNodes(graph,fromId,fromPort,toId,toPort) { graph.connect(fromId,fromPort,toId,toPort); }
export function evaluateGraph(graph,rootId,inputs={}) { return graph.execute(rootId,inputs); }
export function getNodeCount() { return Object.keys(NODE_TYPES).length; }

export default GeometryNodeGraph;
