export default function PhantomLogo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ghost body */}
      <path
        d="M50 8C28 8 18 28 18 48v30c0 2 1 4 4 4s5-3 5-6 2-5 5-5 4 2 4 5-1 6 4 6 5-3 5-6 2-5 5-5 4 2 4 5-1 6 4 6 5-3 5-6 2-5 5-5 4 2 4 5c0 3 2 6 5 6s4-2 4-4V48c0-20-10-40-32-40z"
        fill="url(#ghostGradient)"
        stroke="url(#ghostStroke)"
        strokeWidth="2.5"
      />
      {/* Left eye */}
      <ellipse cx="38" cy="44" rx="6" ry="7" fill="#111" />
      <ellipse cx="40" cy="42" rx="2.5" ry="3" fill="#22c55e" opacity="0.9" />
      {/* Right eye */}
      <ellipse cx="62" cy="44" rx="6" ry="7" fill="#111" />
      <ellipse cx="64" cy="42" rx="2.5" ry="3" fill="#22c55e" opacity="0.9" />
      {/* Glow effect */}
      <defs>
        <linearGradient id="ghostGradient" x1="50" y1="8" x2="50" y2="92">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="ghostStroke" x1="50" y1="8" x2="50" y2="92">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
    </svg>
  );
}
