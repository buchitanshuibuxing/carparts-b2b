import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface ImportProgress {
  status: 'idle' | 'scanning' | 'importing' | 'complete' | 'error' | 'stopped';
  imported: number;
  skipped: number;
  errors: number;
  total: number;
  currentFile: string;
  message?: string;
  timestamp?: string;
}

interface UseImportProgressOptions {
  sourceId: number | null;
  enabled?: boolean;
  onProgress?: (progress: ImportProgress) => void;
  onComplete?: (result: { imported: number; skipped: number; errors: number }) => void;
  onError?: (error: string) => void;
}

export function useImportProgress({
  sourceId,
  enabled = true,
  onProgress,
  onComplete,
  onError,
}: UseImportProgressOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!enabled || !sourceId) return;

    const socket = io(`${window.location.protocol}//${window.location.host}/import`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe', { sourceId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('progress', (data: ImportProgress & { sourceId: number }) => {
      if (data.sourceId === sourceId) {
        setProgress(data);
        onProgress?.(data);
      }
    });

    socket.on('complete', (data: { sourceId: number; imported: number; skipped: number; errors: number }) => {
      if (data.sourceId === sourceId) {
        setProgress({
          status: 'complete',
          imported: data.imported,
          skipped: data.skipped,
          errors: data.errors,
          total: data.imported + data.skipped + data.errors,
          currentFile: '',
        });
        onComplete?.(data);
      }
    });

    socket.on('error', (data: { sourceId: number; message: string }) => {
      if (data.sourceId === sourceId) {
        setProgress(prev => prev ? { ...prev, status: 'error', message: data.message } : null);
        onError?.(data.message);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.emit('unsubscribe', { sourceId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sourceId, enabled, onProgress, onComplete, onError]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  const stopImport = useCallback(() => {
    if (socketRef.current && sourceId) {
      socketRef.current.emit('stop', { sourceId });
    }
  }, [sourceId]);

  return {
    progress,
    connected,
    stopImport,
  };
}
