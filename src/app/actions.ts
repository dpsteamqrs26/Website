'use server';

import { db } from '../../database/db';
import { users, quizzes, questions, attempts, courses, lessons, userLessonProgress, userCourseProgress, correctAnswers, admins, games } from '../../database/schema';
import { eq, desc, asc, sql, and, count } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';

// ─── User Data ───
export async function getUserData() {
  const clerk = await currentUser();
  if (!clerk) return null;

  const result = await db.select().from(users).where(eq(users.clerkId, clerk.id)).limit(1);
  
  if (result.length === 0) {
    // User exists in Clerk but not in our DB yet - return defaults
    return {
      clerkId: clerk.id,
      xp: 0,
      currentLevel: 'RED',
      streak: 0,
      name: clerk.firstName || clerk.username || 'Learner',
      imageUrl: clerk.imageUrl,
    };
  }

  return {
    ...result[0],
    name: clerk.firstName || clerk.username || 'Learner',
    imageUrl: clerk.imageUrl,
  };
}

// ─── Leaderboard ───
export async function getLeaderboard(limit = 50) {
  const result = await db
    .select({
      clerkId: users.clerkId,
      xp: users.xp,
      currentLevel: users.currentLevel,
      streak: users.streak,
    })
    .from(users)
    .orderBy(desc(users.xp))
    .limit(limit);

  return result;
}

// ─── Courses ───
export async function getCourses() {
  const result = await db
    .select()
    .from(courses)
    .where(eq(courses.isActive, true))
    .orderBy(asc(courses.order));

  return result;
}

export async function getCourseWithLessons(courseId: number) {
  const courseResult = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (courseResult.length === 0) return null;

  const lessonResult = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.order));

  return {
    course: courseResult[0],
    lessons: lessonResult,
  };
}

export async function getLesson(lessonId: number) {
  const result = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── User Progress ───
export async function getUserCourseProgress() {
  const clerk = await currentUser();
  if (!clerk) return [];

  const result = await db
    .select()
    .from(userCourseProgress)
    .where(eq(userCourseProgress.clerkId, clerk.id));

  return result;
}

export async function getUserLessonProgressForCourse(courseId: number) {
  const clerk = await currentUser();
  if (!clerk) return [];

  const result = await db
    .select()
    .from(userLessonProgress)
    .where(
      and(
        eq(userLessonProgress.clerkId, clerk.id),
        eq(userLessonProgress.courseId, courseId)
      )
    );

  return result;
}

export async function markLessonComplete(lessonId: number, courseId: number, xpReward: number) {
  const clerk = await currentUser();
  if (!clerk) return { success: false, error: 'Not authenticated' };

  // Check if already completed
  const existing = await db
    .select()
    .from(userLessonProgress)
    .where(
      and(
        eq(userLessonProgress.clerkId, clerk.id),
        eq(userLessonProgress.lessonId, lessonId)
      )
    );

  if (existing.length > 0) {
    return { success: true, alreadyCompleted: true };
  }

  // Mark lesson complete
  await db.insert(userLessonProgress).values({
    clerkId: clerk.id,
    lessonId,
    courseId,
    xpEarned: xpReward,
  });

  // Update user XP
  const userResult = await db.select().from(users).where(eq(users.clerkId, clerk.id)).limit(1);
  if (userResult.length > 0) {
    const newXp = (userResult[0].xp || 0) + xpReward;
    let newLevel = 'RED';
    if (newXp >= 1500) newLevel = 'GREEN';
    else if (newXp >= 500) newLevel = 'YELLOW';

    await db
      .update(users)
      .set({ xp: newXp, currentLevel: newLevel })
      .where(eq(users.clerkId, clerk.id));
  }

  // Update course progress
  const courseProgressResult = await db
    .select()
    .from(userCourseProgress)
    .where(
      and(
        eq(userCourseProgress.clerkId, clerk.id),
        eq(userCourseProgress.courseId, courseId)
      )
    );

  const totalLessonsResult = await db
    .select({ count: count() })
    .from(lessons)
    .where(eq(lessons.courseId, courseId));

  const totalLessons = totalLessonsResult[0]?.count || 0;

  const completedLessonsResult = await db
    .select({ count: count() })
    .from(userLessonProgress)
    .where(
      and(
        eq(userLessonProgress.clerkId, clerk.id),
        eq(userLessonProgress.courseId, courseId)
      )
    );

  const completedLessons = completedLessonsResult[0]?.count || 0;

  if (courseProgressResult.length === 0) {
    await db.insert(userCourseProgress).values({
      clerkId: clerk.id,
      courseId,
      completedLessons,
      totalLessons,
      isCompleted: completedLessons >= totalLessons,
    });
  } else {
    await db
      .update(userCourseProgress)
      .set({
        completedLessons,
        totalLessons,
        isCompleted: completedLessons >= totalLessons,
        completedAt: completedLessons >= totalLessons ? new Date() : null,
      })
      .where(
        and(
          eq(userCourseProgress.clerkId, clerk.id),
          eq(userCourseProgress.courseId, courseId)
        )
      );
  }

  return { success: true, xpEarned: xpReward };
}

// ─── Quizzes ───
export async function getQuizzes() {
  const result = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.isActive, true))
    .orderBy(desc(quizzes.createdAt));

  return result;
}

export async function getQuizWithQuestions(quizId: string) {
  const quizResult = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  if (quizResult.length === 0) return null;

  const questionResult = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(asc(questions.order));

  return {
    quiz: quizResult[0],
    questions: questionResult,
  };
}

export async function submitQuizAttempt(
  quizId: string,
  answers: Record<string, string>,
  score: number,
  totalQuestions: number,
  startedAt: Date
) {
  const clerk = await currentUser();
  if (!clerk) return { success: false, error: 'Not authenticated' };

  const attemptResult = await db.insert(attempts).values({
    quizId,
    userId: clerk.id,
    userEmail: clerk.emailAddresses[0]?.emailAddress || '',
    userName: clerk.firstName || clerk.username || 'User',
    answers,
    score,
    totalQuestions,
    startedAt,
  }).returning();

  // Record correct answers
  const questionList = await db.select().from(questions).where(eq(questions.quizId, quizId));
  for (const q of questionList) {
    const selectedOption = answers[q.id];
    if (selectedOption === q.correctOptionId) {
      await db.insert(correctAnswers).values({
        attemptId: attemptResult[0].id,
        quizId,
        questionId: q.id,
        userId: clerk.id,
        userEmail: clerk.emailAddresses[0]?.emailAddress || '',
        userName: clerk.firstName || clerk.username || 'User',
        selectedOptionId: selectedOption,
        correctOptionId: q.correctOptionId,
      });
    }
  }

  // Award XP based on score (10 XP per correct answer)
  const xpEarned = score * 10;
  const userResult = await db.select().from(users).where(eq(users.clerkId, clerk.id)).limit(1);
  if (userResult.length > 0) {
    const newXp = (userResult[0].xp || 0) + xpEarned;
    let newLevel = 'RED';
    if (newXp >= 1500) newLevel = 'GREEN';
    else if (newXp >= 500) newLevel = 'YELLOW';

    await db
      .update(users)
      .set({
        xp: newXp,
        currentLevel: newLevel,
        lastQuizAttempt: new Date(),
        streak: (userResult[0].streak || 0) + 1,
      })
      .where(eq(users.clerkId, clerk.id));
  }

  return { success: true, xpEarned, score, totalQuestions };
}

// ─── User Stats ───
export async function getUserStats() {
  const clerk = await currentUser();
  if (!clerk) return null;

  const userData = await db.select().from(users).where(eq(users.clerkId, clerk.id)).limit(1);

  const quizAttemptsResult = await db
    .select({ count: count() })
    .from(attempts)
    .where(eq(attempts.userId, clerk.id));

  const completedCoursesResult = await db
    .select({ count: count() })
    .from(userCourseProgress)
    .where(
      and(
        eq(userCourseProgress.clerkId, clerk.id),
        eq(userCourseProgress.isCompleted, true)
      )
    );

  const recentAttempts = await db
    .select()
    .from(attempts)
    .where(eq(attempts.userId, clerk.id))
    .orderBy(desc(attempts.completedAt))
    .limit(5);

  // Calculate quiz points (total score from all attempts)
  const quizPointsResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${attempts.score}), 0)` })
    .from(attempts)
    .where(eq(attempts.userId, clerk.id));

  // Get user rank
  const allUsers = await db.select({ clerkId: users.clerkId, xp: users.xp }).from(users).orderBy(desc(users.xp));
  const rank = allUsers.findIndex(u => u.clerkId === clerk.id) + 1;

  return {
    user: userData[0] || { xp: 0, currentLevel: 'RED', streak: 0 },
    quizAttempts: quizAttemptsResult[0]?.count || 0,
    completedCourses: completedCoursesResult[0]?.count || 0,
    recentAttempts,
    quizPoints: quizPointsResult[0]?.total || 0,
    rank: rank || 0,
    totalUsers: allUsers.length,
  };
}
// ─── Games ───
export async function getGames() {
  const result = await db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .orderBy(asc(games.id));

  return result;
}

export async function addGameXP(amount: number) {
  const clerk = await currentUser();
  if (!clerk) return { success: false, error: 'Not authenticated' };

  const userResult = await db.select().from(users).where(eq(users.clerkId, clerk.id)).limit(1);
  if (userResult.length === 0) return { success: false, error: 'User not found' };

  const newXp = (userResult[0].xp || 0) + amount;
  let newLevel = 'RED';
  if (newXp >= 1500) newLevel = 'GREEN';
  else if (newXp >= 500) newLevel = 'YELLOW';

  await db
    .update(users)
    .set({ xp: newXp, currentLevel: newLevel })
    .where(eq(users.clerkId, clerk.id));

  return { success: true, newXp, newLevel };
}

// ─── Admin Check ───
export async function isAdmin() {
  const clerk = await currentUser();
  if (!clerk) return false;

  const email = clerk.emailAddresses[0]?.emailAddress;
  if (!email) return false;

  const result = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  return result.length > 0;
}

// ─── Admin Actions ───
export async function createCourse(data: {
  title: string;
  description: string;
  levelRequirement: "RED" | "YELLOW" | "GREEN";
  pointsAwarded: number;
  imageUrl?: string;
  order?: number;
}) {
  const admin = await isAdmin();
  if (!admin) return { success: false, error: 'Not authorized' };

  const clerk = await currentUser();
  if (!clerk) return { success: false, error: 'Not authenticated' };

  const newCourse = await db.insert(courses).values({
    ...data,
    createdBy: clerk.emailAddresses[0]?.emailAddress || 'Admin',
    isActive: true,
  }).returning();

  return { success: true, course: newCourse[0] };
}
