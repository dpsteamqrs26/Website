'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, BookOpen, Star, Layout } from 'lucide-react';
import { createCourse } from '@/app/actions';

export default function CreateCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    levelRequirement: 'RED' as 'RED' | 'YELLOW' | 'GREEN',
    pointsAwarded: 50,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createCourse(formData);
      if (result.success) {
        router.push('/dashboard/learn');
        router.refresh();
      } else {
        setError(result.error || 'Failed to create course');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/learn" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Learn
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create New Course</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border/50 bg-card p-8 shadow-sm">
        {error && (
          <div className="rounded-lg bg-red-500/10 p-4 text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Course Title
          </label>
          <input
            id="title"
            type="text"
            required
            placeholder="e.g. Basic Traffic Signs"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layout className="h-4 w-4" /> Description
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="What will students learn in this course?"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="level" className="text-sm font-semibold text-foreground">
              Level Requirement
            </label>
            <select
              id="level"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={formData.levelRequirement}
              onChange={(e) => setFormData({ ...formData, levelRequirement: e.target.value as any })}
            >
              <option value="RED">🔴 RED (Beginner)</option>
              <option value="YELLOW">🟡 YELLOW (Intermediate)</option>
              <option value="GREEN">🟢 GREEN (Advanced)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="points" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Star className="h-4 w-4" /> XP Awarded
            </label>
            <input
              id="points"
              type="number"
              required
              min={10}
              max={500}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={formData.pointsAwarded}
              onChange={(e) => setFormData({ ...formData, pointsAwarded: parseInt(e.target.value) })}
            />
          </div>
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
          Create Course
        </button>
      </form>
    </div>
  );
}
