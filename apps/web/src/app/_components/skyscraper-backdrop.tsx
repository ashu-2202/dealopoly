interface SkyscraperBackdropProps {
  className?: string;
}

export function SkyscraperBackdrop({ className = "" }: SkyscraperBackdropProps) {
  return (
    <div className={`skyscraper-backdrop-container ${className}`} aria-hidden="true">
      {/* Ambient Atmosphere Lighting Glows */}
      <div className="skyscraper-atmosphere-glow skyscraper-atmosphere-glow--cyan" />
      <div className="skyscraper-atmosphere-glow skyscraper-atmosphere-glow--green" />

      {/* Architectural Skyscraper Skyline Vector Sketch */}
      <svg
        className="skyscraper-svg"
        viewBox="0 0 1440 540"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="skylineGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#0284c7" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="skylineGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#059669" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#06120c" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="skylineGradFaint" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#334155" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* ============================================================ */}
        {/* LAYER 1: DEEP BACKGROUND SILHOUETTES & FAINT SPIRES          */}
        {/* ============================================================ */}
        <g opacity="0.4" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="1">
          {/* Distant Spire Tower 1 */}
          <line x1="120" y1="60" x2="120" y2="180" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5" />
          <circle cx="120" cy="58" r="2" fill="#38bdf8" fillOpacity="0.7" />
          <rect x="95" y="180" width="50" height="360" fill="url(#skylineGradFaint)" />

          {/* Distant Pyramid Tower 2 */}
          <polygon points="380,100 350,190 410,190" fill="url(#skylineGradFaint)" />
          <line x1="380" y1="60" x2="380" y2="100" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.6" />
          <circle cx="380" cy="58" r="2" fill="#34d399" fillOpacity="0.8" />
          <rect x="350" y="190" width="60" height="350" fill="url(#skylineGradFaint)" />

          {/* Distant Supertall Antenna 3 */}
          <line x1="680" y1="30" x2="680" y2="140" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.6" />
          <circle cx="680" cy="28" r="2.5" fill="#ef4444" fillOpacity="0.8" />
          <polygon points="680,140 655,180 705,180" fill="url(#skylineGradFaint)" />
          <rect x="655" y="180" width="50" height="360" fill="url(#skylineGradFaint)" />

          {/* Distant Tower 4 */}
          <line x1="1020" y1="70" x2="1020" y2="160" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5" />
          <circle cx="1020" cy="68" r="2" fill="#38bdf8" fillOpacity="0.7" />
          <rect x="990" y="160" width="60" height="380" fill="url(#skylineGradFaint)" />

          {/* Distant Tower 5 */}
          <polygon points="1280,110 1250,180 1310,180" fill="url(#skylineGradFaint)" />
          <rect x="1250" y="180" width="60" height="360" fill="url(#skylineGradFaint)" />
        </g>

        {/* ============================================================ */}
        {/* LAYER 2: MIDGROUND ARCHITECTURAL SKYSCRAPERS                 */}
        {/* ============================================================ */}
        <g stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.2">
          {/* TOWER 1: Modern Angled Glass Tower (Left 40px) */}
          <polygon points="40,240 100,190 100,540 40,540" fill="url(#skylineGrad1)" />
          <line x1="40" y1="240" x2="100" y2="190" stroke="#38bdf8" strokeWidth="1.8" />
          <line x1="70" y1="215" x2="70" y2="540" stroke="rgba(56, 189, 248, 0.25)" />

          {/* TOWER 2: Tiered Art-Deco High-Rise (Left 180px) */}
          {/* Spire */}
          <line x1="225" y1="80" x2="225" y2="160" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="225" cy="78" r="2.5" fill="#38bdf8" />
          {/* Tiers */}
          <rect x="210" y="160" width="30" height="40" fill="url(#skylineGrad1)" />
          <rect x="195" y="200" width="60" height="50" fill="url(#skylineGrad1)" />
          <rect x="180" y="250" width="90" height="290" fill="url(#skylineGrad1)" />
          {/* Vertical Lines */}
          <line x1="200" y1="250" x2="200" y2="540" stroke="rgba(56, 189, 248, 0.3)" />
          <line x1="225" y1="250" x2="225" y2="540" stroke="rgba(56, 189, 248, 0.4)" />
          <line x1="250" y1="250" x2="250" y2="540" stroke="rgba(56, 189, 248, 0.3)" />

          {/* TOWER 3: Diagrid Lattice Tower (Left-Center 300px) */}
          <polygon points="300,170 340,130 380,170 380,540 300,540" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.5)" />
          <line x1="340" y1="90" x2="340" y2="130" stroke="#34d399" strokeWidth="1.8" />
          <circle cx="340" cy="88" r="2" fill="#34d399" />
          <line x1="300" y1="230" x2="380" y2="290" stroke="rgba(52, 211, 153, 0.35)" />
          <line x1="380" y1="230" x2="300" y2="290" stroke="rgba(52, 211, 153, 0.35)" />
          <line x1="300" y1="290" x2="380" y2="350" stroke="rgba(52, 211, 153, 0.35)" />
          <line x1="380" y1="290" x2="300" y2="350" stroke="rgba(52, 211, 153, 0.35)" />
          <line x1="300" y1="350" x2="380" y2="410" stroke="rgba(52, 211, 153, 0.35)" />
          <line x1="380" y1="350" x2="300" y2="410" stroke="rgba(52, 211, 153, 0.35)" />

          {/* TOWER 4: Iconic Center Supertall Tower (Center 480px) */}
          <line x1="530" y1="40" x2="530" y2="120" stroke="#38bdf8" strokeWidth="2.5" />
          <circle cx="530" cy="38" r="3" fill="#38bdf8" />
          <polygon points="530,120 505,170 555,170" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="495" y="170" width="70" height="50" fill="url(#skylineGrad1)" stroke="#38bdf8" />
          <line x1="495" y1="195" x2="565" y2="195" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="480" y="220" width="100" height="320" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="500" y1="220" x2="500" y2="540" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1" />
          <line x1="515" y1="220" x2="515" y2="540" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1" />
          <line x1="530" y1="220" x2="530" y2="540" stroke="rgba(56, 189, 248, 0.6)" strokeWidth="1.5" />
          <line x1="545" y1="220" x2="545" y2="540" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1" />
          <line x1="560" y1="220" x2="560" y2="540" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1" />

          {/* TOWER 5: Modern Sculpted High-Rise (Center-Right 620px) */}
          <polygon points="620,180 670,140 700,180 700,540 620,540" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.45)" />
          <line x1="670" y1="100" x2="670" y2="140" stroke="#34d399" strokeWidth="1.8" />
          <circle cx="670" cy="98" r="2" fill="#34d399" />
          <line x1="660" y1="180" x2="660" y2="540" stroke="rgba(52, 211, 153, 0.3)" />

          {/* TOWER 6: Twin Pinnacle Skyscraper with Skybridge (Right 760px) */}
          <line x1="775" y1="110" x2="775" y2="170" stroke="#38bdf8" strokeWidth="1.8" />
          <rect x="760" y="170" width="30" height="370" fill="url(#skylineGrad1)" stroke="#38bdf8" />
          <line x1="825" y1="110" x2="825" y2="170" stroke="#38bdf8" strokeWidth="1.8" />
          <rect x="810" y="170" width="30" height="370" fill="url(#skylineGrad1)" stroke="#38bdf8" />
          <rect x="790" y="240" width="20" height="18" fill="url(#skylineGrad1)" stroke="#38bdf8" />
          <rect x="790" y="360" width="20" height="18" fill="url(#skylineGrad1)" stroke="#38bdf8" />
          <rect x="790" y="440" width="20" height="100" fill="url(#skylineGrad1)" stroke="#38bdf8" />

          {/* TOWER 7: Tiered Metro Tower (Right 890px) */}
          <line x1="935" y1="130" x2="935" y2="190" stroke="#34d399" strokeWidth="1.8" />
          <circle cx="935" cy="128" r="2" fill="#34d399" />
          <rect x="915" y="190" width="40" height="50" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.5)" />
          <rect x="890" y="240" width="90" height="300" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.5)" />

          {/* TOWER 8: Modern High-Rise with Slanted Crown (Right 1030px) */}
          <polygon points="1030,220 1090,160 1110,220 1110,540 1030,540" fill="url(#skylineGrad1)" stroke="#38bdf8" />
          <line x1="1090" y1="120" x2="1090" y2="160" stroke="#38bdf8" strokeWidth="1.8" />
          <circle cx="1090" cy="118" r="2" fill="#38bdf8" />
          <line x1="1070" y1="200" x2="1070" y2="540" stroke="rgba(56, 189, 248, 0.3)" />

          {/* TOWER 9: Commercial High-Rise (Right 1170px) */}
          <rect x="1160" y="200" width="80" height="340" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.45)" />
          <line x1="1200" y1="150" x2="1200" y2="200" stroke="#34d399" strokeWidth="1.8" />
          <circle cx="1200" cy="148" r="2" fill="#34d399" />
          <line x1="1185" y1="200" x2="1185" y2="540" stroke="rgba(52, 211, 153, 0.25)" />
          <line x1="1215" y1="200" x2="1215" y2="540" stroke="rgba(52, 211, 153, 0.25)" />

          {/* TOWER 10: Slender Perimeter Tower (Right 1300px) */}
          <polygon points="1300,260 1340,210 1380,260 1380,540 1300,540" fill="url(#skylineGrad1)" stroke="#38bdf8" />
          <line x1="1340" y1="170" x2="1340" y2="210" stroke="#38bdf8" strokeWidth="1.8" />
          <circle cx="1340" cy="168" r="2" fill="#38bdf8" />
        </g>

        {/* Base Skyline Ground Horizon Grid Line */}
        <line x1="0" y1="539" x2="1440" y2="539" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
