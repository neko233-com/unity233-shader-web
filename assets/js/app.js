/* ===== Unity233 Shader Studio — 应用路由 ===== */
window.toast = function (msg, kind) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (kind ? ' ' + kind : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ''; }, 2200);
};

const App = (function () {
  const renderers = {
    home: (r) => Home.render(r),
    templates: (r) => TemplatesView.render(r),
    settings: (r) => Settings.render(r),
    nodes: (r) => NodeEditor.render(r)
  };
  const rendered = {};

  function navigate(view) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const sec = document.getElementById('view-' + view);
    sec.classList.add('active');

    if (!rendered[view] && renderers[view]) { renderers[view](sec); rendered[view] = true; }

    if (view === 'workbench') Workbench.onShow();
    window.scrollTo(0, 0);
  }

  function start() {
    document.querySelectorAll('.nav-item').forEach(b => {
      b.onclick = () => navigate(b.dataset.view);
    });
    // 初始首页
    Home.render(document.getElementById('view-home'));
    rendered.home = true;
  }

  return { navigate, start };
})();
window.App = App;

window.addEventListener('DOMContentLoaded', () => App.start());
window.addEventListener('resize', () => {
  const pv = window.Workbench && window.Workbench.getPreview && window.Workbench.getPreview();
  if (pv && document.getElementById('view-workbench').classList.contains('active')) pv.resize();
});
