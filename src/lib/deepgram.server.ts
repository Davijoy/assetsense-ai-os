/**
 * SENTINEL FORT — Deepgram Voice Infrastructure Layer (.server.ts)
 *
 * ARCHITECTURAL BOUNDARY:
 *  - Deepgram is ONLY the voice interface layer.
 *  - STT: user's voice -> text
 *  - Supreme Intelligence: reasoning, memory, planning, tools, decisions, actions
 *  - Deepgram Flux TTS: Supreme Intelligence's synthesis.narrative -> voice
 *  - Deepgram is NEVER the intelligence or LLM brain.
 *  - This module runs strictly SERVER-SIDE (enforced by TanStack/Vite .server.ts rule).
 *  - DEEPGRAM_API_KEY is NEVER exposed to browser bundles or client code.
 */

import { getServerConfig } from "./config.server";

export interface DeepgramVoiceConfig {
  /** Speech-to-Text model (e.g. nova-3, nova-2) */
  sttModel: string;
  /** Language tag for STT (e.g. en, en-US, hi) */
  sttLanguage: string;
  /** Text-to-Speech model / Flux voice (e.g. aura-2-thalia-en, aura-2-orion-en) */
  ttsModel: string;
  /** Audio encoding for TTS output (e.g. mp3, wav, opus) */
  ttsEncoding: string;
  /** Enable automatic punctuation in STT */
  punctuate: boolean;
  /** Enable smart formatting (currency, dates, numbers) */
  smartFormat: boolean;
}

/**
 * Authoritative Single Configuration Point for Fort Voice Layer.
 * Allows swapping models and voices without touching Supreme Intelligence.
 */
export const DEFAULT_DEEPGRAM_VOICE_CONFIG: DeepgramVoiceConfig = {
  sttModel: "nova-3",
  sttLanguage: "en-US",
  ttsModel: "aura-2-thalia-en", // High-fidelity Flux/Aura voice configured for Fort Executive presence
  ttsEncoding: "mp3",
  punctuate: true,
  smartFormat: true,
};

export interface STTOptions {
  model?: string;
  language?: string;
  punctuate?: boolean;
  smartFormat?: boolean;
}

export interface STTResponse {
  transcript: string;
  confidence: number;
  duration: number;
  words?: Array<{ word: string; start: number; end: number; confidence: number }>;
}

export interface TTSOptions {
  model?: string;
  encoding?: string;
  sampleRate?: number;
}

export interface TTSResponse {
  audioBuffer: ArrayBuffer;
  contentType: string;
}

/**
 * Returns whether Deepgram is configured on the server runtime.
 * Never leaks the key value.
 */
export function isDeepgramConfigured(): boolean {
  const config = getServerConfig();
  const key = config.deepgramApiKey;
  return Boolean(key && key.trim().length > 0 && key !== "your_deepgram_api_key");
}

/**
 * Helper to securely obtain the server-side API key.
 * Throws a clean error if missing.
 */
function getRequiredApiKey(): string {
  const config = getServerConfig();
  const key = config.deepgramApiKey;
  if (!key || key.trim() === "" || key === "your_deepgram_api_key") {
    throw new Error("DEEPGRAM_API_KEY_NOT_CONFIGURED: Voice infrastructure is not configured on the server.");
  }
  return key.trim();
}

export interface EphemeralTokenResponse {
  accessToken: string;
  expiresIn: number;
}

/**
 * Server-side generation of short-lived ephemeral Deepgram access token for client WebSocket.
 * Permanent DEEPGRAM_API_KEY is isolated strictly on the server.
 */
export async function createEphemeralToken(ttlSeconds = 60): Promise<EphemeralTokenResponse> {
  const apiKey = getRequiredApiKey();

  const response = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ttl_seconds: ttlSeconds,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`DEEPGRAM_AUTH_GRANT_FAILED (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as { access_token?: string; expires_in?: number; key?: string };
  const token = result.access_token || result.key;
  if (!token) {
    throw new Error("DEEPGRAM_AUTH_GRANT_FAILED: No access_token returned in grant response.");
  }

  return {
    accessToken: token,
    expiresIn: result.expires_in ?? ttlSeconds,
  };
}

/**
 * Server-side Speech-to-Text (STT) via Deepgram API.
 * Accepts audio payload from an authenticated request, transcribes it,
 * and returns the clean transcript for Supreme Intelligence consumption.
 */
export async function transcribeAudio(
  audioData: ArrayBuffer | Uint8Array | Buffer,
  mimeType = "audio/webm",
  options: STTOptions = {}
): Promise<STTResponse> {
  const apiKey = getRequiredApiKey();

  const model = options.model ?? DEFAULT_DEEPGRAM_VOICE_CONFIG.sttModel;
  const language = options.language ?? DEFAULT_DEEPGRAM_VOICE_CONFIG.sttLanguage;
  const punctuate = options.punctuate ?? DEFAULT_DEEPGRAM_VOICE_CONFIG.punctuate;
  const smartFormat = options.smartFormat ?? DEFAULT_DEEPGRAM_VOICE_CONFIG.smartFormat;

  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", model);
  url.searchParams.set("language", language);
  url.searchParams.set("punctuate", String(punctuate));
  url.searchParams.set("smart_format", String(smartFormat));

  // Determine binary body
  const body = audioData instanceof ArrayBuffer
    ? new Uint8Array(audioData)
    : audioData;

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": mimeType,
    },
    body: body as BodyInit,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`DEEPGRAM_STT_FAILED (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const channel = result.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  const transcript = (alternative?.transcript ?? "").trim();
  const confidence = alternative?.confidence ?? 0;
  const duration = result.metadata?.duration ?? 0;
  const words = alternative?.words?.map((w: any) => ({
    word: w.word,
    start: w.start,
    end: w.end,
    confidence: w.confidence,
  }));

  return {
    transcript,
    confidence,
    duration,
    words,
  };
}

/**
 * Server-side Text-to-Speech (TTS) via Deepgram Flux TTS.
 * Accepts Supreme Intelligence's synthesized narrative and converts it into
 * high-fidelity audio without sending user input directly to TTS.
 */
export async function synthesizeSpeech(
  narrativeText: string,
  options: TTSOptions = {}
): Promise<TTSResponse> {
  const apiKey = getRequiredApiKey();

  if (!narrativeText || narrativeText.trim().length === 0) {
    throw new Error("DEEPGRAM_TTS_EMPTY_TEXT: Cannot synthesize empty narrative.");
  }

  const model = options.model ?? DEFAULT_DEEPGRAM_VOICE_CONFIG.ttsModel;
  const encoding = options.encoding ?? DEFAULT_DEEPGRAM_VOICE_CONFIG.ttsEncoding;

  const url = new URL("https://api.deepgram.com/v1/speak");
  url.searchParams.set("model", model);
  url.searchParams.set("encoding", encoding);
  if (options.sampleRate) {
    url.searchParams.set("sample_rate", String(options.sampleRate));
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: narrativeText.trim() }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`DEEPGRAM_TTS_FAILED (${response.status}): ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || `audio/${encoding}`;

  return {
    audioBuffer,
    contentType,
  };
}
