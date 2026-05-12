// Avanti Web — Socket.io Client
// Singleton socket connection, scoped per school.
// Auth: JWT access token sent on handshake.
// Re-exports typed event helpers for each feature.

import { io, type Socket } from 'socket.io-client';

// ── Event payload types (mirror the server-side emits) ────────────────────────

export interface AttendanceMarkedPayload {
  date:    string;
  classId: string;
  total:   number;
  present: number;
  absent:  number;
  halfDay: number;
  late:    number;
  records: Array<{
    studentId:   string;
    studentName: string;
    status:      string;
  }>;
}

export interface AttendanceUpdatedPayload {
  classId: string;
  date:    string;
  total:   number;
  present: number;
  absent:  number;
}

export interface CanvasSavedPayload {
  savedBy:     string;
  version:     number;
  changeCount: number;
}

// ── Singleton socket manager ───────────────────────────────────────────────────

let _socket: Socket | null = null;
let _token:  string | null = null;

function getBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  return process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
}

/**
 * Get (or create) the singleton socket.
 * Pass the JWT access token so the Socket.io auth middleware can verify it.
 * Safe to call multiple times — returns existing socket if token hasn't changed.
 */
export function getSocket(token: string): Socket {
  if (_socket && _token === token && _socket.connected) {
    return _socket;
  }

  // Disconnect stale socket if token changed
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _token = token;

  _socket = io(getBaseUrl(), {
    auth:       { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  _socket.on('connect', () => {
    console.debug('[ws] connected', _socket?.id);
  });

  _socket.on('disconnect', (reason) => {
    console.debug('[ws] disconnected', reason);
  });

  _socket.on('connect_error', (err) => {
    console.debug('[ws] connect error', err.message);
  });

  return _socket;
}

/**
 * Cleanly disconnect and reset the singleton (call on logout).
 */
export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
    _token  = null;
  }
}

// ── Room helpers ───────────────────────────────────────────────────────────────

export function joinAttendanceRoom(socket: Socket, classId: string): void {
  socket.emit('join:attendance', classId);
}

export function leaveAttendanceRoom(socket: Socket, classId: string): void {
  socket.emit('leave:attendance', classId);
}

export function joinCanvasRoom(socket: Socket, canvasId: string): void {
  socket.emit('join:canvas', canvasId);
}

export function leaveCanvasRoom(socket: Socket, canvasId: string): void {
  socket.emit('leave:canvas', canvasId);
}
