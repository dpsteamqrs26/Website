'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, RotateCcw, Heart, PersonStanding } from 'lucide-react';

type Car = {
  id: number;
  lane: number;
  x: number;
  speed: number;
  width: number;
  color: string;
};

type GamePhase = 'ready' | 'playing' | 'success' | 'hit' | 'complete';

const carColors = [
  'bg-red-500', 'bg-blue-500', 'bg-green-600', 'bg-amber-500',
  'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-slate-600',
];

export default function CrossingGame() {
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [playerY, setPlayerY] = useState(90); // percent from top
  const [cars, setCars] = useState<Car[]>([]);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const animRef = useRef<number | null>(null);
  const carsRef = useRef<Car[]>([]);

  const lanes = [25, 40, 55, 70]; // y positions for 4 lanes

  const generateCars = useCallback((lvl: number) => {
    const newCars: Car[] = [];
    const count = 4 + lvl * 2;
    for (let i = 0; i < count; i++) {
      const lane = lanes[i % lanes.length];
      const direction = lane < 50 ? 1 : -1;
      newCars.push({
        id: i,
        lane,
        x: direction > 0 ? -20 + Math.random() * 120 : Math.random() * 120,
        speed: (1.5 + Math.random() * lvl) * direction,
        width: 12 + Math.random() * 4,
        color: carColors[i % carColors.length],
      });
    }
    return newCars;
  }, []);

  const startGame = () => {
    setPhase('playing');
    setPlayerY(90);
    setLives(3);
    setLevel(1);
    setScore(0);
    const newCars = generateCars(1);
    setCars(newCars);
    carsRef.current = newCars;
  };

  const moveUp = () => {
    if (phase !== 'playing' || isMoving) return;
    setIsMoving(true);
    setPlayerY(prev => {
      const next = prev - 8;
      if (next <= 5) {
        // Crossed successfully!
        setScore(s => s + 1);
        const nextLevel = level + 1;
        if (nextLevel > 5) {
          setPhase('complete');
          return prev;
        }
        setLevel(nextLevel);
        const newCars = generateCars(nextLevel);
        setCars(newCars);
        carsRef.current = newCars;
        setTimeout(() => setIsMoving(false), 100);
        return 90;
      }
      setTimeout(() => setIsMoving(false), 100);
      return next;
    });
  };

  const moveDown = () => {
    if (phase !== 'playing' || isMoving) return;
    setIsMoving(true);
    setPlayerY(prev => {
      const next = Math.min(90, prev + 8);
      setTimeout(() => setIsMoving(false), 100);
      return next;
    });
  };

  // Animation loop
  useEffect(() => {
    if (phase !== 'playing') return;

    const animate = () => {
      setCars(prevCars => {
        const updated = prevCars.map(car => ({
          ...car,
          x: car.speed > 0
            ? (car.x + car.speed) > 110 ? -car.width : car.x + car.speed
            : (car.x + car.speed) < -car.width ? 110 : car.x + car.speed,
        }));
        carsRef.current = updated;
        return updated;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [phase]);

  // Collision detection
  useEffect(() => {
    if (phase !== 'playing') return;

    const checkCollision = setInterval(() => {
      const py = playerY;
      const px = 48; // player x position (center)

      for (const car of carsRef.current) {
        const carLeft = car.x;
        const carRight = car.x + car.width;
        const inLane = Math.abs(car.lane - py) < 6;
        const inPath = px > carLeft && px < carRight;

        if (inLane && inPath) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setPhase('hit');
            }
            return newLives;
          });
          setPlayerY(90);
          break;
        }
      }
    }, 100);

    return () => clearInterval(checkCollision);
  }, [phase, playerY]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') moveUp();
      if (e.key === 'ArrowDown' || e.key === 's') moveDown();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const xpEarned = score * 20;

  if (phase === 'ready') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-in">
        <Link href="/dashboard/games" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-xl shadow-green-500/25 text-4xl">
          🚶
        </div>
        <h1 className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-outfit)' }}>Road Crossing</h1>
        <p className="text-muted-foreground">Cross the road safely! Use arrow keys or tap the buttons to move. Avoid the cars!</p>
        <div className="flex items-center justify-center gap-2 text-amber-500 font-semibold">
          <Zap className="h-4 w-4" /> 20 XP per crossing
        </div>
        <button onClick={startGame} className="rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-105">
          Start Crossing
        </button>
      </div>
    );
  }

  if (phase === 'complete' || phase === 'hit') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-in">
        <div className="mx-auto text-6xl">{phase === 'complete' ? '🏆' : '💥'}</div>
        <h2 className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-outfit)' }}>
          {phase === 'complete' ? 'All Crossings Complete!' : 'Game Over!'}
        </h2>
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <p className="text-4xl font-extrabold" style={{ fontFamily: 'var(--font-outfit)' }}>{score}</p>
          <p className="text-muted-foreground">Successful crossings</p>
          <div className="flex items-center justify-center gap-2 text-amber-500 font-bold text-lg">
            <Zap className="h-5 w-5" /> +{xpEarned} XP
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={startGame} className="flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 font-semibold hover:bg-accent">
            <RotateCcw className="h-4 w-4" /> Play Again
          </button>
          <Link href="/dashboard/games" className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 font-semibold text-white shadow-lg">
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
      {/* HUD */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart key={i} className={`h-5 w-5 ${i < lives ? 'text-red-500 fill-red-500' : 'text-muted-foreground/30'}`} />
          ))}
        </div>
        <span className="text-sm font-bold bg-accent rounded-full px-3 py-1">Level {level}/5</span>
        <span className="text-sm font-bold text-primary">{score} crossed</span>
      </div>

      {/* Game field */}
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800 border border-border/50">
        {/* Sidewalks */}
        <div className="absolute top-0 left-0 right-0 h-[15%] bg-green-300 dark:bg-green-900/50 flex items-center justify-center">
          <span className="text-xs font-bold text-green-800 dark:text-green-300">🏁 SAFE ZONE</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-green-300 dark:bg-green-900/50 flex items-center justify-center">
          <span className="text-xs font-bold text-green-800 dark:text-green-300">🚶 START</span>
        </div>

        {/* Road */}
        <div className="absolute top-[15%] left-0 right-0 bottom-[15%] bg-gray-500 dark:bg-gray-700">
          {/* Lane markings */}
          {lanes.map((lane, i) => (
            <div key={i} className="absolute left-0 right-0 flex justify-center gap-6" style={{ top: `${((lane - 15) / 70) * 100}%` }}>
              {Array.from({ length: 8 }).map((_, j) => (
                <div key={j} className="w-6 h-1 bg-yellow-400/60 rounded" />
              ))}
            </div>
          ))}
        </div>

        {/* Cars */}
        {cars.map((car) => (
          <div
            key={car.id}
            className={`absolute h-[5%] rounded-md ${car.color} shadow-md transition-none`}
            style={{
              left: `${car.x}%`,
              top: `${car.lane}%`,
              width: `${car.width}%`,
            }}
          />
        ))}

        {/* Player */}
        <div
          className="absolute left-[48%] w-[4%] transition-all duration-150 flex items-center justify-center"
          style={{ top: `${playerY}%` }}
        >
          <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-xs">
            🚶
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={moveUp}
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xl font-bold shadow-lg active:scale-95 transition-transform"
        >
          ↑
        </button>
        <button
          onClick={moveDown}
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xl font-bold shadow-lg active:scale-95 transition-transform"
        >
          ↓
        </button>
      </div>
      <p className="text-center text-xs text-muted-foreground">Use ↑↓ arrow keys or buttons to move</p>
    </div>
  );
}
