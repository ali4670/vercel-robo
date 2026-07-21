import { useEffect, useState } from "react";

function generateSessionId() {
  return (
    Math.random().toString(36).substring(2, 10).toUpperCase() +
    "-" +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

const SESSION_ID = generateSessionId();

export function VideoWatermark({
  email,
  userId,
  username,
  phone,
}: {
  email: string;
  userId?: string;
  username?: string;
  phone?: string;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    let frame: number;
    const animate = () => {
      const t = Date.now() / 6000;
      setPos({
        x: Math.sin(t) * 35 + 50,
        y: Math.cos(t * 0.7) * 30 + 50,
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

  const lines = [
    username || email.split("@")[0],
    phone || "N/A",
    email,
    `${displayDate} ${displayTime}`,
    `Session: ${SESSION_ID}`,
  ];

  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${pos.x + i * 18 - 35}%`,
            top: `${pos.y + (i % 4) * 22 - 15}%`,
            transform: `rotate(${-20 + i * 5}deg) translate(-50%, -50%)`,
            color: "rgba(255, 255, 255, 0.07)",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            userSelect: "none",
            letterSpacing: "1px",
            lineHeight: "1.6",
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
