/* ===== Unity233 Shader Studio — URP 节点编辑器（类 Shader Graph，仅 URP） =====
 * 节点图编译为两路输出：
 *   1) HLSL —— 真实可用的 URP .shader（UniversalFragmentPBR，ForwardLit Pass）
 *   2) GLSL —— 浏览器预览端口（URP PBR 近似）
 */
const NodeEditor = (function () {
  const RANK = { float:1, vec2:2, vec3:3 };
  function maxType(a,b){ return RANK[a]>=RANK[b]?a:b; }
  function ts(t,lang){ return t==='vec3'?(lang==='hlsl'?'float3':'vec3'):t==='vec2'?(lang==='hlsl'?'float2':'vec2'):'float'; }
  function lit(t,lang){ if(t==='vec3') return lang==='hlsl'?'float3(0,0,0)':'vec3(0.0)'; if(t==='vec2') return lang==='hlsl'?'float2(0,0)':'vec2(0.0)'; return '0.0'; }
  function cast(e,from,to,lang){
    if(from===to) return e;
    const V=lang==='hlsl'?'float3':'vec3', V2=lang==='hlsl'?'float2':'vec2';
    if(to==='vec3') return from==='vec2'?`${V}(${e}, 0.0)`:`${V}(${e})`;
    if(to==='vec2') return `${V2}(${e})`;
    return `(${e}).x`;
  }
  function hexToVec(h,lang){
    const r=parseInt(h.slice(1,3),16)/255,g=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255;
    return `${ts('vec3',lang)}(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})`;
  }
  function reqType(I){ let t='float'; I.forEach(x=>{ if(x&&x.type) t=maxType(t,x.type); }); return t; }

  // ---- 节点规格 ----
  const SPEC = {
    master_urp: { group:'主节点', title:'URP Master', color:'#ff5c6c',
      in:[{n:'Base Color',t:'vec3'},{n:'Metallic',t:'float'},{n:'Smoothness',t:'float'},{n:'Emission',t:'vec3'},{n:'Normal',t:'vec3'},{n:'Alpha',t:'float'},{n:'Vertex',t:'vec3'}], out:[] },
    uv:        { group:'输入', title:'UV', color:'#4a9bff', in:[], out:[{n:'UV',t:'vec2'}] },
    time:      { group:'输入', title:'时间', color:'#4a9bff', in:[], out:[{n:'T',t:'float'}] },
    normal:    { group:'输入', title:'法线', color:'#4a9bff', in:[], out:[{n:'N',t:'vec3'}] },
    viewdir:   { group:'输入', title:'视线方向', color:'#4a9bff', in:[], out:[{n:'V',t:'vec3'}] },
    worldpos:  { group:'输入', title:'世界坐标', color:'#4a9bff', in:[], out:[{n:'P',t:'vec3'}] },
    value:     { group:'输入', title:'数值', color:'#7c5cff', in:[], out:[{n:'V',t:'float'}], fields:[{k:'val',label:'值',type:'float',def:1.0}] },
    color:     { group:'输入', title:'颜色', color:'#7c5cff', in:[], out:[{n:'C',t:'vec3'}], fields:[{k:'val',label:'色',type:'color',def:'#4090ff'}] },
    texture:   { group:'输入', title:'纹理采样', color:'#7c5cff', in:[{n:'UV',t:'vec2'}], out:[{n:'RGB',t:'vec3'}], isTex:true },
    normalmap: { group:'输入', title:'法线贴图', color:'#7c5cff', in:[], out:[{n:'N',t:'vec3'}], isTex:true, fields:[{k:'scale',label:'强度',type:'float',def:1.0}] },
    add:      { group:'运算', title:'相加 +', color:'#5fce7a', in:[{n:'A',t:'any'},{n:'B',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=reqType(I);return `(${cast(I[0].expr,I[0].type,t,lang)} + ${cast(I[1].expr,I[1].type,t,lang)})`;} },
    subtract: { group:'运算', title:'相减 -', color:'#5fce7a', in:[{n:'A',t:'any'},{n:'B',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=reqType(I);return `(${cast(I[0].expr,I[0].type,t,lang)} - ${cast(I[1].expr,I[1].type,t,lang)})`;} },
    multiply: { group:'运算', title:'相乘 ×', color:'#5fce7a', in:[{n:'A',t:'any'},{n:'B',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=reqType(I);return `(${cast(I[0].expr,I[0].type,t,lang)} * ${cast(I[1].expr,I[1].type,t,lang)})`;} },
    divide:   { group:'运算', title:'相除 ÷', color:'#5fce7a', in:[{n:'A',t:'any'},{n:'B',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=reqType(I);return `(${cast(I[0].expr,I[0].type,t,lang)} / ${cast(I[1].expr,I[1].type,t,lang)})`;} },
    sin:      { group:'运算', title:'Sin', color:'#5fce7a', in:[{n:'X',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=I[0].type;return `sin(${cast(I[0].expr,I[0].type,t,lang)})`;} },
    cos:      { group:'运算', title:'Cos', color:'#5fce7a', in:[{n:'X',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=I[0].type;return `cos(${cast(I[0].expr,I[0].type,t,lang)})`;} },
    pow:      { group:'运算', title:'Pow', color:'#5fce7a', in:[{n:'A',t:'any'},{n:'B',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=reqType(I);return `pow(${cast(I[0].expr,I[0].type,t,lang)}, ${cast(I[1].expr,I[1].type,t,lang)})`;} },
    lerp:     { group:'运算', title:'Lerp', color:'#5fce7a', in:[{n:'A',t:'any'},{n:'B',t:'any'},{n:'T',t:'float'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=reqType([I[0],I[1]]);const a=cast(I[0].expr,I[0].type,t,lang);const b=cast(I[1].expr,I[1].type,t,lang);const c=cast(I[2].expr,I[2].type,'float',lang);return lang==='hlsl'?`lerp(${a}, ${b}, ${c})`:`mix(${a}, ${b}, ${c})`;} },
    dot:      { group:'运算', title:'Dot', color:'#5fce7a', in:[{n:'A',t:'any'},{n:'B',t:'any'}], out:[{n:'Out',t:'float'}], gen:(I,port,lang)=>{const t=reqType(I);return `dot(${cast(I[0].expr,I[0].type,t,lang)}, ${cast(I[1].expr,I[1].type,t,lang)})`;} },
    normalize:{ group:'运算', title:'Normalize', color:'#5fce7a', in:[{n:'V',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=I[0].type;return `normalize(${cast(I[0].expr,I[0].type,t,lang)})`;} },
    oneminus: { group:'运算', title:'One Minus', color:'#5fce7a', in:[{n:'X',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>`(1.0 - ${cast(I[0].expr,I[0].type,I[0].type,lang)})` },
    split:    { group:'程序化', title:'拆分', color:'#ffcf5c', in:[{n:'V',t:'vec3'}], out:[{n:'X',t:'float'},{n:'Y',t:'float'},{n:'Z',t:'float'}], gen:(I,port,lang)=>{const x=cast(I[0].expr,I[0].type,'vec3',lang);return {0:`(${x}).x`,1:`(${x}).y`,2:`(${x}).z`};} },
    combine:  { group:'程序化', title:'合成RGB', color:'#ffcf5c', in:[{n:'R',t:'float'},{n:'G',t:'float'},{n:'B',t:'float'}], out:[{n:'RGB',t:'vec3'}], gen:(I,port,lang)=>`${ts('vec3',lang)}(${cast(I[0].expr,I[0].type,'float',lang)}, ${cast(I[1].expr,I[1].type,'float',lang)}, ${cast(I[2].expr,I[2].type,'float',lang)})` },
    fresnel:  { group:'程序化', title:'菲涅尔', color:'#ffcf5c', in:[{n:'Power',t:'float'}], out:[{n:'Out',t:'float'}], fields:[{k:'power',label:'强度',type:'float',def:2.0}], gen:(I,port,lang,n)=>{const N=lang==='hlsl'?'IN.normalWS':'vNormal';const V=lang==='hlsl'?'GetWorldSpaceNormalizeViewDir(IN.positionWS)':'normalize(vViewDir)';const p=I[0].linked?I[0].expr:`${Number(n.params.power).toFixed(4)}`;return `pow(1.0 - max(dot(${N}, ${V}), 0.0), ${p})`;} },
    noise:    { group:'程序化', title:'噪声', color:'#ffcf5c', in:[], out:[{n:'Out',t:'float'}], gen:(I,port,lang,n,ctx)=>{ctx.flags.noise=true;return `hash(${lang==='hlsl'?'IN.uv':'vUv'} * 8.0)`;} },
    uv_perturb:{ group:'程序化', title:'UV 扰动(流动)', color:'#ffcf5c', in:[{n:'UV',t:'vec2'},{n:'速度',t:'float',def:0.1},{n:'缩放',t:'float',def:1.0}], out:[{n:'UV',t:'vec2'}], gen:(I,port,lang)=>{const uv=I[0].linked?cast(I[0].expr,I[0].type,'vec2',lang):(lang==='hlsl'?'IN.uv':'vUv');const sp=I[1].expr;const sc=I[2].expr;const time=lang==='hlsl'?'_Time.y':'u_time';return `(${uv} * ${sc}) + ${ts('vec2',lang)}(${sp} * ${time}, ${sp} * 0.5 * ${time})`;} },
    displace: { group:'程序化', title:'顶点位移(沿法线)', color:'#ffcf5c', in:[{n:'强度',t:'float',def:0.1}], out:[{n:'Offset',t:'vec3'}], gen:(I,port,lang)=>{const a=I[0].expr;return lang==='hlsl'?`(IN.normalOS * ${a})`:`(vNormal * ${a})`;},
      note:'连接到 URP Master 的 Vertex 端口，仅在导出的 .shader 顶点阶段生效；预览为片段着色器，不显示位移。' },
    remap:    { group:'数学', title:'重映射 Remap', color:'#3fd0c9', in:[{n:'In',t:'any'},{n:'OldMin',t:'float',def:0.0},{n:'OldMax',t:'float',def:1.0},{n:'NewMin',t:'float',def:0.0},{n:'NewMax',t:'float',def:1.0}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=reqType([I[0]]);const x=cast(I[0].expr,I[0].type,t,lang);const omin=cast(I[1].expr,I[1].type,t,lang);const omax=cast(I[2].expr,I[2].type,t,lang);const nmin=cast(I[3].expr,I[3].type,t,lang);const nmax=cast(I[4].expr,I[4].type,t,lang);const eps=cast('(0.00001)','float',t,lang);return `((${x} - ${omin}) / max(${omax} - ${omin}, ${eps})) * (${nmax} - ${nmin}) + ${nmin}`;} },
    step:     { group:'数学', title:'Step', color:'#3fd0c9', in:[{n:'Edge',t:'float',def:0.5},{n:'X',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=reqType([I[1]]);const x=cast(I[1].expr,I[1].type,t,lang);const e=cast(I[0].expr,I[0].type,t,lang);return `step(${e}, ${x})`;} },
    smoothstep:{ group:'数学', title:'Smoothstep', color:'#3fd0c9', in:[{n:'Edge0',t:'float',def:0.25},{n:'Edge1',t:'float',def:0.75},{n:'X',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=reqType([I[2]]);const x=cast(I[2].expr,I[2].type,t,lang);const e0=cast(I[0].expr,I[0].type,t,lang);const e1=cast(I[1].expr,I[1].type,t,lang);return `smoothstep(${e0}, ${e1}, ${x})`;} },
    saturate: { group:'数学', title:'Saturate(0~1)', color:'#3fd0c9', in:[{n:'X',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=I[0].type;const x=cast(I[0].expr,I[0].type,t,lang);return lang==='hlsl'?`saturate(${x})`:`clamp(${x}, 0.0, 1.0)`;} },
    distance: { group:'数学', title:'Distance', color:'#3fd0c9', in:[{n:'A',t:'any'},{n:'B',t:'any'}], out:[{n:'Out',t:'float'}], gen:(I,port,lang)=>{const t=reqType(I);const a=cast(I[0].expr,I[0].type,t,lang);const b=cast(I[1].expr,I[1].type,t,lang);return `distance(${a}, ${b})`;} },
    reflect:  { group:'数学', title:'Reflect', color:'#3fd0c9', in:[{n:'I',t:'any'},{n:'N',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=reqType(I);const a=cast(I[0].expr,I[0].type,t,lang);const b=cast(I[1].expr,I[1].type,t,lang);return `reflect(${a}, ${b})`;} },
    length:   { group:'数学', title:'Length', color:'#3fd0c9', in:[{n:'V',t:'any'}], out:[{n:'Out',t:'float'}], gen:(I,port,lang)=>{const t=I[0].type;return `length(${cast(I[0].expr,I[0].type,t,lang)})`;} },
    abs:      { group:'数学', title:'Abs', color:'#3fd0c9', in:[{n:'X',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=I[0].type;return `abs(${cast(I[0].expr,I[0].type,t,lang)})`;} },
    fract:    { group:'数学', title:'Fract', color:'#3fd0c9', in:[{n:'X',t:'any'}], out:[{n:'Out',t:'any'}], gen:(I,port,lang)=>{const t=I[0].type;return `fract(${cast(I[0].expr,I[0].type,t,lang)})`;} }
  };

  let nodes=[], links=[], idc=1, texCount=0, panX=30, panY=20, pending=null, selected=null;
  let wrap, canvas, svg, codeBox;

  function render(root){
    const groups={};
    Object.entries(SPEC).forEach(([k,s])=>{ (groups[s.group]=groups[s.group]||[]).push([k,s]); });
    let pal='';
    Object.entries(groups).forEach(([g,items])=>{
      pal+=`<h4>${g}</h4>`;
      items.forEach(([k])=>{ pal+=`<div class="pal-item" data-type="${k}"><span class="dot" style="background:${SPEC[k].color}"></span>${SPEC[k].title}</div>`; });
    });
    root.innerHTML=`
      <div class="ne-toolbar">
        <strong style="font-size:14px">URP 节点编辑器</strong>
        <span class="tag" style="color:var(--txt-dim);font-size:12px">点输出端口→点输入端口连线 · 选中 URP Master 可调表面选项</span>
        <span class="spacer"></span>
        <button class="btn" id="ne-clear">清空</button>
        <button class="btn" id="ne-demo">示例</button>
        <button class="btn primary" id="ne-send">▶ 发送到工作台</button>
      </div>
      <div class="ne-body">
        <div class="ne-palette">${pal}</div>
        <div class="ne-canvas-wrap" id="ne-wrap"><div id="ne-canvas"><svg id="ne-svg"></svg></div></div>
        <div class="ne-inspector">
          <h4>生成的 URP ShaderLab</h4>
          <div class="ne-code" id="ne-code">// 连接节点后点击“编译”</div>
          <div style="margin-top:14px;display:flex;gap:8px">
            <button class="btn primary" id="ne-compile" style="flex:1">编译</button>
          </div>
          <div id="ne-selinfo" style="margin-top:14px;color:var(--txt-dim);font-size:12px;line-height:1.7"></div>
        </div>
      </div>`;
    wrap=root.querySelector('#ne-wrap'); canvas=root.querySelector('#ne-canvas'); svg=root.querySelector('#ne-svg'); codeBox=root.querySelector('#ne-code');
    canvas.style.width='4000px'; canvas.style.height='3000px'; svg.setAttribute('width','4000'); svg.setAttribute('height','3000');

    root.querySelectorAll('.pal-item').forEach(p=>{ p.onclick=()=>{ if(p.dataset.type==='master_urp'){ const ex=nodes.find(n=>n.type==='master_urp'); if(ex){selectNode(ex);return;} } addNode(p.dataset.type, 620-panX+40, 160-panY+40); }; });
    wrap.addEventListener('mousedown',(e)=>{ if(e.target!==wrap&&e.target!==canvas&&e.target!==svg) return; const sx=e.clientX,sy=e.clientY,ox=panX,oy=panY; const mv=(ev)=>{panX=ox+(ev.clientX-sx);panY=oy+(ev.clientY-sy);applyPan();}; const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);}; document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up); });
    root.querySelector('#ne-clear').onclick=()=>{ nodes=[];links=[];idc=1;texCount=0;redraw();compile(); };
    root.querySelector('#ne-demo').onclick=loadDemo;
    root.querySelector('#ne-compile').onclick=()=>compile();
    root.querySelector('#ne-send').onclick=sendToWorkbench;
    applyPan();
    if(nodes.length===0) loadDemo(); else redraw();
  }
  function applyPan(){ canvas.style.transform=`translate(${panX}px, ${panY}px)`; }

  function addNode(type,x,y){
    if(SPEC[type].isTex){ const n={id:idc++,type,x:x|0,y:y|0,params:{},texIdx:texCount++}; nodes.push(n); drawNode(n); redraw(); return n; }
    if(type==='value'||type==='color'){ const n={id:idc++,type,x:x|0,y:y|0,params:{val:SPEC[type].fields[0].def}}; nodes.push(n); drawNode(n); redraw(); return n; }
    if(type==='fresnel'||type==='normalmap'){ const n={id:idc++,type,x:x|0,y:y|0,params:{power:SPEC[type].fields?SPEC[type].fields[0].def:1.0}}; nodes.push(n); drawNode(n); redraw(); return n; }
    const n={id:idc++,type,x:x|0,y:y|0,params:{}}; nodes.push(n); drawNode(n); redraw(); return n;
  }

  function drawNode(n){
    const spec=SPEC[n.type];
    let el=document.getElementById('ne-node-'+n.id);
    if(!el){ el=document.createElement('div'); el.className='ne-node'; el.id='ne-node-'+n.id; canvas.appendChild(el); }
    el.style.left=n.x+'px'; el.style.top=n.y+'px';
    let html=`<div class="nh"><span class="dot" style="background:${spec.color}"></span>${spec.title}</div><div class="nb">`;
    spec.in.forEach((inp,i)=>{ html+=`<div class="ne-port in"><span class="port" data-node="${n.id}" data-port="${i}" data-dir="in"></span><span class="lbl">${inp.n}</span></div>`; });
    if(spec.fields){ spec.fields.forEach(f=>{ if(f.type==='color') html+=`<div class="field"><input type="color" value="${n.params[f.k]}" data-f="${f.k}"></div>`; else html+=`<div class="field"><span style="color:var(--txt-dim);font-size:11px">${f.label}</span><input type="number" step="0.05" value="${n.params[f.k]}" data-f="${f.k}"></div>`; }); }
    if(spec.isTex){ html+=`<div class="field" style="color:var(--txt-dim);font-size:11px">_Tex${n.texIdx}</div>`; }
    if(n.type==='master_urp'){
      const o=n.options||(n.options={surface:'Opaque',cull:'Off',alphaclip:false});
      html+=`<div class="field"><span style="color:var(--txt-dim);font-size:11px">表面</span><select data-o="surface"><option ${o.surface==='Opaque'?'selected':''}>Opaque</option><option ${o.surface==='Transparent'?'selected':''}>Transparent</option></select></div>`;
      html+=`<div class="field"><span style="color:var(--txt-dim);font-size:11px">剔除</span><select data-o="cull"><option ${o.cull==='Off'?'selected':''}>Off</option><option ${o.cull==='Back'?'selected':''}>Back</option><option ${o.cull==='Front'?'selected':''}>Front</option></select></div>`;
      html+=`<label class="chk" style="font-size:11px"><input type="checkbox" data-o="alphaclip" ${o.alphaclip?'checked':''}> Alpha Clip</label>`;
    }
    spec.out.forEach((o,i)=>{ html+=`<div class="ne-port out"><span class="lbl">${o.n}</span><span class="port" data-node="${n.id}" data-port="${i}" data-dir="out"></span></div>`; });
    html+=`</div>`; el.innerHTML=html;

    const head=el.querySelector('.nh');
    head.onmousedown=(e)=>{ e.stopPropagation(); selectNode(n); const sx=e.clientX,sy=e.clientY,ox=n.x,oy=n.y; const mv=(ev)=>{n.x=ox+(ev.clientX-sx);n.y=oy+(ev.clientY-sy);el.style.left=n.x+'px';el.style.top=n.y+'px';updateWires();}; const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);}; document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up); };
    el.querySelectorAll('.port').forEach(p=>{ p.onclick=(e)=>{ e.stopPropagation(); onPortClick(n,+p.dataset.port,p.dataset.dir); }; });
    el.querySelectorAll('input[data-f]').forEach(inp=>{ inp.oninput=()=>{ n.params[inp.dataset.f]=inp.type==='color'?inp.value:(parseFloat(inp.value)||0); compile(); }; });
    el.querySelectorAll('select[data-o],input[data-o]').forEach(c=>{ c.onchange=()=>{ n.options[c.dataset.o]=c.type==='checkbox'?c.checked:c.value; compile(); }; });
    el.onmousedown=(e)=>{ if(e.target===el) selectNode(n); };
  }

  function onPortClick(n,port,dir){
    if(dir==='out'){ pending={node:n.id,port}; toast('已选输出，点击输入端口完成连线'); return; }
    const ex=links.find(l=>l.to===n.id&&l.toPort===port);
    if(ex){ links=links.filter(l=>l!==ex); redraw(); compile(); return; }
    if(pending){ if(pending.node===n.id){ pending=null; return; } links.push({from:pending.node,fromPort:pending.port,to:n.id,toPort:port}); pending=null; redraw(); compile(); }
  }
  function portPos(n,port,dir){ const el=document.getElementById('ne-node-'+n.id); const p=el.querySelector(`.port[data-port="${port}"][data-dir="${dir}"]`); return {x:n.x+p.offsetLeft+p.offsetWidth/2,y:n.y+p.offsetTop+p.offsetHeight/2}; }
  function updateWires(){ let d=''; links.forEach(l=>{ const a=portPos(byId(l.from),l.fromPort,'out'); const b=portPos(byId(l.to),l.toPort,'in'); const dx=Math.max(40,Math.abs(b.x-a.x)*0.5); d+=`<path d="M ${a.x} ${a.y} C ${a.x+dx} ${a.y}, ${b.x-dx} ${b.y}, ${b.x} ${b.y}" stroke="#4a9bff" stroke-width="2.5" fill="none"/>`; }); if(pending){ const a=portPos(byId(pending.node),pending.port,'out'); d+=`<path d="M ${a.x} ${a.y} L ${a.x+120} ${a.y}" stroke="#7c5cff" stroke-width="2.5" stroke-dasharray="5 4" fill="none"/>`; } svg.innerHTML=d; }
  function redraw(){ nodes.forEach(drawNode); updateWires(); }
  function byId(id){ return nodes.find(n=>n.id===id); }
  function selectNode(n){ selected=n; nodes.forEach(x=>{const el=document.getElementById('ne-node-'+x.id); if(el) el.classList.toggle('selected',x===n);}); updateSelInfo(); }
  function updateSelInfo(){ const b=document.getElementById('ne-selinfo'); if(!selected){b.innerHTML='未选中节点。';return;} const s=SPEC[selected.type]; b.innerHTML=`<b style="color:#fff">${s.title}</b><br>输入: ${s.in.map(i=>i.n).join(', ')||'无'}<br>输出: ${s.out.map(o=>o.n).join(', ')||'无'}`; }

  // ---- 类型与表达式 ----
  function typeOf(id,port,lang){
    const n=byId(id); const spec=SPEC[n.type];
    const t=spec.out[port]?spec.out[port].t:'float';
    if(t!=='any') return t;
    let rt='float';
    spec.in.forEach((inp,i)=>{ const l=links.find(x=>x.to===id&&x.toPort===i); if(l) rt=maxType(rt,typeOf(l.from,l.fromPort,lang)); });
    return rt;
  }
  function emitExpr(id,port,lang,ctx){
    const n=byId(id);
    if(n._c && n._c[lang] && n._c[lang][port]!=null) return n._c[lang][port];
    const spec=SPEC[n.type];
    const I=spec.in.map((inp,i)=>{
      const l=links.find(x=>x.to===id&&x.toPort===i);
      if(l){ const ex=emitExpr(l.from,l.fromPort,lang,ctx); const ty=typeOf(l.from,l.fromPort,lang); return {expr:ex,type:ty,linked:true}; }
      if(inp.def!=null) return {expr:cast('('+Number(inp.def).toFixed(4)+')','float',inp.t,lang),type:inp.t,linked:false};
      if(inp.t==='vec3') return {expr:lit('vec3',lang),type:'vec3',linked:false};
      if(inp.t==='vec2') return {expr:lit('vec2',lang),type:'vec2',linked:false};
      return {expr:lit('float',lang),type:'float',linked:false};
    });
    let out;
    if(spec.gen){ out=spec.gen(I,port,lang,n,ctx); }
    else if(n.type==='uv') out=lang==='hlsl'?'IN.uv':'vUv';
    else if(n.type==='time') out=lang==='hlsl'?'_Time.y':'u_time';
    else if(n.type==='normal') out=lang==='hlsl'?'IN.normalWS':'vNormal';
    else if(n.type==='viewdir') out=lang==='hlsl'?'GetWorldSpaceNormalizeViewDir(IN.positionWS)':'normalize(vViewDir)';
    else if(n.type==='worldpos') out=lang==='hlsl'?'IN.positionWS':'vWorldPosition';
    else if(n.type==='value') out=`${Number(n.params.val).toFixed(4)}`;
    else if(n.type==='color') out=hexToVec(n.params.val,lang);
    else if(n.type==='texture'){ ctx.textures.push(n.texIdx); const tl=links.find(x=>x.to===n.id&&x.toPort===0); const uv=tl?cast(emitExpr(tl.from,tl.fromPort,lang,ctx),typeOf(tl.from,tl.fromPort,lang),'vec2',lang):(lang==='hlsl'?'IN.uv':'vUv'); out=lang==='hlsl'?`SAMPLE_TEXTURE2D(_Tex${n.texIdx}, sampler_Tex${n.texIdx}, ${uv}).rgb`:'vec3(0.8)'; }
    else if(n.type==='normalmap'){ ctx.textures.push(n.texIdx); out=lang==='hlsl'?`UnpackNormalScale(SAMPLE_TEXTURE2D(_Tex${n.texIdx}, sampler_Tex${n.texIdx}, IN.uv), ${Number(n.params.scale).toFixed(4)})`:'normalize(vNormal)'; }
    else out=lit('float',lang);
    n._c=n._c||{}; n._c[lang]=n._c[lang]||{};
    if(typeof out==='object'){ n._c[lang]=out; return out[port]; }
    n._c[lang][port]=out; return out;
  }

  // ---- 编译 ----
  function compile(){
    const master=nodes.find(n=>n.type==='master_urp');
    if(!master){ codeBox.textContent='// 缺少 URP Master 节点'; return null; }
    nodes.forEach(n=>{ n._c={}; });
    const ctx={textures:[],flags:{}};
    const ge=(port,lang,def)=>{ const l=links.find(x=>x.to===master.id&&x.toPort===port); return l?emitExpr(l.from,l.fromPort,lang,ctx):def; };
    const geCast=(port,lang,def,tt)=>{ const l=links.find(x=>x.to===master.id&&x.toPort===port); if(!l) return def; const ex=emitExpr(l.from,l.fromPort,lang,ctx); const ty=typeOf(l.from,l.fromPort,lang); return cast(ex,ty,tt,lang); };
    const o=master.options||{surface:'Opaque',cull:'Off',alphaclip:false};

    const hlsl={
      bc:geCast(0,'hlsl','float3(1,1,1)','vec3'), mt:geCast(1,'hlsl','0.0','float'), sm:geCast(2,'hlsl','0.5','float'),
      em:geCast(3,'hlsl','float3(0,0,0)','vec3'), nt:(links.find(x=>x.to===master.id&&x.toPort===4)?geCast(4,'hlsl','0','vec3'):'0'),
      al:geCast(5,'hlsl','1.0','float'), vo:geCast(6,'hlsl','float3(0,0,0)','vec3')
    };
    const glsl={
      bc:geCast(0,'glsl','vec3(1.0)','vec3'), mt:geCast(1,'glsl','0.0','float'), sm:geCast(2,'glsl','0.5','float'),
      em:geCast(3,'glsl','vec3(0.0)','vec3'), al:geCast(5,'glsl','1.0','float')
    };

    const transparent=o.surface==='Transparent';
    const texUniq=[...new Set(ctx.textures)].sort((a,b)=>a-b);
    let texDecl='', cbDecl='';
    texUniq.forEach(i=>{ texDecl+=`    TEXTURE2D(_Tex${i}); SAMPLER(sampler_Tex${i});\n`; cbDecl+=`                float4 _Tex${i}_ST;\n`; });
    const hashFn = ctx.flags.noise ? (transparent?'':'') + `    float hash(float2 p){ return frac(sin(dot(p, float2(127.1,311.7))) * 43758.5453); }\n` : '';

    const blend = transparent ? '            Blend SrcAlpha OneMinusSrcAlpha\n            ZWrite Off\n' : '';
    const cull = o.cull==='Off' ? 'Cull Off' : (o.cull==='Front'?'Cull Front':'Cull Back');
    const queue = transparent ? 'Transparent' : 'Geometry';
    const rtype = transparent ? 'Transparent' : 'Opaque';
    const clipLine = o.alphaclip ? `            clip(_a - _Cutoff);\n` : '';
    const cutoffProp = o.alphaclip ? `        _Cutoff("Cutoff", Range(0,1)) = 0.5\n` : '';
    const voLine = (hlsl.vo!=='float3(0,0,0)') ? `                float3 p = IN.positionOS.xyz + ${hlsl.vo};\n                OUT.positionHCS = TransformObjectToHClip(p);\n                OUT.positionWS = TransformObjectToWorld(p);` : `                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);\n                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);`;

    const shaderLab = `Shader "Unity233/Graph/Master"
{
    Properties
    {
${texUniq.map(i=>`        _Tex${i}("Texture ${i}", 2D) = "white" {}`).join('\n')}
        _BaseColor("Base Color", Color) = (1,1,1,1)
        _Metallic("Metallic", Range(0,1)) = 0.0
        _Smoothness("Smoothness", Range(0,1)) = 0.5
        _EmissionColor("Emission", Color) = (0,0,0,1)
${cutoffProp}    }
    SubShader
    {
        Tags { "RenderType"="${rtype}" "RenderPipeline"="UniversalPipeline" "Queue"="${queue}" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
${blend}            ${cull}
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
${texDecl}            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
                float  _Metallic;
                float  _Smoothness;
                float4 _EmissionColor;
${cbDecl}            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float4 tangentOS : TANGENT; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; float3 normalWS : TEXCOORD1; float3 positionWS : TEXCOORD2; float3 tangentWS : TEXCOORD3; float3 bitangentWS : TEXCOORD4; };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
${voLine}
                OUT.uv = IN.uv;
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.tangentWS = TransformObjectToWorldNormal(IN.tangentOS.xyz);
                OUT.bitangentWS = cross(OUT.normalWS, OUT.tangentWS) * IN.tangentOS.w;
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
${hashFn}                float3 _bc = ${hlsl.bc};
                float  _m  = ${hlsl.mt};
                float  _s  = ${hlsl.sm};
                float3 _e  = ${hlsl.em};
                float  _a  = ${hlsl.al};
${clipLine}                InputData id = (InputData)0;
                id.normalWS = IN.normalWS;
                id.positionWS = IN.positionWS;
                id.viewDirectionWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                id.shadowCoord = TransformWorldToShadowCoord(IN.positionWS);
                id.bakedGI = SampleSH(IN.normalWS);
                id.tangentWS = IN.tangentWS;
                id.bitangentWS = IN.bitangentWS;
                SurfaceData sd = (SurfaceData)0;
                sd.albedo = _bc * _BaseColor.rgb;
                sd.metallic = _m;
                sd.smoothness = _s;
                sd.emission = _e * _EmissionColor.rgb;
                sd.alpha = _a;
                sd.normalTS = ${hlsl.nt};
                return UniversalFragmentPBR(id, sd);
            }
            ENDHLSL
        }
    }
}`;

    // GLSL 预览端口
    const lib = window.UrpTemplates ? window.UrpTemplates.PREVIEW_LIB : '';
    const ghash = ctx.flags.noise ? `float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }\n` : '';
    const previewFrag = `${ghash}${lib}void main(){
  vec3 _bc = ${glsl.bc};
  float _m = ${glsl.mt};
  float _s = ${glsl.sm};
  float3 _e = ${glsl.em};
  vec3 N = normalize(vNormal);
  vec3 col = urpBRDF(_bc, N, normalize(vViewDir), _m, _s, _e, 1.0);
  gl_FragColor = vec4(col, 1.0);
}`;

    codeBox.textContent = shaderLab;
    codeBox.dataset.shaderLab = shaderLab;
    codeBox.dataset.preview = previewFrag;
    return { shaderLab, previewFrag };
  }

  function sendToWorkbench(){
    const r=compile();
    if(!r){ toast('无法编译：请检查节点连接','err'); return; }
    window.App.navigate('workbench');
    Workbench.loadURPContent(r.shaderLab, r.previewFrag, 'graph-'+Date.now());
    toast('已发送到工作台（URP）','ok');
  }

  function loadDemo(){
    nodes=[];links=[];idc=1;texCount=0;
    const out=addNode('master_urp', 720, 120);
    const col=addNode('color', 440, 60);  col.params.val='#4090ff';
    const sm =addNode('value', 440, 180); sm.params.val=0.6;
    const fr =addNode('fresnel', 440, 300); fr.params.power=2.0;
    const ss =addNode('smoothstep', 440, 430);
    const e0 =addNode('value', 230, 410); e0.params.val=0.3;
    const e1 =addNode('value', 230, 510); e1.params.val=0.9;
    const dp =addNode('displace', 440, 560);
    const amt=addNode('value', 230, 640); amt.params.val=0.08;
    links.push({from:col.id,fromPort:0,to:out.id,toPort:0});
    links.push({from:sm.id, fromPort:0,to:out.id,toPort:2});
    links.push({from:e0.id,fromPort:0,to:ss.id,toPort:0});
    links.push({from:e1.id,fromPort:0,to:ss.id,toPort:1});
    links.push({from:fr.id,fromPort:0,to:ss.id,toPort:2});
    links.push({from:ss.id,fromPort:0,to:out.id,toPort:3});
    links.push({from:amt.id,fromPort:0,to:dp.id,toPort:0});
    links.push({from:dp.id,fromPort:0,to:out.id,toPort:6});
    drawNode(col); drawNode(sm); drawNode(fr); drawNode(ss); drawNode(e0); drawNode(e1); drawNode(dp); drawNode(amt);
    redraw(); compile();
  }

  function onShow(){}
  return { render, onShow };
})();
