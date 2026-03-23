import Link from 'next/link';
import { Metadata } from 'next';
import { getCourses, getUserCourseProgress, isAdmin } from '../../actions';
import { BookOpen, ChevronRight, CheckCircle2, Lock, Star, Plus } from 'lucide-react';

export const metadata: Metadata = {
  title: "Learn Road Safety",
  description: "Master traffic rules and road safety through our interactive courses. Progress from beginner to expert and become a safer driver.",
  openGraph: {
    title: "Wayyat Learning Hub | Road Safety Courses",
    description: "Interactive road safety education designed to save lives and make you a better driver.",
  },
};

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
  const admin = await isAdmin();

  const progressMap = new Map(progress.map(p => [p.courseId, p]));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-outfit)' }}>
            <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">Learn</span> Road Safety
          </h1>
          <p className="mt-2 text-muted-foreground">Master traffic rules and road safety through interactive courses</p>
        </div>
        
        {admin && (
          <Link
            href="/dashboard/learn/create"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:shadow-blue-500/30"
          >
            <Plus className="h-4 w-4" />
            Create Course
          </Link>
        )}
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
