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
 * useMultiplayer — PeerJS-based 2-player-only room system.
 * 
 * Room logic:
 *  - First player becomes HOST with a deterministic peer ID.
 *  - Second player connects as CLIENT.
 *  - If a 3rd player tries to join, HOST rejects them (max 1 client).
 *  - Players exchange state at ~20 Hz via unreliable DataChannel.
 *  - If the host disconnects or stales, the client becomes host.
 */
export function useMultiplayer(gameName: string, playerName: string) {
  const [remotePlayers, setRemotePlayers] = useState<PlayerState[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const clientsRef = useRef<any[]>([]);
  const playersRef = useRef<Record<string, PlayerState>>({});
  const activeRef = useRef(true);
  const broadcastRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const HOST_ID = `qrs2526-${gameName}-room`;

  // Cleanup
  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (broadcastRef.current) clearInterval(broadcastRef.current);
    if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
    peerRef.current = null;
    connRef.current = null;
    clientsRef.current = [];
    playersRef.current = {};
  }, []);

  // Start broadcast loop (host only)
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
      setRemotePlayers(prev => {
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

      // Try to connect to existing host first
      const tempPeer = new Peer(undefined as any, { debug: 0 });

      tempPeer.on('open', () => {
        if (!activeRef.current) { tempPeer.destroy(); return; }

        const conn = tempPeer.connect(HOST_ID, { reliable: true });
        let connected = false;

        conn.on('open', () => {
          connected = true;
          // We are CLIENT
          peerRef.current = tempPeer;
          connRef.current = conn;
          setIsHost(false);
          setIsConnected(true);

          conn.on('data', (data: any) => {
            if (data.type === 'WORLD') {
              const localId = peerRef.current?.id;
              const arr = Object.values(data.players as Record<string, PlayerState>);
              setRemotePlayers(arr.filter((p: PlayerState) => p.id !== localId));
            }
            if (data.type === 'ROOM_FULL') {
              // Room is full, just stay disconnected
              conn.close();
            }
          });

          conn.on('close', () => {
            // Host left, try to become host
            setIsConnected(false);
            setRemotePlayers([]);
            tempPeer.destroy();
            if (activeRef.current) becomeHost(Peer);
          });
        });

        conn.on('error', () => {
          if (!connected && activeRef.current) {
            tempPeer.destroy();
            becomeHost(Peer);
          }
        });

        // Fallback: if connection doesn't open in 2.5s, become host
        setTimeout(() => {
          if (!connected && activeRef.current) {
            try { tempPeer.destroy(); } catch {}
            becomeHost(Peer);
          }
        }, 2500);
      });

      tempPeer.on('error', () => {
        if (activeRef.current) becomeHost(Peer);
      });
    }

    function becomeHost(PeerClass: any) {
      if (!activeRef.current) return;

      const peer = new PeerClass(HOST_ID, { debug: 0 });
      peerRef.current = peer;

      peer.on('open', () => {
        if (!activeRef.current) return;
        setIsHost(true);
        setIsConnected(true);
        startHostBroadcast();
      });

      peer.on('error', (err: any) => {
        // ID taken: another tab/user is already host. Try connecting again
        if (err.type === 'unavailable-id' && activeRef.current) {
          peer.destroy();
          setTimeout(() => { if (activeRef.current) init(); }, 1000);
        }
      });

      peer.on('connection', (conn: any) => {
        // 2-player limit: only accept 1 client
        if (clientsRef.current.length >= 1) {
          conn.on('open', () => { conn.send({ type: 'ROOM_FULL' }); setTimeout(() => conn.close(), 500); });
          return;
        }

        clientsRef.current.push(conn);

        conn.on('data', (data: any) => {
          if (data.type === 'UPDATE' && data.state) {
            playersRef.current[data.state.id] = { ...data.state, lastSeen: Date.now() };
          }
        });

        conn.on('close', () => {
          clientsRef.current = clientsRef.current.filter(c => c !== conn);
          // Remove disconnected player
          const deadIds = Object.keys(playersRef.current).filter(id => {
            return !clientsRef.current.some(c => c.peer === id) && id !== peerRef.current?.id;
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

  return { remotePlayers, sendUpdate, isConnected, isHost };
}
