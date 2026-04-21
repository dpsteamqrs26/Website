import { Metadata } from 'next';
import { getUserData, getUserStats, getCourses } from '../actions';
import DashboardClient from './dashboard-client';

export const metadata: Metadata = {
  title: "Dashboard | Wayyat",
  description: "Manage your road safety learning journey. Track your XP, view achievements, and access simulations and courses from your personalized dashboard.",
  openGraph: {
    title: "Dashboard | Wayyat",
    description: "Track your progress and master road safety in our immersive learning hub.",
  },
};

export default async function DashboardPage() {
  const userData = await getUserData();
  const stats = await getUserStats();
  const courses = await getCourses();

  const clientUserData = {
    xp: (userData as any)?.xp || 0,
    currentLevel: (userData as any)?.currentLevel || 'RED',
    streak: (userData as any)?.streak || 0,
    name: (userData as any)?.name || 'Learner',
  };

  const clientStats = {
    quizPoints: (stats as any)?.quizPoints || 0,
    rank: (stats as any)?.rank || 0,
    quizAttempts: (stats as any)?.quizAttempts || 0,
    completedCourses: (stats as any)?.completedCourses || 0,
    recentAttempts: (stats as any)?.recentAttempts || [],
  };

  return (
    <DashboardClient
      userData={clientUserData}
      stats={clientStats}
      coursesCount={courses.length}
    />
  );
}
