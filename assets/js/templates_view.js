/* ===== Unity233 Shader Studio — 模板中心（URP 真实 .shader + GLSL 片段） ===== */
const TemplatesView = (function () {
  let cur = '全部';
  function merged() {
    return [
      ...window.UrpTemplates.TEMPLATES.map(t => ({ ...t, kind: 'urp' })),
      ...window.UnityShader.TEMPLATES.map(t => ({ ...t, kind: 'glsl' }))
    ];
  }
  function download(name, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name + '.shader';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }
  function render(root) {
    const all = merged();
    const cats = ['全部', ...Array.from(new Set(all.map(t => t.category)))];
    root.innerHTML = `
      <div class="tpl-head">
        <h2>模板中心</h2>
        <span style="color:var(--txt-dim);font-size:13px">点击卡片载入工作台预览 · URP 模板可导出真实 .shader 文件</span>
      </div>
      <div class="tpl-cats" id="tpl-cats"></div>
      <div class="tpl-grid" id="tpl-grid"></div>`;
    const catsEl = root.querySelector('#tpl-cats');
    cats.forEach(c => {
      const p = document.createElement('div');
      p.className = 'cat-pill' + (c === cur ? ' active' : '');
      p.textContent = c;
      p.onclick = () => { cur = c; render(root); };
      catsEl.appendChild(p);
    });
    const grid = root.querySelector('#tpl-grid');
    all.forEach(t => {
      if (cur !== '全部' && t.category !== cur) return;
      const card = document.createElement('div');
      card.className = 'tpl-card';
      const badge = t.kind === 'urp' ? '<span class="tcat" style="background:rgba(124,92,255,.16);color:#b9a6ff">URP · 可导出</span>' : '<span class="tcat">GLSL 片段</span>';
      const expBtn = t.kind === 'urp' ? `<button class="btn ghost" data-exp style="margin-top:10px;padding:5px 10px;font-size:12px">⬇ 导出 .shader</button>` : '';
      card.innerHTML = `
        <div class="tpl-thumb"><canvas width="320" height="180"></canvas></div>
        <div class="tpl-body">
          <h3>${t.name}</h3>
          <p>${t.desc}</p>
          ${badge}
          <div>${expBtn}</div>
        </div>`;
      card.querySelector('.tpl-thumb').onclick = () => openTpl(t);
      card.querySelector('h3').onclick = () => openTpl(t);
      card.querySelector('p').onclick = () => openTpl(t);
      const eb = card.querySelector('[data-exp]');
      if (eb) eb.onclick = (e) => { e.stopPropagation(); download(t.id, t.shaderLab); toast('已导出 ' + t.id + '.shader', 'ok'); };
      grid.appendChild(card);
      const cv = card.querySelector('canvas');
      const frag = t.kind === 'urp' ? (window.UrpTemplates.PREVIEW_LIB + t.previewFrag) : t.frag;
      requestAnimationFrame(() => window.renderThumbnail(frag, window.UnityShader.DEFAULT_VERTEX, cv, { mesh: 'sphere', time: 1.4 }));
    });
  }
  function openTpl(t) {
    window.App.navigate('workbench');
    if (t.kind === 'urp') Workbench.loadURP(t.id);
    else Workbench.loadTemplate(t.id);
  }
  return { render };
})();
