"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "./card";
import type { CardDefinition } from "@dealopoly/shared";

interface HeroCardData {
  id: string;
  card: CardDefinition;
  glow: string;
  tag: string;
  tagIcon: string;
  tagColor: string;
  resting: {
    x: number;
    y: number;
    rotate: number;
    scale: number;
    zIndex: number;
  };
}

const HERO_CARDS: HeroCardData[] = [
  {
    id: "deal-breaker",
    card: {
      id: "action-deal-breaker",
      name: "Deal Breaker",
      type: "action",
      value: 5,
      count: 2,
      tagline: "ACTION",
      description: "Steal a complete set of properties from any player. (Includes any buildings).",
      icon: "handshake",
    },
    glow: "radial-gradient(circle, rgba(239, 68, 68, 0.55) 0%, transparent 70%)",
    tag: "STEAL COMPLETE SET",
    tagIcon: "gavel",
    tagColor: "#fca5a5",
    resting: {
      x: -110,
      y: 20,
      rotate: -12,
      scale: 0.94,
      zIndex: 10,
    },
  },
  {
    id: "mayfair",
    card: {
      id: "prop-mayfair",
      name: "Mayfair",
      type: "property",
      primaryColor: "dark-blue",
      value: 4,
      count: 1,
      setSize: 2,
      rentTiers: [
        { setCount: 1, rent: 3 },
        { setCount: 2, rent: 8, isComplete: true },
      ],
      tagline: "PROPERTY",
      icon: "location_city",
    },
    glow: "radial-gradient(circle, rgba(0, 85, 164, 0.8) 0%, transparent 70%)",
    tag: "WINNING SET ($8M RENT)",
    tagIcon: "star",
    tagColor: "#a8c8ff",
    resting: {
      x: 0,
      y: -10,
      rotate: 0,
      scale: 1.06,
      zIndex: 25,
    },
  },
  {
    id: "just-say-no",
    card: {
      id: "action-just-say-no",
      name: "Just Say No",
      type: "action",
      value: 4,
      count: 3,
      tagline: "ACTION",
      description: "Use at any time to cancel an action played against you. Can also cancel another Just Say No!",
      icon: "block",
    },
    glow: "radial-gradient(circle, rgba(16, 185, 129, 0.55) 0%, transparent 70%)",
    tag: "COUNTER DEFENSE",
    tagIcon: "shield",
    tagColor: "#86efac",
    resting: {
      x: 110,
      y: 25,
      rotate: 12,
      scale: 0.94,
      zIndex: 12,
    },
  },
];

export function HeroCardShowcase() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="hero-showcase-wrapper" aria-label="Dealopoly 3D Card Showcase">
      {/* Ambient Table Lighting Ring */}
      <div className="hero-showcase-table-glow" />
      <div className="hero-showcase-grid-disc" />

      {/* 3D Cards Deck Stage */}
      <div className="hero-showcase-stage">
        {HERO_CARDS.map((item) => {
          const isHovered = hoveredId === item.id;
          const isOtherHovered = hoveredId !== null && !isHovered;

          return (
            <motion.div
              key={item.id}
              className="hero-showcase-card-container"
              initial={item.resting}
              animate={{
                x: isHovered ? item.resting.x * 0.75 : isOtherHovered ? item.resting.x * 1.12 : item.resting.x,
                y: isHovered ? item.resting.y - 42 : isOtherHovered ? item.resting.y + 10 : item.resting.y,
                rotate: isHovered ? 0 : item.resting.rotate,
                scale: isHovered ? 1.16 : isOtherHovered ? 0.88 : item.resting.scale,
                opacity: isOtherHovered ? 0.75 : 1,
                zIndex: isHovered ? 50 : item.resting.zIndex,
              }}
              transition={{
                type: "spring",
                stiffness: 340,
                damping: 24,
              }}
              onHoverStart={() => setHoveredId(item.id)}
              onHoverEnd={() => setHoveredId(null)}
            >
              {/* Dynamic Aura Glow */}
              <div
                className={`hero-card-glow-aura ${isHovered ? "hero-card-glow-aura--active" : ""}`}
                style={{ background: item.glow }}
              />

              {/* Floating Synergy Pill (Visible on Hover) */}
              <motion.div
                className="hero-card-floating-pill"
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: isHovered ? 1 : 0,
                  y: isHovered ? -12 : 10,
                }}
                transition={{ duration: 0.2 }}
                style={{ borderColor: item.tagColor }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "14px", color: item.tagColor }}
                >
                  {item.tagIcon}
                </span>
                <span style={{ color: item.tagColor }}>{item.tag}</span>
              </motion.div>

              {/* Authentic Dealopoly Card */}
              <div className="hero-card-physical-frame">
                <Card card={item.card} size="md" isInteractive={false} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
