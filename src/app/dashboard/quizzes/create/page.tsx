'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, ClipboardList, Clock, Plus, Trash2 } from 'lucide-react';
import { createQuiz } from '@/app/actions';

interface Question {
  id: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  timeLimitSeconds: number;
  order: number;
}

export default function CreateQuizPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationMinutes: 10,
  });

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      questionText: '',
      options: [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
      ],
      correctOptionId: 'a',
      timeLimitSeconds: 30,
      order: 1,
    },
  ]);

  const addQuestion = () => {
    const newId = (questions.length + 1).toString();
    setQuestions([
      ...questions,
      {
        id: newId,
        questionText: '',
        options: [
          { id: 'a', text: '' },
          { id: 'b', text: '' },
          { id: 'c', text: '' },
          { id: 'd', text: '' },
        ],
        correctOptionId: 'a',
        timeLimitSeconds: 30,
        order: questions.length + 1,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (
    index: number,
    field: keyof Question,
    value: string | number | { id: string; text: string }[] // possible types for Question fields
  ) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex].text = text;
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    const nextId = String.fromCharCode(97 + updated[qIndex].options.length); // a, b, c, d, e...
    updated[qIndex].options.push({ id: nextId, text: '' });
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length > 2) {
      updated[qIndex].options.splice(oIndex, 1);
      // If removing the correct option, reset to first option
      if (updated[qIndex].correctOptionId === updated[qIndex].options[oIndex]?.id) {
        updated[qIndex].correctOptionId = updated[qIndex].options[0]?.id || 'a';
      }
      setQuestions(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Quiz title is required');
      setLoading(false);
      return;
    }

    if (questions.length === 0) {
      setError('At least one question is required');
      setLoading(false);
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setError(`Question ${i + 1} text is required`);
        setLoading(false);
        return;
      }
      if (q.options.length < 2) {
        setError(`Question ${i + 1} must have at least 2 options`);
        setLoading(false);
        return;
      }
      const validOptions = q.options.filter(o => o.text.trim());
      if (validOptions.length < 2) {
        setError(`Question ${i + 1} must have at least 2 options with text`);
        setLoading(false);
        return;
      }
      if (!q.correctOptionId || !q.options.find(o => o.id === q.correctOptionId)?.text.trim()) {
        setError(`Question ${i + 1} must have a valid correct answer`);
        setLoading(false);
        return;
      }
    }

    try {
      const result = await createQuiz({
        ...formData,
        questions: questions.map((q, index) => ({
          ...q,
          order: index + 1,
          options: q.options.filter(o => o.text.trim()), // Remove empty options
        })),
      });

      if (result.success) {
        router.push('/dashboard/quizzes');
        router.refresh();
      } else {
        setError(result.error || 'Failed to create quiz');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/quizzes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Quizzes
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create New Quiz</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="rounded-lg bg-red-500/10 p-4 text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Quiz Details */}
        <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-sm space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Quiz Details
          </h2>

          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Quiz Title
            </label>
            <input
              id="title"
              type="text"
              required
              placeholder="e.g. Road Safety Basics Quiz"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-semibold text-foreground">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Brief description of the quiz..."
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="duration" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              required
              min={1}
              max={120}
              className="w-full max-w-xs rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Questions ({questions.length})</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-500/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </button>
          </div>

          {questions.map((question, qIndex) => (
            <div key={question.id} className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Question {qIndex + 1}</h3>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Question Text</label>
                <textarea
                  rows={2}
                  placeholder="Enter your question..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={question.questionText}
                  onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">Answer Options</label>
                  <button
                    type="button"
                    onClick={() => addOption(qIndex)}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-3 w-3" />
                    Add Option
                  </button>
                </div>

                {question.options.map((option, oIndex) => (
                  <div key={option.id} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={question.correctOptionId === option.id}
                      onChange={() => updateQuestion(qIndex, 'correctOptionId', option.id)}
                      className="text-blue-600"
                    />
                    <span className="text-sm font-medium text-muted-foreground w-6">{option.id.toUpperCase()}.</span>
                    <input
                      type="text"
                      placeholder={`Option ${option.id.toUpperCase()}`}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={option.text}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    />
                    {question.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(qIndex, oIndex)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Time Limit (seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  className="w-full max-w-xs rounded-xl border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={question.timeLimitSeconds}
                  onChange={(e) => updateQuestion(qIndex, 'timeLimitSeconds', parseInt(e.target.value) || 30)}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          Create Quiz
        </button>
      </form>
    </div>
  );
}