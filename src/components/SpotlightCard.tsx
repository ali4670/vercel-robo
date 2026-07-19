import React from "react";
import { motion } from "framer-motion";

export function SpotlightCard({ spotlight }: { spotlight: any }) {
  const username = spotlight?.profiles?.username || "cto.robotics";
  const avatarUrl =
    spotlight?.avatar_override_url ||
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200";
  const title = spotlight?.title || "Core Architecture";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -20, 0],
      }}
      transition={{
        y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 },
        opacity: { duration: 0.5 },
      }}
      className="absolute top-[15%] right-[5%] md:right-[22%] z-30 pointer-events-auto"
    >
      <div className="w-40 md:w-52 aspect-[3/3.5] bg-muted backdrop-blur-md border border-border rounded-[2rem] p-5 flex flex-col items-center justify-center rotate-[12deg] shadow-2xl hover:rotate-0 transition-transform duration-500">
        <div className="w-16 h-16 md:w-24 md:h-24 bg-[#2C3E50] rounded-full flex items-center justify-center mb-4 shadow-inner border-[3px] border-border0 overflow-hidden">
          <img
            src={avatarUrl}
            alt={username}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-center mt-2">
          <p className="font-bold text-sm md:text-lg text-foreground">{username}</p>
          <p className="text-[10px] md:text-xs text-white/80 mt-1 uppercase">
            {title}
          </p>
          {spotlight?.description && (
            <p className="text-[8px] mt-2 font-black text-primary uppercase tracking-widest italic">
                {spotlight.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
