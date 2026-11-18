import { buildPoints, CAMERA_DISTANCE as D, frame, MAX_PITCH, MAX_YAW, MOTES, orbitRotation, SPLAT_OVERLAP, type SceneMeta } from "./scene";

/** Plain WebGL pixel-art splat: depth-placed square points plus rising embers. Returns a stop function. */
export interface SplatStats { points: number; frames: number; dtSum: number; drawSum: number; buffer: string }

const SPLAT_VS = `
uniform mat4 uProj; uniform mat3 uRot; uniform float uSize;
attribute vec3 position; attribute vec4 color; varying vec3 vColor;
void main() {
  vec3 mv = uRot * position + vec3(0.0, 0.0, -${D}.0);
  gl_Position = uProj * vec4(mv, 1.0);
  gl_PointSize = uSize * ${D}.0 / -mv.z;
  vColor = color.rgb;
}`;
const SPLAT_FS = `precision mediump float; varying vec3 vColor; void main() { gl_FragColor = vec4(vColor, 1.0); }`;

const MOTE_VS = `
uniform mat4 uProj; uniform mat3 uRot; uniform float uTime; uniform float uPx;
attribute vec4 seed; varying float vT; varying float vF;
void main() {
  float life = 6.0 + seed.x * 6.0;
  float t = fract(uTime / life + seed.y);
  vec3 p = vec3((seed.z - 0.5) * 22.0, (seed.w - 0.5) * 12.0, 4.0);
  float sway = sin(uTime * (0.6 + seed.w) + seed.x * 6.283);
  p.x += t * (20.0 + 40.0 * seed.z) + sway * 7.0 * t;
  p.y += t * (90.0 + 140.0 * seed.w);
  p.z += t * (150.0 + 140.0 * seed.x);
  vec3 mv = uRot * p + vec3(0.0, 0.0, -${D}.0);
  gl_Position = uProj * vec4(mv, 1.0);
  gl_PointSize = floor(uPx * (seed.z > 0.95 ? 2.0 : 1.0) + 0.5);
  vT = t;
  vF = fract(sin(floor(uTime * 9.0 + seed.x * 41.0) * 12.9898 + seed.y * 78.233) * 43758.5453);
}`;
const MOTE_FS = `
precision mediump float;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
varying float vT; varying float vF;
void main() {
  if (vT > 0.92 || vF < 0.12 + vT * 0.25) discard;
  vec3 c = vT < 0.15 ? uC0 : vT < 0.4 ? uC1 : vT < 0.7 ? uC2 : uC3;
  gl_FragColor = vec4(c, 1.0);
}`;

function program(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
  const mk = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
  return p;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
};

export function startSplat(opts: {
  hero: HTMLElement; canvas: HTMLCanvasElement; scene: SceneMeta; idx: Uint8Array; depth: Uint8Array;
  reduce: MediaQueryList; stats: SplatStats; syncPerf?: boolean;
}): () => void {
  const { hero, canvas, scene: S, idx, depth, reduce, stats } = opts;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) throw new Error("no webgl");
  const splatP = program(gl, SPLAT_VS, SPLAT_FS);
  const moteP = program(gl, MOTE_VS, MOTE_FS);
  const U = (p: WebGLProgram, n: string) => gl.getUniformLocation(p, n);
  const A = (p: WebGLProgram, n: string) => gl.getAttribLocation(p, n);
  const bg = hexToRgb(getComputedStyle(hero).getPropertyValue("--color-bg") || "#0d0d0d");

  // palette entries with the most red: the embers' stepped colours
  const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const hot = S.palette.slice().sort((a, b) => lum(b) - lum(a)).filter((c) => c[0] > c[2] + 60).slice(0, 4);
  const v3 = (c?: number[]) => (c ?? hot[0] ?? [255, 255, 255]).map((v) => v / 255);

  const seeds = new Float32Array(MOTES * 4).map(() => Math.random());
  const moteBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, moteBuf); gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

  let posBuf: WebGLBuffer | null = null, colBuf: WebGLBuffer | null = null, count = 0, built = -1;
  const upload = (stride: number) => {
    if (built === stride) return;
    built = stride;
    const pts = buildPoints(S, idx, depth, stride);
    posBuf ??= gl.createBuffer(); colBuf ??= gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, pts.pos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf); gl.bufferData(gl.ARRAY_BUFFER, pts.col, gl.STATIC_DRAW);
    count = pts.count; stats.points = count;
  };

  const mobileQ = matchMedia("(max-width: 699px)"), hoverQ = matchMedia("(hover: hover) and (pointer: fine)");
  let proj: Float32Array = new Float32Array(16), splatSize = 1, motePx = 1;
  function layout() {
    const f = frame(S, hero.clientWidth, hero.clientHeight, innerWidth, innerHeight, mobileQ.matches);
    upload(f.stride);
    canvas.width = f.cw; canvas.height = f.ch;   // one buffer pixel per splat; device pixel ratio never enters
    gl!.viewport(0, 0, f.cw, f.ch);
    proj = f.proj; splatSize = SPLAT_OVERLAP * f.bufPerCell; motePx = Math.max(1, f.bufPerCell);
    stats.buffer = `${f.cw}x${f.ch} @ ${f.pxPerSplat.toFixed(2)}css px/splat`;
  }

  let tx = 0, ty = 0, cx = 0, cy = 0, moved = false;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    moved = true; tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2;
  };
  addEventListener("pointermove", onMove, { passive: true });

  const px1 = new Uint8Array(4);
  let raf = 0, last = 0, visible = true;
  const t0 = performance.now();
  function frameLoop(now: number) {
    raf = requestAnimationFrame(frameLoop);
    if (last) { stats.frames++; stats.dtSum += now - last; }
    last = now;
    const a = performance.now();
    if (!moved || !hoverQ.matches) { tx = Math.sin(now * 0.00021) * 0.55; ty = Math.sin(now * 0.00016 + 1.3) * 0.45; }
    cx += (tx - cx) * 0.045; cy += (ty - cy) * 0.045;
    const rot = orbitRotation(cx * MAX_YAW, -cy * MAX_PITCH);
    gl!.clearColor(bg[0], bg[1], bg[2], 1); gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
    gl!.enable(gl!.DEPTH_TEST); gl!.depthFunc(gl!.LEQUAL);

    gl!.useProgram(splatP);
    gl!.uniformMatrix4fv(U(splatP, "uProj"), false, proj); gl!.uniformMatrix3fv(U(splatP, "uRot"), false, rot);
    gl!.uniform1f(U(splatP, "uSize"), splatSize);
    const ap = A(splatP, "position"), ac = A(splatP, "color");
    gl!.bindBuffer(gl!.ARRAY_BUFFER, posBuf); gl!.enableVertexAttribArray(ap); gl!.vertexAttribPointer(ap, 3, gl!.FLOAT, false, 0, 0);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, colBuf); gl!.enableVertexAttribArray(ac); gl!.vertexAttribPointer(ac, 4, gl!.UNSIGNED_BYTE, true, 0, 0);
    gl!.drawArrays(gl!.POINTS, 0, count);
    gl!.disableVertexAttribArray(ap); gl!.disableVertexAttribArray(ac);

    gl!.useProgram(moteP);
    gl!.uniformMatrix4fv(U(moteP, "uProj"), false, proj); gl!.uniformMatrix3fv(U(moteP, "uRot"), false, rot);
    gl!.uniform1f(U(moteP, "uTime"), (now - t0) / 1000); gl!.uniform1f(U(moteP, "uPx"), motePx);
    ["uC0", "uC1", "uC2", "uC3"].forEach((n, i) => gl!.uniform3fv(U(moteP, n), v3(hot[i])));
    const as = A(moteP, "seed");
    gl!.bindBuffer(gl!.ARRAY_BUFFER, moteBuf); gl!.enableVertexAttribArray(as); gl!.vertexAttribPointer(as, 4, gl!.FLOAT, false, 0, 0);
    gl!.drawArrays(gl!.POINTS, 0, MOTES);
    gl!.disableVertexAttribArray(as);

    if (opts.syncPerf) gl!.readPixels(0, 0, 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, px1); // #perf: wait for the GPU so drawSum is real
    stats.drawSum += performance.now() - a;
    if (!canvas.dataset.ready) canvas.dataset.ready = "1";
  }
  const run = () => { if (!raf && visible && !document.hidden && !reduce.matches) { last = 0; raf = requestAnimationFrame(frameLoop); } };
  const halt = () => { cancelAnimationFrame(raf); raf = 0; };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) run(); else halt(); });
  io.observe(hero);
  const onVis = () => (document.hidden ? halt() : run());
  document.addEventListener("visibilitychange", onVis);
  let rt: ReturnType<typeof setTimeout>;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(layout, 120); };
  addEventListener("resize", onResize);
  layout();
  run();

  return () => {
    halt(); io.disconnect(); clearTimeout(rt);
    document.removeEventListener("visibilitychange", onVis);
    removeEventListener("resize", onResize); removeEventListener("pointermove", onMove);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
