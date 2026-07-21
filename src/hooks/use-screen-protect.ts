import { useEffect, useRef } from "react";

function poisonCanvasPrototype() {
  if (typeof HTMLCanvasElement === "undefined") return;

  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
    const ctx = this.getContext("2d");
    if (ctx) {
      const w = this.width;
      const h = this.height;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.max(16, w / 20)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PROTECTED CONTENT", w / 2, h / 2);
    }
    return origToDataURL.apply(this, args as any);
  };

  const origToBlob = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (callback: any, ...args: any[]) {
    const ctx = this.getContext("2d");
    if (ctx) {
      const w = this.width;
      const h = this.height;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.max(16, w / 20)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PROTECTED CONTENT", w / 2, h / 2);
    }
    return origToBlob.call(this, callback, ...args);
  };

  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    type: string,
    ...rest: any[]
  ) {
    const ctx = origGetContext.call(this, type, ...rest);
    if (ctx && (type === "2d" || type === "webgl" || type === "webgl2" || type === "experimental-webgl")) {
      const origGetImageData = (ctx as any).getImageData;
      if (origGetImageData) {
        (ctx as any).getImageData = function (...imgArgs: any[]) {
          const data = origGetImageData.apply(this, imgArgs);
          for (let i = 0; i < data.data.length; i += 4) {
            data.data[i] = 0;
            data.data[i + 1] = 0;
            data.data[i + 2] = 0;
            data.data[i + 3] = 255;
          }
          return data;
        };
      }
    }
    return ctx;
  };
}

function blockScreenCaptureAPI() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

  const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
  if (origGetDisplayMedia) {
    navigator.mediaDevices.getDisplayMedia = async function () {
      throw new DOMException(
        "Screen capture is not allowed.",
        "NotAllowedError"
      );
    };
  }
}

function blockDevToolsDetection() {
  let devtoolsOpen = false;
  const threshold = 160;

  const check = () => {
    const widthThreshold =
      window.outerWidth - window.innerWidth > threshold;
    const heightThreshold =
      window.outerHeight - window.innerHeight > threshold;

    if (widthThreshold || heightThreshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        document.body.style.filter = "blur(20px)";
        document.body.style.transition = "filter 0.3s";
      }
    } else {
      if (devtoolsOpen) {
        devtoolsOpen = false;
        document.body.style.filter = "";
      }
    }
  };

  const interval = setInterval(check, 1000);
  return () => clearInterval(interval);
}

function isBlockedKey(e: KeyboardEvent): boolean {
  const key = e.key.toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;
  const alt = e.altKey;

  if (key === "printscreen") return true;
  if (alt && key === "printscreen") return true;
  if (key === "snapshot") return true;

  if (ctrl && shift) {
    if (/[s3456]/.test(key)) return true;
    if (/[ijuc]/.test(key)) return true;
    if (key === "h") return true;
  }

  if (ctrl && !shift) {
    if (key === "p") return true;
    if (key === "u") return true;
    if (key === "j") return true;
    if (key === "s" && !alt) return true;
    if (key === "a") return true;
  }

  if (key === "f12") return true;

  if (ctrl && shift && key === "i") return true;
  if (ctrl && shift && key === "j") return true;
  if (ctrl && shift && key === "c") return true;
  if (ctrl && shift && key === "k") return true;

  return false;
}

export function useScreenProtect() {
  const cleanupRefs = useRef<(() => void)[]>([]);

  useEffect(() => {
    poisonCanvasPrototype();
    blockScreenCaptureAPI();
    const devtoolsCleanup = blockDevToolsDetection();

    if (devtoolsCleanup) cleanupRefs.current.push(devtoolsCleanup);

    const blockKey = (e: KeyboardEvent) => {
      if (isBlockedKey(e)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    const blockContext = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const blockDrag = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    const blockCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    const blockBeforeUnload = (e: BeforeUnloadEvent) => {
      e.returnValue = "";
    };

    const blockPointer = (e: PointerEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("keydown", blockKey, true);
    document.addEventListener("keyup", blockKey, true);
    document.addEventListener("contextmenu", blockContext, true);
    document.addEventListener("dragstart", blockDrag, true);
    document.addEventListener("copy", blockCopy, true);
    document.addEventListener("cut", blockCopy, true);
    document.addEventListener("paste", blockCopy, true);
    document.addEventListener("pointerdown", blockPointer, true);
    window.addEventListener("beforeunload", blockBeforeUnload);

    return () => {
      document.removeEventListener("keydown", blockKey, true);
      document.removeEventListener("keyup", blockKey, true);
      document.removeEventListener("contextmenu", blockContext, true);
      document.removeEventListener("dragstart", blockDrag, true);
      document.removeEventListener("copy", blockCopy, true);
      document.removeEventListener("cut", blockCopy, true);
      document.removeEventListener("paste", blockCopy, true);
      document.removeEventListener("pointerdown", blockPointer, true);
      window.removeEventListener("beforeunload", blockBeforeUnload);
      cleanupRefs.current.forEach((fn) => fn());
      cleanupRefs.current = [];
    };
  }, []);
}
