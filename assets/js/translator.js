/* ===== Unity233 Shader Studio — GLSL ES → Unity URP HLSL 转译器 =====
 * 启发式转换：覆盖常见片段着色器写法（类型映射 / 纹理 / 插值器 / uniform → 属性）。
 * 复杂或非常规着色器请在 Unity 内复核。
 */
const ShaderTranslator = (function () {
  const PREVIEW_UNIFORMS = { u_lightDir: 1, u_lightColor: 1, u_ambient: 1 };
  const HLSL_TYPE = { vec2: 'float2', vec3: 'float3', vec4: 'float4', float: 'float', sampler2D: 'float4', samplerCube: 'float4' };
  const KNOWN_VARYINGS = {
    vUv: { field: 'uv', type: 'float2' },
    vUv1: { field: 'uv', type: 'float2' },
    vNormal: { field: 'normalWS', type: 'float3' },
    vWorldPosition: { field: 'positionWS', type: 'float3' },
    vPosition: { field: 'positionWS', type: 'float3' },
    vViewDir: { field: 'viewDirWS', type: 'float3' }
  };

  function toHlsl(code) {
    let s = code;
    s = s.replace(/\btexture2D\s*\(\s*([A-Za-z_]\w*)\s*,\s*([^)]+)\)/g, 'SAMPLE_TEXTURE2D($1, sampler_$1, $2)');
    s = s.replace(/\btexture\s*\(\s*([A-Za-z_]\w*)\s*,\s*([^)]+)\)/g, 'SAMPLE_TEXTURE2D($1, sampler_$1, $2)');
    s = s.replace(/\bvUv\b/g, 'IN.uv');
    s = s.replace(/\bvNormal\b/g, 'IN.normalWS');
    s = s.replace(/\bvWorldPosition\b/g, 'IN.positionWS');
    s = s.replace(/\bvPosition\b/g, 'IN.positionWS');
    s = s.replace(/\bvViewDir\b/g, 'GetWorldSpaceNormalizeViewDir(IN.positionWS)');
    s = s.replace(/\bmix\s*\(/g, 'lerp(');
    s = s.replace(/\bmod\s*\(/g, 'fmod(');
    s = s.replace(/\bgl_FragColor\b/g, 'outColor');
    s = s.replace(/\bgl_FragCoord\b/g, 'float4(0.0, 0.0, 0.0, 0.0)');
    s = s.replace(/\bu_time\b/g, '_Time.y');
    s = s.replace(/\bvec([234])\b/g, 'float$1');
    s = s.replace(/\bmat([234])\b/g, 'float$1x$1');
    return s;
  }

  function prettyName(name) {
    return name.replace(/^u_/, '').replace(/^_/, '').replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
  }
  function propType(glslType) {
    if (glslType === 'sampler2D' || glslType === 'samplerCube') return '2D';
    if (glslType === 'float') return 'Float';
    if (glslType === 'float2') return 'Vector';
    return 'Color';
  }

  function extractMainBody(src) {
    const i = src.search(/void\s+main\s*\(/);
    if (i < 0) return [];
    const j = src.indexOf('{', i);
    if (j < 0) return [];
    let depth = 0, started = false, body = '';
    for (let k = j; k < src.length; k++) {
      const c = src[k];
      if (c === '{') { depth++; if (depth === 1) { started = true; continue; } }
      if (c === '}') { depth--; if (depth === 0) break; }
      if (started) body += c;
    }
    const lines = []; let cur = '', d = 0;
    for (const c of body) {
      if (c === '{') d++; else if (c === '}') d--;
      if (c === ';' && d === 0) { const t = cur.trim(); if (t) lines.push(t); cur = ''; }
      else cur += c;
    }
    const tail = cur.trim(); if (tail) lines.push(tail);
    return lines;
  }

  function translate(src) {
    src = (src || '').replace(/\r\n/g, '\n');
    const lines = src.split('\n');
    const uniforms = [];
    const varyings = [];
    const userFuncs = [];
    let mainBody = [];
    let inFunc = false, funcDepth = 0, inMainSkip = false, mainSkipDepth = 0;

    for (let raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (/^\s*precision\b/.test(line)) continue;
      if (/^\s*attribute\b/.test(line)) continue;
      if (/^\s*uniform\b/.test(line)) {
        const m = line.match(/uniform\s+(\w+)\s+(\w+)\s*;/);
        if (m) { const isTex = (m[1] === 'sampler2D' || m[1] === 'samplerCube'); if (!PREVIEW_UNIFORMS[m[2]]) uniforms.push({ name: m[2], type: m[1], isTex }); }
        continue;
      }
      if (/^\s*varying\b/.test(line)) {
        const m = line.match(/varying\s+(\w+)\s+(\w+)\s*;/);
        if (m) varyings.push({ name: m[2], type: m[1] });
        continue;
      }
      if (/void\s+main\s*\(/.test(line)) {
        inMainSkip = true;
        mainSkipDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        if (mainSkipDepth <= 0) inMainSkip = false;
        continue;
      }
      if (inMainSkip) {
        mainSkipDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        if (mainSkipDepth <= 0) inMainSkip = false;
        continue;
      }
      // 其它函数定义（全局）
      if (/^\w[\w\s\*]*\s+\w+\s*\([^;]*\)\s*\{?$/.test(line) || /\b\w+\s*\([^)]*\)\s*\{/.test(line)) {
        inFunc = true; funcDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        userFuncs.push(line);
        if (funcDepth <= 0 && line.endsWith('{')) funcDepth = 1;
        continue;
      }
      if (inFunc) {
        userFuncs.push(line);
        funcDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        if (funcDepth <= 0) inFunc = false;
        continue;
      }
      userFuncs.push(line);
    }

    mainBody = extractMainBody(src);
    if (mainBody.length === 0 && userFuncs.length) {
      // 没有 main：把全局函数之外的全部当作主体（片段着色器片段）
      mainBody = userFuncs.slice();
      userFuncs.length = 0;
    }

    // 转换
    const uFuncsT = userFuncs.map(toHlsl);
    const mainT = mainBody.map(toHlsl);

    // 属性 + CBUFFER
    let propLines = [], cbLines = [], texDecl = '';
    uniforms.forEach(u => {
      if (u.isTex) {
        propLines.push(`        ${u.name}("${prettyName(u.name)}", 2D) = "white" {}`);
        texDecl += `            TEXTURE2D(${u.name}); SAMPLER(sampler_${u.name});\n`;
        cbLines.push(`                float4 ${u.name}_ST;`);
      } else {
        const ht = HLSL_TYPE[u.type] || u.type;
        propLines.push(`        ${u.name}("${prettyName(u.name)}", ${propType(u.type)}) = ${(u.type === 'float' ? '0.0' : '0')}`);
        cbLines.push(`                ${ht} ${u.name};`);
      }
    });

    // 插值器结构
    const vfields = [
      'float4 positionHCS : SV_POSITION',
      'float2 uv : TEXCOORD0',
      'float3 normalWS : TEXCOORD1',
      'float3 positionWS : TEXCOORD2',
      'float3 tangentWS : TEXCOORD3',
      'float3 bitangentWS : TEXCOORD4'
    ];
    const extra = varyings.filter(v => !KNOWN_VARYINGS[v.name]);
    let tc = 5;
    const extraInit = [];
    extra.forEach(v => {
      vfields.push(`float4 ${v.name} : TEXCOORD${tc++}`);
      extraInit.push(`OUT.${v.name} = float4(0,0,0,0);`);
    });

    const fragFuncs = uFuncsT.length ? uFuncsT.join('\n') + '\n' : '';

    const shaderLab = `Shader "Unity233/Translated/Shader"
{
    Properties
    {
${propLines.join('\n')}
        _Cutoff("Cutoff", Range(0,1)) = 0.5
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            Cull Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
${texDecl}            CBUFFER_START(UnityPerMaterial)
${cbLines.join('\n')}            CBUFFER_END

            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float4 tangentOS : TANGENT; float2 uv : TEXCOORD0; };
            struct Varyings  { ${vfields.join('; ')}; };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs vp = GetVertexPositionInputs(IN.positionOS.xyz);
                VertexNormalInputs vn = GetVertexNormalInputs(IN.normalOS, IN.tangentOS);
                OUT.positionHCS = vp.positionCS;
                OUT.uv = IN.uv;
                OUT.normalWS = vn.normalWS;
                OUT.positionWS = vp.positionWS;
                OUT.tangentWS = vn.tangentWS;
                OUT.bitangentWS = vn.bitangentWS;
${extraInit.join('\n')}
                return OUT;
            }

            ${fragFuncs}half4 frag(Varyings IN) : SV_Target
            {
                float4 outColor = float4(0.0, 0.0, 0.0, 1.0);
${mainT.map(l => '                ' + l).join('\n')}
                InputData id = (InputData)0;
                id.normalWS = IN.normalWS;
                id.positionWS = IN.positionWS;
                id.viewDirectionWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                id.bakedGI = SampleSH(IN.normalWS);
                SurfaceData sd = (SurfaceData)0;
                sd.albedo = outColor.rgb;
                sd.emission = float3(0.0, 0.0, 0.0);
                sd.alpha = outColor.a;
                sd.normalTS = float3(0.0, 0.0, 1.0);
                return UniversalFragmentPBR(id, sd);
            }
            ENDHLSL
        }
    }
}`;
    return shaderLab;
  }

  const SAMPLE = `// GLSL ES 示例：菲涅尔 + 渐变 + 时间动画
precision highp float;
uniform vec3 u_colorA;
uniform vec3 u_colorB;
uniform float u_time;
uniform sampler2D _MainTex;
varying vec2 vUv;
varying vec3 vNormal;

void main(){
  vec3 V = normalize(vViewDir);
  float fres = pow(1.0 - max(dot(vNormal, V), 0.0), 2.0);
  vec3 grad = mix(u_colorA, u_colorB, vUv.y + 0.2 * sin(u_time + vUv.x * 6.2831));
  vec3 base = grad + fres * vec3(1.0);
  vec3 tex = texture2D(_MainTex, vUv).rgb;
  gl_FragColor = vec4(base * tex, 1.0);
}`;

  function render(root) {
    root.innerHTML = `
      <div class="tr-toolbar">
        <strong style="font-size:14px">GLSL → Unity URP 转译器</strong>
        <span class="tag" style="color:var(--txt-dim)">粘贴 GLSL ES 片段 → 生成可粘贴进 Unity 的 URP .shader（启发式转换）</span>
        <span class="spacer"></span>
        <button class="btn ghost" id="tr-sample">示例</button>
        <button class="btn ghost" id="tr-format">格式化</button>
        <button class="btn ghost" id="tr-clear">清空</button>
        <button class="btn primary" id="tr-translate">⚡ 翻译为 URP</button>
        <button class="btn ghost" id="tr-copy">复制</button>
        <button class="btn ghost" id="tr-export">⬇ 导出</button>
        <label class="chk" style="margin-left:6px"><input type="checkbox" id="tr-cmp" checked> 代码对比</label>
      </div>
      <div class="tr-body" id="tr-body">
        <div class="tr-col" id="tr-in-col">
          <h4>GLSL 输入</h4>
          <textarea id="tr-in" spellcheck="false" placeholder="在此粘贴 GLSL ES 片段着色器…"></textarea>
        </div>
        <div class="tr-col" id="tr-out-col">
          <h4>URP HLSL 输出（可粘贴进 Unity）</h4>
          <textarea id="tr-out" spellcheck="false" readonly placeholder="点击“翻译为 URP”生成代码"></textarea>
        </div>
      </div>
      <div id="tr-warn" style="color:var(--txt-dim);font-size:12px;margin-top:10px;line-height:1.7"></div>`;

    const $ = (s) => root.querySelector(s);
    const tin = $('#tr-in'), tout = $('#tr-out');
    tin.value = SAMPLE;

    $('#tr-sample').onclick = () => { tin.value = SAMPLE; tout.value = ''; };
    $('#tr-format').onclick = () => { tin.value = window.ShaderFormatter.beautify(tin.value); };
    $('#tr-clear').onclick = () => { tin.value = ''; tout.value = ''; };
    $('#tr-cmp').onchange = (e) => { $('#tr-body').classList.toggle('single', !e.target.checked); };
    $('#tr-translate').onclick = () => {
      if (!tin.value.trim()) { toast('请先粘贴 GLSL 代码', 'err'); return; }
      let out;
      try { out = window.ShaderFormatter.beautify(translate(tin.value)); }
      catch (e) { toast('转换出错：' + e.message, 'err'); return; }
      tout.value = out;
      const resid = /vec[234]|gl_FragColor|texture2D|mix\s*\(/.test(out);
      $('#tr-warn').innerHTML = resid
        ? '⚠ 转换后仍存在未映射标记（vec*/gl_FragColor/texture2D/mix），请在 Unity 内手动复核。'
        : '✓ 转换完成，未发现常见未映射标记。复杂着色器仍建议在 Unity 内复核效果。';
      toast('已翻译为 URP HLSL', 'ok');
    };
    $('#tr-copy').onclick = () => {
      if (!tout.value.trim()) { toast('还没有输出', 'err'); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(tout.value).then(() => toast('已复制', 'ok'), () => toast('复制失败', 'err'));
      else toast('当前环境不支持复制', 'err');
    };
    $('#tr-export').onclick = () => {
      if (!tout.value.trim()) { toast('还没有输出', 'err'); return; }
      const blob = new Blob([tout.value], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'TranslatedURP.shader';
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
      window.Store.addHist({ name: 'TranslatedURP.shader', kind: 'GLSL→URP 翻译' });
      toast('已导出 TranslatedURP.shader', 'ok');
    };
  }

  return { render, translate };
})();
window.ShaderTranslator = ShaderTranslator;
