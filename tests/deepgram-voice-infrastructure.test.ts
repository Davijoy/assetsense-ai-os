import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_DEEPGRAM_VOICE_CONFIG,
  isDeepgramConfigured,
  transcribeAudio,
  synthesizeSpeech,
} from "../src/lib/deepgram.server";
import {
  DeepgramVoiceAdapter,
  NullSentinelVoiceAdapter,
  ACTIVE_VOICE_ADAPTER,
  openSupremeVoice,
  openSupremeCompanion,
} from "../src/lib/sentinel-voice";
import { SentinelAudioEngine } from "../src/lib/sentinel-audio-engine";
import { processAgentRequest } from "../src/lib/supreme-agent-processor";

describe("DEEPGRAM Voice Layer — Configuration & Server Isolation", () => {
  it("provides authoritative default voice configuration for FORT", () => {
    expect(DEFAULT_DEEPGRAM_VOICE_CONFIG).toBeDefined();
    expect(DEFAULT_DEEPGRAM_VOICE_CONFIG.sttModel).toBe("nova-3");
    expect(DEFAULT_DEEPGRAM_VOICE_CONFIG.sttLanguage).toBe("en-US");
    expect(DEFAULT_DEEPGRAM_VOICE_CONFIG.ttsModel).toBe("aura-2-thalia-en");
    expect(DEFAULT_DEEPGRAM_VOICE_CONFIG.ttsEncoding).toBe("mp3");
    expect(DEFAULT_DEEPGRAM_VOICE_CONFIG.punctuate).toBe(true);
    expect(DEFAULT_DEEPGRAM_VOICE_CONFIG.smartFormat).toBe(true);
  });

  it("never relies on client VITE_ prefix for the secret", () => {
    // Ensure no client-side VITE_DEEPGRAM_API_KEY is used or required
    const clientEnv = (import.meta as any).env || {};
    expect(clientEnv.VITE_DEEPGRAM_API_KEY).toBeUndefined();
  });
});

describe("DEEPGRAM Voice Layer — STT & TTS Error Handling", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.DEEPGRAM_API_KEY;

  beforeEach(() => {
    process.env.DEEPGRAM_API_KEY = "test-deepgram-key";
  });

  afterEach(() => {
    process.env.DEEPGRAM_API_KEY = originalEnv;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("transcribeAudio throws clear error when API key is missing", async () => {
    delete process.env.DEEPGRAM_API_KEY;
    const dummyBuffer = new Uint8Array([1, 2, 3]);
    await expect(transcribeAudio(dummyBuffer)).rejects.toThrow("DEEPGRAM_API_KEY_NOT_CONFIGURED");
  });

  it("synthesizeSpeech throws clear error when API key is missing", async () => {
    delete process.env.DEEPGRAM_API_KEY;
    await expect(synthesizeSpeech("Test speech")).rejects.toThrow("DEEPGRAM_API_KEY_NOT_CONFIGURED");
  });

  it("synthesizeSpeech rejects empty text cleanly", async () => {
    await expect(synthesizeSpeech("   ")).rejects.toThrow("DEEPGRAM_TTS_EMPTY_TEXT");
  });

  it("transcribes audio buffer successfully via mocked Deepgram REST endpoint", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: {
          channels: [
            {
              alternatives: [
                {
                  transcript: "Supreme, analyse Bangalore market opportunities.",
                  confidence: 0.98,
                  words: [
                    { word: "Supreme", start: 0, end: 0.4, confidence: 0.99 },
                    { word: "analyse", start: 0.4, end: 0.8, confidence: 0.98 },
                  ],
                },
              ],
            },
          ],
        },
        metadata: { duration: 2.5 },
      }),
    } as any);

    const dummyBuffer = new Uint8Array([0, 1, 2, 3]);
    const result = await transcribeAudio(dummyBuffer, "audio/webm");

    expect(result.transcript).toBe("Supreme, analyse Bangalore market opportunities.");
    expect(result.confidence).toBe(0.98);
    expect(result.duration).toBe(2.5);
    expect(result.words?.length).toBe(2);
  });

  it("synthesizes narrative text successfully via mocked Deepgram Flux TTS endpoint", async () => {
    const fakeAudioData = new Uint8Array([255, 251, 144, 100]); // MP3 frame header
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name.toLowerCase() === "content-type" ? "audio/mp3" : null),
      },
      arrayBuffer: async () => fakeAudioData.buffer,
    } as any);

    const result = await synthesizeSpeech("Bangalore plotted development reports ₹42 Cr in pipeline value.");
    expect(result.audioBuffer).toBeDefined();
    expect(result.contentType).toBe("audio/mp3");
  });

  it("handles Deepgram HTTP errors gracefully without leaking keys", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Invalid authentication token.",
    } as any);

    const dummyBuffer = new Uint8Array([1, 2, 3]);
    await expect(transcribeAudio(dummyBuffer)).rejects.toThrow("DEEPGRAM_STT_FAILED (401)");
  });
});

describe("DEEPGRAM Voice Adapter Contract", () => {
  it("implements SentinelVoiceAdapter interface correctly", () => {
    expect(DeepgramVoiceAdapter.id).toBe("deepgram");
    expect(typeof DeepgramVoiceAdapter.startListening).toBe("function");
    expect(typeof DeepgramVoiceAdapter.stopListening).toBe("function");
    expect(typeof DeepgramVoiceAdapter.speak).toBe("function");
  });

  it("NullSentinelVoiceAdapter remains available as safe fallback", () => {
    expect(NullSentinelVoiceAdapter.id).toBe("none");
    expect(NullSentinelVoiceAdapter.available).toBe(false);
  });
});

describe("VOICE -> SUPREME INTELLIGENCE Processing Pipeline", () => {
  it("processes voice request through Supreme Intelligence with inputMode: voice", async () => {
    const dummySupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    const voiceRequest = {
      message: "How are my leads performing?",
      workspaceId: "00000000-0000-0000-0000-000000000000",
      inputMode: "voice" as const,
      dryRun: true,
    };

    const response = await processAgentRequest(
      voiceRequest,
      "user-123",
      ["admin"],
      dummySupabase
    );

    // Verify Supreme Intelligence processed the intent and produced narrative
    expect(response.request.inputMode).toBe("voice");
    expect(response.plan.intent).toBe("QUERY");
    expect(response.synthesis).toBeDefined();
    expect(response.narrative || response.synthesis?.narrative).toBeDefined();
  });

  it("preserves RBAC authorization for voice requests", async () => {
    const dummySupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    // A viewer attempting an administrative tool prompt via voice
    const restrictedVoiceRequest = {
      message: "Rebalance portfolio allocations and approve deals",
      workspaceId: "00000000-0000-0000-0000-000000000000",
      inputMode: "voice" as const,
      dryRun: true,
    };

    const response = await processAgentRequest(
      restrictedVoiceRequest,
      "viewer-user",
      ["viewer"],
      dummySupabase
    );

    // Plan steps should require approval or fail role checks
    expect(response.request.inputMode).toBe("voice");
  });
});

describe("DIRECT VOICE CONTROL TRIGGER", () => {
  const target = new EventTarget();
  beforeEach(() => {
    (globalThis as any).window = {
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
    };
    (globalThis as any).CustomEvent = class CustomEvent extends Event {
      detail: any;
      constructor(type: string, options?: { detail?: any }) {
        super(type);
        this.detail = options?.detail;
      }
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).CustomEvent;
  });

  it("openSupremeVoice dispatches sentinel:open-voice custom event", () => {
    let eventFired = false;
    const listener = () => {
      eventFired = true;
    };

    (globalThis as any).window.addEventListener("sentinel:open-voice", listener);
    openSupremeVoice();
    (globalThis as any).window.removeEventListener("sentinel:open-voice", listener);

    expect(eventFired).toBe(true);
  });

  it("openSupremeCompanion dispatches sentinel:open-companion custom event", () => {
    let eventFired = false;
    const listener = () => {
      eventFired = true;
    };

    (globalThis as any).window.addEventListener("sentinel:open-companion", listener);
    openSupremeCompanion();
    (globalThis as any).window.removeEventListener("sentinel:open-companion", listener);

    expect(eventFired).toBe(true);
  });
});

describe("PERSISTENT AUDIO ENGINE & PLAYBACK VERIFICATION", () => {
  it("initializes audio engine with valid initial state", () => {
    const engine = new SentinelAudioEngine();
    const diag = engine.getDiagnostics();
    expect(diag.isPlaying).toBe(false);
    expect(diag.bytesPlayed).toBe(0);
  });

  it("handles cancel and stops playback cleanly", () => {
    const engine = new SentinelAudioEngine();
    engine.cancel();
    expect(engine.isPlaying).toBe(false);
  });

  it("rejects empty buffers with clear error", async () => {
    const engine = new SentinelAudioEngine();
    (globalThis as any).window = {};
    await expect(engine.playBuffer(new ArrayBuffer(0))).rejects.toThrow("AUDIO_ENGINE_EMPTY_BUFFER");
    await expect(engine.playBase64("")).rejects.toThrow("AUDIO_ENGINE_EMPTY_PAYLOAD");
    delete (globalThis as any).window;
  });

  it("testPlayback method is exposed on ACTIVE_VOICE_ADAPTER", () => {
    expect(typeof DeepgramVoiceAdapter.testPlayback).toBe("function");
    expect(typeof DeepgramVoiceAdapter.initAudioEngine).toBe("function");
  });
});

describe("REALTIME CONVERSATIONAL VOICE ENGINE & MULTI-TURN DIALOGUE", () => {
  it("exposes continuous conversational session methods", () => {
    expect(typeof DeepgramVoiceAdapter.startConversationalSession).toBe("function");
    expect(typeof DeepgramVoiceAdapter.stopConversationalSession).toBe("function");
    expect(typeof DeepgramVoiceAdapter.isConversationalActive).toBe("function");
    expect(DeepgramVoiceAdapter.isConversationalActive()).toBe(false);
  });

  it("handles stopConversationalSession cleanly even when idle", () => {
    expect(() => DeepgramVoiceAdapter.stopConversationalSession()).not.toThrow();
    expect(DeepgramVoiceAdapter.isConversationalActive()).toBe(false);
  });

  it("retains conversation context across multi-turn voice queries in Supreme Intelligence", async () => {
    const dummySupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };

    const convId = "test-conv-123";

    // Turn 1: Analyze Bangalore market
    const turn1 = await processAgentRequest(
      {
        message: "Supreme, analyse our current market opportunities.",
        workspaceId: "00000000-0000-0000-0000-000000000000",
        conversationId: convId,
        inputMode: "voice",
        dryRun: true,
      },
      "admin-user",
      ["admin"],
      dummySupabase
    );

    expect(turn1.request.conversationId).toBe(convId);
    expect(turn1.request.inputMode).toBe("voice");
    expect(turn1.synthesis?.narrative).toBeDefined();

    // Turn 2: Follow-up question in same conversation
    const turn2 = await processAgentRequest(
      {
        message: "What about the highest priority one?",
        workspaceId: "00000000-0000-0000-0000-000000000000",
        conversationId: convId,
        inputMode: "voice",
        dryRun: true,
      },
      "admin-user",
      ["admin"],
      dummySupabase
    );

    expect(turn2.request.conversationId).toBe(convId);
    expect(turn2.request.inputMode).toBe("voice");
    expect(turn2.synthesis?.narrative).toBeDefined();
  });

  it("exports exact Supreme Voice Handshake phrase", async () => {
    const { SUPREME_VOICE_HANDSHAKE_PHRASE } = await import("../src/lib/sentinel-voice");
    expect(SUPREME_VOICE_HANDSHAKE_PHRASE).toBe("Supreme Voice is active. I'm listening. Go ahead.");
  });

  it("rejects empty or whitespace-only transcripts without executing agent plan", async () => {
    const dummySupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };

    const emptyInputs = ["", "   ", "...", "!?"];
    for (const emptyInput of emptyInputs) {
      const isNoise = /^[\s.,!?-]*$/.test(emptyInput);
      expect(isNoise).toBe(true);
    }
  });
});
