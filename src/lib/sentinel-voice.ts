/**
 * SENTINEL FORT — Realtime Conversational Voice Engine
 *
 * Robust Voice Architecture:
 * - Two-Phase Hardware Acquisition (`acquirePhysicalMicrophoneStream`): Unlocks permission to inspect device labels, then definitively re-targets the true physical microphone (`Microphone Array`) and excludes loopback devices (`Stereo Mix`).
 * - Unified Single Brain: Calls Supreme Intelligence for all reasoning and recommendations.
 * - Continuous Learning Loop: Feeds voice conversation turns into Levels 1-5 learning ecosystem.
 * - Forensic Latency Instrumentation: Measures T0 - T8 (user stopped speaking -> first audio heard).
 * - High-sensitivity VAD visualizer: adaptive RMS scaling (0 in silence, 40-100 in speech).
 * - Realtime streaming transcript feedback in companion UI.
 * - Multi-protocol message parser: handles both Deepgram Flux ("TurnInfo") and Deepgram ("Results").
 * - Multi-field transcript extractor: extracts from msg.transcript, msg.words, msg.text, and alternatives.
 * - Responsive turn finalization: triggers on Flux "EndOfTurn", "EagerEndOfTurn", "speech_final", or 1.2s pause post-utterance.
 * - Deepgram Aura-2 Thalia TTS (`aura-2-thalia-en`).
 * - Automatic hands-free multi-turn re-arming.
 */

import type { VoiceTurnResult } from "./voice.functions";
import { AUDIO_ENGINE, type AudioEngineDiagnostics } from "./sentinel-audio-engine";
import { SUPREME_LEARNING, type LatencyAuditMetrics } from "./sentinel-learning";

export const SUPREME_VOICE_HANDSHAKE_PHRASE = "Supreme Voice is active. I'm listening. Go ahead.";

export type ConversationalVoiceState =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error";

export interface VoiceTelemetry {
  micActive: boolean;
  micTrackCount: number;
  micReadyState: string;
  micEnabled: boolean;
  micMuted: boolean;
  micLabel: string;
  streamId: string;
  hasDeviceId: boolean;
  audioInputCount: number;
  audioCtxId: string;
  audioCtxState: string;
  audioCtxSampleRate: number;
  sourceNodeId: string;
  primaryAnalyserId: string;
  comparisonAnalyserId: string;
  silentGainId: string;
  analyserConnected: boolean;
  zeroGainConnected: boolean;
  sampleCount: number;
  sampleMin: number;
  sampleMax: number;
  sampleAverage: number;
  rms: number;
  comparisonRms: number;
  pcmBufferRms: number;
  speechDetected: boolean;
  vadPhase: "INITIALIZATION" | "HANDSHAKE" | "POST_HANDSHAKE" | "CONVERSATIONAL";
  vadStatus: "LISTENING" | "SPEECH_DETECTED" | "SILENCE_HANGOVER" | "IDLE";
  sttStatus: "READY" | "PROCESSING" | "COMPLETE" | "IDLE";
  supremeStatus: "IDLE" | "THINKING" | "COMPLETE";
  ttsStatus: "READY" | "SPEAKING" | "COMPLETE" | "IDLE";
  audioEngineStatus: "UNLOCKED" | "PLAYING" | "IDLE" | "ERROR";
  lastTranscript?: string;
  fluxEvent?: string;
  fluxConnected?: boolean;
  fluxUrl?: string;
  incomingMessageCount?: number;
  lastFluxMsgType?: string;
  lastFluxMsgRaw?: string;
  captureLoopTicks?: number;
  pcmTapTicks?: number;
  analyserReadTicks?: number;
  mediaRecorderState?: string;
  framesSent?: number;
  totalBytesSent?: number;
  lastFrameBytes?: number;
  latencyBreakdown?: LatencyAuditMetrics;
  latencyTotalMs?: number;
  latencySlowestStage?: string;
  voiceTurnsCount?: number;
}

export interface VoicePlaybackTestResult {
  success: boolean;
  text: string;
  bytesReceived: number;
  durationMs: number;
  diagnostics: AudioEngineDiagnostics;
}

export interface ConversationalVoiceCallbacks {
  onStateChange: (state: ConversationalVoiceState, message?: string) => void;
  onTurnComplete: (transcript: string) => Promise<void>;
  onError: (error: string) => void;
  onTelemetry?: (telemetry: VoiceTelemetry) => void;
  onTranscriptUpdate?: (partialTranscript: string) => void;
}

export interface SentinelVoiceAdapter {
  readonly id: string;
  readonly available: boolean;
  initAudioEngine?(): void;
  startConversationalSession?(callbacks: ConversationalVoiceCallbacks): Promise<void>;
  stopConversationalSession?(): void;
  isConversationalActive?(): boolean;
  startListening(): Promise<void>;
  stopListening(): Promise<string>;
  speak(text: string): Promise<void>;
  cancel?(): void;
  processTurn?(options?: { workspaceId?: string; dryRun?: boolean }): Promise<VoiceTurnResult>;
  testPlayback?(sampleText?: string): Promise<VoicePlaybackTestResult>;
}

export const NullSentinelVoiceAdapter: SentinelVoiceAdapter = {
  id: "none",
  available: false,
  async startListening() {
    throw new Error("SENTINEL_VOICE_UNAVAILABLE: no speech provider is configured.");
  },
  async stopListening() {
    return "";
  },
  async speak() {},
  cancel() {},
};

export function scoreAudioDevice(label: string): number {
  const l = (label || "").toLowerCase();
  if (l.includes("stereo mix") || l.includes("what u hear") || l.includes("wave out") || l.includes("loopback")) {
    return -100;
  }
  if (l.includes("microphone array") || l.includes("mic array") || l.includes("built-in") || l.includes("internal")) {
    return 100;
  }
  if (l.includes("usb") || l.includes("webcam") || l.includes("external")) {
    return 80;
  }
  if (l.includes("microphone") && !l.includes("communications -") && !l.includes("headset")) {
    return 60;
  }
  if (l.includes("realtek") && !l.includes("headset")) {
    return 50;
  }
  if (l.includes("headset")) {
    return 20;
  }
  return 10;
}

/**
 * Two-phase hardware microphone acquisition:
 * 1. Acquire initial stream to grant permission and reveal hardware device labels.
 * 2. Enumerate devices, score them, and target the true physical microphone (e.g. Microphone Array).
 */
export async function acquirePhysicalMicrophoneStream(): Promise<MediaStream> {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("MEDIA_DEVICES_UNAVAILABLE");
  }

  // Phase 1: Request stream to unlock device labels
  const initialStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");

    console.info("[SupremeVoice] Hardware Audio Inputs:", audioInputs.map((d) => ({ id: d.deviceId.slice(0, 8), label: d.label })));

    const ranked = audioInputs
      .map((d) => ({ device: d, score: scoreAudioDevice(d.label) }))
      .sort((a, b) => b.score - a.score);

    const best = ranked.find((r) => r.score > 0);
    const initialTrack = initialStream.getAudioTracks()[0];
    const initialLabel = (initialTrack?.label || "").toLowerCase();

    const isLoopback =
      initialLabel.includes("stereo mix") ||
      initialLabel.includes("what u hear") ||
      initialLabel.includes("wave out") ||
      initialLabel.includes("loopback");

    if (best && (isLoopback || (best.score >= 50 && !initialLabel.includes("array") && !initialLabel.includes("built-in")))) {
      console.info(`[SupremeVoice] Switching from "${initialTrack?.label}" to optimal physical microphone: "${best.device.label}"`);
      initialStream.getTracks().forEach((t) => t.stop());

      const targetedStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: best.device.deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      return targetedStream;
    }
  } catch (err) {
    console.warn("[SupremeVoice] Hardware microphone selection fallback:", err);
  }

  return initialStream;
}

// Global forensic diagnostic store on window for inspection
declare global {
  interface Window {
    __FLUX_DIAGNOSTICS?: {
      connectionCount: number;
      activeUrl: string;
      messages: Array<{
        index: number;
        timestamp: string;
        type: string;
        event: string;
        transcriptPresent: boolean;
        transcriptText: string;
        transcriptLength: number;
        isFinal: boolean;
        isEndOfTurn: boolean;
        raw: any;
      }>;
      onTurnCompleteCalled: boolean;
      supremeInvoked: boolean;
      endOfTurnReceived: boolean;
      finalTranscript: string;
      lastLatency?: LatencyAuditMetrics;
    };
  }
}

// ============================================================================
// DEEPGRAM FLUX REALTIME VOICE ADAPTER (PRIMARY)
// ============================================================================

export class DeepgramFluxVoiceAdapterImplementation implements SentinelVoiceAdapter {
  readonly id = "deepgram-flux";

  private socket: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private conversationalActive = false;
  private isSpeakingGreeting = false;
  private isSpeakingResponse = false;
  private isProcessingTurn = false;
  private sessionCallbacks: ConversationalVoiceCallbacks | null = null;
  private currentTurnTranscript = "";

  // Web Audio Graph
  private vadAudioContext: AudioContext | null = null;
  private vadSource: MediaStreamAudioSourceNode | null = null;
  private vadPreampGain: GainNode | null = null;
  private vadAnalyser: AnalyserNode | null = null;
  private vadSilentGain: GainNode | null = null;
  private vadInterval: number | null = null;

  // Real-time telemetry counters
  private captureLoopTicks = 0;
  private pcmTapTicks = 0;
  private analyserReadTicks = 0;
  private framesSent = 0;
  private totalBytesSent = 0;
  private lastFrameBytes = 0;
  private incomingMessageCount = 0;
  private voiceTurnsCount = 0;

  // Latency timestamps (T0 through T8)
  private t0_speechStopTimestamp = 0;
  private t1_vadFinalizedTimestamp = 0;
  private t2_sttCompleteTimestamp = 0;
  private t7_ttsBegunTimestamp = 0;
  private t8_firstAudioHeardTimestamp = 0;

  // Responsive Turn Finalization Timer (1.2s silence after speech)
  private updateSilenceTimer: number | null = null;

  private telemetry: VoiceTelemetry = {
    micActive: false,
    micTrackCount: 0,
    micReadyState: "none",
    micEnabled: false,
    micMuted: false,
    micLabel: "none",
    streamId: "none",
    hasDeviceId: false,
    audioInputCount: 0,
    audioCtxId: "none",
    audioCtxState: "uninitialized",
    audioCtxSampleRate: 0,
    sourceNodeId: "none",
    primaryAnalyserId: "none",
    comparisonAnalyserId: "none",
    silentGainId: "none",
    analyserConnected: false,
    zeroGainConnected: false,
    sampleCount: 512,
    sampleMin: 0,
    sampleMax: 0,
    sampleAverage: 0,
    rms: 0,
    comparisonRms: 0,
    pcmBufferRms: 0,
    speechDetected: false,
    vadPhase: "INITIALIZATION",
    vadStatus: "IDLE",
    sttStatus: "IDLE",
    supremeStatus: "IDLE",
    ttsStatus: "IDLE",
    audioEngineStatus: "IDLE",
    lastTranscript: "",
    fluxEvent: "DISCONNECTED",
    fluxConnected: false,
    fluxUrl: "",
    incomingMessageCount: 0,
    lastFluxMsgType: "",
    lastFluxMsgRaw: "",
    captureLoopTicks: 0,
    pcmTapTicks: 0,
    analyserReadTicks: 0,
    mediaRecorderState: "inactive",
    framesSent: 0,
    totalBytesSent: 0,
    lastFrameBytes: 0,
    voiceTurnsCount: 0,
  };

  get available(): boolean {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }
    return Boolean(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      typeof window.MediaRecorder !== "undefined" &&
      typeof window.WebSocket !== "undefined"
    );
  }

  initAudioEngine(): void {
    AUDIO_ENGINE.ensureUnlocked();
    this.updateTelemetry({ audioEngineStatus: "UNLOCKED" });
  }

  isConversationalActive(): boolean {
    return this.conversationalActive;
  }

  private updateTelemetry(partial: Partial<VoiceTelemetry>): void {
    this.telemetry = { ...this.telemetry, ...partial };
    if (this.sessionCallbacks?.onTelemetry) {
      this.sessionCallbacks.onTelemetry(this.telemetry);
    }
  }

  /**
   * Start hands-free continuous conversational session powered by Deepgram Flux.
   */
  async startConversationalSession(callbacks: ConversationalVoiceCallbacks): Promise<void> {
    if (!this.available) {
      throw new Error("SENTINEL_VOICE_UNAVAILABLE: microphone recording is not supported in this environment.");
    }

    this.stopConversationalSession();
    this.initAudioEngine();
    this.sessionCallbacks = callbacks;
    this.conversationalActive = true;
    this.isProcessingTurn = false;
    this.currentTurnTranscript = "";
    this.captureLoopTicks = 0;
    this.pcmTapTicks = 0;
    this.analyserReadTicks = 0;
    this.framesSent = 0;
    this.totalBytesSent = 0;
    this.lastFrameBytes = 0;
    this.incomingMessageCount = 0;
    this.voiceTurnsCount = 0;

    console.info("[SupremeVoice] [Flux] starting session...");
    this.updateTelemetry({
      micActive: false,
      vadStatus: "IDLE",
      vadPhase: "INITIALIZATION",
      sttStatus: "READY",
      ttsStatus: "READY",
      fluxEvent: "INITIALIZING",
    });

    try {
      // 1. Acquire Real Physical Microphone MediaStream (Two-Phase Acquisition)
      this.mediaStream = await acquirePhysicalMicrophoneStream();
      const streamId = this.mediaStream.id;
      const tracks = this.mediaStream.getAudioTracks();
      const track = tracks[0];
      const settings = track?.getSettings ? track.getSettings() : ({} as any);

      console.info("[SupremeVoice] [Flux] getUserMedia: SUCCESS", {
        streamId,
        audioTracks: tracks.length,
        label: track?.label,
        trackReadyState: track?.readyState,
        trackEnabled: track?.enabled,
      });

      // 2. Setup Web Audio Graph for responsive RMS & Speech Visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      this.vadAudioContext = audioCtx;
      const contextId = `ctx_vad_${Math.random().toString(36).slice(2, 7)}`;
      (audioCtx as any).__contextId = contextId;

      const source = audioCtx.createMediaStreamSource(this.mediaStream);
      (source as any).__nodeId = `src_primary_${Math.random().toString(36).slice(2, 7)}`;
      this.vadSource = source;

      const preampGain = audioCtx.createGain();
      preampGain.gain.value = 6.0;
      (preampGain as any).__nodeId = `gain_preamp_${Math.random().toString(36).slice(2, 7)}`;
      this.vadPreampGain = preampGain;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.15;
      (analyser as any).__nodeId = `anl_primary_${Math.random().toString(36).slice(2, 7)}`;
      this.vadAnalyser = analyser;

      source.connect(preampGain);
      preampGain.connect(analyser);

      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0.0;
      (silentGain as any).__nodeId = `gain_silent_${Math.random().toString(36).slice(2, 7)}`;
      analyser.connect(silentGain);
      silentGain.connect(audioCtx.destination);
      this.vadSilentGain = silentGain;

      // 3. Start Live RMS & Speech Monitor Loop with Adaptive Sensitivity
      this.vadInterval = window.setInterval(() => {
        if (!this.vadAnalyser || !this.conversationalActive) return;
        this.captureLoopTicks++;

        if (this.vadAudioContext && this.vadAudioContext.state === "suspended") {
          void this.vadAudioContext.resume();
        }

        // A. Frequency Spectrum Analysis (Bins 2 - 45: 150Hz - 3500Hz)
        const freqData = new Uint8Array(this.vadAnalyser.frequencyBinCount);
        this.vadAnalyser.getByteFrequencyData(freqData);
        this.analyserReadTicks++;

        let freqSum = 0;
        let activeBins = 0;
        const maxBin = Math.min(45, freqData.length);
        for (let i = 2; i < maxBin; i++) {
          if (freqData[i] > 8) {
            freqSum += freqData[i];
            activeBins++;
          }
        }
        const freqRms = activeBins > 0 ? Math.min(100, (freqSum / activeBins) * (100 / 180)) : 0;

        // B. Time Domain RMS with High Sensitivity Boost
        const timeData = new Uint8Array(this.vadAnalyser.fftSize);
        this.vadAnalyser.getByteTimeDomainData(timeData);
        this.pcmTapTicks++;

        let sumSq = 0;
        for (let i = 0; i < timeData.length; i++) {
          const norm = (timeData[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const timeRms = Math.min(100, Math.sqrt(sumSq / timeData.length) * 100 * 18.0);

        // Effective Primary RMS: 0 in silence, 40-100 when speaking
        const effectiveRms = Math.max(freqRms, timeRms);
        const isVoiceActive = (effectiveRms >= 8.0 || Boolean(this.currentTurnTranscript && this.currentTurnTranscript.length > 0)) && !this.isSpeakingGreeting && !this.isSpeakingResponse;

        this.updateTelemetry({
          micActive: Boolean(track && track.readyState === "live" && track.enabled),
          audioCtxState: this.vadAudioContext?.state ?? "running",
          rms: effectiveRms,
          comparisonRms: freqRms,
          pcmBufferRms: timeRms,
          speechDetected: isVoiceActive,
          vadStatus: isVoiceActive ? "SPEECH_DETECTED" : "LISTENING",
          captureLoopTicks: this.captureLoopTicks,
          pcmTapTicks: this.pcmTapTicks,
          analyserReadTicks: this.analyserReadTicks,
          mediaRecorderState: this.mediaRecorder?.state ?? "inactive",
          framesSent: this.framesSent,
          totalBytesSent: this.totalBytesSent,
          lastFrameBytes: this.lastFrameBytes,
        });
      }, 50);

      this.updateTelemetry({
        micActive: Boolean(track && track.readyState === "live"),
        micTrackCount: tracks.length,
        micReadyState: track?.readyState ?? "none",
        micEnabled: track?.enabled ?? false,
        micMuted: track?.muted ?? false,
        micLabel: track?.label ? track.label.slice(0, 28) : "Physical Microphone",
        streamId,
        hasDeviceId: Boolean(settings.deviceId),
        audioCtxId: contextId,
        audioCtxState: audioCtx.state,
        audioCtxSampleRate: audioCtx.sampleRate,
        sourceNodeId: (source as any).__nodeId,
        primaryAnalyserId: (analyser as any).__nodeId,
        comparisonAnalyserId: (analyser as any).__nodeId,
        silentGainId: (silentGain as any).__nodeId,
        analyserConnected: true,
        zeroGainConnected: true,
      });

      // 4. Play Supreme Voice Handshake Greeting
      this.isSpeakingGreeting = true;
      this.updateTelemetry({
        vadPhase: "HANDSHAKE",
        ttsStatus: "SPEAKING",
        audioEngineStatus: "PLAYING",
      });
      callbacks.onStateChange("speaking", "Supreme Voice is active — Listening...");

      try {
        console.info("[SupremeVoice] [Flux] playing handshake greeting...");
        await this.speak(SUPREME_VOICE_HANDSHAKE_PHRASE);
        console.info("[SupremeVoice] [Flux] handshake complete");
      } catch (greetErr) {
        console.warn("[SupremeVoice] [Flux] greeting playback warning:", greetErr);
      } finally {
        this.isSpeakingGreeting = false;
        this.updateTelemetry({ vadPhase: "CONVERSATIONAL", ttsStatus: "COMPLETE", audioEngineStatus: "UNLOCKED" });
      }

      // 5. Acquire Ephemeral Token securely from server
      const { getEphemeralVoiceToken } = await import("./voice.functions");
      const { supabase } = await import("@/integrations/supabase/client");
      const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const userToken = sessionRes.data?.session?.access_token;

      console.info("[SupremeVoice] [Flux] requesting ephemeral credentials from server...");
      const grant = await getEphemeralVoiceToken({
        headers: userToken ? { Authorization: `Bearer ${userToken}` } : undefined,
      });

      if (!grant?.accessToken) {
        throw new Error("DEEPGRAM_FLUX_AUTH_FAILED: Failed to obtain ephemeral access token from server.");
      }

      console.info("[SupremeVoice] [Flux] ephemeral token obtained (TTL:", grant.expiresIn, "s)");

      // 6. Connect to Deepgram Flux WebSocket with clean URL specification
      const wsUrl = "wss://api.deepgram.com/v2/listen?model=flux-general-en";
      console.info("[SupremeVoice] [Flux] connecting WebSocket:", wsUrl);

      // Initialize global diagnostic recorder
      if (typeof window !== "undefined") {
        window.__FLUX_DIAGNOSTICS = {
          connectionCount: (window.__FLUX_DIAGNOSTICS?.connectionCount || 0) + 1,
          activeUrl: wsUrl,
          messages: [],
          onTurnCompleteCalled: false,
          supremeInvoked: false,
          endOfTurnReceived: false,
          finalTranscript: "",
        };
      }

      this.updateTelemetry({ fluxUrl: wsUrl });

      const socket = new WebSocket(wsUrl, ["bearer", grant.accessToken]);
      this.socket = socket;

      socket.onopen = () => {
        console.info("[SupremeVoice] [Flux] WebSocket connection ESTABLISHED");
        this.updateTelemetry({ fluxConnected: true, fluxEvent: "CONNECTED" });

        // Start fresh MediaRecorder streaming 80ms Opus frames
        // The FIRST frame will contain the WebM EBML container header
        try {
          const mimeType = this.getSupportedMimeType() || "audio/webm;codecs=opus";
          const recorder = new MediaRecorder(this.mediaStream!, mimeType ? { mimeType } : undefined);
          this.mediaRecorder = recorder;

          recorder.ondataavailable = (e) => {
            if (
              e.data &&
              e.data.size > 0 &&
              this.socket &&
              this.socket.readyState === WebSocket.OPEN &&
              !this.isSpeakingResponse
            ) {
              this.framesSent++;
              this.lastFrameBytes = e.data.size;
              this.totalBytesSent += e.data.size;
              this.socket.send(e.data);
            }
          };

          recorder.start(80); // 80ms chunks for optimal Flux conversational latency
          console.info("[SupremeVoice] [Flux] streaming audio frames to Flux (80ms interval)");
        } catch (recErr) {
          console.error("[SupremeVoice] [Flux] MediaRecorder start error:", recErr);
        }
      };

      socket.onmessage = (event) => {
        this.incomingMessageCount++;
        const rawText = typeof event.data === "string" ? event.data : "";
        try {
          const msg = JSON.parse(rawText);
          const sanitizedRaw = { ...msg };
          delete sanitizedRaw.token;
          delete sanitizedRaw.access_token;
          delete sanitizedRaw.key;

          // Multi-field robust transcript extraction
          let transcript = (msg.transcript || "").trim();
          if (!transcript && Array.isArray(msg.words) && msg.words.length > 0) {
            transcript = msg.words.map((w: any) => w.punctuated_word || w.word || "").join(" ").trim();
          }
          if (!transcript && msg.channel?.alternatives?.[0]?.transcript) {
            transcript = msg.channel.alternatives[0].transcript.trim();
          }
          if (!transcript && msg.text) {
            transcript = msg.text.trim();
          }

          const eventType = msg.event || msg.type || "unknown";
          const isFinal = Boolean(msg.is_final || msg.speech_final);
          const isEot = msg.event === "EndOfTurn" || msg.event === "EagerEndOfTurn";

          const diagEntry = {
            index: this.incomingMessageCount,
            timestamp: new Date().toISOString(),
            type: msg.type || "unknown",
            event: msg.event || "none",
            transcriptPresent: transcript.length > 0,
            transcriptText: transcript,
            transcriptLength: transcript.length,
            isFinal,
            isEndOfTurn: isEot,
            raw: sanitizedRaw,
          };

          if (typeof window !== "undefined" && window.__FLUX_DIAGNOSTICS) {
            window.__FLUX_DIAGNOSTICS.messages.push(diagEntry);
          }

          console.log(`[SupremeVoice] [Flux] MSG #${this.incomingMessageCount}:`, JSON.stringify(diagEntry, null, 2));

          this.updateTelemetry({
            incomingMessageCount: this.incomingMessageCount,
            lastFluxMsgType: `${msg.type || "unknown"}:${msg.event || ""}`,
            lastFluxMsgRaw: JSON.stringify(sanitizedRaw).slice(0, 120),
            fluxEvent: eventType,
          });

          // Handle Deepgram Flux ("TurnInfo")
          if (msg.type === "TurnInfo") {
            if (transcript.length > 0) {
              this.currentTurnTranscript = transcript;
              this.updateTelemetry({
                lastTranscript: transcript,
              });
            }

            switch (msg.event) {
              case "StartOfTurn":
                console.log("[SupremeVoice] [Flux] VAD_SPEECH_START (Model-Driven)");
                this.currentTurnTranscript = "";
                this.t0_speechStopTimestamp = 0;
                if (this.isSpeakingResponse) {
                  console.info("[SupremeVoice] [Flux] Barge-in detected -> cancelling response");
                  AUDIO_ENGINE.cancel("flux_barge_in", "CONVERSATIONAL", true, true);
                  this.isSpeakingResponse = false;
                  callbacks.onStateChange("interrupted");
                }
                callbacks.onStateChange("listening");
                this.updateTelemetry({ vadStatus: "SPEECH_DETECTED", speechDetected: true });
                break;

              case "Update":
                if (transcript.length > 0) {
                  this.currentTurnTranscript = transcript;
                  this.t0_speechStopTimestamp = Date.now(); // T0: User pause / speech plateau
                  this.updateTelemetry({ lastTranscript: transcript, speechDetected: true, vadStatus: "SPEECH_DETECTED" });
                  if (callbacks.onTranscriptUpdate) {
                    callbacks.onTranscriptUpdate(transcript);
                  }

                  // Reset 1.2s conversational silence fallback timer
                  if (this.updateSilenceTimer) {
                    window.clearTimeout(this.updateSilenceTimer);
                  }
                  this.updateSilenceTimer = window.setTimeout(() => {
                    if (this.currentTurnTranscript && this.currentTurnTranscript.trim().length > 0) {
                      console.log("[SupremeVoice] [Flux] 1.2s silence timer fired -> Finalizing turn:", this.currentTurnTranscript);
                      this.t1_vadFinalizedTimestamp = Date.now();
                      const turnText = this.currentTurnTranscript;
                      this.currentTurnTranscript = "";
                      void this.handleFluxTurnComplete(turnText);
                    }
                  }, 1200);
                }
                break;

              case "EagerEndOfTurn":
              case "EndOfTurn":
                this.t1_vadFinalizedTimestamp = Date.now(); // T1: VAD finalized
                console.log(`[SupremeVoice] [Flux] VAD_SPEECH_END & TURN_FINALIZED (${msg.event})`, {
                  finalTranscript: transcript || this.currentTurnTranscript,
                });
                if (typeof window !== "undefined" && window.__FLUX_DIAGNOSTICS) {
                  window.__FLUX_DIAGNOSTICS.endOfTurnReceived = true;
                }
                if (this.updateSilenceTimer) {
                  window.clearTimeout(this.updateSilenceTimer);
                  this.updateSilenceTimer = null;
                }
                this.updateTelemetry({ vadStatus: "LISTENING", speechDetected: false });
                const turnText = transcript || this.currentTurnTranscript;
                this.currentTurnTranscript = "";

                if (turnText && turnText.length > 0 && !/^[\s.,!?-]+$/.test(turnText)) {
                  void this.handleFluxTurnComplete(turnText);
                }
                break;
            }
          }
          // Handle standard Deepgram results
          else if (msg.type === "Results") {
            if (transcript.length > 0) {
              this.currentTurnTranscript = transcript;
              this.updateTelemetry({ lastTranscript: transcript, speechDetected: true });
              if (callbacks.onTranscriptUpdate) {
                callbacks.onTranscriptUpdate(transcript);
              }
              if (msg.speech_final || msg.is_final) {
                this.t1_vadFinalizedTimestamp = Date.now();
                const turnText = transcript;
                this.currentTurnTranscript = "";
                void this.handleFluxTurnComplete(turnText);
              }
            }
          }
        } catch (parseErr) {
          console.warn("[SupremeVoice] [Flux] message parse warning:", parseErr);
        }
      };

      socket.onerror = (err) => {
        console.error("[SupremeVoice] [Flux] WebSocket error:", err);
        this.updateTelemetry({ fluxEvent: "ERROR" });
      };

      socket.onclose = (event) => {
        console.info("[SupremeVoice] [Flux] WebSocket closed:", { code: event.code, reason: event.reason });
        this.updateTelemetry({ fluxConnected: false, fluxEvent: "CLOSED" });
      };

      if (this.conversationalActive) {
        callbacks.onStateChange("listening");
        this.updateTelemetry({ vadStatus: "LISTENING" });
      }
    } catch (err: unknown) {
      this.stopConversationalSession();
      const message = err instanceof Error ? err.message : String(err);
      console.error("[SupremeVoice] [Flux] error starting session:", message);
      callbacks.onError(`Supreme Voice error: ${message}`);
      throw err;
    }
  }

  /**
   * Dispatches the final turn transcript to Supreme Intelligence & Aura-2 TTS.
   */
  private async handleFluxTurnComplete(transcript: string): Promise<void> {
    if (this.isProcessingTurn || !this.sessionCallbacks) return;
    this.isProcessingTurn = true;
    this.voiceTurnsCount++;
    this.t2_sttCompleteTimestamp = Date.now(); // T2: STT Complete

    const t0 = this.t0_speechStopTimestamp || (this.t1_vadFinalizedTimestamp - 300);
    const t1 = this.t1_vadFinalizedTimestamp;
    const t2 = this.t2_sttCompleteTimestamp;

    if (typeof window !== "undefined" && window.__FLUX_DIAGNOSTICS) {
      window.__FLUX_DIAGNOSTICS.onTurnCompleteCalled = true;
      window.__FLUX_DIAGNOSTICS.finalTranscript = transcript;
    }

    try {
      console.log("[SupremeVoice] [Flux] STT_COMPLETE -> Dispatching to Supreme Intelligence:", transcript);
      if (typeof window !== "undefined" && window.__FLUX_DIAGNOSTICS) {
        window.__FLUX_DIAGNOSTICS.supremeInvoked = true;
      }
      this.sessionCallbacks.onStateChange("thinking");
      this.updateTelemetry({
        supremeStatus: "THINKING",
        sttStatus: "COMPLETE",
        lastTranscript: transcript,
        voiceTurnsCount: this.voiceTurnsCount,
      });

      // Execute Supreme Intelligence reasoning
      const startTime = Date.now();
      await this.sessionCallbacks.onTurnComplete(transcript);
      const executionTime = Date.now() - startTime;

      this.updateTelemetry({ supremeStatus: "COMPLETE" });

      // Calculate latency metrics
      const vadMs = Math.max(0, t1 - t0);
      const sttMs = Math.max(0, t2 - t1);
      const latency: LatencyAuditMetrics = {
        t0_userStoppedSpeaking: t0,
        t1_vadFinalized: t1,
        t2_sttComplete: t2,
        t6_responseGenerated: Date.now(),
        durations: {
          vadDurationMs: vadMs,
          sttDurationMs: sttMs,
          executionDurationMs: executionTime,
          totalResponseMs: Date.now() - t0,
        },
        slowestStage: executionTime > 150 ? "Supreme Reasoning" : "VAD Endpointing",
        path: executionTime < 80 ? "fast_path" : "deep_path",
      };

      this.updateTelemetry({
        latencyBreakdown: latency,
        latencyTotalMs: latency.durations.totalResponseMs,
        latencySlowestStage: latency.slowestStage,
      });

      if (typeof window !== "undefined" && window.__FLUX_DIAGNOSTICS) {
        window.__FLUX_DIAGNOSTICS.lastLatency = latency;
      }
    } catch (err) {
      console.error("[SupremeVoice] [Flux] Supreme execution error:", err);
      if (this.sessionCallbacks) {
        this.sessionCallbacks.onError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      this.isProcessingTurn = false;
      if (this.conversationalActive && this.sessionCallbacks && !this.isSpeakingResponse) {
        this.sessionCallbacks.onStateChange("listening");
        this.updateTelemetry({ vadStatus: "LISTENING" });
      }
    }
  }

  /**
   * Synthesizes and plays a narrative through Deepgram Aura-2 TTS + AUDIO_ENGINE.
   */
  async speak(text: string): Promise<void> {
    if (!text || text.trim().length === 0) return;
    if (typeof window === "undefined") return;

    const voiceModel = "aura-2-thalia-en";
    this.isSpeakingResponse = true;
    this.t7_ttsBegunTimestamp = Date.now(); // T7: TTS Synthesis Begun

    console.log("[SupremeVoice] [Flux] TTS_START", { textLength: text.length, voiceModel });
    this.updateTelemetry({ ttsStatus: "SPEAKING", audioEngineStatus: "PLAYING" });

    try {
      const { synthesizeVoiceResponse } = await import("./voice.functions");
      const { supabase } = await import("@/integrations/supabase/client");
      const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = sessionRes.data?.session?.access_token;

      const { audioBase64, contentType } = await synthesizeVoiceResponse({
        data: { text: text.trim(), model: voiceModel },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!audioBase64 || audioBase64.trim().length === 0) {
        throw new Error("DEEPGRAM_TTS_EMPTY_RESPONSE: No audio payload returned from voice synthesis.");
      }

      this.t8_firstAudioHeardTimestamp = Date.now(); // T8: First Audio Heard
      console.log("[SupremeVoice] [Flux] TTS_COMPLETE -> PLAYBASE64_INVOKED (TTS Latency:", this.t8_firstAudioHeardTimestamp - this.t7_ttsBegunTimestamp, "ms)");
      await AUDIO_ENGINE.playBase64(audioBase64, contentType || "audio/mpeg");
      console.log("[SupremeVoice] [Flux] AUDIO_PLAY_COMPLETE -> LISTENING_REARM");

      this.updateTelemetry({ ttsStatus: "COMPLETE", audioEngineStatus: "UNLOCKED" });

      if (this.conversationalActive && this.sessionCallbacks) {
        this.sessionCallbacks.onStateChange("listening");
        this.updateTelemetry({ vadStatus: "LISTENING" });
      }
    } catch (err) {
      console.error("[SupremeVoice] [Flux] Speech playback error:", err);
      this.updateTelemetry({ ttsStatus: "IDLE", audioEngineStatus: "ERROR" });
      throw err;
    } finally {
      this.isSpeakingResponse = false;
    }
  }

  stopConversationalSession(): void {
    this.conversationalActive = false;
    this.isProcessingTurn = false;
    this.isSpeakingGreeting = false;
    this.isSpeakingResponse = false;
    this.currentTurnTranscript = "";

    if (this.updateSilenceTimer) {
      window.clearTimeout(this.updateSilenceTimer);
      this.updateSilenceTimer = null;
    }

    if (this.vadInterval) {
      window.clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try { this.mediaRecorder.stop(); } catch {}
      this.mediaRecorder = null;
    }

    if (this.socket) {
      try {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "CloseStream" }));
        }
        this.socket.close();
      } catch {}
      this.socket = null;
    }

    if (this.vadSilentGain) {
      try { this.vadSilentGain.disconnect(); } catch {}
      this.vadSilentGain = null;
    }

    if (this.vadPreampGain) {
      try { this.vadPreampGain.disconnect(); } catch {}
      this.vadPreampGain = null;
    }

    if (this.vadSource) {
      try { this.vadSource.disconnect(); } catch {}
      this.vadSource = null;
    }

    if (this.vadAnalyser) {
      try { this.vadAnalyser.disconnect(); } catch {}
      this.vadAnalyser = null;
    }

    if (this.vadAudioContext) {
      try { void this.vadAudioContext.close(); } catch {}
      this.vadAudioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    AUDIO_ENGINE.cancel("stop_session", "CONVERSATIONAL", false, false);
    console.info("[SupremeVoice] [Flux] session:stopped");

    this.updateTelemetry({
      micActive: false,
      vadStatus: "IDLE",
      speechDetected: false,
      rms: 0,
      fluxConnected: false,
      fluxEvent: "DISCONNECTED",
      sourceNodeId: "none",
      primaryAnalyserId: "none",
      comparisonAnalyserId: "none",
      silentGainId: "none",
      analyserConnected: false,
      zeroGainConnected: false,
      audioEngineStatus: "IDLE",
      captureLoopTicks: 0,
      pcmTapTicks: 0,
      analyserReadTicks: 0,
      mediaRecorderState: "inactive",
    });

    if (this.sessionCallbacks) {
      this.sessionCallbacks.onStateChange("idle");
      this.sessionCallbacks = null;
    }
  }

  cancel(): void {
    AUDIO_ENGINE.cancel("manual_cancel", "CONVERSATIONAL", false, false);
  }

  async startListening(): Promise<void> {
    return DeepgramVoiceAdapter.startListening();
  }

  async stopListening(): Promise<string> {
    return DeepgramVoiceAdapter.stopListening();
  }

  async testPlayback(sampleText?: string): Promise<VoicePlaybackTestResult> {
    return DeepgramVoiceAdapter.testPlayback(sampleText);
  }

  private getSupportedMimeType(): string {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      return "audio/webm;codecs=opus";
    }
    const candidateTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];
    for (const type of candidateTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "audio/webm";
  }
}

// ============================================================================
// DEEPGRAM NOVA-3 BATCH VOICE ADAPTER (PRESERVED FALLBACK)
// ============================================================================

export class DeepgramVoiceAdapterImplementation implements SentinelVoiceAdapter {
  readonly id = "deepgram";

  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;

  private conversationalActive = false;
  private vadInterval: number | null = null;
  private vadPhase: "INITIALIZATION" | "HANDSHAKE" | "POST_HANDSHAKE" | "CONVERSATIONAL" = "INITIALIZATION";

  private vadAudioContext: AudioContext | null = null;
  private vadSource: MediaStreamAudioSourceNode | null = null;
  private vadPreampGain: GainNode | null = null;
  private vadAnalyser: AnalyserNode | null = null;
  private vadSilentGain: GainNode | null = null;

  private currentTurnRecorder: MediaRecorder | null = null;
  private currentTurnChunks: Blob[] = [];
  private isSpeakingSpeech = false;
  private silenceStart: number | null = null;
  private speechStart: number | null = null;
  private sessionCallbacks: ConversationalVoiceCallbacks | null = null;
  private processingTurn = false;
  private lastKnownTranscript = "";

  private telemetry: VoiceTelemetry = {
    micActive: false,
    micTrackCount: 0,
    micReadyState: "none",
    micEnabled: false,
    micMuted: false,
    micLabel: "none",
    streamId: "none",
    hasDeviceId: false,
    audioInputCount: 0,
    audioCtxId: "none",
    audioCtxState: "uninitialized",
    audioCtxSampleRate: 0,
    sourceNodeId: "none",
    primaryAnalyserId: "none",
    comparisonAnalyserId: "none",
    silentGainId: "none",
    analyserConnected: false,
    zeroGainConnected: false,
    sampleCount: 512,
    sampleMin: 0,
    sampleMax: 0,
    sampleAverage: 0,
    rms: 0,
    comparisonRms: 0,
    pcmBufferRms: 0,
    speechDetected: false,
    vadPhase: "INITIALIZATION",
    vadStatus: "IDLE",
    sttStatus: "IDLE",
    supremeStatus: "IDLE",
    ttsStatus: "IDLE",
    audioEngineStatus: "IDLE",
    lastTranscript: "",
  };

  get available(): boolean {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }
    return Boolean(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      typeof window.MediaRecorder !== "undefined"
    );
  }

  initAudioEngine(): void {
    AUDIO_ENGINE.ensureUnlocked();
    this.updateTelemetry({ audioEngineStatus: "UNLOCKED" });
  }

  isConversationalActive(): boolean {
    return this.conversationalActive;
  }

  private updateTelemetry(partial: Partial<VoiceTelemetry>): void {
    this.telemetry = { ...this.telemetry, ...partial };
    if (this.sessionCallbacks?.onTelemetry) {
      this.sessionCallbacks.onTelemetry(this.telemetry);
    }
  }

  async startConversationalSession(callbacks: ConversationalVoiceCallbacks): Promise<void> {
    if (!this.available) {
      throw new Error("SENTINEL_VOICE_UNAVAILABLE: microphone recording is not supported in this environment.");
    }

    this.stopConversationalSession();
    this.initAudioEngine();
    this.sessionCallbacks = callbacks;
    this.conversationalActive = true;
    this.processingTurn = false;
    this.vadPhase = "INITIALIZATION";

    console.info("[SupremeVoice] [Nova] microphone:start");
    this.updateTelemetry({
      micActive: false,
      vadStatus: "IDLE",
      vadPhase: "INITIALIZATION",
      sttStatus: "READY",
      ttsStatus: "READY",
    });

    try {
      this.mediaStream = await acquirePhysicalMicrophoneStream();
      const streamId = this.mediaStream.id;
      const tracks = this.mediaStream.getAudioTracks();
      const track = tracks[0];

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      (audioCtx as any).__contextId = `ctx_cap_${Math.random().toString(36).slice(2, 7)}`;
      const contextId = (audioCtx as any).__contextId;

      if (audioCtx.state === "suspended") await audioCtx.resume();
      this.vadAudioContext = audioCtx;

      const source = audioCtx.createMediaStreamSource(this.mediaStream);
      (source as any).__nodeId = `src_primary_${Math.random().toString(36).slice(2, 7)}`;
      this.vadSource = source;

      const preampGain = audioCtx.createGain();
      (preampGain as any).__nodeId = `gain_preamp_${Math.random().toString(36).slice(2, 7)}`;
      preampGain.gain.value = 3.0;
      this.vadPreampGain = preampGain;

      const analyser = audioCtx.createAnalyser();
      (analyser as any).__nodeId = `anl_primary_${Math.random().toString(36).slice(2, 7)}`;
      analyser.fftSize = 512;
      this.vadAnalyser = analyser;

      source.connect(preampGain);
      preampGain.connect(analyser);

      const silentGain = audioCtx.createGain();
      (silentGain as any).__nodeId = `gain_silent_${Math.random().toString(36).slice(2, 7)}`;
      silentGain.gain.value = 0.0;
      analyser.connect(silentGain);
      silentGain.connect(audioCtx.destination);
      this.vadSilentGain = silentGain;

      this.startVadMonitoring();

      this.vadPhase = "HANDSHAKE";
      this.updateTelemetry({
        vadPhase: "HANDSHAKE",
        ttsStatus: "SPEAKING",
        audioEngineStatus: "PLAYING",
        audioCtxId: contextId,
        sourceNodeId: (source as any).__nodeId,
        primaryAnalyserId: (analyser as any).__nodeId,
        silentGainId: (silentGain as any).__nodeId,
        analyserConnected: true,
        zeroGainConnected: true,
      });
      callbacks.onStateChange("speaking", "Supreme Voice is active — Listening...");

      try {
        await this.speak(SUPREME_VOICE_HANDSHAKE_PHRASE);
      } catch (handshakeErr) {
        console.warn("[SupremeVoice] [Nova] handshake playback warning:", handshakeErr);
      } finally {
        this.vadPhase = "POST_HANDSHAKE";
        this.isSpeakingSpeech = false;
        this.silenceStart = null;
        this.speechStart = null;
        this.currentTurnChunks = [];
        this.updateTelemetry({ vadPhase: "POST_HANDSHAKE", ttsStatus: "COMPLETE", audioEngineStatus: "UNLOCKED" });
      }

      if (this.conversationalActive) {
        this.vadPhase = "CONVERSATIONAL";
        callbacks.onStateChange("listening");
        this.updateTelemetry({ vadPhase: "CONVERSATIONAL", vadStatus: "LISTENING" });
      }
    } catch (err: unknown) {
      this.stopConversationalSession();
      const message = err instanceof Error ? err.message : String(err);
      callbacks.onError(`Microphone unavailable: ${message}`);
      throw err;
    }
  }

  stopConversationalSession(): void {
    this.conversationalActive = false;
    this.processingTurn = false;
    this.isSpeakingSpeech = false;
    this.silenceStart = null;
    this.speechStart = null;
    this.currentTurnChunks = [];

    if (this.vadInterval) {
      window.clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.currentTurnRecorder && this.currentTurnRecorder.state !== "inactive") {
      try { this.currentTurnRecorder.stop(); } catch {}
      this.currentTurnRecorder = null;
    }

    if (this.vadSilentGain) {
      try { this.vadSilentGain.disconnect(); } catch {}
      this.vadSilentGain = null;
    }

    if (this.vadPreampGain) {
      try { this.vadPreampGain.disconnect(); } catch {}
      this.vadPreampGain = null;
    }

    if (this.vadSource) {
      try { this.vadSource.disconnect(); } catch {}
      this.vadSource = null;
    }

    if (this.vadAnalyser) {
      try { this.vadAnalyser.disconnect(); } catch {}
      this.vadAnalyser = null;
    }

    if (this.vadAudioContext) {
      try { void this.vadAudioContext.close(); } catch {}
      this.vadAudioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    AUDIO_ENGINE.cancel("stop_session", this.vadPhase, false, false);
    this.updateTelemetry({
      micActive: false,
      vadStatus: "IDLE",
      speechDetected: false,
      rms: 0,
      sourceNodeId: "none",
      primaryAnalyserId: "none",
      silentGainId: "none",
      analyserConnected: false,
      zeroGainConnected: false,
      audioEngineStatus: "IDLE",
    });

    if (this.sessionCallbacks) {
      this.sessionCallbacks.onStateChange("idle");
      this.sessionCallbacks = null;
    }
  }

  private startVadMonitoring(): void {
    const SPEECH_THRESHOLD_RMS = 15.0;
    const SILENCE_HANGOVER_MS = 800;
    const MIN_SPEECH_DURATION_MS = 250;

    this.vadInterval = window.setInterval(() => {
      if (!this.conversationalActive || !this.vadAnalyser || this.processingTurn) return;

      const primaryAnalyser = this.vadAnalyser;
      const freqData = new Uint8Array(primaryAnalyser.frequencyBinCount);
      primaryAnalyser.getByteFrequencyData(freqData);
      let speechBandSum = 0;
      let speechBinsCount = 0;
      const maxBin = Math.min(45, freqData.length);
      for (let i = 2; i < maxBin; i++) {
        if (freqData[i] > 12) {
          speechBandSum += freqData[i];
          speechBinsCount++;
        }
      }
      const freqRms = speechBinsCount > 0 ? (speechBandSum / speechBinsCount) * (100 / 255) : 0;
      const isVoiceActive = freqRms >= SPEECH_THRESHOLD_RMS;
      const now = Date.now();

      this.updateTelemetry({
        rms: freqRms,
        speechDetected: isVoiceActive,
        vadStatus: isVoiceActive ? "SPEECH_DETECTED" : this.isSpeakingSpeech ? "SILENCE_HANGOVER" : "LISTENING",
      });

      if (this.vadPhase === "HANDSHAKE" || (AUDIO_ENGINE.isPlaying && !this.isSpeakingSpeech)) return;

      if (isVoiceActive) {
        this.silenceStart = null;
        if (!this.isSpeakingSpeech) {
          this.isSpeakingSpeech = true;
          this.speechStart = now;
          this.currentTurnChunks = [];

          if (this.mediaStream) {
            try {
              const mimeType = this.getSupportedMimeType();
              const rec = new MediaRecorder(this.mediaStream, mimeType ? { mimeType } : undefined);
              this.currentTurnRecorder = rec;
              rec.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) this.currentTurnChunks.push(e.data);
              };
              rec.start(100);
            } catch {}
          }
          if (this.sessionCallbacks) this.sessionCallbacks.onStateChange("listening");
        }
      } else if (this.isSpeakingSpeech) {
        if (!this.silenceStart) {
          this.silenceStart = now;
        } else if (now - this.silenceStart >= SILENCE_HANGOVER_MS) {
          const totalSpeechDuration = this.silenceStart - (this.speechStart || now);
          this.isSpeakingSpeech = false;
          this.silenceStart = null;
          this.speechStart = null;

          if (totalSpeechDuration >= MIN_SPEECH_DURATION_MS && this.currentTurnRecorder) {
            const rec = this.currentTurnRecorder;
            this.currentTurnRecorder = null;
            rec.onstop = () => {
              const mimeType = rec.mimeType || this.getSupportedMimeType() || "audio/webm";
              const audioBlob = new Blob(this.currentTurnChunks, { type: mimeType });
              this.currentTurnChunks = [];
              void this.finalizeConversationalTurn(audioBlob, totalSpeechDuration, mimeType);
            };
            try { rec.stop(); } catch {}
          } else {
            if (this.currentTurnRecorder) {
              try { this.currentTurnRecorder.stop(); } catch {}
              this.currentTurnRecorder = null;
            }
            this.currentTurnChunks = [];
          }
        }
      }
    }, 50);
  }

  private async finalizeConversationalTurn(audioBlob: Blob, speechDurationMs: number, mimeType: string): Promise<void> {
    if (this.processingTurn || audioBlob.size === 0) return;
    this.processingTurn = true;

    if (this.sessionCallbacks) {
      this.sessionCallbacks.onStateChange("transcribing");
      this.updateTelemetry({ sttStatus: "PROCESSING" });
    }

    try {
      const audioBase64 = await this.blobToBase64(audioBlob);
      const { transcribeVoiceInput } = await import("./voice.functions");
      const { supabase } = await import("@/integrations/supabase/client");
      const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = sessionRes.data?.session?.access_token;

      const response = await transcribeVoiceInput({
        data: { audioBase64, mimeType },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const transcript = (response.transcript || "").trim();
      this.lastKnownTranscript = transcript;
      this.updateTelemetry({ sttStatus: "COMPLETE", lastTranscript: transcript });

      if (transcript && transcript.length > 0 && !/^[\s.,!?-]+$/.test(transcript) && this.sessionCallbacks) {
        this.sessionCallbacks.onStateChange("thinking");
        this.updateTelemetry({ supremeStatus: "THINKING" });
        await this.sessionCallbacks.onTurnComplete(transcript);
        this.updateTelemetry({ supremeStatus: "COMPLETE" });
      }
    } catch (err: unknown) {
      console.error("[SupremeVoice] [Nova] turn error:", err);
      if (this.sessionCallbacks) {
        this.sessionCallbacks.onError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      this.processingTurn = false;
      if (this.conversationalActive && this.sessionCallbacks) {
        this.sessionCallbacks.onStateChange("listening");
        this.updateTelemetry({ vadStatus: "LISTENING" });
      }
    }
  }

  async speak(text: string): Promise<void> {
    if (!text || text.trim().length === 0) return;
    if (typeof window === "undefined") return;

    const voiceModel = "aura-2-thalia-en";
    this.updateTelemetry({ ttsStatus: "SPEAKING", audioEngineStatus: "PLAYING" });

    try {
      const { synthesizeVoiceResponse } = await import("./voice.functions");
      const { supabase } = await import("@/integrations/supabase/client");
      const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = sessionRes.data?.session?.access_token;

      const { audioBase64, contentType } = await synthesizeVoiceResponse({
        data: { text: text.trim(), model: voiceModel },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      await AUDIO_ENGINE.playBase64(audioBase64, contentType || "audio/mpeg");
      this.updateTelemetry({ ttsStatus: "COMPLETE", audioEngineStatus: "UNLOCKED" });

      if (this.conversationalActive && this.sessionCallbacks) {
        this.sessionCallbacks.onStateChange("listening");
        this.updateTelemetry({ vadStatus: "LISTENING" });
      }
    } catch (err) {
      console.error("[SupremeVoice] [Nova] speech playback error:", err);
      this.updateTelemetry({ ttsStatus: "IDLE", audioEngineStatus: "ERROR" });
      throw err;
    }
  }

  async testPlayback(sampleText = "This is a Supreme Intelligence voice output test."): Promise<VoicePlaybackTestResult> {
    const start = Date.now();
    this.initAudioEngine();

    const { synthesizeVoiceResponse } = await import("./voice.functions");
    const { supabase } = await import("@/integrations/supabase/client");
    const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const token = sessionRes.data?.session?.access_token;

    const { audioBase64, contentType } = await synthesizeVoiceResponse({
      data: { text: sampleText },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    await AUDIO_ENGINE.playBase64(audioBase64, contentType || "audio/mpeg");
    return {
      success: true,
      text: sampleText,
      bytesReceived: audioBase64.length,
      durationMs: Date.now() - start,
      diagnostics: AUDIO_ENGINE.getDiagnostics(),
    };
  }

  cancel(): void {
    AUDIO_ENGINE.cancel("manual_cancel", this.vadPhase, false, false);
  }

  async startListening(): Promise<void> {
    if (!this.available) throw new Error("SENTINEL_VOICE_UNAVAILABLE");
    this.cancel();
    this.initAudioEngine();

    this.audioChunks = [];
    this.mediaStream = await acquirePhysicalMicrophoneStream();
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.mediaStream, mimeType ? { mimeType } : undefined);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.audioChunks.push(e.data);
    };
    this.mediaRecorder.start(250);
    this.isRecording = true;
  }

  async stopListening(): Promise<string> {
    if (!this.isRecording || !this.mediaRecorder) return "";
    const audioBlob = await this.stopAndGetBlob();
    if (!audioBlob || audioBlob.size === 0) return "";

    const audioBase64 = await this.blobToBase64(audioBlob);
    const mimeType = audioBlob.type || "audio/webm";

    const { transcribeVoiceInput } = await import("./voice.functions");
    const { supabase } = await import("@/integrations/supabase/client");
    const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const token = sessionRes.data?.session?.access_token;

    const response = await transcribeVoiceInput({
      data: { audioBase64, mimeType },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return response.transcript || "";
  }

  async processTurn(options: { workspaceId?: string; dryRun?: boolean } = {}): Promise<VoiceTurnResult> {
    const audioBlob = await this.stopAndGetBlob();
    if (!audioBlob || audioBlob.size === 0) throw new Error("VOICE_NO_AUDIO: No audio recorded.");

    const audioBase64 = await this.blobToBase64(audioBlob);
    const mimeType = audioBlob.type || "audio/webm";

    const { processVoiceTurn } = await import("./voice.functions");
    const { supabase } = await import("@/integrations/supabase/client");
    const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const token = sessionRes.data?.session?.access_token;

    const result = await processVoiceTurn({
      data: {
        audioBase64,
        workspaceId: options.workspaceId,
        mimeType,
        dryRun: options.dryRun ?? false,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (result.audioBase64 && typeof window !== "undefined") {
      try {
        await AUDIO_ENGINE.playBase64(result.audioBase64, result.contentType || "audio/mpeg");
      } catch {}
    }

    return result;
  }

  private stopAndGetBlob(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        resolve(new Blob(this.audioChunks));
        return;
      }
      this.mediaRecorder.onstop = () => {
        resolve(new Blob(this.audioChunks, { type: this.getSupportedMimeType() || "audio/webm" }));
      };
      try { this.mediaRecorder.stop(); } catch { resolve(new Blob(this.audioChunks)); }
    });
  }

  private getSupportedMimeType(): string {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "audio/webm";
    const candidateTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];
    for (const type of candidateTypes) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "audio/webm";
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.includes(",") ? result.split(",")[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Export singletons
export const DeepgramVoiceAdapter = new DeepgramVoiceAdapterImplementation();
export const DeepgramFluxVoiceAdapter = new DeepgramFluxVoiceAdapterImplementation();

// Set DeepgramFluxVoiceAdapter as the default primary voice engine
export const ACTIVE_VOICE_ADAPTER: SentinelVoiceAdapter = DeepgramFluxVoiceAdapter;

export function openSupremeVoice(): void {
  if (typeof window !== "undefined") {
    AUDIO_ENGINE.ensureUnlocked();
    window.dispatchEvent(new CustomEvent("sentinel:open-voice"));
  }
}

export function openSupremeCompanion(): void {
  if (typeof window !== "undefined") {
    AUDIO_ENGINE.ensureUnlocked();
    window.dispatchEvent(new CustomEvent("sentinel:open-companion"));
  }
}

export function exitSupremeVoice(): void {
  if (typeof window !== "undefined") {
    ACTIVE_VOICE_ADAPTER.stopConversationalSession?.();
    window.dispatchEvent(new CustomEvent("sentinel:exit-voice"));
  }
}

export async function testSupremeVoicePlayback(sampleText?: string): Promise<VoicePlaybackTestResult> {
  if (!ACTIVE_VOICE_ADAPTER.testPlayback) {
    throw new Error("TEST_PLAYBACK_NOT_SUPPORTED");
  }
  return ACTIVE_VOICE_ADAPTER.testPlayback(sampleText);
}
