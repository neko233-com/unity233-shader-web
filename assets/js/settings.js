/* ===== Unity233 Shader Studio — 设置 ===== */
const Settings = (function () {
  const KEY = 'u3_settings';
  const DEFAULTS = { mesh:'sphere', autorotate:true, colorA:'#4090ff', colorB:'#ff5ab3', speed:1.0, scale:1.0, bg:'#0c0c0e' };
  function get(){ try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY)||'{}')); } catch(e){ return {...DEFAULTS}; } }
  function set(p){ localStorage.setItem(KEY, JSON.stringify(p)); }

  function render(root){
    const p = get();
    root.innerHTML = `
      <div class="set-wrap">
        <h2>设置</h2>
        <p class="sub">这些偏好会在工作台初始化时应用。修改后点击“保存并应用”。</p>
        <div style="margin-bottom:18px"><span style="display:inline-block;background:rgba(124,92,255,.18);color:#b9a6ff;border:1px solid #5a4b8a;padding:5px 12px;border-radius:20px;font-size:12px">渲染管线：URP（Universal Render Pipeline）· 仅支持 URP</span></div>

        <div class="set-row">
          <div class="lbl"><b>默认预览模型</b><span>工作台打开时使用的 3D 模型</span></div>
          <select id="s-mesh">
            <option value="sphere">球体</option><option value="box">立方体</option>
            <option value="plane">平面</option><option value="torus">圆环</option>
            <option value="torusKnot">环面结</option><option value="cylinder">圆柱</option>
          </select>
        </div>
        <div class="set-row">
          <div class="lbl"><b>自动旋转</b><span>预览模型是否自动旋转</span></div>
          <label class="chk"><input type="checkbox" id="s-rot"> 启用</label>
        </div>
        <div class="set-row">
          <div class="lbl"><b>主色 / 辅色</b><span>片段着色器 u_colorA / u_colorB 默认值</span></div>
          <div style="display:flex;gap:8px"><input type="color" class="swatch" id="s-ca" value="${p.colorA}"><input type="color" class="swatch" id="s-cb" value="${p.colorB}"></div>
        </div>
        <div class="set-row">
          <div class="lbl"><b>默认速度 / 缩放</b><span>u_speed / u_scale 初始值</span></div>
          <div style="display:flex;gap:14px;align-items:center">
            <span style="font-size:12px;color:var(--txt-dim)">速度</span><input type="range" id="s-speed" min="0" max="4" step="0.01" value="${p.speed}" style="width:120px">
            <span style="font-size:12px;color:var(--txt-dim)">缩放</span><input type="range" id="s-scale" min="0.1" max="6" step="0.01" value="${p.scale}" style="width:120px">
          </div>
        </div>
        <div class="set-row">
          <div class="lbl"><b>预览背景</b><span>预览画布清除颜色</span></div>
          <input type="color" class="swatch" id="s-bg" value="${p.bg}">
        </div>

        <div style="margin-top:24px;display:flex;gap:10px">
          <button class="btn primary" id="s-save">保存并应用</button>
          <button class="btn ghost" id="s-reset">恢复默认</button>
        </div>

        <div class="set-note">
          <b>关于 Unity 着色器</b><br>
          本工具在浏览器中使用 WebGL（Three.js）实时预览，着色器语言为 GLSL ES（与 Unity 的 HLSL 高度相似）。
          系统已内置常用 Unity 风格的 uniform：u_time、u_resolution、u_speed、u_scale、u_colorA、u_colorB，
          以及 varying：vUv、vNormal、vWorldPosition、vViewDir，可直接在片段着色器中使用。
        </div>
      </div>`;

    root.querySelector('#s-mesh').value = p.mesh;
    root.querySelector('#s-rot').checked = p.autorotate;
    root.querySelector('#s-save').onclick = () => {
      const np = {
        mesh: root.querySelector('#s-mesh').value,
        autorotate: root.querySelector('#s-rot').checked,
        colorA: root.querySelector('#s-ca').value,
        colorB: root.querySelector('#s-cb').value,
        speed: +root.querySelector('#s-speed').value,
        scale: +root.querySelector('#s-scale').value,
        bg: root.querySelector('#s-bg').value
      };
      set(np);
      applyLive(np);
      toast('设置已保存', 'ok');
    };
    root.querySelector('#s-reset').onclick = () => { set({...DEFAULTS}); render(root); toast('已恢复默认', 'ok'); };
  }

  function applyLive(p){
    const pv = window.Workbench && window.Workbench.getPreview && window.Workbench.getPreview();
    if(pv){
      pv.setMesh(p.mesh); pv.setAutoRotate(p.autorotate);
      pv.setParams({ speed:p.speed, scale:p.scale, colorA:p.colorA, colorB:p.colorB });
      pv.renderer.setClearColor(new THREE.Color(p.bg), 1);
      // 同步工作台控件显示
      const sp = document.getElementById('p-speed'); if(sp){ sp.value=p.speed; document.getElementById('v-speed').textContent=p.speed.toFixed(2); }
      const sc = document.getElementById('p-scale'); if(sc){ sc.value=p.scale; document.getElementById('v-scale').textContent=p.scale.toFixed(2); }
      const ca = document.getElementById('p-ca'); if(ca) ca.value=p.colorA;
      const cb = document.getElementById('p-cb'); if(cb) cb.value=p.colorB;
      const rot = document.getElementById('p-rot'); if(rot) rot.checked=p.autorotate;
      const badge = document.getElementById('wb-badge'); if(badge){ const m={sphere:'球体',box:'立方体',plane:'平面',torus:'圆环',torusKnot:'环面结',cylinder:'圆柱'}; badge.textContent=m[p.mesh]||'球体'; }
      document.querySelectorAll('#wb-mesh button').forEach(b=>b.classList.toggle('active', b.dataset.m===p.mesh));
    }
  }

  return { render, get, applyLive };
})();
