import { memo } from "react";

interface LogoProps {
    size?: "sm" | "md" | "lg";
    showText?: boolean;
    className?: string;
}

const sizes = {
    sm: { icon: 28, text: "text-lg", sub: "text-[7px]", gap: "gap-2" },
    md: { icon: 32, text: "text-xl", sub: "text-[8px]", gap: "gap-2.5" },
    lg: { icon: 40, text: "text-2xl", sub: "text-[9px]", gap: "gap-3" },
};

function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
    const s = sizes[size];

    return (
        <div className={`flex items-center ${s.gap} ${className}`}>
            {/* Icon */}
            <div
                className="relative flex items-center justify-center flex-shrink-0"
                style={{ width: s.icon, height: s.icon }}
            >
                <svg
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                >
                    <defs>
                        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff5500" />
                            <stop offset="100%" stopColor="#ff7733" />
                        </linearGradient>
                        <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1a1a28" />
                            <stop offset="100%" stopColor="#13131f" />
                        </linearGradient>
                    </defs>
                    {/* Background */}
                    <rect
                        width="48"
                        height="48"
                        rx="14"
                        fill="url(#logoBg)"
                        stroke="rgba(255,85,0,0.25)"
                        strokeWidth="1.5"
                    />
                    {/* Microphone body */}
                    <rect
                        x="20"
                        y="10"
                        width="8"
                        height="16"
                        rx="4"
                        fill="url(#logoGrad)"
                    />
                    {/* Mic arc */}
                    <path
                        d="M15 24a9 9 0 0 0 18 0"
                        stroke="url(#logoGrad)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* Mic stand */}
                    <line
                        x1="24"
                        y1="33"
                        x2="24"
                        y2="37"
                        stroke="url(#logoGrad)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                    {/* Sound waves - left */}
                    <path
                        d="M10 18a6 6 0 0 0 0 12"
                        stroke="#ff5500"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.5"
                    />
                    <path
                        d="M6 15a10 10 0 0 0 0 18"
                        stroke="#ff5500"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.25"
                    />
                    {/* Sound waves - right */}
                    <path
                        d="M38 18a6 6 0 0 1 0 12"
                        stroke="#ff7733"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.5"
                    />
                    <path
                        d="M42 15a10 10 0 0 1 0 18"
                        stroke="#ff7733"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.25"
                    />
                </svg>
            </div>

            {/* Text */}
            {showText && (
                <div className="min-w-0">
                    <h1 className={`font-display ${s.text} font-bold gradient-text leading-none`}>
                        Awaz
                    </h1>
                    <p
                        className={`${s.sub} text-accent font-semibold tracking-[0.15em] uppercase mt-0.5`}
                    >
                        Urdu Voice AI
                    </p>
                </div>
            )}
        </div>
    );
}

export default memo(Logo);
