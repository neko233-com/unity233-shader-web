/* ===== Unity233 Shader Studio — 着色器模板与默认值 ===== */
window.UnityShader = (function () {
  // 默认顶点着色器：提供常用 varying（UV / 法线 / 世界坐标 / 视线方向）
  const DEFAULT_VERTEX = `varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPosition = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

  // 片段着色器公共头：声明系统 uniform 与 varying（请勿在片段中重复声明）
  const FRAG_HEADER = `precision highp float;
uniform float u_time;
uniform vec2  u_resolution;
uniform float u_speed;
uniform float u_scale;
uniform vec3  u_colorA;
uniform vec3  u_colorB;
uniform vec3  u_lightDir;
uniform vec3  u_lightColor;
uniform vec3  u_ambient;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewDir;
`;

  // 可用 uniform 说明（用于工作台提示）
  const UNIFORM_DOCS = [
    { name: 'u_time', type: 'float', desc: '运行时间（秒），自动递增' },
    { name: 'u_resolution', type: 'vec2', desc: '画布分辨率' },
    { name: 'u_speed', type: 'float', desc: '速度（工作台可调）' },
    { name: 'u_scale', type: 'float', desc: '缩放（工作台可调）' },
    { name: 'u_colorA', type: 'vec3', desc: '主色（工作台可调）' },
    { name: 'u_colorB', type: 'vec3', desc: '辅色（工作台可调）' },
    { name: 'u_lightDir', type: 'vec3', desc: '主光方向（URP 预览光源）' },
    { name: 'u_lightColor', type: 'vec3', desc: '主光颜色' },
    { name: 'u_ambient', type: 'vec3', desc: '环境光颜色' }
  ];

  const TEMPLATES = [
    {
      id: 'basic_color', name: '基础纯色', category: '基础',
      desc: '最简单的着色器：直接用主色填充模型。',
      frag: `void main() {
  gl_FragColor = vec4(u_colorA, 1.0);
}`
    },
    {
      id: 'uv_view', name: 'UV 可视化', category: '基础',
      desc: '将模型的 UV 坐标映射为红绿颜色，常用于调试。',
      frag: `void main() {
  gl_FragColor = vec4(vUv, 0.0, 1.0);
}`
    },
    {
      id: 'normal_view', name: '法线可视化', category: '基础',
      desc: '将世界法线方向映射为 RGB 颜色。',
      frag: `void main() {
  gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);
}`
    },
    {
      id: 'gradient', name: '垂直渐变', category: '基础',
      desc: '沿 UV.y 在主色与辅色之间做线性渐变。',
      frag: `void main() {
  float t = clamp(vUv.y, 0.0, 1.0);
  vec3 col = mix(u_colorA, u_colorB, t);
  gl_FragColor = vec4(col, 1.0);
}`
    },
    {
      id: 'fresnel', name: '菲涅尔边缘光', category: '光照',
      desc: '基于视线的菲涅尔项，边缘越亮，类似釉面/玻璃效果。',
      frag: `void main() {
  float f = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.0);
  vec3 col = mix(u_colorA, u_colorB, f);
  gl_FragColor = vec4(col, 1.0);
}`
    },
    {
      id: 'toon', name: '卡通分层', category: '光照',
      desc: '对漫反射做阶梯量化，得到卡通渲染的色块感。',
      frag: `void main() {
  float d = max(dot(vNormal, normalize(vec3(0.5, 0.8, 0.6))), 0.0);
  float level = floor(d * 4.0) / 4.0;
  vec3 col = u_colorA * (0.3 + 0.7 * level);
  gl_FragColor = vec4(col, 1.0);
}`
    },
    {
      id: 'halflambert', name: '半兰伯特光照', category: '光照',
      desc: 'Half-Lambert 漫反射，暗部更柔和，无死黑。',
      frag: `void main() {
  vec3 L = normalize(vec3(0.6, 0.8, 0.4));
  float ndl = dot(vNormal, L) * 0.5 + 0.5;
  vec3 col = u_colorA * ndl;
  gl_FragColor = vec4(col, 1.0);
}`
    },
    {
      id: 'water', name: '波纹水面', category: '程序化',
      desc: '用两层正弦叠加模拟水面波纹，随时间流动。',
      frag: `void main() {
  vec2 uv = vUv * u_scale;
  float w = sin(uv.x * 10.0 + u_time * u_speed) * 0.5 + 0.5;
  w *= sin(uv.y * 10.0 - u_time * u_speed) * 0.5 + 0.5;
  vec3 col = mix(u_colorA, u_colorB, w);
  gl_FragColor = vec4(col, 1.0);
}`
    },
    {
      id: 'noise', name: '白噪声', category: '程序化',
      desc: '基于哈希函数的程序化噪声，可调缩放。',
      frag: `float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 uv = floor(vUv * u_scale * 20.0);
  float n = hash(uv);
  gl_FragColor = vec4(vec3(n), 1.0);
}`
    },
    {
      id: 'checker', name: '棋盘格', category: '程序化',
      desc: '经典棋盘格图案，常用于地面/测试。',
      frag: `void main() {
  vec2 uv = floor(vUv * u_scale * 10.0);
  float c = mod(uv.x + uv.y, 2.0);
  vec3 col = mix(u_colorA, u_colorB, c);
  gl_FragColor = vec4(col, 1.0);
}`
    },
    {
      id: 'scanline', name: '扫描线', category: '特效',
      desc: '横向扫描线，带时间滚动，赛博感十足。',
      frag: `void main() {
  float s = sin((vUv.y + u_time * u_speed * 0.1) * 60.0) * 0.5 + 0.5;
  vec3 col = u_colorA * (0.4 + 0.6 * s);
  gl_FragColor = vec4(col, 1.0);
}`
    },
    {
      id: 'dissolve', name: '溶解', category: '特效',
      desc: '基于噪声阈值做溶解裁剪，边缘带辉光。',
      frag: `float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  float n = hash(floor(vUv * 40.0));
  float t = fract(u_time * u_speed * 0.08);
  if (n < t) discard;
  vec3 glow = u_colorB * smoothstep(t, t + 0.06, n);
  vec3 col = mix(u_colorA, glow, 0.5);
  gl_FragColor = vec4(col, 1.0);
}`
    },
    {
      id: 'hologram', name: '全息投影', category: '特效',
      desc: '菲涅尔 + 竖向扫描 + 闪烁，全息质感。',
      frag: `void main() {
  float f = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.0);
  float scan = sin(vWorldPosition.y * 20.0 - u_time * u_speed * 2.0) * 0.5 + 0.5;
  float flick = 0.85 + 0.15 * sin(u_time * 30.0);
  vec3 col = u_colorA * (f * 1.5 + 0.2) * (0.5 + 0.5 * scan) * flick;
  gl_FragColor = vec4(col, 1.0);
}`
    },
    {
      id: 'pulse', name: '脉动发光', category: '特效',
      desc: '随时间在主辅色间脉动，并叠加边缘光。',
      frag: `void main() {
  float p = sin(u_time * u_speed * 2.0) * 0.5 + 0.5;
  float f = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.0);
  vec3 col = mix(u_colorA, u_colorB, p) * (0.4 + 0.8 * p + f);
  gl_FragColor = vec4(col, 1.0);
}`
    }
  ];

  function buildCombined(frag, vertex) {
    return `// [VERTEX]\n${vertex || DEFAULT_VERTEX}\n\n// [FRAGMENT]\n${frag}\n`;
  }

  return {
    DEFAULT_VERTEX, FRAG_HEADER, UNIFORM_DOCS, TEMPLATES, buildCombined,
    getTemplate: (id) => TEMPLATES.find(t => t.id === id)
  };
})();
