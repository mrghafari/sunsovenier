import { useEffect, useId, useRef } from "react";
import "./about-chemical.css";

type AboutChemicalIllustrationProps = {
  label: string;
};

export default function AboutChemicalIllustration({
  label,
}: AboutChemicalIllustrationProps) {
  const illustrationRef = useRef<SVGSVGElement>(null);
  const reactId = useId();
  const gradientId = `mc-chemical-gradient-${reactId.replace(/:/g, "")}`;
  const flaskClipId = `mc-chemical-flask-clip-${reactId.replace(/:/g, "")}`;

  useEffect(() => {
    const illustration = illustrationRef.current;
    if (!illustration) return;
    if (!("IntersectionObserver" in window)) {
      illustration.classList.add("is-in-view");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        illustration.classList.toggle("is-in-view", entry.isIntersecting);
      },
      { threshold: 0.08 },
    );

    observer.observe(illustration);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={illustrationRef}
      className="mc-chemical-art"
      viewBox="0 0 560 440"
      role="img"
      aria-label={label}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6ea3ff" />
          <stop offset="1" stopColor="#1a56db" />
        </linearGradient>
        <clipPath id={flaskClipId}>
          <path d="M300 70h60v70l55 110c10 22-4 40-28 40H273c-24 0-38-18-28-40l55-110z" />
        </clipPath>
      </defs>

      <rect className="mc-chemical-art__backdrop" width="560" height="440" rx="24" />
      <circle
        cx="330"
        cy="120"
        r="100"
        fill="none"
        stroke="#6ea3ff"
        strokeOpacity=".25"
        strokeDasharray="4 8"
      />

      <g className="mc-chemical-art__orbit">
        <line
          x1="430"
          y1="120"
          x2="455"
          y2="95"
          stroke="#6ea3ff"
          strokeWidth="3"
        />
        <circle cx="430" cy="120" r="9" fill="#6ea3ff" />
        <circle cx="458" cy="92" r="6" fill="#fff" />
      </g>

      <g clipPath={`url(#${flaskClipId})`}>
        <rect
          className="mc-chemical-art__liquid"
          x="230"
          y="220"
          width="200"
          height="120"
          fill={`url(#${gradientId})`}
        />
        <g fill="#fff" fillOpacity=".8">
          <circle className="mc-chemical-art__bubble mc-chemical-art__bubble--one" cx="300" cy="300" r="6" />
          <circle className="mc-chemical-art__bubble mc-chemical-art__bubble--two" cx="335" cy="310" r="4" />
          <circle className="mc-chemical-art__bubble mc-chemical-art__bubble--three" cx="360" cy="295" r="7" />
          <circle className="mc-chemical-art__bubble mc-chemical-art__bubble--four" cx="320" cy="315" r="5" />
        </g>
      </g>
      <path
        d="M300 70h60v70l55 110c10 22-4 40-28 40H273c-24 0-38-18-28-40l55-110z"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <line
        x1="292"
        y1="70"
        x2="368"
        y2="70"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
      />

      <g className="mc-chemical-art__shield">
        <path
          d="M70 40l50 18v38c0 34-22 56-50 68-28-12-50-34-50-68V58z"
          fill="#1a56db"
        />
        <path
          d="M48 98l16 16 30-34"
          fill="none"
          stroke="#fff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <rect x="30" y="380" width="500" height="14" rx="7" fill="#1d4668" />
      <g fill="#fff">
        <circle cx="70" cy="410" r="7" />
        <circle cx="280" cy="410" r="7" />
        <circle cx="490" cy="410" r="7" />
      </g>
      <g className="mc-chemical-art__belt">
        <rect x="0" y="325" width="56" height="55" rx="6" fill="#6ea3ff" />
        <rect x="0" y="345" width="56" height="8" fill="#111923" fillOpacity=".35" />
        <rect x="-110" y="338" width="48" height="42" rx="3" fill="#e8eef2" />
        <path d="M-110 338l48 42m0-42l-48 42" stroke="#9db3c2" strokeWidth="2" />
        <rect x="-210" y="325" width="56" height="55" rx="6" fill="#1a56db" />
        <rect x="-210" y="345" width="56" height="8" fill="#111923" fillOpacity=".35" />
      </g>
    </svg>
  );
}
