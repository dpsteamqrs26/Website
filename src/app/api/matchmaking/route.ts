import { NextResponse } from 'next/server';

declare global {
  // Use var so it persists across hot reloads in dev
  var matchmakingRooms: Record<string, { hostId: string; game: string; clientCount: number; lastPing: number }>;
}

if (!global.matchmakingRooms) {
  global.matchmakingRooms = {};
}

export async function POST(req: Request) {
  try {
    const { action, game, peerId } = await req.json();
    const now = Date.now();

    // 1. Clean up stale rooms (no ping for 15s)
    for (const [key, room] of Object.entries(global.matchmakingRooms)) {
      if (now - room.lastPing > 15000) {
        delete global.matchmakingRooms[key];
      }
    }

    // 2. Client is looking for an available room
    if (action === 'FIND_ROOM') {
      for (const [hostId, room] of Object.entries(global.matchmakingRooms)) {
        if (room.game === game && room.clientCount < 1 && hostId !== peerId) {
          room.clientCount = 1; // Mark as taken
          room.lastPing = now;
          return NextResponse.json({ hostId });
        }
      }
      return NextResponse.json({ hostId: null });
    }

    // 3. User decided to host a room
    if (action === 'HOST_REGISTER') {
      global.matchmakingRooms[peerId] = {
        hostId: peerId,
        game,
        clientCount: 0,
        lastPing: now,
      };
      return NextResponse.json({ success: true });
    }

    // 4. Ping to keep room alive
    if (action === 'PING') {
      if (global.matchmakingRooms[peerId]) {
        global.matchmakingRooms[peerId].lastPing = now;
      }
      return NextResponse.json({ success: true });
    }

    // 5. Host leaves manually
    if (action === 'LEAVE') {
      delete global.matchmakingRooms[peerId];
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
