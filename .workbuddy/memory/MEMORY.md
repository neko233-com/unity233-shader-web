# Unity233 Shader Studio — 长期项目笔记

纯前端、可离线（直接用浏览器打开 `index.html`，无需构建）的 Unity 2022 风格 Shader Web 工具，**仅支持 URP**。技术栈：Three.js r128 + CodeMirror 5（均本地 vendor）。左侧垂直 Tab：首页 / 工作台 / 模板中心 / 节点编辑器 / 设置。

## 双路代码生成（核心架构）
- 节点编辑器 `nodeeditor.js` 把图编译为两路：`shaderLab`（真实 URP `.shader`，`UniversalFragmentPBR`，可粘贴进 Unity）与 `previewFrag`（浏览器 GLSL 预览端口，依赖 `UrpTemplates.PREVIEW_LIB` 里的 `urpBRDF` GGX 近似）。
- URP 模板见 `urp_templates.js`（10 个真实 `.shader` + `previewFrag` + `PREVIEW_LIB`）。

## 关键约定 / 易错点
- **节点 `gen(I,port,lang,n,ctx)` 参数顺序**：第 4 参是 node，第 5 参是 ctx。曾在 `noise` 节点写成 `(I,port,lang,ctx)` 导致把 ctx 当 node、运行时崩溃——新增/修改 `gen` 时务必对齐此签名。
- `emitExpr` 中未连线标量输入用 SPEC 输入里的 `def` 作默认值；`compile()` 用 `geCast(port,lang,def,tt)` 按 Master 端口声明类型做 cast（避免 float→vec3 类型错误）。
- 类型/构造符转换靠 `ts()/cast()/hexToVec()`：HLSL `lerp`↔GLSL `mix`，`saturate`↔`clamp`。
- 生成的顶点用 `OUT.uv = IN.uv`（不引用未定义的 `_BaseMap_ST`）。

## 浏览器预览的已知限制（设计如此，非 bug）
- 预览是**片段着色器**：`Alpha` 恒 1.0（忽略 Alpha 端口）；`Normal`/法线贴图用常量 `vNormal`（忽略 Normal 端口）；`texture` 节点 GLSL 固定 `vec3(0.8)`（浏览器无法加载任意贴图）。因此 `uv_perturb→纹理UV` 的流动只在导出的 `.shader` 生效。`displace`(顶点位移) 同理只在导出文件生效。真实效果以 Unity 内为准。
- 预览光照是 GGX 近似；光源方向由 `u_lightDir/u_lightColor/u_ambient` 驱动（`preview.setLight()`）。

## 验证方式
- 跑真实 `nodeeditor.js`：用最小 DOM stub 在 Node 里 eval 源文件，注入 test-only 导出 `_t`（不改源文件），构造图后断言 HLSL/GLSL 关键 token；临时脚本跑完即删。
- 静态服务：`python -m http.server` 后 curl 各资产确认 200。
- 所有 JS 提交前过 `node --check`。
