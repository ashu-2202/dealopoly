"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StandardCard } from "./standard-card";
import type { LeastCountCard } from "@dealopoly/game-engine";

const SHOWCASE_CARDS: LeastCountCard[] = [
  {
    instanceId: "hero-king",
    suit: "spades",
    rank: "K",
    points: 0,
    rankValue: 13,
  },
  {
    instanceId: "hero-queen",
    suit: "hearts",
    rank: "Q",
    points: 12,
    rankValue: 12,
  },
  {
    instanceId: "hero-ace",
    suit: "diamonds",
    rank: "A",
    points: 1,
    rankValue: 1,
  },
];

export const LeastCountHeroShowcase: React.FC = () => {
  const [cards, setCards] = useState<LeastCountCard[]>(SHOWCASE_CARDS);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsShuffling(true);
      setTimeout(() => {
        setCards((prev) => {
          const next = [...prev];
          const first = next.shift()!;
          next.push(first);
          return next;
        });
        setIsShuffling(false);
      }, 500);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hero-showcase-wrapper">
      <div className="hero-showcase-spotlight" />

      {/* 3D Cards Trio */}
      <div className="hero-showcase-stage">
        {cards.map((card, idx) => {
          const xOffset = idx === 0 ? -120 : idx === 1 ? 0 : 120;
          const rotation = idx === 0 ? -12 : idx === 1 ? 0 : 12;
          const zIndex = idx === 1 ? 10 : 5;

          return (
            <motion.div
              key={card.instanceId}
              layout
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{
                x: xOffset,
                rotateZ: rotation,
                scale: idx === 1 ? 1.08 : 0.96,
                opacity: 1,
                zIndex,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 24,
              }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <StandardCard
                card={card}
                size="lg"
                isSelected={idx === 1}
              />
            </motion.div>
          );
        })}
      </div>

      {/* 3D Circular Platform */}
      <div className="hero-platform-container">
        <div className="hero-platform-shadow" />
        <div className="hero-platform-base">
          <div className="hero-platform-outer-ring" />
          <div className="hero-platform-middle-ring" />
          <div className="hero-platform-surface" />
        </div>
      </div>
    </div>
  );
};
