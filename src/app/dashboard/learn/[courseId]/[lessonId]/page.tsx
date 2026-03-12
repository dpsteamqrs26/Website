'use client';

import { useState } from 'react';
import Link from 'next/link';
import { markLessonComplete } from '../../../../actions';
import { ArrowLeft, CheckCircle2, Zap, Loader2 } from 'lucide-react';

export default function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  return <LessonContent paramsPromise={params} />;
}

function LessonContent({ paramsPromise }: { paramsPromise: Promise<{ courseId: string; lessonId: string }> }) {
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [courseId, setCourseId] = useState('');

  // Fetch lesson data on mount
  useState(() => {
    (async () => {
      const p = await paramsPromise;
      setCourseId(p.courseId);
      const res = await fetch(`/api/lesson?id=${p.lessonId}`);
      if (res.ok) {
        const data = await res.json();
        setLesson(data);
      }
      setLoading(false);
    })();
  });

  const handleComplete = async () => {
    if (!lesson || completing) return;
    setCompleting(true);
    try {
      const p = await paramsPromise;
      const result = await markLessonComplete(
        parseInt(p.lessonId),
        parseInt(p.courseId),
        lesson.xpReward || 25
      );
      if (result.success) {
        setCompleted(true);
        setXpEarned(result.xpEarned || lesson.xpReward || 25);
      }
    } catch {
      // handle error silently
    }
    setCompleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Link
          href={`/dashboard/learn/${courseId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>
        <div className="rounded-2xl border border-border/50 bg-card p-12 text-center">
          <p className="text-muted-foreground">Lesson not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <Link
        href={`/dashboard/learn/${courseId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Course
      </Link>

      <div className="rounded-2xl border border-border/50 bg-card p-8">
        <h1 className="text-2xl font-extrabold tracking-tight mb-2" style={{ fontFamily: 'var(--font-outfit)' }}>
          {lesson.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Zap className="h-4 w-4 text-amber-500" />
          <span>+{lesson.xpReward || 25} XP on completion</span>
        </div>

        {/* Lesson content */}
        <div className="prose prose-sm dark:prose-invert max-w-none mb-8">
          {lesson.content ? (
            <div dangerouslySetInnerHTML={{ __html: lesson.content.replace(/\n/g, '<br/>') }} />
          ) : (
            <p className="text-muted-foreground">This lesson has no content yet.</p>
          )}
        </div>

        {/* Complete button */}
        {completed ? (
          <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 animate-badge-unlock">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-bold text-green-700 dark:text-green-400">Lesson Complete! 🎉</p>
              <p className="text-sm text-green-600 dark:text-green-500">You earned +{xpEarned} XP</p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:shadow-green-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {completing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Mark as Complete
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
