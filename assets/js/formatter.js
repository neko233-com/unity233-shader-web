/* ===== Unity233 Shader Studio — 代码格式化（GLSL / HLSL / ShaderLab 缩进美化） ===== */
window.ShaderFormatter = (function () {
  // 基于花括号深度的极简美化：保留原语义，只重排缩进与空行。
  function beautify(code) {
    if (!code) return '';
    const raw = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = raw.split('\n');
    const out = [];
    let depth = 0;
    const IND = '  ';
    for (let l of lines) {
      let line = l.replace(/\s+$/g, '');
      if (line.trim() === '') {
        // 压缩连续空行：最多保留一个空行
        if (out.length && out[out.length - 1] === '') continue;
        out.push('');
        continue;
      }
      line = line.trim();

      // 预处理器指令（#pragma / #include / #define 等）保持原缩进但不参与括号计数
      const isPre = /^\s*#/.test(line);

      // 以闭合括号开头 → 先减一档
      if (/^[)}\]]/.test(line)) depth = Math.max(0, depth - 1);

      if (!isPre) out.push(IND.repeat(depth) + line);
      else out.push(line);

      if (!isPre) {
        const opens = (line.match(/[{(]/g) || []).length;
        const closes = (line.match(/[})]/g) || []).length;
        depth += opens - closes;
        if (depth < 0) depth = 0;
      }
    }
    // 尾部空行清理
    while (out.length && out[out.length - 1] === '') out.pop();
    return out.join('\n');
  }

  // 轻量压缩（导出前可选）：去掉注释与多余空白。这里仅提供行级压缩，供“复制紧凑版”使用。
  function minify(code) {
    return code
      .split('\n')
      .map(l => l.replace(/\/\/.*$/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
  }

  return { beautify, minify };
})();
