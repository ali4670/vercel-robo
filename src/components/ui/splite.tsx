"use client";

import { Suspense, lazy } from "react";
const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <div 
      className="w-full h-full" 
      style={{ 
        filter: "hue-rotate(140deg) saturate(4) brightness(1.2) invert(0.15) drop-shadow(0 0 20px rgba(0, 255, 0, 0.8))",
        mixBlendMode: "screen"
      }}
    >
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        }
      >
        <Spline scene={scene} className={className} />
      </Suspense>
    </div>
  );
}
