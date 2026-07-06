/* ===== Unity233 Shader Studio — 我的（收藏模板 + 导出历史，本地保存） ===== */
const MyView = (function () {
  function timeAgo(t) {
    const d = Date.now() - t;
    if (d < 60000) return '刚刚';
    if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前';
    if (d < 86400000) return Math.floor(d / 3600000) + ' 小时前';
    const dt = new Date(t);
    return dt.getMonth() + 1 + '/' + dt.getDate() + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
  }
  function render(root) {
    root.innerHTML = `
      <div class="my-head">
        <h2>我的</h2>
        <span style="color:var(--txt-dim);font-size:13px">收藏的模板与导出历史都保存在本地浏览器</span>
      </div>
      <div class="my-cols">
        <div class="my-col">
          <h3>★ 收藏模板 <span class="my-count" id="my-fav-count"></span></h3>
          <div id="my-fav" class="my-list"></div>
        </div>
        <div class="my-col">
          <h3>⬇ 导出历史 <button class="btn ghost" id="my-clear" style="float:right;padding:3px 10px;font-size:12px">清空</button></h3>
          <div id="my-hist" class="my-list"></div>
        </div>
      </div>`;

    const favs = window.Store.getFav();
    const hist = window.Store.getHist();
    const favEl = root.querySelector('#my-fav');
    const histEl = root.querySelector('#my-hist');
    root.querySelector('#my-fav-count').textContent = '(' + favs.length + ')';

    if (favs.length === 0) {
      favEl.innerHTML = '<div class="my-empty">还没有收藏。去「模板中心」点卡片上的 ★ 收藏喜欢的效果。</div>';
    } else {
      favs.forEach(f => {
        const row = document.createElement('div');
        row.className = 'my-row';
        const badge = f.kind === 'urp' ? '<span class="tcat" style="background:rgba(124,92,255,.16);color:#b9a6ff">URP</span>' : '<span class="tcat">GLSL</span>';
        row.innerHTML = `<div class="my-meta"><b>${f.name}</b> ${badge}<div style="color:var(--txt-dim);font-size:12px">${f.desc || ''}</div></div>
          <div class="my-actions"><button class="btn ghost" data-open>打开</button><button class="btn ghost" data-un>取消收藏</button></div>`;
        row.querySelector('[data-open]').onclick = () => {
          window.App.navigate('workbench');
          if (f.kind === 'urp') window.Workbench.loadURP(f.id); else window.Workbench.loadTemplate(f.id);
        };
        row.querySelector('[data-un]').onclick = () => { window.Store.toggleFav(f); render(root); };
        favEl.appendChild(row);
      });
    }

    if (hist.length === 0) {
      histEl.innerHTML = '<div class="my-empty">还没有导出记录。在工作台 / 模板中心 / 转译器点「导出」即可在这里找回。</div>';
    } else {
      hist.forEach((h, i) => {
        const row = document.createElement('div');
        row.className = 'my-row';
        row.innerHTML = `<div class="my-meta"><b>${h.name}</b> <span class="tcat">${h.kind || ''}</span><div style="color:var(--txt-dim);font-size:12px">${timeAgo(h.t)}</div></div>
          <div class="my-actions"><button class="btn ghost" data-copy>复制</button><button class="btn ghost" data-del>删除</button></div>`;
        row.querySelector('[data-copy]').onclick = () => {
          if (navigator.clipboard && h.code) navigator.clipboard.writeText(h.code).then(() => toast('已复制', 'ok'), () => toast('复制失败', 'err'));
          else if (h.code) toast('当前环境不支持复制', 'err');
          else toast('该记录无源码', 'err');
        };
        row.querySelector('[data-del]').onclick = () => {
          const a = window.Store.getHist(); a.splice(i, 1);
          try { localStorage.setItem('u3_export_hist', JSON.stringify(a)); } catch (e) {}
          render(root);
        };
        histEl.appendChild(row);
      });
    }

    root.querySelector('#my-clear').onclick = () => { window.Store.clearHist(); render(root); toast('已清空导出历史', 'ok'); };
  }
  return { render };
})();
window.MyView = MyView;
