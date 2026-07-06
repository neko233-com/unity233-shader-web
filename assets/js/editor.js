/* ===== Unity233 Shader Studio — 工作台（编辑器 + 预览 + 控制） ===== */
const Workbench = (function () {
  let initialized = false;
  let cm, preview, state = { mode: 'glsl', previewFrag: '', shaderLab: '', tplId: '' };
  const $ = (s, r) => (r || document).querySelector(s);

  function parseCombined(src) {
    const lines = src.split('\n');
    let part = null, vertex = [], fragment = [];
    for (const ln of lines) {
      const t = ln.trim();
      if (t === '// [VERTEX]') { part = 'v'; continue; }
      if (t === '// [FRAGMENT]') { part = 'f'; continue; }
      if (part === 'v') vertex.push(ln);
      else if (part === 'f') fragment.push(ln);
    }
    return { vertex: vertex.join('\n'), fragment: fragment.join('\n') };
  }

  function buildDOM(root) {
    root.innerHTML = `
      <div class="wb-left">
        <div class="wb-toolbar">
          <button class="btn primary" id="wb-run">▶ 运行预览</button>
          <button class="btn ghost" id="wb-reset">重置默认</button>
          <button class="btn ghost" id="wb-save">保存</button>
          <button class="btn ghost" id="wb-copy">复制</button>
          <button class="btn ghost" id="wb-export" style="display:none">⬇ 导出 .shader</button>
          <span class="spacer"></span>
          <span class="tag" id="wb-stat">就绪</span>
          <span class="tag" id="wb-mode" style="color:var(--accent)">GLSL</span>
        </div>
        <div class="editor-wrap"><textarea id="cm"></textarea></div>
      </div>
      <div class="wb-right">
        <div class="wb-preview" id="wb-preview">
          <div class="pv-badge" id="wb-badge">Sphere</div>
          <div class="pv-err" id="wb-err"></div>
        </div>
        <div class="panel-block">
          <h4>实时参数</h4>
          <div class="row"><label>速度</label><input type="range" id="p-speed" min="0" max="4" step="0.01" value="1"><span class="val" id="v-speed">1.0</span></div>
          <div class="row"><label>缩放</label><input type="range" id="p-scale" min="0.1" max="6" step="0.01" value="1"><span class="val" id="v-scale">1.0</span></div>
          <div class="row"><label>主色 A</label><input type="color" class="swatch" id="p-ca" value="#4090ff"><label style="width:auto">辅色 B</label><input type="color" class="swatch" id="p-cb" value="#ff5ab3"></div>
        </div>
        <div class="panel-block" id="wb-light">
          <h4>光照（URP 预览）</h4>
          <div class="row"><label>方位</label><input type="range" id="p-az" min="0" max="360" value="35"><span class="val" id="v-az">35</span></div>
          <div class="row"><label>高度</label><input type="range" id="p-el" min="-90" max="90" value="35"><span class="val" id="v-el">35</span></div>
          <div class="row"><label>光色</label><input type="color" class="swatch" id="p-lc" value="#ffffff"><label style="width:auto">环境</label><input type="color" class="swatch" id="p-amb" value="#2a2e38"></div>
        </div>
        <div class="panel-block">
          <h4>预览模型</h4>
          <div class="mesh-grid" id="wb-mesh">
            <button data-m="sphere" class="active">球体</button>
            <button data-m="box">立方体</button>
            <button data-m="plane">平面</button>
            <button data-m="torus">圆环</button>
            <button data-m="torusKnot">环面结</button>
            <button data-m="cylinder">圆柱</button>
          </div>
          <label class="chk" style="margin-top:12px"><input type="checkbox" id="p-rot" checked> 自动旋转</label>
        </div>
        <div class="panel-block">
          <h4>可用 Uniform</h4>
          <div id="wb-unidocs" style="font-size:12px;color:var(--txt-dim);line-height:1.8"></div>
        </div>
      </div>`;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    const root = document.getElementById('view-workbench');
    buildDOM(root);

    const saved = localStorage.getItem('u3_wb_src');
    const def = window.UnityShader.buildCombined(window.UnityShader.getTemplate('fresnel').frag);
    const src = saved || def;

    cm = CodeMirror.fromTextArea(document.getElementById('cm'), {
      mode: 'x-shader/x-fragment', theme: 'material-darker',
      lineNumbers: true, matchBrackets: true, indentUnit: 2,
      viewportMargin: Infinity, tabSize: 2
    });
    cm.setValue(src);

    preview = new ShaderPreview(document.getElementById('wb-preview'));
    preview.start();

    document.getElementById('wb-unidocs').innerHTML =
      window.UnityShader.UNIFORM_DOCS.map(u =>
        `<div><code style="color:var(--accent)">${u.name}</code> <span style="color:var(--txt-dim)">(${u.type})</span> — ${u.desc}</div>`
      ).join('');

    const pref = window.Settings ? window.Settings.get() : null;
    if (pref) {
      document.getElementById('p-speed').value = pref.speed;
      document.getElementById('v-speed').textContent = (+pref.speed).toFixed(2);
      document.getElementById('p-scale').value = pref.scale;
      document.getElementById('v-scale').textContent = (+pref.scale).toFixed(2);
      document.getElementById('p-ca').value = pref.colorA;
      document.getElementById('p-cb').value = pref.colorB;
      document.getElementById('p-rot').checked = pref.autorotate;
      document.getElementById('wb-badge').textContent = { sphere:'球体', box:'立方体', plane:'平面', torus:'圆环', torusKnot:'环面结', cylinder:'圆柱' }[pref.mesh] || '球体';
      document.querySelectorAll('#wb-mesh button').forEach(b => b.classList.toggle('active', b.dataset.m === pref.mesh));
      preview.setMesh(pref.mesh);
      preview.setAutoRotate(pref.autorotate);
      preview.setParams({ speed: pref.speed, scale: pref.scale, colorA: pref.colorA, colorB: pref.colorB });
      preview.renderer.setClearColor(new THREE.Color(pref.bg), 1);
    }

    // 事件
    document.getElementById('wb-run').onclick = run;
    document.getElementById('wb-reset').onclick = () => {
      state.mode = 'glsl';
      document.getElementById('wb-mode').textContent = 'GLSL';
      document.getElementById('wb-export').style.display = 'none';
      cm.setValue(window.UnityShader.buildCombined(window.UnityShader.getTemplate('fresnel').frag));
      run();
    };
    document.getElementById('wb-save').onclick = () => {
      localStorage.setItem('u3_wb_src', cm.getValue());
      toast('已保存到本地', 'ok');
    };
    document.getElementById('wb-copy').onclick = copyShader;
    document.getElementById('wb-export').onclick = exportShader;

    const speed = document.getElementById('p-speed');
    const scale = document.getElementById('p-scale');
    speed.oninput = () => { document.getElementById('v-speed').textContent = (+speed.value).toFixed(2); preview.setParams({ speed: +speed.value }); };
    scale.oninput = () => { document.getElementById('v-scale').textContent = (+scale.value).toFixed(2); preview.setParams({ scale: +scale.value }); };
    document.getElementById('p-ca').oninput = e => preview.setParams({ colorA: e.target.value });
    document.getElementById('p-cb').oninput = e => preview.setParams({ colorB: e.target.value });
    document.getElementById('p-rot').onchange = e => preview.setAutoRotate(e.target.checked);
    document.querySelectorAll('#wb-mesh button').forEach(b => {
      b.onclick = () => {
        document.querySelectorAll('#wb-mesh button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        preview.setMesh(b.dataset.m);
        document.getElementById('wb-badge').textContent = b.textContent;
      };
    });

    // 光照
    const az = document.getElementById('p-az'), el = document.getElementById('p-el');
    function applyLight() {
      const a = (+az.value) * Math.PI / 180, e = (+el.value) * Math.PI / 180;
      document.getElementById('v-az').textContent = az.value;
      document.getElementById('v-el').textContent = el.value;
      preview.setLight({ dir: { x: Math.cos(e) * Math.sin(a), y: Math.sin(e), z: Math.cos(e) * Math.cos(a) } });
    }
    az.oninput = applyLight; el.oninput = applyLight;
    applyLight();
    document.getElementById('p-lc').oninput = e => preview.setLight({ color: e.target.value });
    document.getElementById('p-amb').oninput = e => preview.setLight({ ambient: e.target.value });

    run();
    state.cm = cm; state.preview = preview;
  }

  function run() {
    let frag;
    if (state.mode === 'glsl') {
      const src = cm.getValue();
      const { vertex, fragment } = parseCombined(src);
      state._vert = vertex; frag = fragment;
    } else {
      frag = state.previewFrag;
    }
    const res = preview.setShader(state._vert, frag);
    const errBox = document.getElementById('wb-err');
    const stat = document.getElementById('wb-stat');
    if (!res.ok) {
      errBox.style.display = 'block';
      errBox.textContent = res.error;
      stat.textContent = '编译失败';
      stat.style.color = 'var(--bad)';
    } else {
      errBox.style.display = 'none';
      stat.textContent = '运行中 ●';
      stat.style.color = 'var(--good)';
    }
  }

  function onShow() {
    init();
    requestAnimationFrame(() => { if (preview) preview.resize(); cm.refresh(); });
  }

  function loadTemplate(id) {
    init();
    const t = window.UnityShader.getTemplate(id);
    if (!t) return;
    state.mode = 'glsl';
    document.getElementById('wb-mode').textContent = 'GLSL';
    document.getElementById('wb-export').style.display = 'none';
    cm.setValue(window.UnityShader.buildCombined(t.frag));
    state.previewFrag = t.frag;
    run();
    toast('已载入模板：' + t.name, 'ok');
  }

  function loadURPContent(shaderLab, previewFrag, id) {
    init();
    state.mode = 'urp';
    state.shaderLab = shaderLab;
    state.previewFrag = previewFrag;
    state.tplId = id || 'graph';
    document.getElementById('wb-mode').textContent = 'URP';
    document.getElementById('wb-export').style.display = 'inline-block';
    cm.setValue(shaderLab);
    run();
  }

  function loadURP(id) {
    init();
    const t = window.UrpTemplates.get(id);
    if (!t) return;
    loadURPContent(t.shaderLab, window.UrpTemplates.PREVIEW_LIB + t.previewFrag, t.id);
    toast('已载入 URP 模板：' + t.name, 'ok');
  }

  function exportShader() {
    if (!state.shaderLab) { toast('当前没有可导出的 URP 文件', 'err'); return; }
    const name = (state.tplId || 'Shader') + '.shader';
    const blob = new Blob([state.shaderLab], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
    toast('已导出 ' + name, 'ok');
  }

  function copyShader() {
    const text = cm.getValue();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('已复制', 'ok'), fallbackCopy.bind(null, text));
    } else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('已复制', 'ok'); } catch (e) { toast('复制失败', 'err'); }
    ta.remove();
  }

  return { init, onShow, run, loadTemplate, loadURP, exportShader, copyShader, getPreview: () => preview };
})();
