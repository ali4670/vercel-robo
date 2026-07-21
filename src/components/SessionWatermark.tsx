import { useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";

function generateSessionId() {
  return (
    Math.random().toString(36).substring(2, 10).toUpperCase() +
    "-" +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

const SESSION_ID = generateSessionId();

export function SessionWatermark() {
  const { user, profile } = useAuth();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState(new Date());

  const email = user?.email || "anonymous";
  const userId = user?.id || "N/A";
  const username = profile?.username || email.split("@")[0];

  useEffect(() => {
    let frame: number;
    const animate = () => {
      const t = Date.now() / 10000;
      setPos({
        x: Math.sin(t) * 30 + 50,
        y: Math.cos(t * 0.6) * 25 + 50,
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const displayDate = time.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const displayTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const phone = profile?.phone_number || "N/A";

  const lines = [
    username,
    phone,
    email,
    `${displayDate} ${displayTime}`,
    `Session: ${SESSION_ID}`,
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999996,
        pointerEvents: "none",
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${pos.x + i * 16 - 30}%`,
            top: `${pos.y + (i % 5) * 20 - 10}%`,
            transform: `rotate(${-18 + i * 4}deg) translate(-50%, -50%)`,
            color: "rgba(128, 128, 128, 0.04)",
            fontSize: "10px",
            fontWeight: 600,
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            userSelect: "none",
            letterSpacing: "1px",
            lineHeight: "1.5",
          }}
        >
          {lines.map((line, j) => (
            <div key={j}>{line}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
