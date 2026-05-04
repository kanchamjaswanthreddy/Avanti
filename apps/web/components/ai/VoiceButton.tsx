'use client';

// Avanti — Voice Input Button
// Records audio via MediaRecorder → sends to transcribe endpoint.
// Animated pulse ring while recording. Disabled during AI streaming.

import { useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useChatStore } from '../../store/chatStore';
import { getApiClient } from '../../lib/api';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?:    boolean;
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const isRecording  = useChatStore(s => s.isRecording);
  const isSpeaking   = useChatStore(s => s.isSpeaking);
  const setRecording = useChatStore(s => s.setRecording);
  const setLanguage  = useChatStore(s => s.setLanguage);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 100) return;  // too short — discard

        try {
          const result = await getApiClient().transcribeVoice(blob);
          if (result.transcript.trim()) {
            setLanguage(result.language);
            onTranscript(result.transcript.trim());
          }
        } catch (err) {
          console.error('[VoiceButton] Transcription failed:', err);
        }
      };

      recorder.start(100);  // 100ms time slices for live chunking
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error('[VoiceButton] Microphone access denied:', err);
    }
  }, [onTranscript, setLanguage, setRecording]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, [setRecording]);

  const handleClick = () => {
    if (disabled || isSpeaking) return;
    if (isRecording) stopRecording();
    else void startRecording();
  };

  const isDisabled = disabled || isSpeaking;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      style={{
        position:        'relative',
        width:           '36px',
        height:          '36px',
        borderRadius:    '50%',
        border:          'none',
        background:      isRecording
          ? 'var(--color-error-500, #ef4444)'
          : 'var(--color-gray-100)',
        color:           isRecording ? '#fff' : 'var(--text-muted)',
        cursor:          isDisabled ? 'not-allowed' : 'pointer',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
        transition:      'background 200ms, color 200ms',
        opacity:         isDisabled ? 0.5 : 1,
      }}
      title={isRecording ? 'Stop recording' : 'Voice input'}
    >
      {/* Pulse ring */}
      <AnimatePresence>
        {isRecording && (
          <motion.span
            key="pulse"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            style={{
              position:      'absolute',
              inset:         0,
              borderRadius:  '50%',
              background:    'var(--color-error-500, #ef4444)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Mic icon */}
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 1a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-5 0v-4A2.5 2.5 0 0 1 8 1z"/>
        <path d="M4.5 7.5a.5.5 0 0 0-1 0 4.5 4.5 0 0 0 4 4.473V13H6a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1H8.5v-1.027A4.5 4.5 0 0 0 12.5 7.5a.5.5 0 0 0-1 0 3.5 3.5 0 0 1-7 0z"/>
      </svg>
    </button>
  );
}
