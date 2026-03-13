import { db } from './db';
import { users } from './schema';

async function seedUsers() {
  const sampleUsers = [
    { clerkId: 'user1', xp: 2500, currentLevel: 'GREEN', streak: 5 },
    { clerkId: 'user2', xp: 1800, currentLevel: 'YELLOW', streak: 3 },
    { clerkId: 'user3', xp: 1200, currentLevel: 'YELLOW', streak: 2 },
    { clerkId: 'user4', xp: 800, currentLevel: 'RED', streak: 1 },
    { clerkId: 'user5', xp: 600, currentLevel: 'RED', streak: 0 },
    { clerkId: 'user6', xp: 400, currentLevel: 'RED', streak: 0 },
  ];

  for (const user of sampleUsers) {
    await db.insert(users).values(user).onConflictDoNothing();
  }

  console.log('Sample users inserted');
}

seedUsers().catch(console.error);