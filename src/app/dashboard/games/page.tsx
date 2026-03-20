import Link from 'next/link';
import { Gamepad2, Target, Eye, Timer, PersonStanding, ArrowRight, Zap, Brain, Car, Radar, TrafficCone } from 'lucide-react';

const games = [
  {
    id: 'roadsafety',
    title: 'Road Safety Simulator',
    description: 'Full 3D open-world city driving with traffic lights, parking, and random map generation. Multiplayer enabled!',
    icon: Car,
    color: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/25',
    xp: 'Up to 50 XP',
    difficulty: 'Hard',
    emoji: '🚗',
    badges: ['3D', 'Multiplayer', 'Random Maps'],
  },
  {
    id: 'parking',
    title: 'Parking Master 3D',
    description: 'Precision parking in randomly generated lots. Park in the green spot without damaging your car!',
    icon: Car,
    color: 'from-indigo-500 to-purple-600',
    shadow: 'shadow-indigo-500/25',
    xp: 'Up to 60 XP',
    difficulty: 'Medium - Hard',
    emoji: '🅿️',
    badges: ['3D', 'Multiplayer', 'Random Maps'],
  },
  {
    id: 'crossing',
    title: 'Road Crossing 3D',
    description: 'Cross busy 3D lanes of traffic safely! Frogger-style gameplay with increasing difficulty.',
    icon: PersonStanding,
    color: 'from-green-500 to-emerald-600',
    shadow: 'shadow-green-500/25',
    xp: '20 XP per crossing',
    difficulty: 'Medium',
    emoji: '🚶',
    badges: ['3D', 'Multiplayer'],
  },
  {
    id: 'highway-racer',
    title: 'Highway Racer 3D',
    description: 'Dodge oncoming traffic on a fast 3-lane highway! Lane-switching survival at its finest.',
    icon: Radar,
    color: 'from-red-500 to-orange-600',
    shadow: 'shadow-red-500/25',
    xp: '+5 XP / 2 sec',
    difficulty: 'Hard',
    emoji: '🏎️',
    badges: ['3D', 'Multiplayer'],
  },
  {
    id: 'traffic-controller',
    title: 'Traffic Controller 3D',
    description: 'Manage traffic lights at a busy 3D intersection. Keep the flow moving without causing crashes!',
    icon: TrafficCone,
    color: 'from-yellow-500 to-red-600',
    shadow: 'shadow-yellow-500/25',
    xp: '10 XP per safe pass',
    difficulty: 'Medium',
    emoji: '🚦',
    badges: ['3D'],
  },
  {
    id: 'speed-trap',
    title: 'Speed Trap 3D',
    description: 'Drive through speed-limit zones at the correct speed. Obey every sign or face XP penalties!',
    icon: Radar,
    color: 'from-blue-500 to-cyan-600',
    shadow: 'shadow-blue-500/25',
    xp: '15 XP per zone',
    difficulty: 'Medium',
    emoji: '🚗',
    badges: ['3D', 'Multiplayer'],
  },
  {
    id: 'quiz',
    title: 'Traffic Sign Quiz',
    description: 'Test your knowledge of traffic signs. Answer questions from real quizzes and earn XP!',
    icon: Target,
    color: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-500/25',
    xp: '10 XP per correct answer',
    difficulty: 'Easy - Medium',
    emoji: '🚦',
    badges: [],
  },
  {
    id: 'spot-danger',
    title: 'Spot the Danger',
    description: 'Identify unsafe behaviors in road scenes. Click on the hazards before time runs out!',
    icon: Eye,
    color: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/25',
    xp: '25 XP per game',
    difficulty: 'Medium',
    emoji: '⚠️',
    badges: [],
  },
  {
    id: 'reaction',
    title: 'Reaction Time',
    description: 'Test your reflexes with a traffic light reaction game. How fast can you stop?',
    icon: Timer,
    color: 'from-rose-500 to-pink-600',
    shadow: 'shadow-rose-500/25',
    xp: 'Up to 30 XP',
    difficulty: 'Easy',
    emoji: '🚥',
    badges: [],
  },
  {
    id: 'memory',
    title: 'Sign Match Training',
    description: 'Train your memory by matching road safety signs. Fast reflexes earn more XP!',
    icon: Brain,
    color: 'from-blue-500 to-cyan-600',
    shadow: 'shadow-blue-500/25',
    xp: 'Up to 100 XP',
    difficulty: 'Medium',
    emoji: '🧠',
    badges: [],
  },
];

export default function GamesPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-outfit)' }}>
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Game Arena</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Master road safety through 3D simulations, quizzes, and reflex challenges</p>
      </div>

      {/* Games Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/dashboard/games/${game.id}`}
            className="group relative rounded-2xl border border-border/50 bg-card overflow-hidden card-hover"
          >
            {/* Top gradient */}
            <div className={`h-24 bg-gradient-to-br ${game.color} flex items-center justify-center relative overflow-hidden`}>
              <div className="absolute inset-0 bg-black/10" />
              <span className="text-5xl relative z-10 transition-transform group-hover:scale-125">{game.emoji}</span>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{game.title}</h3>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${game.color} ${game.shadow} shadow-lg transition-transform group-hover:scale-110`}>
                  <game.icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{game.description}</p>

              {/* Badges */}
              {game.badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {game.badges.map(badge => (
                    <span key={badge} className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      badge === '3D' ? 'bg-purple-500/15 text-purple-500 dark:text-purple-400' :
                      badge === 'Multiplayer' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                      'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    }`}>{badge}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Zap className="h-3 w-3" />
                  {game.xp}
                </span>
                <span className="text-xs text-muted-foreground">{game.difficulty}</span>
              </div>

              <div className="flex items-center gap-1 text-sm font-medium text-primary">
                Play Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
