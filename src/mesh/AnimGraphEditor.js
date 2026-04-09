// AnimGraphEditor.js — Visual node-based animation graph (Unreal AnimGraph style)
// Features: state machine, blend trees, additive layers, IK nodes, transitions
import * as THREE from 'three';

// ── Node types ────────────────────────────────────────────────────────────────
export const ANIM_NODE_TYPES = {
  clip:         { label:'Clip',          color:'#0066cc', inputs:[],                outputs:['pose'] },
  blend2:       { label:'Blend 2',       color:'#006644', inputs:['A','B','alpha'],  outputs:['pose'] },
  blend3:       { label:'Blend 3',       color:'#006644', inputs:['A','B','C','t'],  outputs:['pose'] },
  additive:     { label:'Additive',      color:'#884400', inputs:['base','add','w'], outputs:['pose'] },
  layeredBlend: { label:'Layered Blend', color:'#664488', inputs:['base','layer','mask'], outputs:['pose'] },
  aimOffset:    { label:'Aim Offset',    color:'#cc4400', inputs:['pose','yaw','pitch'], outputs:['pose'] },
  twobone_ik:   { label:'Two Bone IK',   color:'#cc0044', inputs:['pose','target'],  outputs:['pose'] },
  stateMachine: { label:'State Machine', color:'#440088', inputs:[],                 outputs:['pose'] },
  output:       { label:'Output Pose',   color:'#00ffc8', inputs:['pose'],           outputs:[] },
};

// ── State machine ─────────────────────────────────────────────────────────────
export class AnimStateMachine {
  constructor() {
    this.states      = new Map();
    this.transitions = [];
    this.current     = null;
    this.blendTime   = 0.2;
    this._blendFrom  = null;
    this._blendAlpha = 1.0;
  }

  addState(id, options = {}) {
    this.states.set(id, {
      id, name: options.name ?? id,
      clip: options.clip ?? null,
      loop: options.loop ?? true,
      speed: options.speed ?? 1.0,
      time: 0,
    });
    if (!this.current) this.current = id;
    return this;
  }

  addTransition(from, to, condition, blendTime = 0.2) {
    this.transitions.push({ from, to, condition, blendTime });
    return this;
  }

  update(dt, params = {}) {
    const state = this.states.get(this.current);
    if (!state) return null;
    // Advance time
    state.time += dt * state.speed;
    if (state.clip && state.loop) {
      const dur = state.clip.duration ?? 1;
      if (state.time > dur) state.time -= dur;
    }
    // Check transitions
    for (const t of this.transitions) {
      if (t.from !== this.current) continue;
      if (typeof t.condition === 'function' ? t.condition(params) : params[t.condition]) {
        this._blendFrom  = this.current;
        this._blendAlpha = 0;
        this.current     = t.to;
        this.blendTime   = t.blendTime;
        this.states.get(t.to).time = 0;
        break;
      }
    }
    // Advance blend
    if (this._blendAlpha < 1) {
      this._blendAlpha = Math.min(1, this._blendAlpha + dt / this.blendTime);
    }
    return { state: this.current, time: state.time, blendFrom: this._blendFrom, blendAlpha: this._blendAlpha };
  }

  getCurrentState() { return this.states.get(this.current); }
}

// ── Blend tree ────────────────────────────────────────────────────────────────
export class BlendTree {
  constructor() { this.nodes = new Map(); this.connections = []; this.outputNode = null; }

  addNode(id, type, options = {}) {
    const def = ANIM_NODE_TYPES[type] ?? ANIM_NODE_TYPES.clip;
    this.nodes.set(id, {
      id, type, options,
      label: def.label,
      color: def.color,
      x: options.x ?? Math.random() * 400,
      y: options.y ?? Math.random() * 300,
      inputs:  def.inputs.map(name => ({ name, connected: null })),
      outputs: def.outputs.map(name => ({ name, connections: [] })),
      params:  { ...options },
    });
    if (type === 'output') this.outputNode = id;
    return this;
  }

  connect(fromId, fromOutput, toId, toInput) {
    const conn = { from: fromId, fromOutput, to: toId, toInput };
    this.connections.push(conn);
    const toNode = this.nodes.get(toId);
    if (toNode) {
      const inp = toNode.inputs.find(i => i.name === toInput);
      if (inp) inp.connected = { nodeId: fromId, output: fromOutput };
    }
    return this;
  }

  evaluate(params = {}) {
    if (!this.outputNode) return null;
    return this._evalNode(this.outputNode, params);
  }

  _evalNode(nodeId, params) {
    const node = this.nodes.get(nodeId);
    if (!node) return null;
    switch (node.type) {
      case 'clip':
        return { clip: node.params.clip, time: params[node.params.timeParam ?? 'time'] ?? 0, weight: 1 };
      case 'blend2': {
        const alpha = params[node.params.alphaParam ?? 'alpha'] ?? 0.5;
        const a = node.inputs[0].connected ? this._evalNode(node.inputs[0].connected.nodeId, params) : null;
        const b = node.inputs[1].connected ? this._evalNode(node.inputs[1].connected.nodeId, params) : null;
        return { blend2: { a, b, alpha } };
      }
      case 'blend3': {
        const t = params[node.params.tParam ?? 't'] ?? 0;
        const a = node.inputs[0].connected ? this._evalNode(node.inputs[0].connected.nodeId, params) : null;
        const b = node.inputs[1].connected ? this._evalNode(node.inputs[1].connected.nodeId, params) : null;
        const c = node.inputs[2].connected ? this._evalNode(node.inputs[2].connected.nodeId, params) : null;
        const alpha = t <= 0.5 ? t * 2 : (t - 0.5) * 2;
        return t <= 0.5 ? { blend2: { a, b: b, alpha } } : { blend2: { a: b, b: c, alpha } };
      }
      case 'additive': {
        const base = node.inputs[0].connected ? this._evalNode(node.inputs[0].connected.nodeId, params) : null;
        const add  = node.inputs[1].connected ? this._evalNode(node.inputs[1].connected.nodeId, params) : null;
        const w    = params[node.params.weightParam ?? 'additiveWeight'] ?? 1;
        return { additive: { base, add, weight: w } };
      }
      case 'output':
        return node.inputs[0].connected ? this._evalNode(node.inputs[0].connected.nodeId, params) : null;
      default:
        return null;
    }
  }

  // Apply evaluated pose to skeleton
  applyPose(mixer, poseResult, skeleton) {
    if (!poseResult || !mixer) return;
    if (poseResult.clip) {
      const action = mixer.clipAction(poseResult.clip);
      if (!action.isRunning()) action.play();
      mixer.setTime(poseResult.time);
    } else if (poseResult.blend2) {
      const { a, b, alpha } = poseResult.blend2;
      if (a?.clip) { const ac = mixer.clipAction(a.clip); ac.weight = 1-alpha; if(!ac.isRunning()) ac.play(); }
      if (b?.clip) { const bc = mixer.clipAction(b.clip); bc.weight = alpha;   if(!bc.isRunning()) bc.play(); }
    }
  }

  serialize() {
    return {
      nodes: Array.from(this.nodes.values()),
      connections: this.connections,
      outputNode: this.outputNode,
    };
  }

  static deserialize(data) {
    const tree = new BlendTree();
    data.nodes.forEach(n => tree.nodes.set(n.id, n));
    tree.connections = data.connections;
    tree.outputNode  = data.outputNode;
    return tree;
  }
}

// ── Animation graph ────────────────────────────────────────────────────────────
export class AnimationGraph {
  constructor(skeleton, mixer) {
    this.skeleton    = skeleton;
    this.mixer       = mixer;
    this.blendTree   = new BlendTree();
    this.stateMachine = new AnimStateMachine();
    this.params      = {};
    this._time       = 0;
  }

  setParam(key, value) { this.params[key] = value; }
  getParam(key)        { return this.params[key]; }

  update(dt) {
    this._time += dt;
    this.params.time = this._time;
    const smResult = this.stateMachine.update(dt, this.params);
    const poseResult = this.blendTree.evaluate(this.params);
    if (poseResult) this.blendTree.applyPose(this.mixer, poseResult, this.skeleton);
    return { smResult, poseResult };
  }

  // Two-bone IK (for hand/foot placement)
  applyTwoBoneIK(boneA, boneB, boneC, target, poleVector = null) {
    const posA = new THREE.Vector3().setFromMatrixPosition(boneA.matrixWorld);
    const posB = new THREE.Vector3().setFromMatrixPosition(boneB.matrixWorld);
    const posC = new THREE.Vector3().setFromMatrixPosition(boneC.matrixWorld);
    const lenAB = posA.distanceTo(posB);
    const lenBC = posB.distanceTo(posC);
    const toTarget = new THREE.Vector3().subVectors(target, posA);
    const dist = Math.min(toTarget.length(), lenAB + lenBC - 0.001);
    const cosAngle = (lenAB*lenAB + dist*dist - lenBC*lenBC) / (2*lenAB*dist);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    const axis = new THREE.Vector3().crossVectors(toTarget, poleVector ?? new THREE.Vector3(0,1,0)).normalize();
    boneA.quaternion.setFromAxisAngle(axis, angle);
    boneA.updateMatrixWorld();
  }
}

export function createAnimationGraph(skeleton, mixer) {
  return new AnimationGraph(skeleton, mixer);
}


export default AnimationGraph;
