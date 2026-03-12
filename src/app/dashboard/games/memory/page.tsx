'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, RotateCcw, Brain, Shield, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { addGameXP } from '@/app/actions';

type Card = {
  id: number;
  icon: any;
  label: string;
  isFlipped: boolean;
  isMatched: boolean;
};

const SIGNS = [
  { icon: Shield, label: 'Safety First' },
  { icon: AlertTriangle, label: 'Danger Ahead' },
  { icon: Info, label: 'Information' },
  { icon: CheckCircle2, label: 'Safe to Go' },
  { icon: Shield, label: 'Seatbelt' },
  { icon: AlertTriangle, label: 'Road Work' },
  { icon: Info, label: 'Hospital' },
  { icon: CheckCircle2, label: 'School Zone' },
];

export default function MemoryMatchGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'complete'>('ready');
  const [xpPersisted, setXpPersisted] = useState(false);

  const initGame = useCallback(() => {
    const shuffledCards = [...SIGNS, ...SIGNS]
      .sort(() => Math.random() - 0.5)
      .map((sign, index) => ({
        ...sign,
        id: index,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledCards);
    setFlippedCards([]);
    setMatches(0);
    setMoves(0);
    setPhase('playing');
    setXpPersisted(false);
  }, []);

  const handleCardClick = (id: number) => {
    if (phase !== 'playing' || flippedCards.length === 2 || cards[id].isFlipped || cards[id].isMatched) return;

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [firstId, secondId] = newFlipped;
      
      if (cards[firstId].label === cards[secondId].label) {
        // Match!
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[firstId].isMatched = true;
          matchedCards[secondId].isMatched = true;
          setCards(matchedCards);
          setFlippedCards([]);
          setMatches(m => m + 1);
        }, 600);
      } else {
        // No match
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstId].isFlipped = false;
          resetCards[secondId].isFlipped = false;
          setCards(resetCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  useEffect(() => {
    if (matches === SIGNS.length) {
      setPhase('complete');
    }
  }, [matches]);

  const xpEarned = Math.max(10, 100 - moves * 2);

  useEffect(() => {
    if (phase === 'complete' && !xpPersisted) {
      const persistXP = async () => {
        try {
          await addGameXP(xpEarned);
          setXpPersisted(true);
        } catch (error) {
          console.error('Failed to update XP:', error);
        }
      };
      persistXP();
    }
  }, [phase, xpEarned, xpPersisted]);

  if (phase === 'ready') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-in">
        <Link href="/dashboard/games" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-xl shadow-blue-500/25 text-4xl">
          <Brain className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-outfit)' }}>Sign Match</h1>
        <p className="text-muted-foreground">Train your memory! Match the road safety signs as quickly as possible with the fewest moves.</p>
        <div className="flex items-center justify-center gap-2 text-amber-500 font-semibold">
          <Zap className="h-4 w-4" /> Up to 100 XP per game
        </div>
        <button onClick={initGame} className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-105">
          Start Training
        </button>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-in">
        <div className="mx-auto text-6xl">🧠</div>
        <h2 className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-outfit)' }}>Memory Mastered!</h2>
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-extrabold text-foreground">{moves}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Moves</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-amber-500">+{xpEarned}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">XP Earned</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={initGame} className="flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 font-semibold hover:bg-accent">
            <RotateCcw className="h-4 w-4" /> Try Again
          </button>
          <Link href="/dashboard/games" className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-3 font-semibold text-white shadow-lg">
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/games" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Quit
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold bg-accent rounded-full px-4 py-1.5">
            Moves: <span className="text-primary">{moves}</span>
          </div>
          <div className="text-sm font-bold bg-accent rounded-full px-4 py-1.5">
            Matches: <span className="text-green-500">{matches}/{SIGNS.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className={`aspect-square rounded-2xl transition-all duration-300 transform preserve-3d ${
              card.isFlipped || card.isMatched ? 'rotate-y-180' : ''
            } ${card.isMatched ? 'opacity-60 grayscale-[0.5]' : ''}`}
          >
            <div className="relative w-full h-full duration-300 transition-all preserve-3d">
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-accent to-accent/50 rounded-2xl flex items-center justify-center border border-border/50 shadow-sm hover:border-blue-500/50 hover:bg-accent/80 transition-colors">
                <Brain className="h-8 w-8 text-muted-foreground/30" />
              </div>
              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-gray-800 rounded-2xl flex flex-col items-center justify-center border-2 border-blue-500 shadow-lg text-blue-500">
                <card.icon className="h-8 w-8 mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-tighter text-center px-1">{card.label}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      <p className="text-center text-xs text-muted-foreground">Match all signs to earn XP and level up!</p>
    </div>
  );
}
