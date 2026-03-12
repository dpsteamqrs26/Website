import Link from 'next/link';
import { getCourses, getUserCourseProgress } from '../../actions';
import { BookOpen, ChevronRight, CheckCircle2, Lock, Star } from 'lucide-react';

function LevelTag({ level }: { level: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    RED: { bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800', label: '🔴 Beginner' },
    YELLOW: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800', label: '🟡 Intermediate' },
    GREEN: { bg: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800', label: '🟢 Expert' },
  };
  const c = config[level] || config.RED;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${c.bg}`}>
      {c.label}
    </span>
  );
}

export default async function LearnPage() {
  const courses = await getCourses();
  const progress = await getUserCourseProgress();

  const progressMap = new Map(progress.map(p => [p.courseId, p]));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-outfit)' }}>
          <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">Learn</span> Road Safety
        </h1>
        <p className="mt-2 text-muted-foreground">Master traffic rules and road safety through interactive courses</p>
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-bold mb-2">No Courses Available Yet</h3>
          <p className="text-sm text-muted-foreground">Courses will appear here once admins create them. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {courses.map((course) => {
            const cp = progressMap.get(course.id);
            const isCompleted = cp?.isCompleted;
            const completedLessons = cp?.completedLessons || 0;
            const totalLessons = cp?.totalLessons || 0;
            const progressPct = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

            return (
              <Link
                key={course.id}
                href={`/dashboard/learn/${course.id}`}
                className="group relative rounded-2xl border border-border/50 bg-card overflow-hidden card-hover"
              >
                {/* Top gradient accent */}
                <div className={`h-2 w-full ${course.levelRequirement === 'GREEN' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : course.levelRequirement === 'YELLOW' ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`} />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-110">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    {isCompleted && (
                      <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </div>
                    )}
                  </div>

                  <h3 className="mb-1 text-lg font-bold text-foreground group-hover:text-primary transition-colors">{course.title}</h3>
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{course.description || 'Learn essential road safety concepts.'}</p>

                  <div className="flex items-center gap-2 mb-3">
                    <LevelTag level={course.levelRequirement || 'RED'} />
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                      <Star className="h-3 w-3" />
                      +{course.pointsAwarded} XP
                    </span>
                  </div>

                  {/* Progress bar */}
                  {totalLessons > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{completedLessons}/{totalLessons} lessons</span>
                        <span>{Math.round(progressPct)}%</span>
                      </div>
                      <div className="xp-bar-bg h-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
