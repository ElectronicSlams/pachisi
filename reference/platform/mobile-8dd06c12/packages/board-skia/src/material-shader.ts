export const MATERIAL_SHADER_VERSION = "eslams.board-material.sksl.v1" as const;

/**
 * One bounded SkSL program represents all theme material planes. The numeric
 * surface uniform is derived from ThemeTokens.material.boardSurface; no theme
 * or game is allowed to inject shader source at runtime.
 */
export const MATERIAL_SKSL = `
uniform float2 resolution;
uniform float4 baseColor;
uniform float4 accentColor;
uniform float detail;
uniform float surface;
uniform float phase;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123);
}

half4 main(float2 position) {
  float2 size = max(resolution, float2(1.0));
  float2 uv = position / size;
  float treatment = 0.0;

  if (surface > 0.5 && surface < 1.5) {
    float grain = sin((uv.y * 66.0 + hash(float2(floor(uv.y * 24.0), 2.0)) * 5.0));
    treatment = grain * 0.022;
  } else if (surface >= 1.5 && surface < 2.5) {
    treatment = (hash(floor(position * 0.7)) - 0.5) * 0.035;
  } else if (surface >= 2.5 && surface < 3.5) {
    float scan = sin(position.y * 3.14159265) * 0.026;
    float persistence = exp(-abs(uv.x - phase) * 8.0) * 0.035;
    treatment = scan + persistence;
  } else if (surface >= 3.5 && surface < 4.5) {
    float sheen = pow(max(0.0, 1.0 - distance(uv, float2(0.2, 0.05))), 5.0);
    treatment = sheen * 0.09;
  } else if (surface >= 4.5) {
    treatment = -smoothstep(0.25, 0.78, distance(uv, float2(0.5))) * 0.075;
  }

  float accentMix = max(0.0, treatment) * detail;
  float3 rgb = mix(baseColor.rgb + treatment * detail, accentColor.rgb, accentMix);
  return half4(clamp(rgb, 0.0, 1.0), baseColor.a);
}
`;
