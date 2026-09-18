/**
 * SENTINEL FORT — Persistent Web Audio Engine & Playback Forensics
 *
 * Provides resilient, low-latency audio playback for Supreme Intelligence responses:
 * 1. Pre-warms & unlocks Web Audio AudioContext synchronously on user interaction.
 * 2. Decodes binary audio streams via AudioContext.decodeAudioData (cross-browser).
 * 3. Plays audio via AudioBufferSourceNode + GainNode with precise onended events.
 * 4. Full forensic lifecycle instrumentation:
 *    - [SupremeVoice] AUDIO_DECODE_START
 *    - [SupremeVoice] AUDIO_DECODE_COMPLETE
 *    - [SupremeVoice] AUDIO_SOURCE_CREATED
 *    - [SupremeVoice] AUDIO_SOURCE_START
 *    - [SupremeVoice] AUDIO_PLAY_START
 *    - [SupremeVoice] AUDIO_PLAY_COMPLETE
 *    - [SupremeVoice] AUDIO_CANCEL
 */

export interface AudioEngineDiagnostics {
  contextState: string;
  isUnlocked: boolean;
  isPlaying: boolean;
  bytesPlayed: number;
}

export class SentinelAudioEngine {
  private audioContext: AudioContext | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private fallbackAudio: HTMLAudioElement | null = null;
  private _isUnlocked = false;
  private _isPlaying = false;
  private _bytesPlayed = 0;
  private stateListeners: Set<(isPlaying: boolean) => void> = new Set();

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get isUnlocked(): boolean {
    return this._isUnlocked;
  }

  getAudioContext(): AudioContext | null {
    this.ensureUnlocked();
    return this.audioContext;
  }

  subscribe(listener: (isPlaying: boolean) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyState(playing: boolean): void {
    this._isPlaying = playing;
    this.stateListeners.forEach((fn) => {
      try {
        fn(playing);
      } catch {}
    });
  }

  /**
   * Must be called during a direct user gesture (e.g. clicking VOICE or mic).
   * Unlocks the AudioContext so subsequent async TTS plays without autoplay errors.
   */
  ensureUnlocked(): void {
    if (typeof window === "undefined") return;

    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          this.gainNode = this.audioContext.createGain();
          this.gainNode.gain.value = 1.0;
          this.gainNode.connect(this.audioContext.destination);
          console.info("[SupremeVoice] audio:engine-state initialized ->", this.audioContext.state);
        }
      }

      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume().catch((err) => {
          console.warn("[SupremeVoice] audio:resume error:", err);
        });
      }

      // Play a 1-sample silent buffer to unlock mobile/Safari/Chrome media pipeline
      if (this.audioContext && !this._isUnlocked) {
        const buffer = this.audioContext.createBuffer(1, 1, 22050);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.gainNode || this.audioContext.destination);
        source.start(0);
        this._isUnlocked = true;
        console.info("[SupremeVoice] audio:unlocked via user gesture");
      }
    } catch (err) {
      console.warn("[SupremeVoice] audio:ensureUnlocked error:", err);
    }
  }

  /**
   * Cross-browser decode supporting both Promise and callback syntax.
   */
  private decodeAudio(audioCtx: AudioContext, buffer: ArrayBuffer, mimeType = "audio/mpeg"): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      console.log("[SupremeVoice] AUDIO_DECODE_START", {
        byteLength: buffer.byteLength,
        mimeType,
      });

      const copy = buffer.slice(0);
      try {
        const res = audioCtx.decodeAudioData(
          copy,
          (decoded) => {
            console.log("[SupremeVoice] AUDIO_DECODE_COMPLETE", {
              success: true,
              durationMs: Math.round(decoded.duration * 1000),
              sampleRate: decoded.sampleRate,
              channels: decoded.numberOfChannels,
            });
            resolve(decoded);
          },
          (err) => {
            console.error("[SupremeVoice] AUDIO_DECODE_ERROR:", err);
            reject(err);
          }
        );
        if (res && typeof (res as any).then === "function") {
          (res as any)
            .then((decoded: AudioBuffer) => {
              console.log("[SupremeVoice] AUDIO_DECODE_COMPLETE", {
                success: true,
                durationMs: Math.round(decoded.duration * 1000),
                sampleRate: decoded.sampleRate,
                channels: decoded.numberOfChannels,
              });
              resolve(decoded);
            })
            .catch((err: unknown) => {
              console.error("[SupremeVoice] AUDIO_DECODE_ERROR (promise):", err);
              reject(err);
            });
        }
      } catch (err) {
        console.error("[SupremeVoice] AUDIO_DECODE_ERROR (sync):", err);
        reject(err);
      }
    });
  }

  /**
   * Play binary ArrayBuffer audio (e.g. MP3 from Deepgram TTS).
   */
  async playBuffer(arrayBuffer: ArrayBuffer, mimeType = "audio/mpeg"): Promise<void> {
    if (typeof window === "undefined") return;
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error("AUDIO_ENGINE_EMPTY_BUFFER: Cannot play empty audio buffer.");
    }

    this.ensureUnlocked();

    // Strategy A: Web Audio API (preferred: zero autoplay rejection when unlocked)
    if (this.audioContext) {
      try {
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }

        const audioBuffer = await this.decodeAudio(this.audioContext, arrayBuffer, mimeType);

        if (!audioBuffer || audioBuffer.duration <= 0 || audioBuffer.sampleRate <= 0 || audioBuffer.numberOfChannels <= 0) {
          throw new Error("AUDIO_ENGINE_INVALID_BUFFER: AudioBuffer duration or channels is zero.");
        }

        const sourceNode = this.audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(this.gainNode || this.audioContext.destination);

        const durationMs = Math.round(audioBuffer.duration * 1000);

        console.log("[SupremeVoice] AUDIO_SOURCE_CREATED", {
          durationMs,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
        });

        this.currentSourceNode = sourceNode;
        this.notifyState(true);
        this._bytesPlayed += arrayBuffer.byteLength;

        console.log("[SupremeVoice] AUDIO_SOURCE_START", {
          audioContextState: this.audioContext.state,
          durationMs,
        });

        console.log("[SupremeVoice] AUDIO_PLAY_START", {
          durationMs,
        });

        return await new Promise<void>((resolve, reject) => {
          sourceNode.onended = () => {
            console.log("[SupremeVoice] AUDIO_PLAY_COMPLETE", {
              completed: true,
            });
            if (this.currentSourceNode === sourceNode) {
              this.currentSourceNode = null;
              this.notifyState(false);
            }
            resolve();
          };

          try {
            sourceNode.start(0);
          } catch (startErr) {
            console.error("[SupremeVoice] audio:play-error:", startErr);
            this.currentSourceNode = null;
            this.notifyState(false);
            reject(startErr);
          }
        });
      } catch (decodeErr) {
        console.warn("[SupremeVoice] Web Audio decode failed, trying HTMLAudioElement fallback:", decodeErr);
      }
    }

    // Strategy B: Fallback HTMLAudioElement with Base64 blob URL
    const blob = new Blob([arrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this.fallbackAudio = audio;
    this.notifyState(true);

    console.log("[SupremeVoice] AUDIO_PLAY_START", { fallback: true });

    return await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        console.log("[SupremeVoice] AUDIO_PLAY_COMPLETE", { completed: true, fallback: true });
        URL.revokeObjectURL(url);
        this.fallbackAudio = null;
        this.notifyState(false);
        resolve();
      };
      audio.onerror = () => {
        console.error("[SupremeVoice] audio:play-error (fallback)");
        URL.revokeObjectURL(url);
        this.fallbackAudio = null;
        this.notifyState(false);
        reject(new Error("AUDIO_PLAYBACK_ELEMENT_ERROR: Failed to play audio element."));
      };
      audio.play().catch((playErr) => {
        console.error("[SupremeVoice] audio:play-error (fallback play failed):", playErr);
        URL.revokeObjectURL(url);
        this.fallbackAudio = null;
        this.notifyState(false);
        reject(playErr);
      });
    });
  }

  /**
   * Play Base64 encoded audio.
   */
  async playBase64(base64: string, mimeType = "audio/mpeg"): Promise<void> {
    if (!base64 || base64.trim().length === 0) {
      throw new Error("AUDIO_ENGINE_EMPTY_PAYLOAD: Cannot play empty base64 audio.");
    }

    const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    const binaryString = window.atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return this.playBuffer(bytes.buffer, mimeType);
  }

  /**
   * Immediately stops any currently playing audio (barge-in / interruption).
   */
  cancel(reason = "user_cancel", phase = "CONVERSATIONAL", userSpeechDetected = false, bargeInDetected = false): void {
    const sourceActive = Boolean(this.currentSourceNode || this.fallbackAudio);

    if (sourceActive) {
      console.log("[SupremeVoice] AUDIO_CANCEL", {
        timestamp: Date.now(),
        reason,
        phase,
        sourceActive,
        userSpeechDetected,
        bargeInDetected,
      });
    }

    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop(0);
        this.currentSourceNode.disconnect();
      } catch {}
      this.currentSourceNode = null;
    }

    if (this.fallbackAudio) {
      try {
        this.fallbackAudio.pause();
        this.fallbackAudio.currentTime = 0;
      } catch {}
      this.fallbackAudio = null;
    }

    this.notifyState(false);
  }

  getDiagnostics(): AudioEngineDiagnostics {
    return {
      contextState: this.audioContext?.state ?? "uninitialized",
      isUnlocked: this._isUnlocked,
      isPlaying: this._isPlaying,
      bytesPlayed: this._bytesPlayed,
    };
  }
}

export const AUDIO_ENGINE = new SentinelAudioEngine();
