const WorkflowAnimation = () => {
  return (
    <div className="relative w-full aspect-[5/3] bg-gradient-to-br from-primary/[0.04] via-background to-primary/[0.06]">
      <svg
        viewBox="0 0 600 360"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        role="img"
        aria-label="Animated workflow: a document is processed by AI and turned into completed export documents"
      >
        <defs>
          <linearGradient id="aiGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F76A1F" />
            <stop offset="100%" stopColor="#E54E0F" />
          </linearGradient>
          <radialGradient id="aiGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#F76A1F" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F76A1F" stopOpacity="0" />
          </radialGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="2" result="off" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.18" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <path id="flowIn" d="M 130 180 C 180 180, 220 180, 230 180" />
          <path id="flowOut" d="M 370 180 C 400 180, 430 180, 460 180" />

          <style>{`
            @keyframes ue-flow-dash {
              from { stroke-dashoffset: 24; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes ue-ai-pulse {
              0%, 100% { transform: scale(1); opacity: 0.55; }
              50% { transform: scale(1.18); opacity: 1; }
            }
            @keyframes ue-spark {
              0%, 100% { opacity: 0; transform: translate(0, 0) scale(0.6); }
              50% { opacity: 1; transform: translate(var(--dx, 0), var(--dy, 0)) scale(1); }
            }
            @keyframes ue-line-grow {
              from { transform: scaleX(0); }
              to { transform: scaleX(1); }
            }
            @keyframes ue-doc-in {
              0%, 8% { opacity: 0; transform: translateY(8px) scale(0.96); }
              18%, 92% { opacity: 1; transform: translateY(0) scale(1); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes ue-check-pop {
              0%, 14% { opacity: 0; transform: scale(0.4); }
              22% { opacity: 1; transform: scale(1.25); }
              30%, 100% { opacity: 1; transform: scale(1); }
            }
            .ue-flow {
              stroke-dasharray: 6 6;
              animation: ue-flow-dash 1.2s linear infinite;
            }
            .ue-ai-pulse {
              transform-origin: 300px 180px;
              animation: ue-ai-pulse 2.4s ease-in-out infinite;
            }
            .ue-line { transform-origin: left center; }
            .ue-line-1 { animation: ue-line-grow 0.8s 0.2s ease-out both; }
            .ue-line-2 { animation: ue-line-grow 0.8s 0.5s ease-out both; }
            .ue-line-3 { animation: ue-line-grow 0.8s 0.8s ease-out both; }
            .ue-line-4 { animation: ue-line-grow 0.8s 1.1s ease-out both; }
            .ue-doc-out {
              transform-origin: center;
              animation: ue-doc-in 6s ease-out infinite;
            }
            .ue-doc-out-1 { animation-delay: 0.4s; }
            .ue-doc-out-2 { animation-delay: 1.2s; }
            .ue-doc-out-3 { animation-delay: 2.0s; }
            .ue-check {
              transform-origin: center;
              animation: ue-check-pop 6s ease-out infinite;
            }
            .ue-check-1 { animation-delay: 0.7s; }
            .ue-check-2 { animation-delay: 1.5s; }
            .ue-check-3 { animation-delay: 2.3s; }
            .ue-spark {
              animation: ue-spark 2.4s ease-in-out infinite;
              transform-origin: center;
            }
            .ue-spark-1 { --dx: -6px; --dy: -10px; animation-delay: 0s; }
            .ue-spark-2 { --dx: 10px; --dy: -8px; animation-delay: 0.4s; }
            .ue-spark-3 { --dx: -10px; --dy: 8px; animation-delay: 0.8s; }
            .ue-spark-4 { --dx: 8px; --dy: 12px; animation-delay: 1.2s; }
          `}</style>
        </defs>

        {/* Subtle grid background dots */}
        <g opacity="0.12">
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 9 }).map((_, col) => (
              <circle
                key={`${row}-${col}`}
                cx={40 + col * 65}
                cy={50 + row * 65}
                r="1.2"
                fill="hsl(20 30% 50%)"
              />
            ))
          )}
        </g>

        {/* INPUT DOCUMENT */}
        <g filter="url(#softShadow)">
          <rect x="50" y="110" width="100" height="140" rx="8" fill="#ffffff" stroke="hsl(24 14% 85%)" strokeWidth="1" />
          <path d="M 130 110 L 150 130 L 130 130 Z" fill="hsl(24 14% 92%)" />
          <rect className="ue-line ue-line-1" x="62" y="130" width="60" height="6" rx="2" fill="hsl(20 30% 75%)" />
          <rect className="ue-line ue-line-2" x="62" y="148" width="76" height="5" rx="2" fill="hsl(24 12% 88%)" />
          <rect className="ue-line ue-line-3" x="62" y="163" width="68" height="5" rx="2" fill="hsl(24 12% 88%)" />
          <rect className="ue-line ue-line-4" x="62" y="178" width="50" height="5" rx="2" fill="hsl(24 12% 88%)" />
          <rect x="62" y="200" width="36" height="36" rx="3" fill="none" stroke="hsl(20 93% 54% / 0.35)" strokeWidth="1.2" strokeDasharray="3 3" />
          <text x="80" y="222" textAnchor="middle" fontSize="9" fontFamily="ui-sans-serif, system-ui" fill="hsl(20 90% 36% / 0.65)" fontWeight="600">PDF</text>
        </g>

        {/* FLOW IN — arrow + SMIL animated packets */}
        <path
          className="ue-flow"
          d="M 155 180 C 180 180, 210 180, 235 180"
          stroke="hsl(20 93% 54%)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <circle r="3.5" fill="hsl(20 93% 54%)">
          <animateMotion dur="1.6s" repeatCount="indefinite" begin="0s">
            <mpath href="#flowIn" />
          </animateMotion>
        </circle>
        <circle r="3" fill="hsl(20 93% 54%)" fillOpacity="0.7">
          <animateMotion dur="1.6s" repeatCount="indefinite" begin="0.4s">
            <mpath href="#flowIn" />
          </animateMotion>
        </circle>
        <circle r="2.5" fill="hsl(20 93% 54%)" fillOpacity="0.5">
          <animateMotion dur="1.6s" repeatCount="indefinite" begin="0.8s">
            <mpath href="#flowIn" />
          </animateMotion>
        </circle>

        {/* AI PROCESSOR */}
        <g>
          <circle cx="300" cy="180" r="80" fill="url(#aiGlow)" />
          <circle className="ue-ai-pulse" cx="300" cy="180" r="58" fill="none" stroke="hsl(20 93% 54%)" strokeWidth="1.5" opacity="0.4" />
          <circle cx="300" cy="180" r="48" fill="url(#aiGrad)" filter="url(#softShadow)" />
          <g stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.95">
            <circle cx="300" cy="180" r="20" strokeWidth="1.6" />
            <circle cx="300" cy="180" r="32" strokeWidth="1" opacity="0.6" />
            <path d="M 300 160 L 300 200" strokeWidth="1.2" />
            <path d="M 280 180 L 320 180" strokeWidth="1.2" />
            <path d="M 286 166 L 314 194" strokeWidth="0.8" opacity="0.6" />
            <path d="M 314 166 L 286 194" strokeWidth="0.8" opacity="0.6" />
            <circle cx="300" cy="180" r="4" fill="#ffffff" stroke="none" />
            <circle cx="280" cy="180" r="2" fill="#ffffff" stroke="none" />
            <circle cx="320" cy="180" r="2" fill="#ffffff" stroke="none" />
            <circle cx="300" cy="160" r="2" fill="#ffffff" stroke="none" />
            <circle cx="300" cy="200" r="2" fill="#ffffff" stroke="none" />
          </g>
          <text x="300" y="252" textAnchor="middle" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="600" fill="hsl(20 90% 36%)">
            Universal Exports AI
          </text>

          <g fill="hsl(20 93% 54%)">
            <path className="ue-spark ue-spark-1" transform="translate(252 140)" d="M 0 -5 L 1 -1 L 5 0 L 1 1 L 0 5 L -1 1 L -5 0 L -1 -1 Z" />
            <path className="ue-spark ue-spark-2" transform="translate(348 138)" d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" />
            <path className="ue-spark ue-spark-3" transform="translate(248 220)" d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" />
            <path className="ue-spark ue-spark-4" transform="translate(352 222)" d="M 0 -5 L 1 -1 L 5 0 L 1 1 L 0 5 L -1 1 L -5 0 L -1 -1 Z" />
          </g>
        </g>

        {/* FLOW OUT — arrow + SMIL animated packets */}
        <path
          className="ue-flow"
          d="M 365 180 C 395 180, 425 180, 455 180"
          stroke="hsl(20 93% 54%)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <circle r="3.5" fill="hsl(20 93% 54%)">
          <animateMotion dur="1.6s" repeatCount="indefinite" begin="0s">
            <mpath href="#flowOut" />
          </animateMotion>
        </circle>
        <circle r="3" fill="hsl(20 93% 54%)" fillOpacity="0.7">
          <animateMotion dur="1.6s" repeatCount="indefinite" begin="0.4s">
            <mpath href="#flowOut" />
          </animateMotion>
        </circle>
        <circle r="2.5" fill="hsl(20 93% 54%)" fillOpacity="0.5">
          <animateMotion dur="1.6s" repeatCount="indefinite" begin="0.8s">
            <mpath href="#flowOut" />
          </animateMotion>
        </circle>

        {/* OUTPUT DOCUMENTS */}
        <g>
          <g className="ue-doc-out ue-doc-out-3" filter="url(#softShadow)">
            <rect x="500" y="78" width="84" height="116" rx="7" fill="#ffffff" stroke="hsl(24 14% 85%)" strokeWidth="1" transform="rotate(6 542 136)" />
            <g transform="rotate(6 542 136)">
              <rect x="510" y="96" width="50" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
              <rect x="510" y="108" width="62" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
              <rect x="510" y="120" width="56" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
              <rect x="510" y="132" width="46" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
              <g className="ue-check ue-check-3" transform="translate(560 170)">
                <circle r="11" fill="hsl(142 71% 45%)" />
                <path d="M -4 0 L -1 3 L 5 -3" stroke="#ffffff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </g>
          </g>

          <g className="ue-doc-out ue-doc-out-2" filter="url(#softShadow)">
            <rect x="475" y="110" width="88" height="124" rx="7" fill="#ffffff" stroke="hsl(24 14% 85%)" strokeWidth="1" transform="rotate(-3 519 172)" />
            <g transform="rotate(-3 519 172)">
              <rect x="486" y="130" width="54" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
              <rect x="486" y="142" width="66" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
              <rect x="486" y="154" width="60" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
              <rect x="486" y="166" width="48" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
              <rect x="486" y="178" width="56" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
              <g className="ue-check ue-check-2" transform="translate(540 210)">
                <circle r="11" fill="hsl(142 71% 45%)" />
                <path d="M -4 0 L -1 3 L 5 -3" stroke="#ffffff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </g>
          </g>

          <g className="ue-doc-out ue-doc-out-1" filter="url(#softShadow)">
            <rect x="460" y="130" width="92" height="130" rx="8" fill="#ffffff" stroke="hsl(24 14% 80%)" strokeWidth="1.2" />
            <path d="M 532 130 L 552 150 L 532 150 Z" fill="hsl(24 14% 92%)" />
            <rect x="472" y="150" width="58" height="5" rx="2" fill="hsl(20 30% 75%)" />
            <rect x="472" y="164" width="68" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
            <rect x="472" y="176" width="60" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
            <rect x="472" y="188" width="52" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
            <rect x="472" y="200" width="64" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
            <rect x="472" y="212" width="44" height="4" rx="1.5" fill="hsl(24 12% 88%)" />
            <path d="M 472 232 C 480 226, 488 238, 496 230 S 510 234, 522 228" stroke="hsl(20 93% 54%)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <g className="ue-check ue-check-1" transform="translate(532 244)">
              <circle r="12" fill="hsl(142 71% 45%)" />
              <path d="M -4.5 0 L -1.5 3.5 L 5.5 -3.5" stroke="#ffffff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        </g>

        <text x="100" y="280" textAnchor="middle" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="500" fill="hsl(24 10% 44%)">
          Upload
        </text>
        <text x="506" y="290" textAnchor="middle" fontSize="11" fontFamily="ui-sans-serif, system-ui" fontWeight="500" fill="hsl(24 10% 44%)">
          Signed &amp; ready
        </text>
      </svg>
    </div>
  );
};

export default WorkflowAnimation;
