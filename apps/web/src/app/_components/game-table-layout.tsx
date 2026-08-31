"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export interface GameTableLayoutProps {
  // Topbar
  brandIcon: React.ReactNode;
  brandName: string;
  brandHref: string;
  turnPillNode: React.ReactNode;
  statusBadgeNode: React.ReactNode;
  unreadActivityCount: number;
  onOpenActivity: () => void;
  onLeaveGame: () => void;
  
  // State
  lastError: string | null;
  
  // Areas
  opponentsStripNode: React.ReactNode;
  centerStageNode: React.ReactNode;
  playerAssetsRowNode: React.ReactNode;
  playerHandNode: React.ReactNode;
  
  // Modals/Drawers
  isActivityDrawerOpen: boolean;
  onCloseActivity: () => void;
  activityLogNode: React.ReactNode;
  modalsNode?: React.ReactNode;
}

export function GameTableLayout({
  brandIcon,
  brandName,
  brandHref,
  turnPillNode,
  statusBadgeNode,
  unreadActivityCount,
  onOpenActivity,
  onLeaveGame,
  lastError,
  opponentsStripNode,
  centerStageNode,
  playerAssetsRowNode,
  playerHandNode,
  isActivityDrawerOpen,
  onCloseActivity,
  activityLogNode,
  modalsNode,
}: GameTableLayoutProps) {
  return (
    <div className="game-table-shell">
      {/* Texture Noise Overlay */}
      <div className="texture-overlay" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }} />

      {/* Top App Bar */}
      <header className="game-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href={brandHref} className="game-topbar-brand" title={`Back to ${brandName}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: "24px" }}>
              {brandIcon}
            </span>
            <span className="game-topbar-logo-text">{brandName}</span>
          </Link>

          {turnPillNode}
        </div>

        {/* Top bar actions */}
        <div className="game-topbar-actions">
          {statusBadgeNode}

          {/* Activity Drawer Toggle */}
          <button
            type="button"
            className="game-activity-toggle-btn"
            onClick={onOpenActivity}
            title="Match Activity"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              feed
            </span>
            <span className="game-desktop-only">Activity</span>
            {unreadActivityCount > 0 && (
              <span className="game-activity-unread-badge">{unreadActivityCount}</span>
            )}
          </button>

          {/* Red Leave Game Button */}
          <button
            type="button"
            className="game-topbar-leave-btn"
            title="Leave Match"
            onClick={onLeaveGame}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>
              exit_to_app
            </span>
            <span className="game-desktop-only">Leave Game</span>
          </button>
        </div>
      </header>

      {/* Error Notification Bar */}
      {lastError && (
        <div
          style={{
            position: "absolute",
            top: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "#93000a",
            border: "1px solid #ffb4ab",
            color: "#ffdad6",
            padding: "6px 16px",
            borderRadius: "999px",
            fontSize: "0.78rem",
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          {lastError}
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="game-layout-grid">
        <main className="game-main-arena">
          <div className="game-opponents-strip">
            {opponentsStripNode}
          </div>

          <div className="game-center-stage">
            {centerStageNode}
          </div>

          <div className="game-player-table-stage">
            <div className="game-player-assets-row">
              {playerAssetsRowNode}
            </div>

            <div className="game-hand-section" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="game-hand-fanned-container" style={{ flex: 1, minHeight: 0 }}>
                <div className="game-hand-cards-row">
                  {playerHandNode}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Activity Log Drawer */}
      <AnimatePresence>
        {isActivityDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="game-modal-overlay"
              onClick={onCloseActivity}
              style={{ zIndex: 199 }}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="game-activity-drawer"
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "360px",
                maxWidth: "100vw",
                background: "var(--surface)",
                borderLeft: "1px solid var(--outline-variant)",
                zIndex: 200,
                display: "flex",
                flexDirection: "column",
                boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
              }}
            >
              <div className="game-activity-header" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--outline-variant)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, color: "var(--text)" }}>
                  <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>history</span>
                  Match Activity Log
                </div>
                <button
                  type="button"
                  onClick={onCloseActivity}
                  className="button button--icon button--sm"
                  aria-label="Close activity log"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="game-activity-body" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {activityLogNode}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Modals & Overlays */}
      {modalsNode}
    </div>
  );
}
