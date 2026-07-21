import { useScreenProtect } from "../hooks/use-screen-protect";

export function ScreenProtect() {
  useScreenProtect();

  return (
    <div
      id="screen-protect-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "black",
        opacity: 0,
        pointerEvents: "none",
        transition: "opacity 0.15s ease",
      }}
    />
  );
}
