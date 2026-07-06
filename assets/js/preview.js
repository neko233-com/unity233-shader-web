/* ===== Unity233 Shader Studio — WebGL 预览引擎（Three.js） ===== */
(function () {
  // ---- 校验用的离屏 GL 上下文 ----
  const _vc = document.createElement('canvas');
  const _vg = _vc.getContext('webgl');
  const VERT_PREFIX = `attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
`;
  function compileTest(type, src) {
    const sh = _vg.createShader(type);
    _vg.shaderSource(sh, src);
    _vg.compileShader(sh);
    const ok = _vg.getShaderParameter(sh, _vg.COMPILE_STATUS);
    const log = _vg.getShaderInfoLog(sh);
    _vg.deleteShader(sh);
    return { ok, log };
  }

  function makeMesh(name) {
    switch (name) {
      case 'box': return new THREE.BoxGeometry(1.4, 1.4, 1.4);
      case 'plane': return new THREE.PlaneGeometry(2.2, 2.2, 1, 1);
      case 'torus': return new THREE.TorusGeometry(1, 0.38, 32, 96);
      case 'torusKnot': return new THREE.TorusKnotGeometry(0.85, 0.28, 160, 24);
      case 'cylinder': return new THREE.CylinderGeometry(1, 1, 1.8, 48);
      case 'sphere':
      default: return new THREE.SphereGeometry(1.25, 64, 48);
    }
  }

  class ShaderPreview {
    constructor(container) {
      this.container = container;
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(0x0c0c0e, 1);
      container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      this.camera.position.set(0, 0, 4.2);

      this.uniforms = {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(1, 1) },
        u_speed: { value: 1.0 },
        u_scale: { value: 1.0 },
        u_colorA: { value: new THREE.Color(0.25, 0.55, 1.0) },
        u_colorB: { value: new THREE.Color(1.0, 0.35, 0.7) },
        u_lightDir: { value: new THREE.Vector3(0.5, 0.8, 0.6).normalize() },
        u_lightColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
        u_ambient: { value: new THREE.Color(0.16, 0.18, 0.22) }
      };
      this.material = null;
      this.mesh = null;
      this.meshName = 'sphere';
      this.autoRotate = true;
      this.params = { speed: 1.0, scale: 1.0, colorA: '#4090ff', colorB: '#ff5ab3' };
      this.clock = new THREE.Clock();
      this.running = false;
      this._setMesh('sphere');
      // 默认着色器，避免首帧空材质报错
      this.material.vertexShader = window.UnityShader.DEFAULT_VERTEX;
      this.material.fragmentShader = window.UnityShader.FRAG_HEADER + 'void main(){ gl_FragColor = vec4(vUv, 0.0, 1.0); }';
      this.material.needsUpdate = true;
      this._loop = this._loop.bind(this);
      this.resize();
    }

    _setMesh(name) {
      if (this.mesh) { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); }
      this.meshName = name;
      const geo = makeMesh(name);
      if (!this.material) {
        this.material = new THREE.ShaderMaterial({
          uniforms: this.uniforms, vertexShader: '', fragmentShader: '',
          side: THREE.DoubleSide
        });
      }
      this.mesh = new THREE.Mesh(geo, this.material);
      this.scene.add(this.mesh);
    }

    setMesh(name) { this._setMesh(name); }
    setAutoRotate(b) { this.autoRotate = b; }
    setParams(p) {
      if (p.speed != null) { this.params.speed = p.speed; this.uniforms.u_speed.value = p.speed; }
      if (p.scale != null) { this.params.scale = p.scale; this.uniforms.u_scale.value = p.scale; }
      if (p.colorA != null) { this.params.colorA = p.colorA; this.uniforms.u_colorA.value.set(p.colorA); }
      if (p.colorB != null) { this.params.colorB = p.colorB; this.uniforms.u_colorB.value.set(p.colorB); }
    }
    setLight(p) {
      if (p.dir) this.uniforms.u_lightDir.value.set(p.dir.x, p.dir.y, p.dir.z).normalize();
      if (p.color) this.uniforms.u_lightColor.value.set(p.color);
      if (p.ambient) this.uniforms.u_ambient.value.set(p.ambient);
    }

    // 返回 { ok, error }
    setShader(vertexSrc, fragSrc) {
      const vert = (vertexSrc && vertexSrc.trim()) ? vertexSrc : window.UnityShader.DEFAULT_VERTEX;
      const frag = window.UnityShader.FRAG_HEADER + (fragSrc || '');
      // 校验
      const cv = compileTest(_vg.VERTEX_SHADER, VERT_PREFIX + vert);
      if (!cv.ok) return { ok: false, error: '顶点着色器错误:\n' + cv.log };
      const cf = compileTest(_vg.FRAGMENT_SHADER, frag);
      if (!cf.ok) return { ok: false, error: '片段着色器错误:\n' + cf.log };

      // 应用到材质（保留旧材质直到成功）
      const oldVert = this.material.vertexShader;
      const oldFrag = this.material.fragmentShader;
      this.material.vertexShader = vert;
      this.material.fragmentShader = frag;
      this.material.needsUpdate = true;

      // 捕获 THREE 运行时编译错误
      let captured = null;
      const origErr = console.error;
      console.error = function () { captured = Array.from(arguments).join(' '); };
      try { this.renderer.render(this.scene, this.camera); }
      catch (e) { captured = captured || String(e); }
      console.error = origErr;
      if (captured && /WebGLProgram|shader|ERROR:|compile/i.test(captured)) {
        this.material.vertexShader = oldVert;
        this.material.fragmentShader = oldFrag;
        this.material.needsUpdate = true;
        return { ok: false, error: captured.replace(/^THREE\.WebGLProgram: /, '') };
      }
      return { ok: true };
    }

    start() { if (!this.running) { this.running = true; this.clock.start(); this._loop(); } }
    stop() { this.running = false; }

    _loop() {
      if (!this.running) return;
      requestAnimationFrame(this._loop);
      const dt = this.clock.getDelta();
      this.uniforms.u_time.value += dt;
      if (this.autoRotate && this.mesh) { this.mesh.rotation.y += dt * 0.5; this.mesh.rotation.x += dt * 0.18; }
      this.renderer.render(this.scene, this.camera);
    }

    resize() {
      const w = this.container.clientWidth || 360;
      const h = this.container.clientHeight || 300;
      this.renderer.setSize(w, h);
      this.uniforms.u_resolution.value.set(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  // ---- 模板缩略图（共享一个离屏渲染器，drawImage 到 2D canvas） ----
  let _thumb = null;
  function getThumbRenderer() {
    if (_thumb) return _thumb;
    const cv = document.createElement('canvas');
    cv.width = 320; cv.height = 190;
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    r.setClearColor(0x0c0c0e, 1);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, 320 / 190, 0.1, 100);
    cam.position.set(0, 0, 4.2);
    const uniforms = {
      u_time: { value: 1.2 }, u_resolution: { value: new THREE.Vector2(320, 190) },
      u_speed: { value: 1.0 }, u_scale: { value: 1.0 },
      u_colorA: { value: new THREE.Color(0.25, 0.55, 1.0) },
      u_colorB: { value: new THREE.Color(1.0, 0.35, 0.7) },
      u_lightDir: { value: new THREE.Vector3(0.5, 0.8, 0.6).normalize() },
      u_lightColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
      u_ambient: { value: new THREE.Color(0.16, 0.18, 0.22) }
    };
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: window.UnityShader.DEFAULT_VERTEX, fragmentShader: '', side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 32), mat);
    scene.add(mesh);
    _thumb = { r, scene, cam, uniforms, mat, mesh };
    return _thumb;
  }
  function renderThumbnail(frag, vertex, target2d, opts) {
    opts = opts || {};
    const t = getThumbRenderer();
    const vert = vertex || window.UnityShader.DEFAULT_VERTEX;
    t.mat.vertexShader = vert;
    t.mat.fragmentShader = window.UnityShader.FRAG_HEADER + (frag || '');
    t.mat.needsUpdate = true;
    t.uniforms.u_time.value = opts.time != null ? opts.time : 1.2;
    t.uniforms.u_speed.value = opts.speed != null ? opts.speed : 1.0;
    t.uniforms.u_scale.value = opts.scale != null ? opts.scale : 1.0;
    if (opts.colorA) t.uniforms.u_colorA.value.set(opts.colorA);
    if (opts.colorB) t.uniforms.u_colorB.value.set(opts.colorB);
    if (opts.mesh) { t.scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh = new THREE.Mesh(makeMesh(opts.mesh), t.mat); t.scene.add(t.mesh); }
    if (opts.rot) { t.mesh.rotation.set(opts.rot[0], opts.rot[1], 0); }
    t.r.render(t.scene, t.cam);
    const ctx = target2d.getContext('2d');
    ctx.drawImage(t.r.domElement, 0, 0, target2d.width, target2d.height);
  }

  window.ShaderPreview = ShaderPreview;
  window.renderThumbnail = renderThumbnail;
})();
