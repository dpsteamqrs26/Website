'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getQuizzes, getQuizWithQuestions, submitQuizAttempt } from '../../../actions';
import { ArrowLeft, Target, CheckCircle2, XCircle, Timer, Zap, Loader2, RotateCcw } from 'lucide-react';

type QuizQuestion = {
  id: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  order: number;
};

type GameState = 'loading' | 'select' | 'playing' | 'result';

export default function QuizGame() {
  const [state, setState] = useState<GameState>('loading');
  const [quizList, setQuizList] = useState<any[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    (async () => {
      const result = await getQuizzes();
      setQuizList(result);
      setState('select');
    })();
  }, []);

  const selectQuiz = async (quizId: string) => {
    setState('loading');
    const data = await getQuizWithQuestions(quizId);
    if (data) {
      setCurrentQuiz(data.quiz);
      setQuestions(data.questions as QuizQuestion[]);
      setCurrentIndex(0);
      setAnswers({});
      setScore(0);
      setState('playing');
    }
  };

  const handleAnswer = (optionId: string) => {
    if (showAnswer) return;
    setSelectedOption(optionId);
    setShowAnswer(true);

    const q = questions[currentIndex];
    const newAnswers = { ...answers, [q.id]: optionId };
    setAnswers(newAnswers);

    if (optionId === q.correctOptionId) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setShowAnswer(false);
      } else {
        finishQuiz(newAnswers);
      }
    }, 1500);
  };

  const finishQuiz = async (finalAnswers: Record<string, string>) => {
    setSubmitting(true);
    const finalScore = Object.entries(finalAnswers).reduce((s, [qId, optId]) => {
      const q = questions.find(q => q.id === qId);
      return s + (q && optId === q.correctOptionId ? 1 : 0);
    }, 0);
    setScore(finalScore);

    try {
      const result = await submitQuizAttempt(
        currentQuiz.id,
        finalAnswers,
        finalScore,
        questions.length,
        startTime
      );
      setXpEarned(result.xpEarned || 0);
    } catch {
      setXpEarned(finalScore * 10);
    }

    setState('result');
    setSubmitting(false);
  };

  const restart = () => {
    setState('select');
    setCurrentQuiz(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setScore(0);
    setSelectedOption(null);
    setShowAnswer(false);
  };

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === 'select') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Link href="/dashboard/games" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ fontFamily: 'var(--font-outfit)' }}>
            🚦 Traffic Sign Quiz
          </h1>
          <p className="text-muted-foreground">Select a quiz to test your knowledge</p>
        </div>

        {quizList.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-12 text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-bold mb-2">No Quizzes Available</h3>
            <p className="text-sm text-muted-foreground">Quizzes will appear here once admins create them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quizList.map((quiz) => (
              <button
                key={quiz.id}
                onClick={() => selectQuiz(quiz.id)}
                className="w-full text-left group flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all card-hover"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20 text-white text-xl">
                  📝
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{quiz.title}</p>
                  <p className="text-sm text-muted-foreground">{quiz.description || 'Test your road safety knowledge'}</p>
                  <p className="text-xs text-muted-foreground mt-1">⏱️ {quiz.durationMinutes} min</p>
                </div>
                <Zap className="h-5 w-5 text-amber-500" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (state === 'result') {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-md mx-auto text-center space-y-6 animate-fade-in py-12">
        <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-4xl ${percentage >= 70 ? 'bg-green-100 dark:bg-green-950/30' : percentage >= 40 ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-red-100 dark:bg-red-950/30'}`}>
          {percentage >= 70 ? '🏆' : percentage >= 40 ? '📚' : '💪'}
        </div>
        <h2 className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-outfit)' }}>
          {percentage >= 70 ? 'Great Job!' : percentage >= 40 ? 'Good Try!' : 'Keep Practicing!'}
        </h2>
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <div className="text-5xl font-extrabold" style={{ fontFamily: 'var(--font-outfit)' }}>
            {score}/{questions.length}
          </div>
          <p className="text-muted-foreground">Correct Answers</p>
          <div className="xp-bar-bg h-3">
            <div className={`h-full rounded-full animate-progress-fill ${percentage >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} style={{ width: `${percentage}%` }} />
          </div>
          <div className="flex items-center justify-center gap-2 text-amber-500 font-bold text-lg">
            <Zap className="h-5 w-5" />
            +{xpEarned} XP Earned
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={restart} className="flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 font-semibold transition-all hover:bg-accent">
            <RotateCcw className="h-4 w-4" /> Try Another Quiz
          </button>
          <Link href="/dashboard/games" className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 font-semibold text-white shadow-lg">
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  // Playing state
  const q = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="text-sm font-bold text-primary">{score} correct</span>
      </div>
      <div className="xp-bar-bg h-2">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-border/50 bg-card p-8">
        <h2 className="text-xl font-bold mb-6">{q.questionText}</h2>

        <div className="space-y-3">
          {(q.options as { id: string; text: string }[]).map((option) => {
            const isSelected = selectedOption === option.id;
            const isCorrect = option.id === q.correctOptionId;
            let classes = 'w-full text-left rounded-xl border p-4 transition-all font-medium';

            if (showAnswer) {
              if (isCorrect) {
                classes += ' border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400';
              } else if (isSelected && !isCorrect) {
                classes += ' border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400';
              } else {
                classes += ' border-border/50 opacity-50';
              }
            } else {
              classes += ' border-border/50 hover:border-primary hover:bg-accent cursor-pointer';
            }

            return (
              <button key={option.id} className={classes} onClick={() => handleAnswer(option.id)} disabled={showAnswer}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${showAnswer && isCorrect ? 'bg-green-500 text-white' : showAnswer && isSelected ? 'bg-red-500 text-white' : 'bg-accent text-muted-foreground'}`}>
                    {showAnswer && isCorrect ? <CheckCircle2 className="h-4 w-4" /> : showAnswer && isSelected ? <XCircle className="h-4 w-4" /> : option.id.toUpperCase()}
                  </div>
                  <span>{option.text}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
