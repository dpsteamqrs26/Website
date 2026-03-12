import Link from 'next/link';
import { getQuizzes } from '@/app/actions';
import { ClipboardList, ChevronRight, Clock, User, Calendar, Target } from 'lucide-react';

export default async function QuizzesPage() {
  const quizzes = await getQuizzes();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-outfit)' }}>
          <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Quizzes</span> & Assessments
        </h1>
        <p className="mt-2 text-muted-foreground">Challenge yourself and earn extra XP by completing road safety quizzes</p>
      </div>

      {quizzes.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card p-12 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-bold mb-2">No Quizzes Available</h3>
          <p className="text-sm text-muted-foreground">Stay tuned! Our team is preparing new assessments for you.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 stagger-children">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/dashboard/games/quiz?quizId=${quiz.id}`}
              className="group relative rounded-2xl border border-border/50 bg-card p-6 card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-110">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Target className="h-3.5 w-3.5" />
                  +10 XP / Answer
                </div>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{quiz.title}</h3>
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{quiz.description || 'Test your knowledge with this interactive assessment.'}</p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {quiz.durationMinutes} Minutes
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(quiz.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-1 text-sm font-bold text-emerald-500 group-hover:gap-2 transition-all">
                Start Quiz
                <ChevronRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
