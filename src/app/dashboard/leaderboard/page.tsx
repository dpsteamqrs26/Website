import { getLeaderboard, getUserData } from '../../actions';
import { Trophy, Crown, Medal, Award, Zap, Flame, Sparkles } from 'lucide-react';

function LevelBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    RED: { bg: 'level-red', label: '🔴 Beginner' },
    YELLOW: { bg: 'level-yellow', label: '🟡 Intermediate' },
    GREEN: { bg: 'level-green', label: '🟢 Expert' },
  };
  const c = config[level] || config.RED;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${c.bg}`}>
      {c.label}
    </span>
  );
}

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard(50);
  const userData = await getUserData();

  const userRank = leaderboard.findIndex(u => u.clerkId === userData?.clerkId) + 1;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-500 uppercase tracking-wider">
          <Sparkles className="h-3 w-3" /> Global Rankings
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-outfit)' }}>
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Leaderboard</span>
        </h1>
        <p className="mt-2 text-muted-foreground">See who&apos;s leading the road safety challenge</p>
      </div>

      {/* Your rank card */}
      {userData && userRank > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 card-hover-glow animate-fade-in-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-xl font-bold text-white shadow-lg shadow-green-500/25 animate-pulse-glow">
                #{userRank}
              </div>
              <div>
                <p className="font-bold text-lg">Your Rank</p>
                <p className="text-sm text-muted-foreground">
                  {(userData as any).xp?.toLocaleString() || 0} XP • <LevelBadge level={(userData as any).currentLevel || 'RED'} />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-amber-500">
              <Flame className="h-5 w-5" />
              <span className="font-bold">{(userData as any).streak || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-4 stagger-children">
          {/* Silver (2nd) */}
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-xl font-bold text-white shadow-lg mb-2 transition-transform hover:scale-110">
              2
            </div>
            <div className="rounded-xl bg-card border border-border/50 p-4 text-center w-28 card-hover">
              <Medal className="h-6 w-6 text-slate-400 mx-auto mb-1" />
              <p className="text-xs font-bold truncate">{leaderboard[1]?.name || 'Player 2'}</p>
              <p className="text-xs text-muted-foreground">{(leaderboard[1]?.xp || 0).toLocaleString()} XP</p>
            </div>
            <div className="h-20 w-28 rounded-t-xl bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 mt-1" />
          </div>

          {/* Gold (1st) */}
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-2xl font-bold text-white shadow-xl shadow-amber-500/30 mb-2 animate-pulse-glow transition-transform hover:scale-110">
              1
            </div>
            <div className="rounded-xl bg-card border border-amber-200 dark:border-amber-800 p-4 text-center w-32 card-hover">
              <Crown className="h-6 w-6 text-amber-500 mx-auto mb-1" />
              <p className="text-sm font-bold truncate">{leaderboard[0]?.name || 'Player 1'}</p>
              <p className="text-xs text-muted-foreground">{(leaderboard[0]?.xp || 0).toLocaleString()} XP</p>
              <LevelBadge level={leaderboard[0]?.currentLevel || 'RED'} />
            </div>
            <div className="h-28 w-32 rounded-t-xl bg-gradient-to-t from-amber-200 to-amber-100 dark:from-amber-900/50 dark:to-amber-800/30 mt-1" />
          </div>

          {/* Bronze (3rd) */}
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-lg font-bold text-white shadow-lg mb-2 transition-transform hover:scale-110">
              3
            </div>
            <div className="rounded-xl bg-card border border-border/50 p-4 text-center w-28 card-hover">
              <Award className="h-6 w-6 text-amber-700 mx-auto mb-1" />
              <p className="text-xs font-bold truncate">{leaderboard[2]?.name || 'Player 3'}</p>
              <p className="text-xs text-muted-foreground">{(leaderboard[2]?.xp || 0).toLocaleString()} XP</p>
            </div>
            <div className="h-14 w-28 rounded-t-xl bg-gradient-to-t from-amber-100 to-orange-50 dark:from-amber-950/50 dark:to-amber-900/30 mt-1" />
          </div>
        </div>
      )}

      {/* Full Ranking List */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
        <div className="grid grid-cols-[60px_1fr_100px_100px] gap-2 px-4 py-3 bg-accent/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">XP</span>
          <span className="text-right">Level</span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-8 text-center">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No users yet. Be the first to earn XP!</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {leaderboard.map((user, i) => {
              const isYou = user.clerkId === userData?.clerkId;
              return (
                <div
                  key={user.clerkId}
                  className={`grid grid-cols-[60px_1fr_100px_100px] gap-2 items-center px-4 py-3 transition-all duration-200 ${isYou ? 'bg-primary/5 font-semibold border-l-2 border-primary' : 'hover:bg-accent/30'}`}
                >
                  <div className="flex items-center">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm shadow-amber-500/30' :
                      i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                      i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {i + 1}
                    </span>
                  </div>
                  <span className="text-sm truncate">
                    {isYou ? '⭐ You' : (user.name || `Player ${i + 1}`)}
                  </span>
                  <span className="text-sm text-right flex items-center justify-end gap-1">
                    <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    {(user.xp || 0).toLocaleString()}
                  </span>
                  <span className="text-right">
                    <LevelBadge level={user.currentLevel || 'RED'} />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
