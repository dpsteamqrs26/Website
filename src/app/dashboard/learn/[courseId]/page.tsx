import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCourseWithLessons, getUserLessonProgressForCourse } from '../../../actions';
import { BookOpen, CheckCircle2, Circle, ChevronRight, ArrowLeft, Star, Zap } from 'lucide-react';

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const id = parseInt(courseId);
  if (isNaN(id)) notFound();

  const data = await getCourseWithLessons(id);
  if (!data) notFound();

  const { course, lessons } = data;
  const completedLessons = await getUserLessonProgressForCourse(id);
  const completedSet = new Set(completedLessons.map(l => l.lessonId));

  const totalXP = lessons.reduce((sum, l) => sum + (l.xpReward || 0), 0);
  const earnedXP = completedLessons.reduce((sum, l) => sum + (l.xpEarned || 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Back link */}
      <Link
        href="/dashboard/learn"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Courses
      </Link>

      {/* Course Header */}
      <div className="rounded-2xl border border-border/50 bg-card p-8">
        <div className={`inline-block mb-4 h-1.5 w-20 rounded-full ${course.levelRequirement === 'GREEN' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : course.levelRequirement === 'YELLOW' ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`} />
        <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ fontFamily: 'var(--font-outfit)' }}>
          {course.title}
        </h1>
        <p className="text-muted-foreground mb-6">{course.description || 'Learn essential road safety concepts.'}</p>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2 text-sm">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <span className="font-medium">{lessons.length} Lessons</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2 text-sm">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="font-medium">{totalXP} Total XP</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2 text-sm">
            <Zap className="h-4 w-4 text-green-500" />
            <span className="font-medium">{earnedXP} XP Earned</span>
          </div>
        </div>

        {/* Overall progress */}
        {lessons.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Course Progress</span>
              <span className="font-bold">{completedSet.size}/{lessons.length} complete</span>
            </div>
            <div className="xp-bar-bg h-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 animate-progress-fill"
                style={{ width: `${(completedSet.size / lessons.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lessons List */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Lessons</h2>
        {lessons.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-muted-foreground">No lessons have been added to this course yet.</p>
          </div>
        ) : (
          lessons.map((lesson, i) => {
            const isCompleted = completedSet.has(lesson.id);
            return (
              <Link
                key={lesson.id}
                href={`/dashboard/learn/${courseId}/${lesson.id}`}
                className={`group flex items-center gap-4 rounded-xl border p-4 transition-all card-hover ${isCompleted ? 'border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-950/20' : 'border-border/50 bg-card'}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${isCompleted ? 'bg-green-500 text-white' : 'bg-accent text-muted-foreground'}`}>
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${isCompleted ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>{lesson.title}</p>
                  <p className="text-xs text-muted-foreground">+{lesson.xpReward || 0} XP</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
