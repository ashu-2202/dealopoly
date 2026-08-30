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
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="skylineGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="skylineGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#059669" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06120c" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="skylineGradFaint" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#334155" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* ============================================================ */}
        {/* LAYER 1: DEEP BACKGROUND SILHOUETTES & FAINT SPIRES          */}
        {/* ============================================================ */}
        <g opacity="0.6" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="1">
          {/* Distant Spire Tower 0 (Far Left) */}
          <line x1="45" y1="70" x2="45" y2="190" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.7" />
          <circle cx="45" cy="68" r="2.5" fill="#38bdf8" />
          <rect x="25" y="190" width="40" height="350" fill="url(#skylineGradFaint)" />

          {/* Distant Spire Tower 1 */}
          <line x1="160" y1="60" x2="160" y2="180" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.7" />
          <circle cx="160" cy="58" r="2.5" fill="#38bdf8" />
          <rect x="135" y="180" width="50" height="360" fill="url(#skylineGradFaint)" />

          {/* Distant Pyramid Tower 2 */}
          <polygon points="380,100 350,190 410,190" fill="url(#skylineGradFaint)" />
          <line x1="380" y1="60" x2="380" y2="100" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.7" />
          <circle cx="380" cy="58" r="2.5" fill="#34d399" />
          <rect x="350" y="190" width="60" height="350" fill="url(#skylineGradFaint)" />

          {/* Distant Supertall Antenna 3 */}
          <line x1="680" y1="30" x2="680" y2="140" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="680" cy="28" r="3" fill="#ef4444" />
          <polygon points="680,140 655,180 705,180" fill="url(#skylineGradFaint)" />
          <rect x="655" y="180" width="50" height="360" fill="url(#skylineGradFaint)" />

          {/* Distant Tower 4 */}
          <line x1="1020" y1="70" x2="1020" y2="160" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.7" />
          <circle cx="1020" cy="68" r="2.5" fill="#38bdf8" />
          <rect x="990" y="160" width="60" height="380" fill="url(#skylineGradFaint)" />

          {/* Distant Tower 5 */}
          <polygon points="1280,110 1250,180 1310,180" fill="url(#skylineGradFaint)" />
          <rect x="1250" y="180" width="60" height="360" fill="url(#skylineGradFaint)" />

          {/* Distant Tower 6 (Far Right) */}
          <line x1="1400" y1="80" x2="1400" y2="200" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.7" />
          <circle cx="1400" cy="78" r="2.5" fill="#34d399" />
          <rect x="1375" y="200" width="50" height="340" fill="url(#skylineGradFaint)" />
        </g>

        {/* ============================================================ */}
        {/* LAYER 2: MIDGROUND ARCHITECTURAL SKYSCRAPERS                 */}
        {/* ============================================================ */}
        <g stroke="rgba(56, 189, 248, 0.65)" strokeWidth="1.4">
          {/* TOWER 0: Far-Left Anchor High-Rise (Left 0-70px) */}
          <polygon points="0,250 50,190 70,220 70,540 0,540" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.6" />
          <line x1="50" y1="130" x2="50" y2="190" stroke="#38bdf8" strokeWidth="2.2" />
          <circle cx="50" cy="128" r="3" fill="#38bdf8" />
          <line x1="25" y1="220" x2="25" y2="540" stroke="rgba(56, 189, 248, 0.4)" />
          <line x1="50" y1="190" x2="50" y2="540" stroke="rgba(56, 189, 248, 0.4)" />

          {/* TOWER 1: Modern Angled Glass Tower (Left 70-160px) */}
          <polygon points="75,220 120,160 155,200 155,540 75,540" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.7)" strokeWidth="1.6" />
          <line x1="120" y1="100" x2="120" y2="160" stroke="#34d399" strokeWidth="2.2" />
          <circle cx="120" cy="98" r="3" fill="#34d399" />
          <line x1="100" y1="190" x2="100" y2="540" stroke="rgba(52, 211, 153, 0.35)" />
          <line x1="130" y1="180" x2="130" y2="540" stroke="rgba(52, 211, 153, 0.35)" />

          {/* TOWER 2: Tiered Art-Deco High-Rise (Left 165-270px) */}
          <line x1="215" y1="60" x2="215" y2="150" stroke="#38bdf8" strokeWidth="2.5" />
          <circle cx="215" cy="58" r="3.5" fill="#38bdf8" />
          <rect x="200" y="150" width="30" height="40" fill="url(#skylineGrad1)" stroke="#38bdf8" />
          <rect x="185" y="190" width="60" height="50" fill="url(#skylineGrad1)" stroke="#38bdf8" />
          <rect x="170" y="240" width="90" height="300" fill="url(#skylineGrad1)" stroke="#38bdf8" />
          <line x1="190" y1="240" x2="190" y2="540" stroke="rgba(56, 189, 248, 0.4)" />
          <line x1="215" y1="240" x2="215" y2="540" stroke="rgba(56, 189, 248, 0.55)" strokeWidth="1.8" />
          <line x1="240" y1="240" x2="240" y2="540" stroke="rgba(56, 189, 248, 0.4)" />

          {/* TOWER 3: Diagrid Lattice Tower (Left-Center 280-390px) */}
          <polygon points="280,170 330,120 380,170 380,540 280,540" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.7)" strokeWidth="1.5" />
          <line x1="330" y1="70" x2="330" y2="120" stroke="#34d399" strokeWidth="2.2" />
          <circle cx="330" cy="68" r="3" fill="#34d399" />
          <line x1="280" y1="220" x2="380" y2="280" stroke="rgba(52, 211, 153, 0.45)" />
          <line x1="380" y1="220" x2="280" y2="280" stroke="rgba(52, 211, 153, 0.45)" />
          <line x1="280" y1="280" x2="380" y2="340" stroke="rgba(52, 211, 153, 0.45)" />
          <line x1="380" y1="280" x2="280" y2="340" stroke="rgba(52, 211, 153, 0.45)" />
          <line x1="280" y1="340" x2="380" y2="400" stroke="rgba(52, 211, 153, 0.45)" />
          <line x1="380" y1="340" x2="280" y2="400" stroke="rgba(52, 211, 153, 0.45)" />

          {/* TOWER 4: Iconic Center Supertall Tower (Center 430-580px) */}
          <line x1="505" y1="20" x2="505" y2="110" stroke="#38bdf8" strokeWidth="3" />
          <circle cx="505" cy="18" r="4" fill="#38bdf8" />
          <polygon points="505,110 475,160 535,160" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.8" />
          <rect x="465" y="160" width="80" height="50" fill="url(#skylineGrad1)" stroke="#38bdf8" />
          <line x1="465" y1="185" x2="545" y2="185" stroke="#38bdf8" strokeWidth="1.8" />
          <rect x="445" y="210" width="120" height="330" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.8" />
          <line x1="470" y1="210" x2="470" y2="540" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.2" />
          <line x1="490" y1="210" x2="490" y2="540" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.2" />
          <line x1="505" y1="210" x2="505" y2="540" stroke="#38bdf8" strokeWidth="2" />
          <line x1="520" y1="210" x2="520" y2="540" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.2" />
          <line x1="540" y1="210" x2="540" y2="540" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.2" />

          {/* TOWER 5: Modern Sculpted High-Rise (Center-Right 600-710px) */}
          <polygon points="600,180 655,130 695,170 695,540 600,540" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.6)" strokeWidth="1.6" />
          <line x1="655" y1="80" x2="655" y2="130" stroke="#34d399" strokeWidth="2.2" />
          <circle cx="655" cy="78" r="3" fill="#34d399" />
          <line x1="645" y1="170" x2="645" y2="540" stroke="rgba(52, 211, 153, 0.4)" />

          {/* TOWER 6: Twin Pinnacle Skyscraper with Skybridge (Right 730-860px) */}
          <line x1="755" y1="90" x2="755" y2="160" stroke="#38bdf8" strokeWidth="2.2" />
          <circle cx="755" cy="88" r="3" fill="#38bdf8" />
          <rect x="740" y="160" width="35" height="380" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="835" y1="90" x2="835" y2="160" stroke="#38bdf8" strokeWidth="2.2" />
          <circle cx="835" cy="88" r="3" fill="#38bdf8" />
          <rect x="820" y="160" width="35" height="380" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="775" y="230" width="45" height="18" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="775" y="340" width="45" height="18" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="775" y="430" width="45" height="110" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.5" />

          {/* TOWER 7: Tiered Metro Tower (Right 880-990px) */}
          <line x1="935" y1="100" x2="935" y2="180" stroke="#34d399" strokeWidth="2.2" />
          <circle cx="935" cy="98" r="3" fill="#34d399" />
          <rect x="915" y="180" width="40" height="50" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.6)" strokeWidth="1.5" />
          <rect x="890" y="230" width="90" height="310" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.6)" strokeWidth="1.5" />

          {/* TOWER 8: Modern High-Rise with Slanted Crown (Right 1010-1130px) */}
          <polygon points="1010,210 1075,150 1110,210 1110,540 1010,540" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.6" />
          <line x1="1075" y1="100" x2="1075" y2="150" stroke="#38bdf8" strokeWidth="2.2" />
          <circle cx="1075" cy="98" r="3" fill="#38bdf8" />
          <line x1="1055" y1="190" x2="1055" y2="540" stroke="rgba(56, 189, 248, 0.4)" />

          {/* TOWER 9: Commercial High-Rise (Right 1145-1265px) */}
          <rect x="1145" y="190" width="85" height="350" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.6)" strokeWidth="1.5" />
          <line x1="1185" y1="130" x2="1185" y2="190" stroke="#34d399" strokeWidth="2.2" />
          <circle cx="1185" cy="128" r="3" fill="#34d399" />
          <line x1="1170" y1="190" x2="1170" y2="540" stroke="rgba(52, 211, 153, 0.35)" />
          <line x1="1200" y1="190" x2="1200" y2="540" stroke="rgba(52, 211, 153, 0.35)" />

          {/* TOWER 10: Slender Needle Tower (Right 1280-1370px) */}
          <polygon points="1280,250 1320,190 1360,250 1360,540 1280,540" fill="url(#skylineGrad1)" stroke="#38bdf8" strokeWidth="1.6" />
          <line x1="1320" y1="130" x2="1320" y2="190" stroke="#38bdf8" strokeWidth="2.2" />
          <circle cx="1320" cy="128" r="3" fill="#38bdf8" />

          {/* TOWER 11: Far-Right Border Tower (Right 1375-1440px) */}
          <polygon points="1375,230 1410,180 1440,210 1440,540 1375,540" fill="url(#skylineGrad2)" stroke="rgba(52, 211, 153, 0.7)" strokeWidth="1.6" />
          <line x1="1410" y1="120" x2="1410" y2="180" stroke="#34d399" strokeWidth="2.2" />
          <circle cx="1410" cy="118" r="3" fill="#34d399" />
          <line x1="1405" y1="210" x2="1405" y2="540" stroke="rgba(52, 211, 153, 0.35)" />
        </g>

        {/* Base Skyline Ground Horizon Line */}
        <line x1="0" y1="539" x2="1440" y2="539" stroke="rgba(56, 189, 248, 0.6)" strokeWidth="2" />
      </svg>
    </div>
  );
}
