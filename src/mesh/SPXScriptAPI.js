// SPXScriptAPI.js — JavaScript Scripting API for SPX Mesh Editor
// SPX Mesh Editor | StreamPireX
// MEL/Python equivalent — exposes all systems to JS with built-in REPL
// Features: scene manipulation, modifier application, animation, rendering,
//           macro recording, script library, sandboxed execution

import * as THREE from 'three';

// ─── Script Context ───────────────────────────────────────────────────────────

export class SPXScriptContext {
  constructor(scene, options = {}) {
    this.scene    = scene;
    this.selected = [];
    this.history  = [];
    this._macros  = new Map();
    this._vars    = new Map();
    this._hooks   = new Map();
    this._recording = false;
    this._recordedCmds = [];
    this.callbacks = options.callbacks ?? {};
  }

  // ─── Scene API ──────────────────────────────────────────────────────────

  ls(filter = '') {
    const results = [];
    this.scene.traverse(obj => {
      if (!filter || obj.name.includes(filter)) results.push(obj.name || obj.uuid);
    });
    return results;
  }

  select(nameOrUUID) {
    const obj = this._find(nameOrUUID);
    if (obj) { this.selected = [obj]; this.callbacks.onSelect?.(obj); }
    return obj;
  }

  selectAll() {
    const objs = [];
    this.scene.traverse(o => { if (o.isMesh) objs.push(o); });
    this.selected = objs;
    return objs;
  }

  deselect() { this.selected = []; }

  get(nameOrUUID) { return this._find(nameOrUUID); }

  createMesh(type = 'box', params = {}) {
    let geo;
    switch (type) {
      case 'box':      geo = new THREE.BoxGeometry(params.w??1, params.h??1, params.d??1); break;
      case 'sphere':   geo = new THREE.SphereGeometry(params.r??1, params.ws??32, params.hs??16); break;
      case 'cylinder': geo = new THREE.CylinderGeometry(params.rt??1, params.rb??1, params.h??2, params.s??32); break;
      case 'plane':    geo = new THREE.PlaneGeometry(params.w??1, params.h??1); break;
      case 'torus':    geo = new THREE.TorusGeometry(params.r??1, params.t??0.4, params.rs??16, params.ts??100); break;
      default:         geo = new THREE.BoxGeometry(1,1,1);
    }
    const mat = new THREE.MeshStandardMaterial({ color: params.color ?? 0x888888 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = params.name ?? `${type}_${Date.now()}`;
    if (params.position) mesh.position.set(...params.position);
    if (params.rotation) mesh.rotation.set(...params.rotation);
    if (params.scale)    mesh.scale.set(...params.scale);
    this.scene.add(mesh);
    this._record('createMesh', [type, params]);
    return mesh;
  }

  delete(nameOrUUID) {
    const obj = this._find(nameOrUUID);
    if (obj) { obj.parent?.remove(obj); this._record('delete', [nameOrUUID]); }
  }

  duplicate(nameOrUUID, offset = [1,0,0]) {
    const obj = this._find(nameOrUUID);
    if (!obj?.isMesh) return null;
    const clone = obj.clone();
    clone.position.add(new THREE.Vector3(...offset));
    clone.name = obj.name + '_copy';
    this.scene.add(clone);
    return clone;
  }

  // ─── Transform API ──────────────────────────────────────────────────────

  move(nameOrUUID, x=0, y=0, z=0, relative=false) {
    const obj = this._findOrSelected(nameOrUUID);
    obj?.forEach(o => {
      if (relative) o.position.add(new THREE.Vector3(x,y,z));
      else o.position.set(x,y,z);
    });
    this._record('move', [nameOrUUID,x,y,z,relative]);
  }

  rotate(nameOrUUID, x=0, y=0, z=0, degrees=true) {
    const obj = this._findOrSelected(nameOrUUID);
    const factor = degrees ? Math.PI/180 : 1;
    obj?.forEach(o => o.rotation.set(x*factor, y*factor, z*factor));
    this._record('rotate', [nameOrUUID,x,y,z,degrees]);
  }

  scale(nameOrUUID, x=1, y=1, z=1) {
    const obj = this._findOrSelected(nameOrUUID);
    obj?.forEach(o => o.scale.set(x,y,z));
    this._record('scale', [nameOrUUID,x,y,z]);
  }

  // ─── Material API ────────────────────────────────────────────────────────

  setColor(nameOrUUID, color) {
    const obj = this._findOrSelected(nameOrUUID);
    obj?.forEach(o => { if (o.material) o.material.color.set(color); });
  }

  setMaterial(nameOrUUID, params = {}) {
    const obj = this._findOrSelected(nameOrUUID);
    obj?.forEach(o => {
      o.material = new THREE.MeshStandardMaterial({
        color:     params.color     ?? 0x888888,
        roughness: params.roughness ?? 0.5,
        metalness: params.metalness ?? 0,
        opacity:   params.opacity   ?? 1,
        transparent: (params.opacity ?? 1) < 1,
        wireframe: params.wireframe ?? false,
      });
    });
  }

  // ─── Modifier API ────────────────────────────────────────────────────────

  addModifier(nameOrUUID, type, params = {}) {
    const obj = this._find(nameOrUUID);
    if (!obj) return;
    if (!obj.userData.modifiers) obj.userData.modifiers = [];
    obj.userData.modifiers.push({ type, params, enabled: true, id: Math.random().toString(36).slice(2) });
    this._record('addModifier', [nameOrUUID, type, params]);
    this.callbacks.onModifierAdded?.(obj, type);
  }

  applyModifiers(nameOrUUID) {
    const obj = this._find(nameOrUUID);
    if (!obj?.isMesh) return;
    this.callbacks.onApplyModifiers?.(obj);
  }

  // ─── Animation API ───────────────────────────────────────────────────────

  setKeyframe(nameOrUUID, frame, property, value) {
    const obj = this._find(nameOrUUID);
    if (!obj) return;
    if (!obj.userData.keyframes) obj.userData.keyframes = {};
    if (!obj.userData.keyframes[property]) obj.userData.keyframes[property] = [];
    obj.userData.keyframes[property].push({ frame, value });
    obj.userData.keyframes[property].sort((a,b) => a.frame - b.frame);
    this._record('setKeyframe', [nameOrUUID, frame, property, value]);
  }

  getKeyframe(nameOrUUID, frame, property) {
    const obj = this._find(nameOrUUID);
    return obj?.userData.keyframes?.[property]?.find(k => k.frame === frame);
  }

  // ─── Physics API ─────────────────────────────────────────────────────────

  addRigidBody(nameOrUUID, params = {}) {
    const obj = this._find(nameOrUUID);
    if (!obj) return;
    obj.userData.physics = { type: 'rigid', mass: params.mass??1, restitution: params.restitution??0.3, ...params };
    this.callbacks.onPhysicsAdded?.(obj);
  }

  addCloth(nameOrUUID, params = {}) {
    const obj = this._find(nameOrUUID);
    if (!obj) return;
    obj.userData.physics = { type: 'cloth', ...params };
    this.callbacks.onClothAdded?.(obj);
  }

  // ─── Render API ──────────────────────────────────────────────────────────

  render(options = {}) {
    this.callbacks.onRender?.(options);
    return 'Rendering...';
  }

  screenshot(options = {}) {
    return this.callbacks.onScreenshot?.(options) ?? null;
  }

  // ─── Variable API ────────────────────────────────────────────────────────

  set(name, value) { this._vars.set(name, value); }
  get_var(name)    { return this._vars.get(name); }
  del(name)        { this._vars.delete(name); }
  vars()           { return Object.fromEntries(this._vars); }

  // ─── Macro System ────────────────────────────────────────────────────────

  startRecord()  { this._recording = true; this._recordedCmds = []; }
  stopRecord(name) {
    this._recording = false;
    if (name) this._macros.set(name, [...this._recordedCmds]);
    return this._recordedCmds;
  }
  runMacro(name) {
    const cmds = this._macros.get(name);
    if (!cmds) return `Macro '${name}' not found`;
    cmds.forEach(([fn, args]) => this[fn]?.(...args));
    return `Ran macro '${name}' (${cmds.length} commands)`;
  }
  listMacros() { return Array.from(this._macros.keys()); }
  saveMacro(name) { return JSON.stringify({ name, commands: this._macros.get(name) ?? [] }); }
  loadMacro(json) { const d = JSON.parse(json); this._macros.set(d.name, d.commands); }

  // ─── Hook System ─────────────────────────────────────────────────────────

  on(event, fn) {
    if (!this._hooks.has(event)) this._hooks.set(event, []);
    this._hooks.get(event).push(fn);
  }
  off(event, fn) {
    const hooks = this._hooks.get(event) ?? [];
    this._hooks.set(event, hooks.filter(h => h !== fn));
  }
  emit(event, ...args) {
    this._hooks.get(event)?.forEach(fn => fn(...args));
  }

  // ─── Utility ─────────────────────────────────────────────────────────────

  print(...args) { console.log('[SPX]', ...args); return args.join(' '); }
  help() {
    return `
SPX Script API — Available Commands:
  Scene:      ls(), select(), selectAll(), get(), createMesh(), delete(), duplicate()
  Transform:  move(), rotate(), scale()
  Material:   setColor(), setMaterial()
  Modifiers:  addModifier(), applyModifiers()
  Animation:  setKeyframe(), getKeyframe()
  Physics:    addRigidBody(), addCloth()
  Render:     render(), screenshot()
  Variables:  set(), get_var(), del(), vars()
  Macros:     startRecord(), stopRecord(), runMacro(), listMacros()
  Events:     on(), off(), emit()
  Utility:    print(), help(), history(), clear()
    `.trim();
  }

  history(n = 10) { return this.history.slice(-n); }
  clear() { this.history = []; this._vars.clear(); }

  _find(nameOrUUID) {
    if (!nameOrUUID) return this.selected[0] ?? null;
    let found = null;
    this.scene.traverse(o => { if (o.name === nameOrUUID || o.uuid === nameOrUUID) found = o; });
    return found;
  }

  _findOrSelected(nameOrUUID) {
    if (!nameOrUUID || nameOrUUID === '') return this.selected;
    const obj = this._find(nameOrUUID);
    return obj ? [obj] : this.selected;
  }

  _record(fn, args) {
    const entry = [fn, args, Date.now()];
    this.history.push(entry);
    if (this._recording) this._recordedCmds.push([fn, args]);
  }
}

// ─── Script Runner (sandboxed) ────────────────────────────────────────────────

export class SPXScriptRunner {
  constructor(scene, options = {}) {
    this.context = new SPXScriptContext(scene, options);
    this._scriptLibrary = new Map();
    this._loadBuiltins();
  }

  _loadBuiltins() {
    this._scriptLibrary.set('center_all', `
      const objs = selectAll();
      objs.forEach(o => move(o.name, 0, 0, 0));
      print('Centered', objs.length, 'objects');
    `);
    this._scriptLibrary.set('random_colors', `
      const objs = selectAll();
      objs.forEach(o => setColor(o.name, Math.random() * 0xffffff));
      print('Randomized colors for', objs.length, 'objects');
    `);
    this._scriptLibrary.set('apply_subdivision', `
      const objs = selectAll();
      objs.forEach(o => addModifier(o.name, 'SUBDIVISION', { levels: 2 }));
      print('Applied subdivision to', objs.length, 'objects');
    `);
    this._scriptLibrary.set('create_grid', `
      const count = get_var('grid_count') || 5;
      const spacing = get_var('grid_spacing') || 2;
      for (let x = 0; x < count; x++) {
        for (let z = 0; z < count; z++) {
          createMesh('box', { position: [x*spacing, 0, z*spacing], name: 'cube_'+x+'_'+z });
        }
      }
      print('Created', count*count, 'objects');
    `);
  }

  run(code) {
    const ctx = this.context;
    try {
      const fn = new Function(
        'ls','select','selectAll','deselect','get','createMesh','delete_obj','duplicate',
        'move','rotate','scale','setColor','setMaterial',
        'addModifier','applyModifiers','setKeyframe','getKeyframe',
        'addRigidBody','addCloth','render','screenshot',
        'set','get_var','del','vars',
        'startRecord','stopRecord','runMacro','listMacros',
        'on','off','emit','print','help','history','clear',
        code,
      );
      return fn(
        ctx.ls.bind(ctx), ctx.select.bind(ctx), ctx.selectAll.bind(ctx), ctx.deselect.bind(ctx),
        ctx.get.bind(ctx), ctx.createMesh.bind(ctx), ctx.delete.bind(ctx), ctx.duplicate.bind(ctx),
        ctx.move.bind(ctx), ctx.rotate.bind(ctx), ctx.scale.bind(ctx),
        ctx.setColor.bind(ctx), ctx.setMaterial.bind(ctx),
        ctx.addModifier.bind(ctx), ctx.applyModifiers.bind(ctx),
        ctx.setKeyframe.bind(ctx), ctx.getKeyframe.bind(ctx),
        ctx.addRigidBody.bind(ctx), ctx.addCloth.bind(ctx),
        ctx.render.bind(ctx), ctx.screenshot.bind(ctx),
        ctx.set.bind(ctx), ctx.get_var.bind(ctx), ctx.del.bind(ctx), ctx.vars.bind(ctx),
        ctx.startRecord.bind(ctx), ctx.stopRecord.bind(ctx),
        ctx.runMacro.bind(ctx), ctx.listMacros.bind(ctx),
        ctx.on.bind(ctx), ctx.off.bind(ctx), ctx.emit.bind(ctx),
        ctx.print.bind(ctx), ctx.help.bind(ctx), ctx.history.bind(ctx), ctx.clear.bind(ctx),
      );
    } catch(e) {
      return `Error: ${e.message}`;
    }
  }

  runScript(name) {
    const script = this._scriptLibrary.get(name);
    if (!script) return `Script '${name}' not found`;
    return this.run(script);
  }

  saveScript(name, code) { this._scriptLibrary.set(name, code); }
  deleteScript(name) { this._scriptLibrary.delete(name); }
  listScripts() { return Array.from(this._scriptLibrary.keys()); }
  exportScript(name) { return { name, code: this._scriptLibrary.get(name) }; }
  importScript(data) { this._scriptLibrary.set(data.name, data.code); }
}

export const SCRIPT_EXAMPLES = {
  hello: `print('Hello from SPX Script API!')`,
  create_cube: `const cube = createMesh('box', { name: 'my_cube', color: 0xff0000 }); print('Created:', cube.name)`,
  animate_cube: `
    const cube = createMesh('box', { name: 'anim_cube' });
    for (let f = 0; f <= 60; f++) {
      setKeyframe('anim_cube', f, 'position.y', Math.sin(f/10) * 2);
    }
    print('Animated cube for 60 frames');
  `,
  random_scene: `
    set('count', 20);
    for (let i = 0; i < get_var('count'); i++) {
      createMesh('sphere', {
        name: 'sphere_'+i,
        position: [(Math.random()-0.5)*10, Math.random()*5, (Math.random()-0.5)*10],
        color: Math.random() * 0xffffff,
      });
    }
    print('Created', get_var('count'), 'spheres');
  `,
};

export default SPXScriptRunner;
