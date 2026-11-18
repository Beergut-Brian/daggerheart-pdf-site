import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { books, shelfTag } from "../../app/books";
import { buildPoints, frame, frustum, orbitRotation, type SceneMeta } from "../../app/lib/splat/scene";

const dir = path.resolve(__dirname, "../../public/splat");
const meta = JSON.parse(fs.readFileSync(path.join(dir, "scene.json"), "utf8")) as SceneMeta;
const bytes = (f: string) => new Uint8Array(zlib.inflateSync(fs.readFileSync(path.join(dir, f))));

describe("landing tag", () => {
  it("comes from the book data", () => {
    expect(shelfTag()).toBe("2 books · 601 pages");
    expect(shelfTag(books.slice(0, 1))).toBe("1 book · 397 pages");
  });
});

describe("splat scene data (static assets)", () => {
  const idx = bytes("idx.bin"), depth = bytes("depth.bin");
  it("has one byte per cell and palette indices in range", () => {
    expect(idx.length).toBe(meta.w * meta.h);
    expect(depth.length).toBe(meta.w * meta.h);
    expect(Math.max(...idx)).toBeLessThan(meta.palette.length);
    expect(Math.max(...depth)).toBeLessThanOrEqual(63);
  });
  it("builds finite points at both strides; the phone stride is lighter", () => {
    const full = buildPoints(meta, idx, depth, 1), half = buildPoints(meta, idx, depth, 2);
    expect(full.count).toBeGreaterThan(50_000);
    expect(half.count).toBeLessThan(full.count);
    expect(full.pos.every(Number.isFinite)).toBe(true);
    expect(full.col.length).toBe(full.count * 4);
  });
  it("ships the still and keeps the scene out of the JS bundle", () => {
    expect(fs.statSync(path.join(dir, "still.webp")).size).toBeLessThan(30_000);
  });
});

describe("camera maths", () => {
  it("orbit rotation is the identity at rest and orthonormal when turned", () => {
    Array.from(orbitRotation(0, 0)).forEach((v, i) => expect(v).toBeCloseTo([1, 0, 0, 0, 1, 0, 0, 0, 1][i], 9));
    const r = orbitRotation(6.5, -4.5);
    const dot = (a: number, b: number) => [0, 1, 2].reduce((s, i) => s + r[a * 3 + i] * r[b * 3 + i], 0);
    expect(dot(0, 0)).toBeCloseTo(1, 5); expect(dot(0, 1)).toBeCloseTo(0, 5); expect(dot(1, 2)).toBeCloseTo(0, 5);
  });
  it("frustum maps the near plane corners to clip edges", () => {
    const p = frustum(-2, 2, 1, -1, 1, 10);
    expect(p[0]).toBeCloseTo(0.5); expect(p[5]).toBeCloseTo(1); expect(p[11]).toBe(-1);
  });
  it("frames one splat per buffer pixel on desktop and phone", () => {
    const d = frame(meta, 1440, 900, 1440, 900, false), m = frame(meta, 390, 844, 390, 844, true);
    expect(d.stride).toBe(1); expect(m.stride).toBe(2);
    expect(d.pxPerSplat).toBeGreaterThan(3); expect(m.pxPerSplat).toBeGreaterThan(3);
    expect(d.cw).toBeLessThan(1440 / 3);
  });
});
