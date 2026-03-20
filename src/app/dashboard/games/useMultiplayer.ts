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
 * useMultiplayer — PeerJS 2-player room with shared game data.
 *
 * Map sharing:
 *  - Host calls `setSharedData(data)` to store map/zones/obstacles.
 *  - When a client joins, host immediately sends `MAP_SYNC` with the shared data.
 *  - Client receives it via the `onMapSync` callback.
 *  - This ensures both players play on the SAME randomly-generated map.
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
  const sharedDataRef = useRef<any>(null);
  const onMapSyncRef = useRef(onMapSync);
  onMapSyncRef.current = onMapSync;

  const HOST_ID = `qrs2526-${gameName}-room`;

  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (broadcastRef.current) clearInterval(broadcastRef.current);
    if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
    peerRef.current = null;
    connRef.current = null;
    clientsRef.current = [];
    playersRef.current = {};
  }, []);

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

      const tempPeer = new Peer(undefined as any, { debug: 0 });

      tempPeer.on('open', () => {
        if (!activeRef.current) { tempPeer.destroy(); return; }

        const conn = tempPeer.connect(HOST_ID, { reliable: true });
        let connected = false;

        conn.on('open', () => {
          connected = true;
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
            if (data.type === 'MAP_SYNC' && data.payload) {
              // Host sent us the map data — apply it
              if (onMapSyncRef.current) onMapSyncRef.current(data.payload);
            }
            if (data.type === 'ROOM_FULL') {
              conn.close();
            }
          });

          conn.on('close', () => {
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
        if (err.type === 'unavailable-id' && activeRef.current) {
          peer.destroy();
          setTimeout(() => { if (activeRef.current) init(); }, 1000);
        }
      });

      peer.on('connection', (conn: any) => {
        if (clientsRef.current.length >= 1) {
          conn.on('open', () => { conn.send({ type: 'ROOM_FULL' }); setTimeout(() => conn.close(), 500); });
          return;
        }

        clientsRef.current.push(conn);

        conn.on('open', () => {
          // Send shared map data immediately to the new client
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

  /** Host calls this to store map/level data that will be sent to joining clients */
  const setSharedData = useCallback((data: any) => {
    sharedDataRef.current = data;
  }, []);

  return { remotePlayers, sendUpdate, isConnected, isHost, setSharedData };
}
