'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, RotateCcw, Timer } from 'lucide-react';

type Phase = 'ready' | 'waiting' | 'go' | 'result' | 'complete';

export default function ReactionGame() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [reactionTime, setReactionTime] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [lightColor, setLightColor] = useState<'red' | 'yellow' | 'green'>('red');
  const [tooEarly, setTooEarly] = useState(false);
  const startTimeRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const totalRounds = 5;

  const startRound = useCallback(() => {
    setTooEarly(false);
    setPhase('waiting');
    setLightColor('red');

    // Random delay between 2-5 seconds
    const delay = 2000 + Math.random() * 3000;

    // Flash yellow briefly before green
    timeoutRef.current = setTimeout(() => {
      setLightColor('yellow');
      setTimeout(() => {
        setLightColor('green');
        setPhase('go');
        startTimeRef.current = performance.now();
      }, 500);
    }, delay);
  }, []);

  const handleClick = () => {
    if (phase === 'ready') {
      startRound();
      setRound(1);
      setResults([]);
      return;
    }

    if (phase === 'waiting') {
      // Clicked too early
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setTooEarly(true);
      setPhase('result');
      return;
    }

    if (phase === 'go') {
      const time = Math.round(performance.now() - startTimeRef.current);
      setReactionTime(time);
      setResults(prev => [...prev, time]);
      setPhase('result');
      return;
    }

    if (phase === 'result') {
      if (round >= totalRounds) {
        setPhase('complete');
      } else {
        setRound(prev => prev + 1);
        startRound();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const averageTime = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
  const xpEarned = results.length > 0 ? Math.max(5, 30 - Math.floor(averageTime / 50)) : 0;

  const restart = () => {
    setPhase('ready');
    setResults([]);
    setRound(0);
    setLightColor('red');
    setTooEarly(false);
  };

  if (phase === 'complete') {
    const bestTime = Math.min(...results);
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-in">
        <div className="mx-auto text-6xl">{averageTime < 300 ? '⚡' : averageTime < 500 ? '🏆' : '👍'}</div>
        <h2 className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-outfit)' }}>
          {averageTime < 300 ? 'Lightning Fast!' : averageTime < 500 ? 'Great Reflexes!' : 'Keep Practicing!'}
        </h2>
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Average Reaction Time</p>
            <p className="text-4xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-outfit)' }}>{averageTime}ms</p>
          </div>
          <div className="flex justify-center gap-6 text-sm">
            <div><p className="text-muted-foreground">Best</p><p className="font-bold text-green-500">{bestTime}ms</p></div>
            <div><p className="text-muted-foreground">Rounds</p><p className="font-bold">{results.length}/{totalRounds}</p></div>
          </div>
          <div className="flex items-center justify-center gap-2 text-amber-500 font-bold text-lg">
            <Zap className="h-5 w-5" /> +{xpEarned} XP
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Your Results</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {results.map((r, i) => (
              <span key={i} className={`rounded-full px-3 py-1 text-xs font-bold ${r < 300 ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : r < 500 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
                {r}ms
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={restart} className="flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 font-semibold hover:bg-accent">
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
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      <Link href="/dashboard/games" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Games
      </Link>

      {round > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Round {round}/{totalRounds}</span>
          <span className="font-bold text-primary">{results.length} recorded</span>
        </div>
      )}

      {/* Traffic Light */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-3xl p-8 cursor-pointer transition-all select-none ${
          phase === 'go' ? 'bg-green-100 dark:bg-green-950/30' :
          tooEarly ? 'bg-red-100 dark:bg-red-950/30' :
          'bg-card border border-border/50'
        }`}
        onClick={handleClick}
      >
        {/* Traffic light */}
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-zinc-800 dark:bg-zinc-900 p-4 shadow-2xl mb-6">
          <div className={`h-16 w-16 rounded-full transition-all duration-300 ${lightColor === 'red' ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-red-900/50'}`} />
          <div className={`h-16 w-16 rounded-full transition-all duration-300 ${lightColor === 'yellow' ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : 'bg-yellow-900/50'}`} />
          <div className={`h-16 w-16 rounded-full transition-all duration-300 ${lightColor === 'green' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-green-900/50'}`} />
        </div>

        {/* Instructions */}
        <div className="text-center">
          {phase === 'ready' && (
            <>
              <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-outfit)' }}>🚥 Reaction Time</h1>
              <p className="text-muted-foreground mb-4">Click when the light turns GREEN!</p>
              <div className="flex items-center justify-center gap-2 text-amber-500 font-semibold mb-4">
                <Zap className="h-4 w-4" /> Up to 30 XP
              </div>
              <p className="text-lg font-bold text-primary animate-pulse">Click to Start</p>
            </>
          )}
          {phase === 'waiting' && (
            <p className="text-xl font-bold text-red-500">Wait for GREEN...</p>
          )}
          {phase === 'go' && (
            <p className="text-xl font-bold text-green-500 animate-pulse">CLICK NOW!</p>
          )}
          {phase === 'result' && !tooEarly && (
            <div>
              <p className="text-4xl font-extrabold text-foreground mb-1" style={{ fontFamily: 'var(--font-outfit)' }}>{reactionTime}ms</p>
              <p className="text-muted-foreground mb-4">
                {reactionTime < 250 ? '⚡ Incredible!' : reactionTime < 400 ? '🔥 Fast!' : reactionTime < 600 ? '👍 Good' : '🐢 Keep practicing'}
              </p>
              <p className="text-sm font-medium text-primary">Click to continue</p>
            </div>
          )}
          {phase === 'result' && tooEarly && (
            <div>
              <p className="text-xl font-bold text-red-500 mb-2">Too Early! 🚫</p>
              <p className="text-sm text-muted-foreground mb-4">Wait for the green light before clicking</p>
              <p className="text-sm font-medium text-primary">Click to retry</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
