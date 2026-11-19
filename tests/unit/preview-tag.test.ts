import { afterEach, describe, expect, it, vi } from "vitest";
import { canDrawHtmlInCanvas } from "../../app/components/PreviewTag";

function fakeDom(protoKeys: string[], glKeys: string[] | null) {
  const proto: Record<string, unknown> = {};
  for (const k of protoKeys) proto[k] = true;
  vi.stubGlobal("HTMLCanvasElement", { prototype: proto });
  vi.stubGlobal("document", {
    createElement: () => ({
      getContext: () => {
        if (!glKeys) return null;
        const gl: Record<string, unknown> = {};
        for (const k of glKeys) gl[k] = () => undefined;
        return gl;
      },
    }),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("canDrawHtmlInCanvas", () => {
  it("is true with the canvas markup and the texElement upload", () => {
    fakeDom(["layoutSubtree"], ["texElementImage2D"]);
    expect(canDrawHtmlInCanvas()).toBe(true);
    fakeDom(["content"], ["texElementSubImage2D"]);
    expect(canDrawHtmlInCanvas()).toBe(true);
  });
  it("is false in today's Firefox and Safari (no markup, no upload)", () => {
    fakeDom([], ["texImage2D"]);
    expect(canDrawHtmlInCanvas()).toBe(false);
    fakeDom(["layoutSubtree"], ["texImage2D"]);
    expect(canDrawHtmlInCanvas()).toBe(false);
    fakeDom(["layoutSubtree"], null);
    expect(canDrawHtmlInCanvas()).toBe(false);
  });
});
