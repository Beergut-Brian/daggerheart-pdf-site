"use client";

import { useRef, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/** True when this browser can draw live HTML into a canvas (the /table preview needs it). */
export function canDrawHtmlInCanvas(): boolean {
  if (typeof document === "undefined") return false;
  const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
  const markup = "layoutSubtree" in proto || "content" in proto;
  if (!markup) return false;
  try {
    const gl = document.createElement("canvas").getContext("webgl2") as unknown as Record<string, unknown> | null;
    if (!gl) return false;
    return "texElementImage2D" in gl || "texElementSubImage2D" in gl;
  } catch {
    return false;
  }
}

/** Hero tag: opens the HTML-in-Canvas table where the browser supports it, otherwise explains why not. */
export default function PreviewTag({ href = "/table" }: { href?: string }) {
  // null on the server and during hydration, the real answer in the browser
  const supported = useSyncExternalStore<boolean | null>(noSubscribe, canDrawHtmlInCanvas, () => null);
  const dialog = useRef<HTMLDialogElement>(null);

  const onClick = () => {
    if (supported ?? canDrawHtmlInCanvas()) {
      window.location.assign(href);
    } else {
      dialog.current?.showModal();
    }
  };

  return (
    <>
      <button type="button" className="tag tag-button" onClick={onClick} data-supported={supported === null ? undefined : String(supported)}>
        Preview the new version
      </button>
      <dialog ref={dialog} className="preview-dialog" aria-labelledby="preview-dialog-title">
        <h2 id="preview-dialog-title">Not in this browser yet</h2>
        <p>The new version draws the page inside a 3D scene with HTML-in-Canvas. You need Chrome 157 or later to see it.</p>
        <p>Firefox and Safari have not shipped support yet. Please try again later.</p>
        <form method="dialog">
          <button type="submit" className="preview-dialog-close" autoFocus>Got it</button>
        </form>
      </dialog>
    </>
  );
}
