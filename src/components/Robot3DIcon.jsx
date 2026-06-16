export default function Robot3DIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 72 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`robot-v5-svg h-12 w-12 md:h-[3.25rem] md:w-[3.25rem] ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="robotV5Head" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f4f4f5" />
          <stop offset="100%" stopColor="#d4d4d8" />
        </radialGradient>
        <radialGradient id="robotV5Body" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="100%" stopColor="#a1a1aa" />
        </radialGradient>
      </defs>

      <g className="robot-v5-bounce">
        {/* tiny legs */}
        <rect x="28" y="68" width="6" height="8" rx="3" fill="#71717a" />
        <rect x="38" y="68" width="6" height="8" rx="3" fill="#71717a" />

        {/* body */}
        <ellipse cx="36" cy="62" rx="14" ry="10" fill="url(#robotV5Body)" />
        <ellipse cx="36" cy="60" rx="8" ry="4" fill="#eab308" opacity="0.35" className="robot-v5-heart" />

        {/* head */}
        <circle cx="36" cy="34" r="24" fill="url(#robotV5Head)" />
        <ellipse cx="28" cy="26" rx="7" ry="4.5" fill="#fff" opacity="0.55" />

        {/* big cute eyes */}
        <ellipse cx="27" cy="34" rx="7" ry="8" fill="#fff" stroke="#e4e4e7" strokeWidth="1.5" />
        <ellipse cx="45" cy="34" rx="7" ry="8" fill="#fff" stroke="#e4e4e7" strokeWidth="1.5" />
        <circle cx="27" cy="35" r="4.5" fill="#18181b" className="robot-v5-pupil" />
        <circle cx="45" cy="35" r="4.5" fill="#18181b" className="robot-v5-pupil robot-v5-pupil-right" />
        <circle cx="28.5" cy="33" r="1.6" fill="#fff" />
        <circle cx="46.5" cy="33" r="1.6" fill="#fff" />

        {/* blush */}
        <ellipse cx="18" cy="40" rx="3" ry="2" fill="#fbbf24" opacity="0.35" />
        <ellipse cx="54" cy="40" rx="3" ry="2" fill="#fbbf24" opacity="0.35" />

        {/* smile */}
        <path d="M30 44 Q36 49 42 44" stroke="#71717a" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* ears */}
        <circle cx="12" cy="34" r="4" fill="#e4e4e7" />
        <circle cx="60" cy="34" r="4" fill="#d4d4d8" />

        {/* antenna */}
        <g className="robot-v5-antenna">
          <line x1="36" y1="10" x2="36" y2="4" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" />
          <circle cx="36" cy="3" r="2.5" fill="#eab308" />
        </g>
      </g>
    </svg>
  );
}
