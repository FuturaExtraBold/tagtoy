// Uniform layout (80 bytes, padded to 256 for dynamic offset alignment):
//   offset  0: canvas_size      vec2f
//   offset  8: draw_offset      vec2f
//   offset 16: color            vec4f
//   offset 32: gradient_start   vec4f
//   offset 48: gradient_end     vec4f
//   offset 64: grad_min_y       f32
//   offset 68: grad_max_y       f32
//   offset 72: use_gradient     u32
//   offset 76: use_texture      u32

export const SHADER_SOURCE = /* wgsl */ `
struct Uniforms {
  canvas_size    : vec2f,
  draw_offset    : vec2f,
  color          : vec4f,
  gradient_start : vec4f,
  gradient_end   : vec4f,
  grad_min_y     : f32,
  grad_max_y     : f32,
  use_gradient   : u32,
  use_texture    : u32,
}

@group(0) @binding(0) var<uniform> u           : Uniforms;
@group(0) @binding(1) var          paint_tex   : texture_2d<f32>;
@group(0) @binding(2) var          tex_sampler : sampler;

struct VertOut {
  @builtin(position) clip : vec4f,
  @location(0)       wy   : f32,
}

@vertex
fn vs_main(@location(0) pos : vec2f) -> VertOut {
  let p    = pos + u.draw_offset;
  let ndcx =  (p.x / u.canvas_size.x) * 2.0 - 1.0;
  let ndcy = -(p.y / u.canvas_size.y) * 2.0 + 1.0;
  return VertOut(vec4f(ndcx, ndcy, 0.0, 1.0), p.y);
}

@fragment
fn fs_main(v : VertOut) -> @location(0) vec4f {
  var col : vec4f;
  if u.use_gradient == 1u {
    let range = max(u.grad_max_y - u.grad_min_y, 1.0);
    let t     = clamp((v.wy - u.grad_min_y) / range, 0.0, 1.0);
    col = mix(u.gradient_start, u.gradient_end, t);
  } else {
    col = u.color;
  }
  if u.use_texture == 1u {
    let uv  = v.clip.xy / u.canvas_size;
    let tex = textureSample(paint_tex, tex_sampler, uv);
    let lum = dot(tex.rgb, vec3f(0.299, 0.587, 0.114));
    col = vec4f(col.rgb * (0.25 + 0.75 * lum), col.a);
  }
  return col;
}
`;

// Size of the uniform struct (must match the WGSL layout above)
export const UNIFORM_SIZE = 80;

// Each uniform slot is padded to this alignment for dynamic offsets.
// WebGPU requires minUniformBufferOffsetAlignment <= 256.
export const UNIFORM_STRIDE = 256;

export const MAX_DRAW_CALLS = 1024; // per frame
