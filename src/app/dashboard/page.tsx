import Link from 'next/link';
import { getUserData, getUserStats, getLeaderboard, getCourses, getUserCourseProgress } from '../actions';
import {
  Zap, Flame, Trophy, BookOpen, Gamepad2, Award, Star,
  ArrowRight, TrendingUp, Target, Crown, Medal, ChevronRight
} from 'lucide-react';

function LevelBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; label: string; emoji: string }> = {
    RED: { bg: 'level-red', label: 'Beginner', emoji: '🔴' },
    YELLOW: { bg: 'level-yellow', label: 'Intermediate', emoji: '🟡' },
    GREEN: { bg: 'level-green', label: 'Expert', emoji: '🟢' },
  };
  const c = config[level] || config.RED;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${c.bg}`}>
      {c.emoji} {c.label}
    </span>
  );
}

function XPProgressBar({ xp }: { xp: number }) {
  const levels = [
    { name: 'RED', min: 0, max: 499, color: 'from-red-500 to-rose-500' },
    { name: 'YELLOW', min: 500, max: 1499, color: 'from-amber-400 to-yellow-500' },
    { name: 'GREEN', min: 1500, max: 3000, color: 'from-green-500 to-emerald-500' },
  ];
  const current = levels.find(l => xp >= l.min && xp <= l.max) || levels[2];
  const progress = ((xp - current.min) / (current.max - current.min + 1)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-medium text-muted-foreground">Progress to next level</span>
        <span className="font-bold text-foreground">{xp} XP</span>
      </div>
      <div className="xp-bar-bg h-3">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${current.color} animate-progress-fill`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{current.min} XP</span>
        <span>{current.max + 1} XP</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const userData = await getUserData();
  const stats = await getUserStats();
  const leaderboard = await getLeaderboard(5);
  const courses = await getCourses();
  const courseProgress = await getUserCourseProgress();

  const xp = (userData as any)?.xp || 0;
  const level = (userData as any)?.currentLevel || 'RED';
  const streak = (userData as any)?.streak || 0;
  const name = (userData as any)?.name || 'Learner';
  const quizPoints = stats?.quizPoints || 0;
  const rank = stats?.rank || 0;
  const quizAttempts = stats?.quizAttempts || 0;
  const completedCourses = stats?.completedCourses || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-outfit)' }}>
            Welcome back, <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">{name}</span>! 👋
          </h1>
          <p className="mt-1 text-muted-foreground">Continue your road safety journey</p>
        </div>
        <LevelBadge level={level} />
      </div>

      {/* XP Progress */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
        <XPProgressBar xp={xp} />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        {[
          { icon: Zap, label: 'Total XP', value: xp.toLocaleString(), color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
          { icon: Target, label: 'Quiz Points', value: quizPoints.toLocaleString(), color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
          { icon: Flame, label: 'Streak', value: `${streak} 🔥`, color: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/20' },
          { icon: Crown, label: 'Rank', value: rank > 0 ? `#${rank}` : 'N/A', color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border/50 bg-card p-5 card-hover">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} ${stat.shadow} shadow-lg`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-outfit)' }}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: BookOpen, label: 'Quizzes Taken', value: quizAttempts },
          { icon: Award, label: 'Courses Completed', value: completedCourses },
          { icon: TrendingUp, label: 'Courses Available', value: courses.length },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column: Leaderboard + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leaderboard Preview */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Leaderboard
            </h2>
            <Link href="/dashboard/leaderboard" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No users on the leaderboard yet. Be the first!</p>
            ) : (
              leaderboard.map((user, i) => (
                <div key={user.clerkId} className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${user.clerkId === userData?.clerkId ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-accent/50'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white' : i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' : i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {user.clerkId === userData?.clerkId ? 'You' : `Player ${i + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{(user.xp || 0).toLocaleString()} XP</p>
                  </div>
                  <LevelBadge level={user.currentLevel || 'RED'} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
          {[
            { href: '/dashboard/learn', icon: BookOpen, title: 'Continue Learning', desc: 'Pick up where you left off', color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
            { href: '/dashboard/games', icon: Gamepad2, title: 'Play Games', desc: 'Test your knowledge with fun games', color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20' },
            { href: '/dashboard/leaderboard', icon: Trophy, title: 'View Leaderboard', desc: 'See how you rank', color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
            { href: '/dashboard/achievements', icon: Award, title: 'Achievements', desc: 'Check your earned badges', color: 'from-green-500 to-emerald-600', shadow: 'shadow-green-500/20' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all card-hover"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} ${action.shadow} shadow-lg transition-transform group-hover:scale-110`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{action.title}</p>
                <p className="text-sm text-muted-foreground">{action.desc}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Quiz Attempts */}
      {stats?.recentAttempts && stats.recentAttempts.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Recent Quiz Attempts
          </h2>
          <div className="space-y-3">
            {stats.recentAttempts.map((attempt) => (
              <div key={attempt.id} className="flex items-center justify-between rounded-xl bg-accent/30 p-4">
                <div>
                  <p className="font-medium text-sm">Quiz Attempt</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(attempt.completedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">
                    {attempt.score}/{attempt.totalQuestions}
                  </p>
                  <p className="text-xs text-green-500 font-medium">
                    +{attempt.score * 10} XP
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
