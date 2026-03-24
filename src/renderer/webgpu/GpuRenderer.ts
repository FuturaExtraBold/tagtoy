import type {
  GradientMode,
  Point,
  RenderConfig,
  Stroke,
  StyleMode,
} from "../../types/drawing";
import { getDrawingBounds, shadowCoords } from "../renderHelpers";
import {
  MAX_DRAW_CALLS,
  SHADER_SOURCE,
  UNIFORM_SIZE,
  UNIFORM_STRIDE,
} from "./shaders";
import {
  concatF32,
  tessellateBubble,
  tessellateDrips,
  tessellateStroke,
} from "./tessellate";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnimatingStroke {
  stroke: Stroke;
  progress: number; // 0 → 1
}

interface UniformData {
  offset?: [number, number];
  color?: [number, number, number, number];
  gradientStart?: [number, number, number, number];
  gradientEnd?: [number, number, number, number];
  gradMinY?: number;
  gradMaxY?: number;
  useGradient?: boolean;
}

interface DrawCall {
  vertOffset: number; // vertex index (not bytes)
  vertCount: number;
  uniformSlot: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hex4(hex: string, a = 1): [number, number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
    a,
  ];
}

function pts(stroke: Stroke): Point[] {
  return stroke.renderPoints.length > 1 ? stroke.renderPoints : stroke.points;
}

function seedFor(stroke: Stroke): number {
  const p = pts(stroke);
  return Math.round(p[0].x * 7 + p[0].y * 13 + stroke.id * 17);
}

// ── GpuRenderer ──────────────────────────────────────────────────────────────

export class GpuRenderer {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private bindGroupLayout!: GPUBindGroupLayout;
  private uniformBuffer!: GPUBuffer;
  private vertexBuffer!: GPUBuffer;
  private vertexCapacity = 0; // in floats
  private msaaTexture: GPUTexture | null = null;
  private fallbackTexture!: GPUTexture;
  private paintTexture!: GPUTexture;
  private textureSampler!: GPUSampler;
  private useTexture = 0;

  // Scratch buffers reused each frame (avoids GC churn)
  private uniformScratch = new ArrayBuffer(MAX_DRAW_CALLS * UNIFORM_STRIDE);
  private drawCalls: DrawCall[] = [];
  private vertArrays: Float32Array[] = [];

  width = 1;
  height = 1;

  // ── Init ────────────────────────────────────────────────────────────────────

  static async create(canvas: HTMLCanvasElement): Promise<GpuRenderer> {
    if (!navigator.gpu) throw new Error("WebGPU not supported");
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "high-performance",
    });
    if (!adapter) throw new Error("No WebGPU adapter");
    const device = await adapter.requestDevice();

    const r = new GpuRenderer();
    r.device = device;

    r.format = navigator.gpu.getPreferredCanvasFormat();
    r.context = canvas.getContext("webgpu") as GPUCanvasContext;
    r.context.configure({
      device,
      format: r.format,
      alphaMode: "premultiplied",
      colorSpace: "display-p3",
    });

    const module = device.createShaderModule({ code: SHADER_SOURCE });

    r.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: UNIFORM_SIZE,
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" },
        },
      ],
    });

    r.uniformBuffer = device.createBuffer({
      size: MAX_DRAW_CALLS * UNIFORM_STRIDE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // 1×1 white fallback texture — always bound so the shader binding is valid
    r.fallbackTexture = device.createTexture({
      size: [1, 1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
      { texture: r.fallbackTexture },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4 },
      [1, 1, 1],
    );
    r.paintTexture = r.fallbackTexture;

    r.textureSampler = device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
    });

    r.bindGroup = device.createBindGroup({
      layout: r.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: r.uniformBuffer, offset: 0, size: UNIFORM_SIZE },
        },
        { binding: 1, resource: r.fallbackTexture.createView() },
        { binding: 2, resource: r.textureSampler },
      ],
    });

    r.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [r.bindGroupLayout],
      }),
      vertex: {
        module,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 8, // 2 × f32
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: "fs_main",
        targets: [
          {
            format: r.format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
      multisample: { count: 4 }, // 4× MSAA
    });

    r.growVertexBuffer(1024 * 1024); // 1M floats (~8MB) initial allocation

    return r;
  }

  // ── Resize ──────────────────────────────────────────────────────────────────

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    // Setting canvas.width/height invalidates the swap chain — must reconfigure.
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "premultiplied",
      colorSpace: "display-p3",
    });
    // Recreate MSAA texture to match new canvas size
    this.msaaTexture?.destroy();
    this.msaaTexture = this.device.createTexture({
      size: [w, h, 1],
      format: this.format,
      sampleCount: 4,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  render(
    strokes: Stroke[],
    currentPoints: Point[],
    style: StyleMode,
    gradientMode: GradientMode,
    config: RenderConfig,
    animating: AnimatingStroke[],
  ): void {
    this.drawCalls = [];
    this.vertArrays = [];

    const isDrawing = currentPoints.length >= 2;
    const preview: Stroke | null = isDrawing
      ? { id: -1, points: currentPoints, renderPoints: currentPoints }
      : null;

    const gradBounds =
      style === "burner" && gradientMode === "combined"
        ? getDrawingBounds(
            isDrawing && preview ? [...strokes, preview] : strokes,
            Math.max(config.brushSize, config.outlineSize) / 2,
          )
        : null;

    if (style === "tag") {
      this.planTag(strokes, config, preview);
    } else if (style === "throwup") {
      this.planThrowup(strokes, config, animating, preview);
    } else if (style === "bubble") {
      this.planBubble(strokes, config, animating, preview);
    } else {
      this.planBurner(
        strokes,
        config,
        gradientMode,
        animating,
        gradBounds,
        preview,
      );
    }

    this.flush();
  }

  // ── Style planners ───────────────────────────────────────────────────────────

  private planTag(
    strokes: Stroke[],
    cfg: RenderConfig,
    preview: Stroke | null,
  ): void {
    const all = preview ? [...strokes, preview] : strokes;
    for (const s of all) {
      const p = pts(s);
      if (p.length < 2) continue;
      const seed = seedFor(s);
      const [sx, sy] = shadowCoords(cfg);

      // Bleed / Glow: multiple passes behind everything
      if (cfg.tagEffect === "bleed" || cfg.tagEffect === "glow") {
        const isGlow = cfg.tagEffect === "glow";
        const steps = 5;
        const spreadMult = isGlow ? 0.5 : 0.2;
        const baseAlpha = isGlow ? 0.12 : 0.06;
        for (let i = steps; i >= 1; i--) {
          const size = cfg.brushSize * (1 + i * spreadMult);
          const alpha = baseAlpha / i;
          this.push(tessellateStroke(p, size, cfg.brushType), {
            color: isGlow ? hex4(cfg.tagColor, alpha) : hex4("#000000", alpha),
          });
        }
      }

      // Shadow
      if (cfg.shadowOffset > 0) {
        this.push(tessellateStroke(p, cfg.brushSize, cfg.brushType), {
          color: hex4(cfg.shadowColor),
          offset: [sx, sy],
        });
      }

      // Outline
      if (cfg.outlineSize > 0) {
        this.push(tessellateStroke(p, cfg.outlineSize, cfg.brushType), {
          color: hex4(cfg.outlineColor),
        });
      }

      // Fill
      if (cfg.tagEffect === "chrome") {
        let bmin = Infinity,
          bmax = -Infinity;
        for (const pt of p) {
          bmin = Math.min(bmin, pt.y);
          bmax = Math.max(bmax, pt.y);
        }
        const pad = cfg.brushSize / 2;
        this.push(tessellateStroke(p, cfg.brushSize, cfg.brushType), {
          useGradient: true,
          gradientStart: hex4(cfg.gradientStart),
          gradientEnd: hex4(cfg.gradientEnd),
          gradMinY: bmin - pad,
          gradMaxY: bmax + pad,
        });
      } else {
        this.push(tessellateStroke(p, cfg.brushSize, cfg.brushType), {
          color: hex4(cfg.tagColor),
        });
      }

      // Ink streaks / drips
      if (cfg.showDrips) {
        if (cfg.tagEffect === "chrome") {
          let bmin = Infinity,
            bmax = -Infinity;
          for (const pt of p) {
            bmin = Math.min(bmin, pt.y);
            bmax = Math.max(bmax, pt.y);
          }
          const pad = cfg.brushSize / 2;
          this.push(tessellateDrips(p, cfg.brushSize, seed, cfg.dripCount, 1), {
            useGradient: true,
            gradientStart: hex4(cfg.gradientStart),
            gradientEnd: hex4(cfg.gradientEnd),
            gradMinY: bmin - pad,
            gradMaxY: bmax + pad,
          });
        } else {
          this.push(tessellateDrips(p, cfg.brushSize, seed, cfg.dripCount, 1), {
            color: hex4(cfg.tagColor),
          });
        }
      }
    }
  }

  private planThrowup(
    strokes: Stroke[],
    cfg: RenderConfig,
    animating: AnimatingStroke[],
    preview: Stroke | null,
  ): void {
    const animIds = new Set(animating.map((a) => a.stroke.id));

    // Throwup renders newest-first so oldest strokes appear on top
    const live = strokes.filter((s) => !animIds.has(s.id));
    const ordered = [...live].reverse();

    const drawThrowup = (s: Stroke, dripProg?: number) => {
      const p = pts(s);
      if (p.length < 2) return;
      const [sx, sy] = shadowCoords(cfg);
      const seed = seedFor(s);

      // Shadow
      if (cfg.shadowOffset > 0) {
        if (cfg.shadowAttached) {
          this.extrude(
            s,
            cfg.outlineSize,
            cfg.brushType,
            sx,
            sy,
            cfg.shadowColor,
          );
        } else {
          this.push(tessellateStroke(p, cfg.outlineSize, cfg.brushType), {
            color: hex4(cfg.shadowColor),
            offset: [sx, sy],
          });
        }
        // Drips between shadow and outline so stroke covers the attachment point
        if (cfg.showDrips && dripProg !== undefined) {
          this.push(
            tessellateDrips(
              p,
              cfg.outlineSize,
              seed,
              cfg.dripCount,
              dripProg,
              sx,
              sy,
            ),
            { color: hex4(cfg.shadowColor) },
          );
        }
      }
      // Outline
      this.push(tessellateStroke(p, cfg.outlineSize, cfg.brushType), {
        color: hex4(cfg.outlineColor),
      });
      if (cfg.showDrips && dripProg !== undefined) {
        this.push(
          tessellateDrips(
            p,
            cfg.outlineSize,
            seed + 1000,
            cfg.dripCount,
            dripProg,
          ),
          { color: hex4(cfg.outlineColor) },
        );
      }
      // Fill
      this.push(tessellateStroke(p, cfg.brushSize, cfg.brushType), {
        color: hex4(cfg.throwupColor),
      });
      if (cfg.showDrips && dripProg !== undefined) {
        this.push(
          tessellateDrips(
            p,
            cfg.brushSize,
            seed + 2000,
            cfg.dripCount,
            dripProg,
          ),
          { color: hex4(cfg.throwupColor) },
        );
      }
    };

    if (preview) drawThrowup(preview);
    for (const anim of [...animating].reverse())
      drawThrowup(anim.stroke, anim.progress);
    for (const s of ordered) drawThrowup(s, 1);
  }

  private planBubble(
    strokes: Stroke[],
    cfg: RenderConfig,
    animating: AnimatingStroke[],
    preview: Stroke | null,
  ): void {
    const animIds = new Set(animating.map((a) => a.stroke.id));
    const live = strokes.filter((s) => !animIds.has(s.id));
    const ordered = [...live].reverse();

    const drawBubble = (s: Stroke, dripProg?: number) => {
      const p = pts(s);
      if (p.length < 2) return;
      const [sx, sy] = shadowCoords(cfg);
      const seed = seedFor(s);

      // Shadow — uniform round stroke so shadow is consistent
      if (cfg.shadowOffset > 0) {
        if (cfg.shadowAttached) {
          this.extrude(
            s,
            cfg.outlineSize,
            cfg.brushType,
            sx,
            sy,
            cfg.shadowColor,
          );
        } else {
          this.push(tessellateStroke(p, cfg.outlineSize, cfg.brushType), {
            color: hex4(cfg.shadowColor),
            offset: [sx, sy],
          });
        }
        if (cfg.showDrips && dripProg !== undefined) {
          this.push(
            tessellateDrips(
              p,
              cfg.outlineSize,
              seed,
              cfg.dripCount,
              dripProg,
              sx,
              sy,
            ),
            { color: hex4(cfg.shadowColor) },
          );
        }
      }
      // Outline — uniform round stroke for consistent ring width
      this.push(tessellateStroke(p, cfg.outlineSize, cfg.brushType), {
        color: hex4(cfg.outlineColor),
      });
      if (cfg.showDrips && dripProg !== undefined) {
        this.push(
          tessellateDrips(
            p,
            cfg.outlineSize,
            seed + 1000,
            cfg.dripCount,
            dripProg,
          ),
          { color: hex4(cfg.outlineColor) },
        );
      }
      // Fill — bubble tessellation: tapers at ends
      this.push(tessellateBubble(p, cfg.brushSize), {
        color: hex4(cfg.throwupColor),
      });
      if (cfg.showDrips && dripProg !== undefined) {
        this.push(
          tessellateDrips(
            p,
            cfg.brushSize,
            seed + 2000,
            cfg.dripCount,
            dripProg,
          ),
          { color: hex4(cfg.throwupColor) },
        );
      }
    };

    for (const anim of [...animating].reverse())
      drawBubble(anim.stroke, anim.progress);
    for (const s of ordered) drawBubble(s, 1);
    if (preview) drawBubble(preview); // last = renders on top
  }

  private planBurner(
    strokes: Stroke[],
    cfg: RenderConfig,
    gradientMode: GradientMode,
    animating: AnimatingStroke[],
    gradBounds: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    } | null,
    preview: Stroke | null,
  ): void {
    const animIds = new Set(animating.map((a) => a.stroke.id));
    const live = strokes.filter((s) => !animIds.has(s.id));
    const effectiveMode = gradientMode === "combined" ? "combined" : "overlay";
    const [sx, sy] = shadowCoords(cfg);
    const shadowSize = cfg.outlineSize || cfg.brushSize;

    // Preview (current stroke) goes last so it renders on top of existing strokes
    const all: Array<{ stroke: Stroke; dripProg?: number }> = [];
    for (const a of animating)
      all.push({ stroke: a.stroke, dripProg: a.progress });
    for (const s of live) all.push({ stroke: s, dripProg: 1 });
    if (preview) all.push({ stroke: preview });

    if (effectiveMode === "combined") {
      // Pass 1: all shadows
      for (const { stroke: s } of all) {
        const p = pts(s);
        if (p.length < 2) continue;
        if (cfg.shadowOffset > 0) {
          if (cfg.shadowAttached) {
            this.extrude(s, shadowSize, cfg.brushType, sx, sy, cfg.shadowColor);
          } else {
            this.push(tessellateStroke(p, shadowSize, cfg.brushType), {
              color: hex4(cfg.shadowColor),
              offset: [sx, sy],
            });
          }
        }
      }
      // Pass 2: all drips (between shadow and outline — stroke covers attachment)
      if (cfg.showDrips && cfg.shadowOffset > 0) {
        for (const { stroke: s, dripProg } of all) {
          if (!dripProg) continue;
          const p = pts(s);
          if (p.length < 2) continue;
          this.push(
            tessellateDrips(
              p,
              shadowSize,
              seedFor(s),
              cfg.dripCount,
              dripProg,
              sx,
              sy,
            ),
            { color: hex4(cfg.shadowColor) },
          );
        }
      }
      // Pass 3: all outlines
      if (cfg.outlineSize > 0) {
        for (const { stroke: s } of all) {
          const p = pts(s);
          if (p.length < 2) continue;
          this.push(tessellateStroke(p, cfg.outlineSize, cfg.brushType), {
            color: hex4(cfg.outlineColor),
          });
        }
      }
      // Pass 3.5: outline drips
      if (cfg.showDrips && cfg.outlineSize > 0) {
        for (const { stroke: s, dripProg } of all) {
          if (!dripProg) continue;
          const p = pts(s);
          if (p.length < 2) continue;
          this.push(
            tessellateDrips(
              p,
              cfg.outlineSize,
              seedFor(s) + 1000,
              cfg.dripCount,
              dripProg,
            ),
            { color: hex4(cfg.outlineColor) },
          );
        }
      }
      // Pass 4: gradient fill
      const gmin = gradBounds?.minY ?? 0;
      const gmax = gradBounds?.maxY ?? this.height;
      for (const { stroke: s } of all) {
        const p = pts(s);
        if (p.length < 2) continue;
        this.push(tessellateStroke(p, cfg.brushSize, cfg.brushType), {
          useGradient: true,
          gradientStart: hex4(cfg.gradientStart),
          gradientEnd: hex4(cfg.gradientEnd),
          gradMinY: gmin,
          gradMaxY: gmax,
        });
      }
      // Pass 4.5: fill drips (same gradient as fill so color matches position)
      if (cfg.showDrips) {
        for (const { stroke: s, dripProg } of all) {
          if (!dripProg) continue;
          const p = pts(s);
          if (p.length < 2) continue;
          this.push(
            tessellateDrips(
              p,
              cfg.brushSize,
              seedFor(s) + 2000,
              cfg.dripCount,
              dripProg,
            ),
            {
              useGradient: true,
              gradientStart: hex4(cfg.gradientStart),
              gradientEnd: hex4(cfg.gradientEnd),
              gradMinY: gmin,
              gradMaxY: gmax,
            },
          );
        }
      }
    } else {
      // Overlay: per-stroke bounds
      for (const { stroke: s, dripProg } of all) {
        const p = pts(s);
        if (p.length < 2) continue;
        const pad = Math.max(cfg.brushSize, cfg.outlineSize) / 2;
        let bmin = Infinity,
          bmax = -Infinity;
        for (const pt of p) {
          bmin = Math.min(bmin, pt.y);
          bmax = Math.max(bmax, pt.y);
        }
        bmin -= pad;
        bmax += pad;

        if (cfg.shadowOffset > 0) {
          if (cfg.shadowAttached) {
            this.extrude(s, shadowSize, cfg.brushType, sx, sy, cfg.shadowColor);
          } else {
            this.push(tessellateStroke(p, shadowSize, cfg.brushType), {
              color: hex4(cfg.shadowColor),
              offset: [sx, sy],
            });
          }
          // Drips between shadow and outline
          if (cfg.showDrips && dripProg) {
            this.push(
              tessellateDrips(
                p,
                shadowSize,
                seedFor(s),
                cfg.dripCount,
                dripProg,
                sx,
                sy,
              ),
              { color: hex4(cfg.shadowColor) },
            );
          }
        }
        if (cfg.outlineSize > 0) {
          this.push(tessellateStroke(p, cfg.outlineSize, cfg.brushType), {
            color: hex4(cfg.outlineColor),
          });
          if (cfg.showDrips && dripProg) {
            this.push(
              tessellateDrips(
                p,
                cfg.outlineSize,
                seedFor(s) + 1000,
                cfg.dripCount,
                dripProg,
              ),
              { color: hex4(cfg.outlineColor) },
            );
          }
        }
        this.push(tessellateStroke(p, cfg.brushSize, cfg.brushType), {
          useGradient: true,
          gradientStart: hex4(cfg.gradientStart),
          gradientEnd: hex4(cfg.gradientEnd),
          gradMinY: bmin,
          gradMaxY: bmax,
        });
        if (cfg.showDrips && dripProg) {
          this.push(
            tessellateDrips(
              p,
              cfg.brushSize,
              seedFor(s) + 2000,
              cfg.dripCount,
              dripProg,
            ),
            {
              useGradient: true,
              gradientStart: hex4(cfg.gradientStart),
              gradientEnd: hex4(cfg.gradientEnd),
              gradMinY: bmin,
              gradMaxY: bmax,
            },
          );
        }
      }
    }
  }

  // ── Extrusion helper ─────────────────────────────────────────────────────────

  private extrude(
    stroke: Stroke,
    lineWidth: number,
    brushType: RenderConfig["brushType"],
    sx: number,
    sy: number,
    color: string,
  ): void {
    const p = pts(stroke);
    const dist = Math.hypot(sx, sy);
    if (dist < 1) return;
    const steps = Math.min(20, Math.ceil(dist / Math.max(1, lineWidth * 0.4)));
    const verts = tessellateStroke(p, lineWidth, brushType);
    const c = hex4(color);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.push(verts, { color: c, offset: [sx * t, sy * t] });
    }
  }

  // ── Low-level push / flush ───────────────────────────────────────────────────

  private push(verts: Float32Array, u: UniformData): void {
    if (verts.length === 0) return;
    if (this.drawCalls.length >= MAX_DRAW_CALLS) return; // safety cap

    const slot = this.drawCalls.length;
    const vertOffset = this.vertArrays.reduce((s, a) => s + a.length, 0);

    this.vertArrays.push(verts);
    this.drawCalls.push({
      vertOffset,
      vertCount: verts.length / 2,
      uniformSlot: slot,
    });

    // Write uniform data into scratch buffer
    const dv = new DataView(this.uniformScratch, slot * UNIFORM_STRIDE);
    let o = 0;
    const w32 = (v: number) => {
      dv.setFloat32(o, v, true);
      o += 4;
    };
    const w32u = (v: number) => {
      dv.setUint32(o, v, true);
      o += 4;
    };

    w32(this.width);
    w32(this.height); // canvas_size
    w32(u.offset?.[0] ?? 0);
    w32(u.offset?.[1] ?? 0); // draw_offset
    const col = u.color ?? [0, 0, 0, 1];
    col.forEach(w32); // color
    (u.gradientStart ?? [0, 0, 0, 1]).forEach(w32); // gradient_start
    (u.gradientEnd ?? [0, 0, 0, 1]).forEach(w32); // gradient_end
    w32(u.gradMinY ?? 0);
    w32(u.gradMaxY ?? this.height); // grad_min/max_y
    w32u(u.useGradient ? 1 : 0); // use_gradient
    w32u(this.useTexture); // use_texture
  }

  private renderPassDescriptor(): GPURenderPassDescriptor {
    const swapView = this.context.getCurrentTexture().createView();
    if (this.msaaTexture) {
      // MSAA: render into the multisample texture, resolve to swapchain
      return {
        colorAttachments: [
          {
            view: this.msaaTexture.createView(),
            resolveTarget: swapView,
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "discard", // MSAA buffer not needed after resolve
          },
        ],
      };
    }
    return {
      colorAttachments: [
        {
          view: swapView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };
  }

  private flush(): void {
    if (this.drawCalls.length === 0) {
      const enc = this.device.createCommandEncoder();
      enc.beginRenderPass(this.renderPassDescriptor()).end();
      this.device.queue.submit([enc.finish()]);
      return;
    }

    // Upload uniforms
    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      this.uniformScratch,
      0,
      this.drawCalls.length * UNIFORM_STRIDE,
    );

    // Concat + upload vertices
    const allVerts = concatF32(this.vertArrays);
    if (allVerts.length > this.vertexCapacity) {
      this.growVertexBuffer(allVerts.length * 2);
    }
    this.device.queue.writeBuffer(this.vertexBuffer, 0, allVerts);

    // Record render pass
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginRenderPass(this.renderPassDescriptor());

    pass.setPipeline(this.pipeline);
    pass.setVertexBuffer(0, this.vertexBuffer);

    for (const dc of this.drawCalls) {
      if (dc.vertCount === 0) continue;
      pass.setBindGroup(0, this.bindGroup, [dc.uniformSlot * UNIFORM_STRIDE]);
      pass.draw(dc.vertCount, 1, dc.vertOffset / 2, 0);
    }

    pass.end();
    this.device.queue.submit([enc.finish()]);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private growVertexBuffer(minFloats: number): void {
    this.vertexBuffer?.destroy();
    this.vertexCapacity = minFloats;
    this.vertexBuffer = this.device.createBuffer({
      size: minFloats * 4, // float32 = 4 bytes
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  // ── Paint texture ────────────────────────────────────────────────────────────

  setPaintTexture(image: HTMLImageElement | null): void {
    if (this.paintTexture !== this.fallbackTexture) {
      this.paintTexture.destroy();
    }
    if (image === null) {
      this.paintTexture = this.fallbackTexture;
      this.useTexture = 0;
    } else {
      const w = image.naturalWidth || 1;
      const h = image.naturalHeight || 1;
      const tex = this.device.createTexture({
        size: [w, h, 1],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this.device.queue.copyExternalImageToTexture(
        { source: image },
        { texture: tex },
        [w, h],
      );
      this.paintTexture = tex;
      this.useTexture = 1;
    }
    this.rebuildBindGroup();
  }

  private rebuildBindGroup(): void {
    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer,
            offset: 0,
            size: UNIFORM_SIZE,
          },
        },
        { binding: 1, resource: this.paintTexture.createView() },
        { binding: 2, resource: this.textureSampler },
      ],
    });
  }

  destroy(): void {
    this.msaaTexture?.destroy();
    if (this.paintTexture !== this.fallbackTexture)
      this.paintTexture?.destroy();
    this.fallbackTexture?.destroy();
    this.vertexBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.context.unconfigure();
  }
}
