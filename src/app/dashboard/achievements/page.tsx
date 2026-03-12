import { getUserStats, getUserData, getUserCourseProgress } from '../../actions';
import { Award, Lock, CheckCircle2, Star, Trophy, Target, BookOpen, Gamepad2, Flame, Zap, Shield, Crown } from 'lucide-react';

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  shadow: string;
  condition: (stats: any) => boolean;
  progress: (stats: any) => { current: number; target: number };
};

const achievements: Achievement[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Earn your first XP points',
    icon: Zap,
    color: 'from-amber-400 to-orange-500',
    shadow: 'shadow-amber-500/25',
    condition: (s) => (s.user?.xp || 0) > 0,
    progress: (s) => ({ current: Math.min(s.user?.xp || 0, 1), target: 1 }),
  },
  {
    id: 'road-safety-beginner',
    title: 'Road Safety Beginner',
    description: 'Reach 100 XP',
    icon: Shield,
    color: 'from-green-500 to-emerald-600',
    shadow: 'shadow-green-500/25',
    condition: (s) => (s.user?.xp || 0) >= 100,
    progress: (s) => ({ current: Math.min(s.user?.xp || 0, 100), target: 100 }),
  },
  {
    id: 'quiz-taker',
    title: 'Quiz Taker',
    description: 'Complete your first quiz',
    icon: Target,
    color: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-500/25',
    condition: (s) => (s.quizAttempts || 0) >= 1,
    progress: (s) => ({ current: Math.min(s.quizAttempts || 0, 1), target: 1 }),
  },
  {
    id: 'quiz-champion',
    title: 'Quiz Champion',
    description: 'Complete 10 quizzes',
    icon: Trophy,
    color: 'from-purple-500 to-purple-600',
    shadow: 'shadow-purple-500/25',
    condition: (s) => (s.quizAttempts || 0) >= 10,
    progress: (s) => ({ current: Math.min(s.quizAttempts || 0, 10), target: 10 }),
  },
  {
    id: 'course-starter',
    title: 'Course Starter',
    description: 'Complete your first course',
    icon: BookOpen,
    color: 'from-cyan-500 to-teal-500',
    shadow: 'shadow-cyan-500/25',
    condition: (s) => (s.completedCourses || 0) >= 1,
    progress: (s) => ({ current: Math.min(s.completedCourses || 0, 1), target: 1 }),
  },
  {
    id: 'traffic-sign-master',
    title: 'Traffic Sign Master',
    description: 'Score 50+ quiz points',
    icon: Star,
    color: 'from-amber-500 to-yellow-500',
    shadow: 'shadow-amber-500/25',
    condition: (s) => (s.quizPoints || 0) >= 50,
    progress: (s) => ({ current: Math.min(s.quizPoints || 0, 50), target: 50 }),
  },
  {
    id: 'safe-pedestrian',
    title: 'Safe Pedestrian',
    description: 'Reach YELLOW level (500 XP)',
    icon: Award,
    color: 'from-yellow-400 to-amber-500',
    shadow: 'shadow-yellow-500/25',
    condition: (s) => (s.user?.xp || 0) >= 500,
    progress: (s) => ({ current: Math.min(s.user?.xp || 0, 500), target: 500 }),
  },
  {
    id: 'road-warrior',
    title: 'Road Warrior',
    description: 'Reach GREEN level (1500 XP)',
    icon: Crown,
    color: 'from-emerald-500 to-green-600',
    shadow: 'shadow-emerald-500/25',
    condition: (s) => (s.user?.xp || 0) >= 1500,
    progress: (s) => ({ current: Math.min(s.user?.xp || 0, 1500), target: 1500 }),
  },
  {
    id: 'streaker',
    title: 'On Fire!',
    description: 'Build a 5-day streak',
    icon: Flame,
    color: 'from-rose-500 to-pink-600',
    shadow: 'shadow-rose-500/25',
    condition: (s) => (s.user?.streak || 0) >= 5,
    progress: (s) => ({ current: Math.min(s.user?.streak || 0, 5), target: 5 }),
  },
  {
    id: 'top-10',
    title: 'Top 10',
    description: 'Reach top 10 on the leaderboard',
    icon: Trophy,
    color: 'from-indigo-500 to-violet-600',
    shadow: 'shadow-indigo-500/25',
    condition: (s) => (s.rank || 0) > 0 && (s.rank || 0) <= 10,
    progress: (s) => {
      const rank = s.rank || 999;
      return { current: rank <= 10 ? 1 : 0, target: 1 };
    },
  },
  {
    id: 'scholar',
    title: 'Road Scholar',
    description: 'Complete 5 courses',
    icon: BookOpen,
    color: 'from-teal-500 to-cyan-600',
    shadow: 'shadow-teal-500/25',
    condition: (s) => (s.completedCourses || 0) >= 5,
    progress: (s) => ({ current: Math.min(s.completedCourses || 0, 5), target: 5 }),
  },
  {
    id: 'gaming-pro',
    title: 'Gaming Pro',
    description: 'Score 100+ quiz points',
    icon: Gamepad2,
    color: 'from-pink-500 to-rose-600',
    shadow: 'shadow-pink-500/25',
    condition: (s) => (s.quizPoints || 0) >= 100,
    progress: (s) => ({ current: Math.min(s.quizPoints || 0, 100), target: 100 }),
  },
];

export default async function AchievementsPage() {
  const stats = await getUserStats();

  const earned = achievements.filter(a => a.condition(stats));
  const locked = achievements.filter(a => !a.condition(stats));

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-outfit)' }}>
          <span className="bg-gradient-to-r from-amber-500 to-purple-500 bg-clip-text text-transparent">Achievements</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Track your road safety milestones</p>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-3xl font-extrabold text-primary" style={{ fontFamily: 'var(--font-outfit)' }}>{earned.length}</p>
          <p className="text-sm text-muted-foreground">Earned</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-3xl font-extrabold text-muted-foreground" style={{ fontFamily: 'var(--font-outfit)' }}>{locked.length}</p>
          <p className="text-sm text-muted-foreground">Locked</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-outfit)' }}>{achievements.length}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Overall progress</span>
          <span className="font-bold">{Math.round((earned.length / achievements.length) * 100)}%</span>
        </div>
        <div className="xp-bar-bg h-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-purple-500 to-pink-500 animate-progress-fill"
            style={{ width: `${(earned.length / achievements.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Earned Badges */}
      {earned.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Earned ({earned.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {earned.map((achievement) => {
              const progress = achievement.progress(stats);
              return (
                <div
                  key={achievement.id}
                  className="rounded-2xl border border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/20 p-5 animate-badge-unlock"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${achievement.color} ${achievement.shadow} shadow-lg`}>
                      <achievement.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{achievement.title}</p>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed!
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {locked.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Locked ({locked.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {locked.map((achievement) => {
              const progress = achievement.progress(stats);
              const progressPct = (progress.current / progress.target) * 100;
              return (
                <div
                  key={achievement.id}
                  className="rounded-2xl border border-border/50 bg-card p-5 opacity-75"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Lock className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{achievement.title}</p>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{progress.current}/{progress.target}</span>
                          <span>{Math.round(progressPct)}%</span>
                        </div>
                        <div className="xp-bar-bg h-1.5">
                          <div
                            className="h-full rounded-full bg-muted-foreground/30"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
