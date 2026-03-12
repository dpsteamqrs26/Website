import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../database/db';
import { lessons } from '../../../../database/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing lesson id' }, { status: 400 });
  }

  const result = await db.select().from(lessons).where(eq(lessons.id, parseInt(id))).limit(1);
  if (result.length === 0) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}
