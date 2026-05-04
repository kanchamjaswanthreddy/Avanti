// Vidyut AI — Voice Pipeline
// From TechnicalArchitecture_v1.docx Section 8
//
// STT:  Sarvam AI saarika:v2 (Indian languages) → Whisper fallback if empty transcript
// TTS:  Sarvam AI bulbul:v1 → returns base64-encoded WAV

import type { VoiceTranscribeResult } from '@vidyut/types';

const SARVAM_BASE_URL  = 'https://api.sarvam.ai';
const SARVAM_API_KEY   = () => process.env['SARVAM_API_KEY'] ?? '';
const OPENAI_API_KEY   = () => process.env['OPENAI_API_KEY'] ?? '';

// ── STT: Sarvam AI ─────────────────────────────────────────────────────────────

async function sarvamTranscribe(
  audioBuffer: Buffer,
  mimeType:    string
): Promise<{ transcript: string; language: string }> {
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: mimeType }), 'audio.webm');
  formData.append('model',         'saarika:v2');
  formData.append('language_code', 'unknown');   // auto-detect
  formData.append('with_timestamps', 'false');

  const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
    method:  'POST',
    headers: { 'api-subscription-key': SARVAM_API_KEY() },
    body:    formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sarvam STT failed (${response.status}): ${text}`);
  }

  const data = await response.json() as { transcript?: string; language_code?: string };
  return {
    transcript: data.transcript?.trim() ?? '',
    language:   data.language_code ?? 'en-IN',
  };
}

// ── STT: OpenAI Whisper (fallback) ────────────────────────────────────────────

async function whisperTranscribe(
  audioBuffer: Buffer,
  mimeType:    string
): Promise<{ transcript: string; language: string }> {
  const formData = new FormData();
  formData.append('file',  new Blob([audioBuffer], { type: mimeType }), 'audio.webm');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY()}` },
    body:    formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Whisper STT failed (${response.status}): ${text}`);
  }

  const data = await response.json() as { text?: string; language?: string };
  return {
    transcript: data.text?.trim() ?? '',
    language:   `${data.language ?? 'en'}-IN`,
  };
}

// ── Main transcribe: Sarvam → Whisper fallback ────────────────────────────────

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType:    string = 'audio/webm'
): Promise<VoiceTranscribeResult> {
  // Try Sarvam AI first (faster for Indian languages)
  try {
    const { transcript, language } = await sarvamTranscribe(audioBuffer, mimeType);

    // Fall back to Whisper if Sarvam returns empty transcript
    if (transcript.length > 0) {
      return { transcript, language, provider: 'sarvam' };
    }
  } catch (err) {
    // Sarvam unavailable — fall through to Whisper
    console.warn('[voice] Sarvam STT failed, falling back to Whisper:', err instanceof Error ? err.message : err);
  }

  // Whisper fallback
  const { transcript, language } = await whisperTranscribe(audioBuffer, mimeType);
  return { transcript, language, provider: 'whisper' };
}

// ── TTS: Sarvam AI ─────────────────────────────────────────────────────────────

// Maps BCP-47 language codes to Sarvam speaker names
const SARVAM_SPEAKER: Record<string, string> = {
  'en-IN': 'meera',
  'hi-IN': 'arvind',
  'te-IN': 'pavithra',
  'ta-IN': 'maitreyi',
  'kn-IN': 'sita',
  'mr-IN': 'meera',
};

export async function synthesizeSpeech(
  text:     string,
  language: string = 'en-IN'
): Promise<string> {
  // Returns base64-encoded WAV audio
  const speaker = SARVAM_SPEAKER[language] ?? 'meera';

  const response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method:  'POST',
    headers: {
      'api-subscription-key': SARVAM_API_KEY(),
      'Content-Type':         'application/json',
    },
    body: JSON.stringify({
      inputs:               [text.slice(0, 500)],  // Sarvam max chars
      target_language_code: language,
      speaker,
      pitch:                0,
      pace:                 1.65,
      loudness:             1.5,
      speech_sample_rate:   22050,
      enable_preprocessing: true,
      model:                'bulbul:v1',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sarvam TTS failed (${response.status}): ${body}`);
  }

  const data = await response.json() as { audios?: string[] };
  const audio = data.audios?.[0];
  if (!audio) throw new Error('Sarvam TTS returned no audio data.');
  return audio; // base64 WAV
}
