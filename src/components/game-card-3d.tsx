'use client';

import { useRef, useState, type MouseEvent, type ReactNode } from 'react';

interface GameCard3DProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: number;
}

export default function GameCard3D({
  children,
  className = '',
  glowColor = 'rgba(99, 102, 241, 0.3)',
  intensity = 15,
}: GameCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotateX = (y - 0.5) * -intensity;
    const rotateY = (x - 0.5) * intensity;

    setTransform(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`
    );
    setGlarePos({ x: x * 100, y: y * 100 });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      ref={cardRef}
      className={`relative ${className}`}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out',
        willChange: 'transform',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      {children}
      {/* Glare overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 rounded-inherit opacity-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 0.15 : 0,
          background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.5), transparent 60%)`,
          borderRadius: 'inherit',
        }}
      />
      {/* Bottom glow */}
      <div
        className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-16 rounded-full blur-2xl transition-opacity duration-500 -z-10"
        style={{
          background: glowColor,
          opacity: isHovered ? 0.6 : 0,
        }}
      />
    </div>
  );
}
