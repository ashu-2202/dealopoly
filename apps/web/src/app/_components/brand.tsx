import Link from "next/link";

export function Brand({
  className = "brand",
  game,
}: {
  className?: string;
  game?: "arcade" | "monodeal" | "lowdeck";
}) {
  if (game === "monodeal") {
    return (
      <Link className={className} href="/monodeal" aria-label="Monodeal home" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: "#38bdf8", fontSize: "24px" }}>
          style
        </span>
        <span style={{ fontWeight: 900 }}>monodeal</span>
        <span style={{ fontSize: "0.62rem", background: "rgba(56, 189, 248, 0.18)", color: "#38bdf8", padding: "1px 6px", borderRadius: "999px", border: "1px solid rgba(56, 189, 248, 0.35)", fontWeight: 800 }}>
          ARCADE
        </span>
      </Link>
    );
  }

  if (game === "lowdeck") {
    return (
      <Link className={className} href="/lowdeck" aria-label="Lowdeck home" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: "#facc15", fontSize: "24px" }}>
          playing_cards
        </span>
        <span style={{ fontWeight: 900 }}>lowdeck</span>
        <span style={{ fontSize: "0.62rem", background: "rgba(234, 179, 8, 0.18)", color: "#facc15", padding: "1px 6px", borderRadius: "999px", border: "1px solid rgba(234, 179, 8, 0.35)", fontWeight: 800 }}>
          ARCADE
        </span>
      </Link>
    );
  }

  return (
    <Link className={className} href="/" aria-label="Dealopoly Arcade home" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <span
        className="material-symbols-outlined"
        style={{ fontVariationSettings: "'FILL' 1", color: "var(--primary)" }}
      >
        playing_cards
      </span>
      <span style={{ fontWeight: 900 }}>dealopoly <span style={{ opacity: 0.7, fontSize: "0.85em", fontWeight: 700 }}>arcade</span></span>
    </Link>
  );
}
