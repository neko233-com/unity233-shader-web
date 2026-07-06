/* ===== Unity233 Shader Studio — 首页 ===== */
const Home = (function () {
  function render(root) {
    const feats = window.UrpTemplates.TEMPLATES.slice(0, 6);
    root.innerHTML = `
      <div class="home-hero">
        <h1>用 <span class="grad">Web</span> 编写 Unity 2022 <span class="grad">URP</span> 着色器</h1>
        <p>Unity233 Shader Studio 是一款面向 Unity 2022（URP 通用渲染管线）的网页版着色器工具。
        左侧写代码 / 节点连线，右侧实时预览；所有模板均为<strong>可直接粘贴进 Unity 的真实 URP .shader 文件</strong>。
        预览用 WebGL 近似 URP 光照，方便快速迭代。</p>
        <div class="home-cta">
          <button class="btn primary" id="h-open-wb">进入工作台 →</button>
          <button class="btn ghost" id="h-open-tpl">浏览 URP 模板</button>
        </div>
      </div>

      <div class="home-section-title">快速开始</div>
      <div class="home-cards">
        <div class="hcard" data-go="workbench">
          <div class="hico">🧪</div><h3>工作台</h3>
          <p>编写 URP ShaderLab / HLSL，右侧 3D 模型实时预览；支持导出 .shader、复制源码、调节光照与参数。</p>
        </div>
        <div class="hcard" data-go="templates">
          <div class="hico">📚</div><h3>模板中心</h3>
          <p>10 个真实 URP 模板：Lit(PBR) / Unlit / Toon / Dissolve / Water / Hologram / Outline / SimpleLit / CustomLit / Fresnel，一键载入。</p>
        </div>
        <div class="hcard" data-go="nodes">
          <div class="hico">🔗</div><h3>URP 节点编辑器</h3>
          <p>像 Shader Graph 一样拖拽节点连线，自动编译为真实 URP .shader（UniversalFragmentPBR）+ 浏览器预览端口。</p>
        </div>
        <div class="hcard" data-go="settings">
          <div class="hico">⚙️</div><h3>设置</h3>
          <p>调整默认预览模型、旋转、背景与光照偏好。管线固定为 URP。</p>
        </div>
      </div>

      <div class="home-section-title">精选 URP 模板</div>
      <div class="home-feat" id="h-feat"></div>
    `;
    const feat = root.querySelector('#h-feat');
    feats.forEach(t => {
      const el = document.createElement('div');
      el.className = 'feat';
      el.innerHTML = `<div class="ft">✦ ${t.name}</div><p>${t.desc}</p>`;
      el.style.cursor = 'pointer';
      el.onclick = () => { window.App.navigate('templates'); };
      feat.appendChild(el);
    });
    root.querySelector('#h-open-wb').onclick = () => window.App.navigate('workbench');
    root.querySelector('#h-open-tpl').onclick = () => window.App.navigate('templates');
    root.querySelectorAll('.hcard').forEach(c => { c.onclick = () => window.App.navigate(c.dataset.go); });
  }
  return { render };
})();
