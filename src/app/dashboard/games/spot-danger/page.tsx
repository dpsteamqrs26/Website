'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, AlertTriangle, CheckCircle2, Zap, RotateCcw, Timer } from 'lucide-react';

type Scenario = {
  id: number;
  title: string;
  description: string;
  dangers: { id: number; label: string; x: number; y: number }[];
  background: string;
};

const scenarios: Scenario[] = [
  {
    id: 1,
    title: 'School Zone',
    description: 'Find 3 dangerous behaviors in this school zone scene',
    dangers: [
      { id: 1, label: 'Child running into road', x: 30, y: 60 },
      { id: 2, label: 'Car speeding past school', x: 70, y: 45 },
      { id: 3, label: 'Missing crossing guard', x: 50, y: 70 },
    ],
    background: 'from-blue-100 to-sky-200 dark:from-blue-950 dark:to-sky-900',
  },
  {
    id: 2,
    title: 'Busy Intersection',
    description: 'Spot 3 unsafe behaviors at this intersection',
    dangers: [
      { id: 1, label: 'Pedestrian jaywalking', x: 25, y: 55 },
      { id: 2, label: 'Driver running red light', x: 65, y: 35 },
      { id: 3, label: 'Cyclist without helmet', x: 80, y: 60 },
    ],
    background: 'from-amber-100 to-orange-200 dark:from-amber-950 dark:to-orange-900',
  },
  {
    id: 3,
    title: 'Residential Street',
    description: 'Find 3 hazards on this residential street',
    dangers: [
      { id: 1, label: 'Kids playing near parked cars', x: 20, y: 65 },
      { id: 2, label: 'Obstructed stop sign', x: 75, y: 25 },
      { id: 3, label: 'Car parked on sidewalk', x: 55, y: 50 },
    ],
    background: 'from-green-100 to-emerald-200 dark:from-green-950 dark:to-emerald-900',
  },
];

export default function SpotDangerGame() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'complete' | 'gameover'>('ready');
  const [totalScore, setTotalScore] = useState(0);
  const [clickFeedback, setClickFeedback] = useState<{ x: number; y: number; correct: boolean } | null>(null);

  const scenario = scenarios[scenarioIndex];

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (timeLeft <= 0) {
      setGameState('gameover');
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Check proximity to dangers (within 12% radius)
    const hitDanger = scenario.dangers.find(
      d => !found.has(d.id) && Math.abs(d.x - x) < 12 && Math.abs(d.y - y) < 12
    );

    if (hitDanger) {
      const newFound = new Set(found);
      newFound.add(hitDanger.id);
      setFound(newFound);
      setTotalScore(prev => prev + 1);
      setClickFeedback({ x, y, correct: true });

      if (newFound.size === scenario.dangers.length) {
        if (scenarioIndex < scenarios.length - 1) {
          setTimeout(() => {
            setScenarioIndex(prev => prev + 1);
            setFound(new Set());
            setTimeLeft(30);
          }, 1000);
        } else {
          setTimeout(() => setGameState('complete'), 1000);
        }
      }
    } else {
      setClickFeedback({ x, y, correct: false });
    }

    setTimeout(() => setClickFeedback(null), 800);
  };

  const start = () => {
    setGameState('playing');
    setTimeLeft(30);
    setFound(new Set());
    setTotalScore(0);
    setScenarioIndex(0);
  };

  if (gameState === 'ready') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-in">
        <Link href="/dashboard/games" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-xl shadow-amber-500/25 text-4xl">
          ⚠️
        </div>
        <h1 className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-outfit)' }}>Spot the Danger</h1>
        <p className="text-muted-foreground">Click on unsafe behaviors in each road scene before time runs out!</p>
        <div className="flex items-center justify-center gap-2 text-amber-500 font-semibold">
          <Zap className="h-5 w-5" /> Earn 25 XP per game
        </div>
        <button onClick={start} className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-105">
          Start Game
        </button>
      </div>
    );
  }

  if (gameState === 'complete' || gameState === 'gameover') {
    const xp = totalScore * 5;
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-in">
        <div className="mx-auto text-6xl">{gameState === 'complete' ? '🏆' : '⏰'}</div>
        <h2 className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-outfit)' }}>
          {gameState === 'complete' ? 'All Clear!' : 'Time\'s Up!'}
        </h2>
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <p className="text-4xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-outfit)' }}>{totalScore}/{scenarios.reduce((s, sc) => s + sc.dangers.length, 0)}</p>
          <p className="text-muted-foreground mb-4">Dangers spotted</p>
          <div className="flex items-center justify-center gap-2 text-amber-500 font-bold">
            <Zap className="h-5 w-5" /> +{xp} XP
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={start} className="flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 font-semibold hover:bg-accent">
            <RotateCcw className="h-4 w-4" /> Play Again
          </button>
          <Link href="/dashboard/games" className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 font-semibold text-white shadow-lg">
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold">{scenario.title}</h2>
          <p className="text-sm text-muted-foreground">{scenario.description}</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${timeLeft <= 10 ? 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400 animate-pulse' : 'bg-accent text-foreground'}`}>
          <Timer className="h-4 w-4" /> {timeLeft}s
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {scenario.dangers.map(d => (
          <div key={d.id} className={`h-2 flex-1 rounded-full transition-all ${found.has(d.id) ? 'bg-green-500' : 'bg-muted'}`} />
        ))}
      </div>

      {/* Scene */}
      <div
        className={`relative aspect-video rounded-2xl bg-gradient-to-br ${scenario.background} cursor-crosshair overflow-hidden border border-border/50`}
        onClick={handleClick}
      >
        {/* Scene elements */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-4 p-8 w-full h-full">
            {/* Road lines */}
            <div className="col-span-3 flex items-end justify-center">
              <div className="w-full h-4 bg-gray-500/30 rounded-full flex items-center justify-center gap-4">
                <div className="w-8 h-1 bg-white/50 rounded" />
                <div className="w-8 h-1 bg-white/50 rounded" />
                <div className="w-8 h-1 bg-white/50 rounded" />
                <div className="w-8 h-1 bg-white/50 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Danger zones (visible when found) */}
        {scenario.dangers.map(d => (
          <div
            key={d.id}
            className={`absolute transition-all duration-300 ${found.has(d.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
            style={{ left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div className="flex flex-col items-center">
              <AlertTriangle className="h-8 w-8 text-amber-500 drop-shadow-lg" />
              <span className="mt-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap">{d.label}</span>
            </div>
          </div>
        ))}

        {/* Click feedback */}
        {clickFeedback && (
          <div
            className="absolute animate-count-up pointer-events-none"
            style={{ left: `${clickFeedback.x}%`, top: `${clickFeedback.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {clickFeedback.correct ? (
              <CheckCircle2 className="h-10 w-10 text-green-500 drop-shadow-lg" />
            ) : (
              <div className="h-8 w-8 rounded-full border-2 border-red-500/50" />
            )}
          </div>
        )}

        {/* Hint overlay */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          Click on unsafe behaviors • {found.size}/{scenario.dangers.length} found
        </div>
      </div>

      {/* Found list */}
      <div className="flex flex-wrap gap-2">
        {scenario.dangers.map(d => (
          <span key={d.id} className={`rounded-full px-3 py-1 text-xs font-medium ${found.has(d.id) ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
            {found.has(d.id) ? `✓ ${d.label}` : '???'}
          </span>
        ))}
      </div>
    </div>
  );
}
