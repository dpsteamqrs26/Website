import { NextResponse } from 'next/server';

type Room = {
  id: string;          // e.g., 'parking-room1'
  game: string;        // e.g., 'parking'
  players: string[];   // [hostPeerId, guestPeerId]
  createdAt: number;
};

// Simple in-memory store for matchmaking.
// In a real production app (serverless), this would use Redis, 
// a database, or Ably. But since we need a 0-dependency native 
// Next.js solution without schema changes, this works for a single instance.
// Note: In development with HMR, this might reset occasionally, but it's 
// sufficient for the requested "works without API keys" requirement.
let rooms: Room[] = [];

// Clean up stale rooms older than 10 minutes
const cleanup = () => {
  const now = Date.now();
  rooms = rooms.filter(r => now - r.createdAt < 1000 * 60 * 10);
};

export async function POST(req: Request) {
  try {
    const { action, game, peerId, roomId } = await req.json();
    cleanup();

    if (action === 'host') {
      // Create a new room
      const newRoom: Room = {
        id: `${game}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        game,
        players: [peerId],
        createdAt: Date.now()
      };
      rooms.push(newRoom);
      return NextResponse.json({ success: true, room: newRoom });
    }

    if (action === 'join') {
      // Find an available room for this game that only has 1 player (the host)
      const availableRoom = rooms.find(r => r.game === game && r.players.length === 1);
      
      if (availableRoom) {
        availableRoom.players.push(peerId);
        return NextResponse.json({ success: true, room: availableRoom });
      } else {
        return NextResponse.json({ success: false, error: 'No available rooms found.' });
      }
    }

    if (action === 'leave') {
      // Find the room the player is in
      const roomIndex = rooms.findIndex(r => r.id === roomId);
      if (roomIndex !== -1) {
        rooms[roomIndex].players = rooms[roomIndex].players.filter(p => p !== peerId);
        // If room is empty, remove it
        if (rooms[roomIndex].players.length === 0) {
          rooms.splice(roomIndex, 1);
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' });

  } catch (error) {
    console.error('Matchmaking API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
