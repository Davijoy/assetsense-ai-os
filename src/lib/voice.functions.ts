/**
 * SENTINEL FORT — Voice Server Functions
 *
 * TanStack Start server functions providing authenticated voice endpoints:
 *  - transcribeVoiceInput: Deepgram STT (audio -> text)
 *  - synthesizeVoiceResponse: Deepgram Flux TTS (Supreme narrative -> voice)
 *  - processVoiceTurn: Atomic voice roundtrip (voice in -> STT -> Supreme -> TTS -> audio out)
 *
 * PRESERVES ALL AUTH & RBAC:
 *  - Enforces Supabase auth & application roles via `requireRoles`.
 *  - DEEPGRAM_API_KEY is isolated strictly in server runtime.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireRoles, type AppRole } from "@/integrations/supabase/role-middleware";
import { getCurrentWorkspaceId } from "@/lib/services/workspace.service";
import { isFlagEnabled } from "@/lib/services/feature-flags.service";
import { z } from "zod";
import {
  transcribeAudio,
  synthesizeSpeech,
  isDeepgramConfigured,
  createEphemeralToken,
  DEFAULT_DEEPGRAM_VOICE_CONFIG,
  type DeepgramVoiceConfig,
  type EphemeralTokenResponse,
} from "./deepgram.server";
import type { AgentResponse } from "./supreme-agent-processor";

const ALL_ROLES: AppRole[] = ["admin", "manager", "agent", "viewer", "builder", "developer"];

const transcribeInputSchema = z.object({
  audioBase64: z.string().min(1, "Audio payload required"),
  mimeType: z.string().optional().default("audio/webm"),
  language: z.string().optional(),
});

const synthesizeInputSchema = z.object({
  text: z.string().min(1, "Text payload required"),
  model: z.string().optional(),
});

const voiceTurnInputSchema = z.object({
  audioBase64: z.string().min(1, "Audio payload required"),
  workspaceId: z.string().optional(),
  mimeType: z.string().optional().default("audio/webm"),
  dryRun: z.boolean().optional().default(false),
});

/**
 * Check if the voice layer is configured and available server-side.
 */
export const getVoiceStatus = createServerFn({ method: "GET" })
  .middleware([requireRoles(ALL_ROLES)])
  .handler(async (): Promise<{ available: boolean; config: DeepgramVoiceConfig }> => {
    const available = isDeepgramConfigured();
    return {
      available,
      config: DEFAULT_DEEPGRAM_VOICE_CONFIG,
    };
  });

/**
 * Generate secure, short-lived Deepgram credentials for client-side Flux realtime WebSocket.
 */
export const getEphemeralVoiceToken = createServerFn({ method: "POST" })
  .middleware([requireRoles(ALL_ROLES)])
  .handler(async ({ context }): Promise<EphemeralTokenResponse> => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const workspaceId = await getCurrentWorkspaceId(supabase, userId);
    if (workspaceId) {
      const voiceEnabled = await isFlagEnabled(supabase, workspaceId, "voice");
      if (!voiceEnabled) {
        throw new Error("VOICE_FEATURE_DISABLED: Voice capabilities are disabled by Platform Administration.");
      }
    }
    return createEphemeralToken(60);
  });

/**
 * Transcribe authenticated audio payload to text via Deepgram STT.
 */
export const transcribeVoiceInput = createServerFn({ method: "POST" })
  .middleware([requireRoles(ALL_ROLES)])
  .inputValidator((input: unknown) => transcribeInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ transcript: string; confidence: number; duration: number }> => {
    const audioBuffer = Buffer.from(data.audioBase64, "base64");
    const result = await transcribeAudio(audioBuffer, data.mimeType, {
      language: data.language,
    });
    return {
      transcript: result.transcript,
      confidence: result.confidence,
      duration: result.duration,
    };
  });

/**
 * Synthesize Supreme Intelligence narrative text into audio via Deepgram Flux TTS.
 */
export const synthesizeVoiceResponse = createServerFn({ method: "POST" })
  .middleware([requireRoles(ALL_ROLES)])
  .inputValidator((input: unknown) => synthesizeInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ audioBase64: string; contentType: string }> => {
    const result = await synthesizeSpeech(data.text, {
      model: data.model,
    });
    const audioBase64 = Buffer.from(result.audioBuffer).toString("base64");
    return {
      audioBase64,
      contentType: result.contentType,
    };
  });

export interface VoiceTurnResult {
  transcript: string;
  agentResponse: AgentResponse;
  audioBase64?: string | null;
  contentType?: string;
  voiceAvailable: boolean;
}

/**
 * Atomic Voice Turn:
 * 1. Deepgram STT transcribes user audio.
 * 2. Supreme Intelligence receives the transcript with inputMode: "voice" and orchestrates decision/tools.
 * 3. Deepgram Flux TTS synthesizes the resulting synthesis.narrative.
 * 4. Structured intelligence payload + audio stream returned to client.
 */
export const processVoiceTurn = createServerFn({ method: "POST" })
  .middleware([requireRoles(ALL_ROLES)])
  .inputValidator((input: unknown) => voiceTurnInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<VoiceTurnResult> => {
    const { supabase, userId, roles } = context as {
      supabase: any;
      userId: string;
      roles: string[];
    };

    const voiceAvailable = isDeepgramConfigured();
    if (!voiceAvailable) {
      throw new Error("VOICE_INFRASTRUCTURE_UNAVAILABLE: Deepgram voice layer is not configured.");
    }

    // Resolve workspace
    const workspaceId = data.workspaceId || (await getCurrentWorkspaceId(supabase, userId));
    if (workspaceId) {
      const voiceEnabled = await isFlagEnabled(supabase, workspaceId, "voice");
      if (!voiceEnabled) {
        throw new Error("VOICE_FEATURE_DISABLED: Voice capabilities are disabled by Platform Administration.");
      }
    }

    // 1. STT: Audio -> Text
    const audioBuffer = Buffer.from(data.audioBase64, "base64");
    const sttResult = await transcribeAudio(audioBuffer, data.mimeType);
    const transcript = sttResult.transcript;

    if (!transcript || transcript.trim().length === 0) {
      throw new Error("VOICE_NO_SPEECH_DETECTED: No intelligible speech recognized.");
    }

    // Lazy load processor at request time to preserve client bundling boundaries
    const { processAgentRequest } = await import("./supreme-agent-processor");

    // 2. Supreme Intelligence Brain Processing
    const agentResponse = await processAgentRequest(
      {
        message: transcript,
        workspaceId,
        inputMode: "voice",
        dryRun: data.dryRun ?? false,
      },
      userId,
      roles,
      supabase
    );

    // 3. TTS: Supreme synthesis.narrative -> Deepgram Flux TTS
    const spokenText =
      agentResponse.narrative ||
      agentResponse.synthesis?.narrative ||
      agentResponse.synthesis?.summary ||
      "Sentinel processing complete.";

    let audioBase64: string | null = null;
    let contentType = "audio/mp3";

    try {
      const ttsResult = await synthesizeSpeech(spokenText);
      audioBase64 = Buffer.from(ttsResult.audioBuffer).toString("base64");
      contentType = ttsResult.contentType;
    } catch (ttsErr) {
      console.error("[VoiceFunctions] TTS synthesis fallback warning:", ttsErr);
    }

    return {
      transcript,
      agentResponse,
      audioBase64,
      contentType,
      voiceAvailable,
    };
  });

const voiceRequestSchema = z.object({
  message: z.string().min(1, "Message required"),
  workspaceId: z.string().optional(),
  conversationId: z.string().optional(),
  inputMode: z.enum(["text", "voice"]).default("voice"),
  dryRun: z.boolean().optional().default(false),
});

/**
 * Route validated voice transcript strictly through Supreme Intelligence (processAgentRequest).
 */
export const processSupremeVoiceRequest = createServerFn({ method: "POST" })
  .middleware([requireRoles(ALL_ROLES)])
  .inputValidator((input: unknown) => voiceRequestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, roles } = context as {
      supabase: any;
      userId: string;
      roles: string[];
    };

    console.info("[SupremeVoice] SUPREME_REQUEST_AUTH", {
      authenticated: true,
      userIdPresent: Boolean(userId) ? "YES" : "NO",
      roleResolution: (roles || []).join(", "),
    });

    const workspaceId = data.workspaceId || (await getCurrentWorkspaceId(supabase));
    const { processAgentRequest } = await import("./supreme-agent-processor");

    console.info("[SupremeVoice] SUPREME_AGENT_START", {
      message: data.message,
      workspaceId,
      conversationId: data.conversationId,
      inputMode: data.inputMode,
      inputModeIsVoice: data.inputMode === "voice" ? "YES" : "NO",
    });

    const agentResponse = await processAgentRequest(
      {
        message: data.message,
        workspaceId,
        conversationId: data.conversationId,
        inputMode: data.inputMode,
        dryRun: data.dryRun ?? false,
      },
      userId,
      roles,
      supabase
    );

    const capabilitiesInvoked = agentResponse.evidence?.capabilitiesInvoked ?? [];
    const toolCount = capabilitiesInvoked.length;

    console.info("[SupremeVoice] SUPREME_AGENT_COMPLETE", {
      success: agentResponse.success,
      capabilitiesInvoked,
      toolCount,
      intent: agentResponse.evidence?.interpretedIntent ?? "UNKNOWN",
      requiresApproval: agentResponse.requiresApproval,
    });

    const narrative =
      agentResponse.narrative ||
      agentResponse.synthesis?.narrative ||
      agentResponse.synthesis?.summary ||
      "Supreme processing completed.";

    console.info("[SupremeVoice] SUPREME_SYNTHESIS", {
      narrativePresent: Boolean(narrative) ? "YES" : "NO",
      narrativeLength: narrative.length,
      narrativePreview: narrative.slice(0, 100),
    });

    console.info("[SupremeVoice] SUPREME_REQUEST_COMPLETE", {
      success: agentResponse.success,
      narrativePresent: Boolean(narrative) ? "YES" : "NO",
      narrativeLength: narrative.length,
      toolCount,
    });

    return {
      answer: narrative,
      synthesis: agentResponse.synthesis,
      plan: agentResponse.plan,
      success: agentResponse.success,
      requiresApproval: agentResponse.requiresApproval,
      capabilitiesInvoked,
    };
  });

