/* ===== Unity233 Shader Studio — 本地存储（收藏 + 导出历史） ===== */
window.Store = (function () {
  const FAV = 'u3_fav';
  const HIST = 'u3_export_hist';

  function read(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function getFav() { return read(FAV); }
  function isFav(id) { return getFav().some(f => f.id === id); }
  // item: { id, name, kind, desc?, thumb? }  —— 收藏的是“入口”，重新打开时按 kind 载入
  function toggleFav(item) {
    let a = getFav();
    const i = a.findIndex(f => f.id === item.id);
    if (i >= 0) a.splice(i, 1);
    else a.unshift(item);
    write(FAV, a);
    return i < 0; // true = 已收藏
  }

  function getHist() { return read(HIST); }
  function addHist(rec) {
    let a = getHist();
    a.unshift({ t: Date.now(), ...rec });
    if (a.length > 60) a = a.slice(0, 60);
    write(HIST, a);
  }
  function clearHist() { write(HIST, []); }

  return { getFav, isFav, toggleFav, getHist, addHist, clearHist };
})();
