// Avanti Web — useSocket hook
// Returns a live Socket.io instance tied to the current auth token.
// Automatically disconnects on token change or unmount.

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';

/**
 * Returns the singleton socket (or null if not authenticated).
 * Handles connection lifecycle — connect on mount, no teardown (singleton).
 */
export function useSocket(): Socket | null {
  const token = useAuthStore(s => s.accessToken);
  const ref   = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      ref.current = null;
      return;
    }
    ref.current = getSocket(token);
  }, [token]);

  return token ? ref.current : null;
}

/**
 * Subscribe to a socket event for the lifetime of the calling component.
 * Automatically joins/leaves the attendance room for the given classId.
 */
export function useAttendanceSocket(
  classId: string | null,
  onMarked:  (payload: import('../lib/socket').AttendanceMarkedPayload)  => void,
  onUpdated: (payload: import('../lib/socket').AttendanceUpdatedPayload) => void,
): void {
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !classId) return;

    socket.emit('join:attendance', classId);
    socket.on('attendance:marked',  onMarked);
    socket.on('attendance:updated', onUpdated);

    return () => {
      socket.emit('leave:attendance', classId);
      socket.off('attendance:marked',  onMarked);
      socket.off('attendance:updated', onUpdated);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, classId]);
}

/**
 * Subscribe to canvas:saved events for the given canvasId.
 */
export function useCanvasSocket(
  canvasId: string | null,
  onSaved: (payload: import('../lib/socket').CanvasSavedPayload) => void,
): void {
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !canvasId) return;

    socket.emit('join:canvas', canvasId);
    socket.on('canvas:saved', onSaved);

    return () => {
      socket.emit('leave:canvas', canvasId);
      socket.off('canvas:saved', onSaved);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, canvasId]);
}
