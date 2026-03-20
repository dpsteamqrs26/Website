import { useState, useEffect, useRef, useCallback } from 'react';

export type PlayerState = {
  id: string;
  name: string;
  x: number;
  z: number;
  angle: number;
  speed: number;
  color?: string;
  lastSeen?: number;
};

/**
 * useMultiplayer — Dynamic 2-player matchmaking via in-memory Next.js API route.
 *
 * Map sharing:
 *  - Host calls `setSharedData(data)` to store map/zones/obstacles.
 *  - When a client joins, host immediately sends `MAP_SYNC` with the shared data.
 *  - Client receives it via the `onMapSync` callback.
 */
export function useMultiplayer(
  gameName: string,
  playerName: string,
  onMapSync?: (data: any) => void,
) {
  const [remotePlayers, setRemotePlayers] = useState<PlayerState[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const clientsRef = useRef<any[]>([]);
  const playersRef = useRef<Record<string, PlayerState>>({});
  const activeRef = useRef(true);
  const broadcastRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingIntervRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sharedDataRef = useRef<any>(null);
  const onMapSyncRef = useRef(onMapSync);
  onMapSyncRef.current = onMapSync;

  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (broadcastRef.current) clearInterval(broadcastRef.current);
    if (pingIntervRef.current) clearInterval(pingIntervRef.current);
    
    if (isHost && peerRef.current?.id) {
      // Tell matchmaking we left
      fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LEAVE', game: gameName, peerId: peerRef.current.id }),
      }).catch(() => {});
    }

    if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
    peerRef.current = null;
    connRef.current = null;
    clientsRef.current = [];
    playersRef.current = {};
  }, [isHost, gameName]);

  const startHostBroadcast = useCallback(() => {
    if (broadcastRef.current) clearInterval(broadcastRef.current);
    broadcastRef.current = setInterval(() => {
      const now = Date.now();
      const map = { ...playersRef.current };
      let changed = false;
      for (const [id, s] of Object.entries(map)) {
        if (now - (s.lastSeen || 0) > 4000) { delete map[id]; changed = true; }
      }
      if (changed) playersRef.current = map;

      const arr = Object.values(map);
      setRemotePlayers(() => {
        const localId = peerRef.current?.id;
        return arr.filter(p => p.id !== localId);
      });

      const payload = { type: 'WORLD', players: map };
      for (const c of clientsRef.current) {
        try { if (c.open) c.send(payload); } catch {}
      }
    }, 50);
  }, []);

  useEffect(() => {
    activeRef.current = true;

    async function init() {
      const { Peer } = await import('peerjs');
      if (!activeRef.current) return;

      // 1. Create peer with dynamic random ID
      const peer = new Peer(undefined as any, { debug: 0 });
      peerRef.current = peer;

      peer.on('open', async (localId) => {
        if (!activeRef.current) { peer.destroy(); return; }

        // 2. Ask matchmaking API if there's an available room
        try {
          const res = await fetch('/api/matchmaking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'FIND_ROOM', game: gameName, peerId: localId })
          });
          const data = await res.json();

          if (data.hostId && data.hostId !== localId) {
            // Found a room! Connect as client
            connectToHost(data.hostId);
          } else {
            // No room found — become host
            becomeHost();
          }
        } catch (error) {
          // If fetch fails, try to become host anyway
          console.error("Matchmaking error:", error);
          becomeHost();
        }
      });

      // 3. Connect as CLIENT
      function connectToHost(hostId: string) {
        const conn = peer.connect(hostId, { reliable: true });
        let connected = false;

        conn.on('open', () => {
          connected = true;
          connRef.current = conn;
          setIsHost(false);
          setIsConnected(true);

          conn.on('data', (data: any) => {
            if (data.type === 'WORLD') {
              const arr = Object.values(data.players as Record<string, PlayerState>);
              setRemotePlayers(arr.filter((p: PlayerState) => p.id !== peerRef.current?.id));
            }
            if (data.type === 'MAP_SYNC' && data.payload) {
              if (onMapSyncRef.current) onMapSyncRef.current(data.payload);
            }
            if (data.type === 'ROOM_FULL') {
              conn.close();
            }
          });

          conn.on('close', () => {
            // Host dropped — we should become host of a new room
            setIsConnected(false);
            setRemotePlayers([]);
            becomeHost();
          });
        });

        conn.on('error', () => {
          if (!connected && activeRef.current) becomeHost();
        });

        setTimeout(() => {
          if (!connected && activeRef.current) becomeHost();
        }, 3000);
      }

      // 4. Become HOST
      async function becomeHost() {
        if (!activeRef.current) return;

        // Register as host
        try {
          await fetch('/api/matchmaking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'HOST_REGISTER', game: gameName, peerId: peer.id })
          });
        } catch {}

        setIsHost(true);
        setIsConnected(true);
        startHostBroadcast();

        // Ping interval
        if (pingIntervRef.current) clearInterval(pingIntervRef.current);
        pingIntervRef.current = setInterval(() => {
          fetch('/api/matchmaking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'PING', game: gameName, peerId: peer.id })
          }).catch(() => {});
        }, 10000);
      }

      // Listen for incoming client connections (if we are HOST)
      peer.on('connection', (conn: any) => {
        // Enforce 2-player limit
        if (clientsRef.current.length >= 1) {
          conn.on('open', () => { conn.send({ type: 'ROOM_FULL' }); setTimeout(() => conn.close(), 500); });
          return;
        }

        clientsRef.current.push(conn);

        conn.on('open', () => {
          // Send map to joining client immediately
          if (sharedDataRef.current) {
            try { conn.send({ type: 'MAP_SYNC', payload: sharedDataRef.current }); } catch {}
          }
        });

        conn.on('data', (data: any) => {
          if (data.type === 'UPDATE' && data.state) {
            playersRef.current[data.state.id] = { ...data.state, lastSeen: Date.now() };
          }
        });

        conn.on('close', () => {
          clientsRef.current = clientsRef.current.filter(c => c !== conn);
          const deadIds = Object.keys(playersRef.current).filter(id => {
            return !clientsRef.current.some(c => c.peer === id) && id !== peer.id;
          });
          for (const id of deadIds) delete playersRef.current[id];
        });
      });
    }

    init();
    return cleanup;
  }, [gameName, cleanup, startHostBroadcast]);

  const sendUpdate = useCallback((state: Omit<PlayerState, 'id'>) => {
    if (!peerRef.current?.id) return;
    const fullState: PlayerState = { ...state, id: peerRef.current.id } as PlayerState;

    if (isHost) {
      playersRef.current[peerRef.current.id] = { ...fullState, lastSeen: Date.now() };
    } else if (connRef.current?.open) {
      try { connRef.current.send({ type: 'UPDATE', state: fullState }); } catch {}
    }
  }, [isHost]);

  const setSharedData = useCallback((data: any) => {
    sharedDataRef.current = data;
  }, []);

  return { remotePlayers, sendUpdate, isConnected, isHost, setSharedData };
}
