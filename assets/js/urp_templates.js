/* ===== Unity233 Shader Studio — 真实 URP .shader 模板库 =====
 * 每个模板都包含：
 *   shaderLab  : 直接可粘贴进 Unity 2022 (URP) 的完整 .shader 文件
 *   previewFrag: 浏览器预览用的 GLSL 端口（URP 光照近似）
 * 仅支持 URP（"RenderPipeline"="UniversalPipeline"）。
 */
window.UrpTemplates = (function () {
  // 浏览器预览用的 URP 风格 PBR 近似（GGX），由 previewFrag 调用
  const PREVIEW_LIB = `vec3 urpBRDF(vec3 albedo, vec3 N, vec3 V, float metal, float smooth, vec3 emission, float occ){
  vec3 L = normalize(u_lightDir);
  vec3 H = normalize(L + V);
  float ndl = max(dot(N, L), 0.0);
  float ndh = max(dot(N, H), 0.0);
  float ndv = max(dot(N, V), 0.0);
  vec3 F0 = mix(vec3(0.04), albedo, metal);
  float a = max(1.0 - smooth, 0.001); float a2 = a * a;
  float d = ndh * ndh * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159265 * d * d + 1e-5);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  float k = (smooth + 1.0); k = (k * k) / 8.0;
  float Gv = ndv / (ndv * (1.0 - k) + k);
  float Gl = ndl / (ndl * (1.0 - k) + k);
  float G = Gv * Gl;
  vec3 spec = (D * G) * F / (4.0 * ndv * ndl + 1e-4) * ndl;
  vec3 kd = (1.0 - metal);
  vec3 col = (kd * albedo * ndl + spec * ndl) * u_lightColor * occ;
  col += u_ambient * albedo * kd * occ;
  return col + emission;
}
`;

  const TEMPLATES = [
    {
      id: 'urp-lit', name: 'Lit (PBR 金属度)', category: '光照', desc: '完整 URP PBR：法线贴图 / 遮挡 / 自发光，使用 UniversalFragmentPBR。',
      shaderLab: `Shader "Unity233/URP/Lit"
{
    Properties
    {
        _BaseMap("Base Map", 2D) = "white" {}
        _BaseColor("Base Color", Color) = (1,1,1,1)
        _Metallic("Metallic", Range(0,1)) = 0.0
        _Smoothness("Smoothness", Range(0,1)) = 0.5
        _BumpMap("Normal Map", 2D) = "bump" {}
        _BumpScale("Normal Scale", Float) = 1.0
        _OcclusionMap("Occlusion", 2D) = "white" {}
        _OcclusionStrength("Occlusion Strength", Range(0,1)) = 1.0
        _EmissionMap("Emission", 2D) = "white" {}
        _EmissionColor("Emission Color", Color) = (0,0,0,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex LitPassVertex
            #pragma fragment LitPassFragment
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            TEXTURE2D(_BaseMap);   SAMPLER(sampler_BaseMap);
            TEXTURE2D(_BumpMap);   SAMPLER(sampler_BumpMap);
            TEXTURE2D(_OcclusionMap); SAMPLER(sampler_OcclusionMap);
            TEXTURE2D(_EmissionMap);  SAMPLER(sampler_EmissionMap);

            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                float4 _BaseColor;
                float  _Metallic;
                float  _Smoothness;
                float  _BumpScale;
                float  _OcclusionStrength;
                float4 _EmissionColor;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float4 tangentOS  : TANGENT;
                float2 uv         : TEXCOORD0;
            };
            struct Varyings
            {
                float4 positionHCS : SV_POSITION;
                float2 uv          : TEXCOORD0;
                float3 normalWS    : TEXCOORD1;
                float3 positionWS  : TEXCOORD2;
                float3 tangentWS   : TEXCOORD3;
                float3 bitangentWS : TEXCOORD4;
            };

            Varyings LitPassVertex(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs vp = GetVertexPositionInputs(IN.positionOS.xyz);
                VertexNormalInputs vn = GetVertexNormalInputs(IN.normalOS, IN.tangentOS);
                OUT.positionHCS = vp.positionCS;
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                OUT.normalWS = vn.normalWS;
                OUT.positionWS = vp.positionWS;
                OUT.tangentWS = vn.tangentWS;
                OUT.bitangentWS = vn.bitangentWS;
                return OUT;
            }

            half4 LitPassFragment(Varyings IN) : SV_Target
            {
                float3 N = normalize(IN.normalWS);
                float3 t = normalize(IN.tangentWS);
                float3 b = normalize(IN.bitangentWS);
                float3 nTex = UnpackNormal(SAMPLE_TEXTURE2D(_BumpMap, sampler_BumpMap, IN.uv));
                N = normalize(N + (t * nTex.x + b * nTex.y) * _BumpScale);

                float3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv).rgb * _BaseColor.rgb;
                float occ = lerp(1.0, SAMPLE_TEXTURE2D(_OcclusionMap, sampler_OcclusionMap, IN.uv).g, _OcclusionStrength);
                float3 emission = SAMPLE_TEXTURE2D(_EmissionMap, sampler_EmissionMap, IN.uv).rgb * _EmissionColor.rgb;

                InputData inputData = (InputData)0;
                inputData.normalWS = N;
                inputData.positionWS = IN.positionWS;
                inputData.viewDirectionWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                inputData.shadowCoord = TransformWorldToShadowCoord(IN.positionWS);
                inputData.bakedGI = SampleSH(N);

                SurfaceData surfaceData = (SurfaceData)0;
                surfaceData.albedo = albedo;
                surfaceData.metallic = _Metallic;
                surfaceData.smoothness = _Smoothness;
                surfaceData.occlusion = occ;
                surfaceData.emission = emission;
                surfaceData.alpha = 1.0;

                return UniversalFragmentPBR(inputData, surfaceData);
            }
            ENDHLSL
        }
    }
}`,
      previewFrag: `void main(){
  vec3 N = normalize(vNormal);
  vec3 col = urpBRDF(u_colorA, N, normalize(vViewDir), 0.0, 0.6, vec3(0.0), 1.0);
  gl_FragColor = vec4(col, 1.0);
}`
    },

    {
      id: 'urp-unlit', name: 'Unlit', category: '基础', desc: '最简洁的 URP Unlit 着色器，输出纯色/贴图。',
      shaderLab: `Shader "Unity233/URP/Unlit"
{
    Properties
    {
        _BaseMap("Base Map", 2D) = "white" {}
        _BaseColor("Base Color", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Name "Unlit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                float4 _BaseColor;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
                return SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv) * _BaseColor;
            }
            ENDHLSL
        }
    }
}`,
      previewFrag: `void main(){ gl_FragColor = vec4(u_colorA, 1.0); }`
    },

    {
      id: 'urp-toon', name: 'Toon 卡通', category: '光照', desc: 'URP 卡通渲染：Ramp 阶梯化漫反射 + 边缘光，自定义主光。',
      shaderLab: `Shader "Unity233/URP/Toon"
{
    Properties
    {
        _BaseMap("Base Map", 2D) = "white" {}
        _BaseColor("Base Color", Color) = (1,1,1,1)
        _Ramp("Ramp", 2D) = "white" {}
        _RimColor("Rim Color", Color) = (1,1,1,1)
        _RimPower("Rim Power", Float) = 2.0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
            TEXTURE2D(_Ramp);    SAMPLER(sampler_Ramp);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                float4 _BaseColor;
                float4 _RimColor;
                float  _RimPower;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; float3 normalWS : TEXCOORD1; float3 positionWS : TEXCOORD2; };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
                float3 N = normalize(IN.normalWS);
                float3 V = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                Light main = GetMainLight();
                float ndl = dot(N, main.direction) * 0.5 + 0.5;
                float ramp = SAMPLE_TEXTURE2D(_Ramp, sampler_Ramp, float2(ndl, 0.5)).r;
                float3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv).rgb * _BaseColor.rgb;
                float3 col = albedo * ramp * main.color;
                float rim = pow(1.0 - max(dot(N, V), 0.0), _RimPower);
                col += _RimColor.rgb * rim;
                return half4(col, 1);
            }
            ENDHLSL
        }
    }
}`,
      previewFrag: `void main(){
  float ndl = dot(normalize(vNormal), normalize(u_lightDir)) * 0.5 + 0.5;
  float ramp = smoothstep(0.0, 1.0, ndl);
  vec3 col = u_colorA * ramp * u_lightColor;
  float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.0);
  col += u_colorB * rim;
  gl_FragColor = vec4(col, 1.0);
}`
    },

    {
      id: 'urp-dissolve', name: 'Dissolve 溶解', category: '特效', desc: 'URP 溶解：噪声裁剪 + 边缘辉光 + 主光。',
      shaderLab: `Shader "Unity233/URP/Dissolve"
{
    Properties
    {
        _BaseMap("Base Map", 2D) = "white" {}
        _BaseColor("Base Color", Color) = (1,1,1,1)
        _DissolveMap("Dissolve Noise", 2D) = "white" {}
        _Dissolve("Dissolve", Range(0,1)) = 0.0
        _Edge("Edge Width", Range(0,0.2)) = 0.05
        _EdgeColor("Edge Color", Color) = (1,0.3,0,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            float hash(float2 p){ return frac(sin(dot(p, float2(127.1,311.7))) * 43758.5453); }
            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
            TEXTURE2D(_DissolveMap); SAMPLER(sampler_DissolveMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                float4 _BaseColor;
                float4 _DissolveMap_ST;
                float  _Dissolve;
                float  _Edge;
                float4 _EdgeColor;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; float3 normalWS : TEXCOORD1; float3 positionWS : TEXCOORD2; };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = IN.uv;
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
                float n = hash(IN.uv * 40.0);
                clip(n - _Dissolve);
                float3 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv).rgb * _BaseColor.rgb;
                float edge = smoothstep(_Dissolve, _Dissolve + _Edge, n);
                float3 coll = lerp(_EdgeColor.rgb, albedo, edge);
                float ndl = max(dot(normalize(IN.normalWS), GetMainLight().direction), 0.0);
                return half4(coll * (0.3 + 0.7 * ndl), 1);
            }
            ENDHLSL
        }
    }
}`,
      previewFrag: `float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
void main(){
  float n = hash(floor(vUv * 40.0));
  float t = fract(u_time * u_speed * 0.08);
  if (n < t) discard;
  float ndl = max(dot(normalize(vNormal), normalize(u_lightDir)), 0.0);
  vec3 base = u_colorA * (0.3 + 0.7 * ndl);
  vec3 glow = u_colorB * smoothstep(t, t + 0.06, n);
  float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.0);
  gl_FragColor = vec4(mix(base, glow, 0.4) + rim * 0.3, 1.0);
}`
    },

    {
      id: 'urp-water', name: 'Water 水面', category: '程序化', desc: 'URP 半透明水面：正弦波动 + 菲涅尔，Queue=Transparent。',
      shaderLab: `Shader "Unity233/URP/Water"
{
    Properties
    {
        _ColorA("Shallow", Color) = (0.1,0.5,0.7,1)
        _ColorB("Deep", Color) = (0.0,0.1,0.3,1)
        _Speed("Speed", Float) = 1.0
        _Scale("Scale", Float) = 8.0
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" }
        Pass
        {
            Name "Water"
            Tags { "LightMode"="UniversalForward" }
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            CBUFFER_START(UnityPerMaterial)
                float4 _ColorA;
                float4 _ColorB;
                float  _Speed;
                float  _Scale;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; float3 normalWS : TEXCOORD1; float3 positionWS : TEXCOORD2; };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = IN.uv;
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
                float2 uv = IN.uv * _Scale;
                float w = sin(uv.x * 3.0 + _Time.y * _Speed) * 0.5 + 0.5;
                w *= sin(uv.y * 3.0 - _Time.y * _Speed) * 0.5 + 0.5;
                float3 col = lerp(_ColorB.rgb, _ColorA.rgb, w);
                float f = pow(1.0 - max(dot(normalize(IN.normalWS), GetWorldSpaceNormalizeViewDir(IN.positionWS)), 0.0), 3.0);
                col += f * 0.4;
                return half4(col, 0.8);
            }
            ENDHLSL
        }
    }
}`,
      previewFrag: `void main(){
  vec2 uv = vUv * u_scale * 8.0;
  float w = sin(uv.x * 3.0 + u_time * u_speed) * 0.5 + 0.5;
  w *= sin(uv.y * 3.0 - u_time * u_speed) * 0.5 + 0.5;
  vec3 col = lerp(u_colorB, u_colorA, w);
  float f = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 3.0);
  col += f * 0.4;
  gl_FragColor = vec4(col, 0.85);
}`
    },

    {
      id: 'urp-hologram', name: 'Hologram 全息', category: '特效', desc: 'URP 全息：加色混合 + 菲涅尔 + 竖向扫描 + 闪烁。',
      shaderLab: `Shader "Unity233/URP/Hologram"
{
    Properties
    {
        _Color("Color", Color) = (0.2,0.8,1,1)
        _Speed("Speed", Float) = 2.0
        _Scan("Scan Density", Float) = 20.0
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" }
        Pass
        {
            Name "Holo"
            Tags { "LightMode"="UniversalForward" }
            Blend One One
            ZWrite Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            CBUFFER_START(UnityPerMaterial)
                float4 _Color;
                float  _Speed;
                float  _Scan;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionHCS : SV_POSITION; float3 normalWS : TEXCOORD1; float3 positionWS : TEXCOORD2; float2 uv : TEXCOORD0; };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                OUT.uv = IN.uv;
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
                float f = pow(1.0 - max(dot(normalize(IN.normalWS), GetWorldSpaceNormalizeViewDir(IN.positionWS)), 0.0), 2.0);
                float scan = sin(IN.positionWS.y * _Scan - _Time.y * _Speed) * 0.5 + 0.5;
                float flick = 0.85 + 0.15 * sin(_Time.y * 30.0);
                float3 col = _Color.rgb * (f * 1.5 + 0.2) * (0.5 + 0.5 * scan) * flick;
                return half4(col, 1);
            }
            ENDHLSL
        }
    }
}`,
      previewFrag: `void main(){
  float f = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.0);
  float scan = sin(vWorldPosition.y * 20.0 - u_time * u_speed * 2.0) * 0.5 + 0.5;
  float flick = 0.85 + 0.15 * sin(u_time * 30.0);
  vec3 col = u_colorA * (f * 1.5 + 0.2) * (0.5 + 0.5 * scan) * flick;
  gl_FragColor = vec4(col, 1.0);
}`
    },

    {
      id: 'urp-outline', name: 'Outline 描边', category: '特效', desc: 'URP 反向外扩描边（第二 Pass, Cull Front）+ PBR 主体。',
      shaderLab: `Shader "Unity233/URP/Outline"
{
    Properties
    {
        _BaseMap("Base Map", 2D) = "white" {}
        _BaseColor("Base Color", Color) = (1,1,1,1)
        _OutlineColor("Outline", Color) = (0,0,0,1)
        _OutlineWidth("Width", Range(0.001,0.05)) = 0.01
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        // 描边通道：沿法线外扩，剔除正面
        Pass
        {
            Name "Outline"
            Tags { "LightMode"="UniversalForward" }
            Cull Front
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            CBUFFER_START(UnityPerMaterial)
                float4 _OutlineColor;
                float  _OutlineWidth;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; };
            struct Varyings  { float4 positionHCS : SV_POSITION; };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                float3 p = IN.positionOS.xyz + normalize(IN.normalOS) * _OutlineWidth;
                OUT.positionHCS = TransformObjectToHClip(p);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target { return _OutlineColor; }
            ENDHLSL
        }
        // 主体 PBR
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                float4 _BaseColor;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; float3 normalWS : TEXCOORD1; float3 positionWS : TEXCOORD2; };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
                float3 N = normalize(IN.normalWS);
                InputData id = (InputData)0;
                id.normalWS = N;
                id.positionWS = IN.positionWS;
                id.viewDirectionWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                id.shadowCoord = TransformWorldToShadowCoord(IN.positionWS);
                id.bakedGI = SampleSH(N);
                SurfaceData sd = (SurfaceData)0;
                sd.albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv).rgb * _BaseColor.rgb;
                sd.alpha = 1.0;
                return UniversalFragmentPBR(id, sd);
            }
            ENDHLSL
        }
    }
}`,
      previewFrag: `void main(){
  vec3 N = normalize(vNormal);
  vec3 col = u_colorA * (0.3 + 0.7 * max(dot(N, normalize(u_lightDir)), 0.0));
  gl_FragColor = vec4(col, 1.0);
}`
    },

    {
      id: 'urp-simplelit', name: 'SimpleLit', category: '光照', desc: 'URP Blinn-Phong 简化光照（UniversalFragmentBlinnPhong）。',
      shaderLab: `Shader "Unity233/URP/SimpleLit"
{
    Properties
    {
        _BaseMap("Base Map", 2D) = "white" {}
        _BaseColor("Base Color", Color) = (1,1,1,1)
        _SpecColor("Specular", Color) = (0.2,0.2,0.2,1)
        _Shininess("Shininess", Range(0,1)) = 0.5
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                float4 _BaseColor;
                float4 _SpecColor;
                float  _Shininess;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; float3 normalWS : TEXCOORD1; float3 positionWS : TEXCOORD2; };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
                float3 N = normalize(IN.normalWS);
                InputData id = (InputData)0;
                id.normalWS = N;
                id.positionWS = IN.positionWS;
                id.viewDirectionWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                id.shadowCoord = TransformWorldToShadowCoord(IN.positionWS);
                id.bakedGI = SampleSH(N);
                SurfaceData sd = (SurfaceData)0;
                sd.albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv).rgb * _BaseColor.rgb;
                sd.specular = _SpecColor.rgb;
                sd.smoothness = _Shininess;
                sd.alpha = 1.0;
                return UniversalFragmentBlinnPhong(id, sd);
            }
            ENDHLSL
        }
    }
}`,
      previewFrag: `void main(){
  vec3 N = normalize(vNormal); vec3 V = normalize(vViewDir); vec3 L = normalize(u_lightDir);
  vec3 H = normalize(L + V);
  float ndl = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), 32.0);
  vec3 col = u_colorA * ndl * u_lightColor + vec3(spec) * 0.5;
  gl_FragColor = vec4(col, 1.0);
}`
    },

    {
      id: 'urp-customlit', name: 'CustomLit 自定义光', category: '光照', desc: 'URP 自定义光照函数：Wrap 漫反射 + 边缘光（不依赖 PBR）。',
      shaderLab: `Shader "Unity233/URP/CustomLit"
{
    Properties
    {
        _BaseColor("Base Color", Color) = (0.8,0.8,0.9,1)
        _RimColor("Rim Color", Color) = (0.4,0.8,1,1)
        _RimPower("Rim Power", Float) = 3.0
        _Wrap("Wrap", Range(0,1)) = 0.3
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
                float4 _RimColor;
                float  _RimPower;
                float  _Wrap;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; float3 normalWS : TEXCOORD1; float3 positionWS : TEXCOORD2; };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = IN.uv;
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
                float3 N = normalize(IN.normalWS);
                float3 V = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                Light L = GetMainLight();
                float ndl = (dot(N, L.direction) + _Wrap) / (1.0 + _Wrap);
                float3 diff = _BaseColor.rgb * max(ndl, 0.0) * L.color;
                float rim = pow(1.0 - max(dot(N, V), 0.0), _RimPower);
                float3 col = diff + _RimColor.rgb * rim;
                return half4(col, 1);
            }
            ENDHLSL
        }
    }
}`,
      previewFrag: `void main(){
  vec3 N = normalize(vNormal); vec3 V = normalize(vViewDir); vec3 L = normalize(u_lightDir);
  float ndl = (dot(N, L) + 0.3) / 1.3;
  vec3 diff = u_colorA * max(ndl, 0.0) * u_lightColor;
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 col = diff + u_colorB * rim;
  gl_FragColor = vec4(col, 1.0);
}`
    },

    {
      id: 'urp-fresnel', name: 'Fresnel 边缘光', category: '特效', desc: 'URP 菲涅尔边缘光（加色混合，透明）。',
      shaderLab: `Shader "Unity233/URP/Fresnel"
{
    Properties
    {
        _ColorA("Inner", Color) = (0.1,0.3,0.8,1)
        _ColorB("Rim", Color) = (0.6,0.9,1,1)
        _Power("Power", Float) = 3.0
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" }
        Pass
        {
            Name "Fres"
            Tags { "LightMode"="UniversalForward" }
            Blend One One
            ZWrite Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            CBUFFER_START(UnityPerMaterial)
                float4 _ColorA;
                float4 _ColorB;
                float  _Power;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionHCS : SV_POSITION; float3 normalWS : TEXCOORD1; float3 positionWS : TEXCOORD2; };
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                return OUT;
            }
            half4 frag(Varyings IN) : SV_Target
            {
                float f = pow(1.0 - max(dot(normalize(IN.normalWS), GetWorldSpaceNormalizeViewDir(IN.positionWS)), 0.0), _Power);
                return half4(lerp(_ColorA.rgb, _ColorB.rgb, f), 1);
            }
            ENDHLSL
        }
    }
}`,
      previewFrag: `void main(){
  float f = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 3.0);
  gl_FragColor = vec4(lerp(u_colorA, u_colorB, f), 1.0);
}`
    }
  ];

  return {
    PREVIEW_LIB,
    TEMPLATES,
    get: (id) => TEMPLATES.find(t => t.id === id)
  };
})();
