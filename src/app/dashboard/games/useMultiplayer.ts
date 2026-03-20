import { useState, useEffect, useRef } from 'react';

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

export function useMultiplayer(gameName: string, playerName: string, onCustomEvent?: (payload: any) => void) {
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  
  const onCustomEventRef = useRef(onCustomEvent);
  onCustomEventRef.current = onCustomEvent;
  
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null); // host connection if client
  const clientsRef = useRef<any[]>([]); // client connections if host
  const playersMapRef = useRef<Record<string, PlayerState>>({});
  
  const HOST_ID = `qrs2526-host-${gameName}`;

  useEffect(() => {
    let active = true;

    async function init() {
      // Dynamic import to avoid SSR crash in Next.js
      const { Peer } = await import('peerjs');

      // Attempt to connect to the host first
      const tempPeer = new Peer();
      
      tempPeer.on('open', (localId) => {
        if (!active) return;
        
        console.log("Looking for Host:", HOST_ID);
        const conn = tempPeer.connect(HOST_ID, { reliable: false }); // UDP style
        
        conn.on('open', () => {
          // WE ARE A CLIENT
          console.log("Connected as Client!");
          setIsHost(false);
          setIsConnected(true);
          connRef.current = conn;
          peerRef.current = tempPeer;

          // Listen for world syncs from host
          conn.on('data', (data: any) => {
            if (data.type === 'WORLD_STATE') {
              setPlayers(data.players);
            } else if (data.type === 'CUSTOM_EVENT') {
              if (onCustomEventRef.current) onCustomEventRef.current(data.payload);
            }
          });
        });

        conn.on('error', () => becomeHost(Peer));
        
        // If connection doesn't open quickly, the host might not exist or peerjs cloud lag
        setTimeout(() => {
          if (!isConnected && active && !connRef.current?.open) {
             tempPeer.destroy();
             becomeHost(Peer);
          }
        }, 3000);
      });
    }

    function becomeHost(PeerClass: any) {
      if (!active) return;
      console.log("Becoming Host...");
      
      const peer = new PeerClass(HOST_ID);
      peerRef.current = peer;

      peer.on('open', () => {
        setIsHost(true);
        setIsConnected(true);
        console.log("Hosted Room successfully.");
      });
      
      peer.on('error', (err: any) => {
         // If ID is actually taken but we failed to connect earlier, just retry connection
         console.log("Host error", err.type);
      });

      peer.on('connection', (conn: any) => {
        clientsRef.current.push(conn);
        
        conn.on('data', (data: any) => {
          if (data.type === 'PLAYER_UPDATE') {
            playersMapRef.current[data.state.id] = { ...data.state, lastSeen: Date.now() };
          } else if (data.type === 'CUSTOM_EVENT') {
            if (onCustomEventRef.current) onCustomEventRef.current(data.payload);
            // Also broadcast this event from the host to all other clients if needed
            clientsRef.current.forEach((c: any) => {
              if (c !== conn && c.open) c.send({ type: 'CUSTOM_EVENT', payload: data.payload });
            });
          }
        });

        conn.on('close', () => {
          clientsRef.current = clientsRef.current.filter((c: any) => c !== conn);
        });
      });
    }

    init();

    return () => {
      active = false;
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [gameName]);

  // HOST LOOP: Broadcast world state 20 times a second
  useEffect(() => {
    if (!isHost) return;
    
    const interval = setInterval(() => {
      // Clean up dead players
      const now = Date.now();
      const updatedMap = { ...playersMapRef.current };
      let changed = false;
      
      for (const [id, state] of Object.entries(updatedMap)) {
        if (now - (state.lastSeen || 0) > 3000) {
          delete updatedMap[id];
          changed = true;
        }
      }
      
      if (changed) playersMapRef.current = updatedMap;

      // Broadcast
      const payload = { type: 'WORLD_STATE', players: playersMapRef.current };
      setPlayers(updatedMap); // Host sets its own state for rendering
      
      clientsRef.current.forEach(conn => {
        if (conn.open) conn.send(payload);
      });
    }, 50); // 20 updates per second

    return () => clearInterval(interval);
  }, [isHost]);

  // Send local state
  const sendUpdate = (state: Omit<PlayerState, 'id'>) => {
    if (!isConnected || !peerRef.current) return;
    const localId = peerRef.current.id;
    if (!localId) return;

    const fullState = { ...state, id: localId };

    if (isHost) {
      // Host just updates its own map
      playersMapRef.current[localId] = { ...fullState, lastSeen: Date.now() };
    } else if (connRef.current?.open) {
      // Client sends to Host
      connRef.current.send({ type: 'PLAYER_UPDATE', state: fullState });
    }
  };

  const sendCustomEvent = (payload: any) => {
    if (isHost) {
      clientsRef.current.forEach(c => {
        if (c.open) c.send({ type: 'CUSTOM_EVENT', payload });
      });
    } else if (connRef.current?.open) {
      connRef.current.send({ type: 'CUSTOM_EVENT', payload });
    }
  };

  // Convert dictionary to array for easy mapping
  const remotePlayers = Object.values(players).filter(p => peerRef.current && p.id !== peerRef.current.id);

  return { remotePlayers, sendUpdate, isConnected, isHost, sendCustomEvent };
}
