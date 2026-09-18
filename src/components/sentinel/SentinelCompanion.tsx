/**
 * SENTINEL FORT — persistent intelligence companion & Realtime Conversational Voice UI.
 *
 * A small floating Sentinel presence inside the application. It is the visible
 * doorway into the deliberately-invisible Supreme Intelligence layer — NOT a
 * second brain. It surfaces contextual prompts derived from REAL registered
 * capabilities, routes typed/voice questions through the real interpretIntent/createPlan
 * registry, and never fabricates intelligence or execution.
 *
 * Realtime Conversational Voice:
 * - Hands-free continuous multi-turn dialogue
 * - Immediate audible handshake: "Supreme Voice is active. I'm listening. Go ahead."
 * - Automatic speech-end detection (VAD) without push-to-talk buttons
 * - Instant barge-in: user speech silences Supreme immediately
 * - Visible transcript & real-time telemetry diagnostics
 * - Single "Exit Voice" control to terminate session
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, ArrowUpRight, ChevronDown, ChevronUp, Mic, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveCompanionPrompt, companionSuggestions, type CompanionResolution, type CompanionExecutionResult } from "@/lib/sentinel-companion";
import { ACTIVE_VOICE_ADAPTER, type ConversationalVoiceState, type VoiceTelemetry } from "@/lib/sentinel-voice";
import { isRouteAuthorized } from "@/lib/route-roles";
import { SentinelIdentity } from "./SentinelIdentity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export type CompanionState =
  | "idle"
  | "hover"
  | "active"
  | "listening"
  | "transcribing"
  | "thinking"
  | "responding"
  | "speaking"
  | "interrupted"
  | "error";

export interface CompanionFortContext {
  label?: string | null;
  capabilities?: readonly string[];
}

export interface SentinelCompanionProps {
  fort?: CompanionFortContext | null;
  roles?: readonly string[];
  execute?: ((message: string, roles: readonly string[]) => Promise<CompanionExecutionResult>) | null;
  orb?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SUPREME_ROUTE = "/app/supreme-intelligence";
export function SentinelCompanion({
  fort,
  roles = [],
  execute = null,
  orb = true,
  open: controlledOpen,
  onOpenChange,
}: SentinelCompanionProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CompanionState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [last, setLast] = useState<CompanionResolution | null>(null);
  const [lastExec, setLastExec] = useState<CompanionExecutionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [isConversational, setIsConversational] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [recognizedTranscript, setRecognizedTranscript] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<VoiceTelemetry>({
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
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen: boolean = isControlled ? Boolean(controlledOpen) : open;
  const commitOpen = useCallback(
    (next: boolean) => {
      if (isControlled) onOpenChange?.(next);
      else setOpen(next);
    },
    [isControlled, onOpenChange],
  );

  const suggestions = companionSuggestions(fort?.capabilities ?? []);
  const canOpenSupreme = isRouteAuthorized(roles, SUPREME_ROUTE);

  const exitVoiceMode = useCallback(() => {
    ACTIVE_VOICE_ADAPTER.stopConversationalSession?.();
    setIsConversational(false);
    setStatusMessage(null);
    setState("idle");
  }, []);

  const openPanel = () => {
    commitOpen(true);
    setState("active");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const closePanel = () => {
    exitVoiceMode();
    commitOpen(false);
    setState("idle");
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        closePanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, closePanel]);

  const submit = async (raw?: string, inputMode: "text" | "voice" = "text") => {
    const message = (raw ?? value).trim();
    if (!message || running) return;

    if (/^[\s.,!?-]+$/.test(message)) {
      setState("listening");
      return;
    }

    if (inputMode === "voice") {
      setRecognizedTranscript(message);
    }

    setValue("");
    if (execute) {
      setRunning(true);
      setState("thinking");
      try {
        const exec = await execute(message, [...roles]);
        setLastExec(exec);
        setState("responding");

        if (inputMode === "voice" && exec.answer && ACTIVE_VOICE_ADAPTER.speak) {
          setState("speaking");
          try {
            await ACTIVE_VOICE_ADAPTER.speak(exec.answer);
            setState(isConversational ? "listening" : "idle");
          } catch (speakErr: unknown) {
            console.error("[SentinelCompanion] Voice playback failed:", speakErr);
            setState("error");
            setLast({
              intent: null,
              capabilityId: null,
              capabilityLabel: null,
              description: null,
              requiresApproval: false,
              requiredRoles: [],
              callerAllowed: true,
              disposition: "unsupported",
              reason: "Supreme generated a response, but voice playback is unavailable.",
            });
          }
        }
      } catch {
        setLastExec({
          disposition: "unsupported",
          matched: false,
          capabilityId: null,
          capabilityLabel: null,
          answer: "Supreme Intelligence couldn't complete that request just now. Please retry.",
          success: false,
          insufficientData: false,
          unauthorized: false,
          question: message,
        });
        setState("error");
      } finally {
        setRunning(false);
      }
      return;
    }

    setState("thinking");
    const res = resolveCompanionPrompt(message, [...roles]);
    setLast(res);
    setState("responding");
  };

  const startConversationalVoice = useCallback(async () => {
    ACTIVE_VOICE_ADAPTER.initAudioEngine?.();

    if (!ACTIVE_VOICE_ADAPTER.available) {
      setState("error");
      setLast({
        intent: null,
        capabilityId: null,
        capabilityLabel: null,
        description: null,
        requiresApproval: false,
        requiredRoles: [],
        callerAllowed: true,
        disposition: "unsupported",
        reason: "Microphone unavailable. Check browser permissions.",
      });
      return;
    }

    setIsConversational(true);
    setState("listening");
    setStatusMessage("🔊 Supreme Voice is active — Listening...");

    try {
      if (ACTIVE_VOICE_ADAPTER.startConversationalSession) {
        await ACTIVE_VOICE_ADAPTER.startConversationalSession({
          onStateChange: (newState: ConversationalVoiceState, customMessage?: string) => {
            setState(newState as CompanionState);
            if (customMessage) setStatusMessage(customMessage);
            else if (newState === "listening") setStatusMessage(null);
          },
          onTurnComplete: async (transcript: string) => {
            setRecognizedTranscript(transcript);
            setValue(transcript);
            await submit(transcript, "voice");
          },
          onError: (errorMessage: string) => {
            setState("error");
            setLast({
              intent: null,
              capabilityId: null,
              capabilityLabel: null,
              description: null,
              requiresApproval: false,
              requiredRoles: [],
              callerAllowed: true,
              disposition: "unsupported",
              reason: errorMessage,
            });
          },
          onTelemetry: (t: VoiceTelemetry) => {
            setTelemetry(t);
          },
          onTranscriptUpdate: (partial: string) => {
            setRecognizedTranscript(partial);
          },
        });
      }
    } catch (err: unknown) {
      console.error("[SentinelCompanion] Conversational voice start error:", err);
      setIsConversational(false);
      setState("error");
    }
  }, [submit]);

  useEffect(() => {
    const handleVoiceTrigger = () => {
      commitOpen(true);
      window.setTimeout(() => {
        void startConversationalVoice();
      }, 50);
    };

    window.addEventListener("sentinel:open-voice", handleVoiceTrigger);
    return () => window.removeEventListener("sentinel:open-voice", handleVoiceTrigger);
  }, [commitOpen, startConversationalVoice]);

  const toggleVoiceMode = () => {
    if (isConversational) {
      exitVoiceMode();
    } else {
      void startConversationalVoice();
    }
  };

  return (
    <>
      {orb && (
        <button
          type="button"
          onClick={openPanel}
          onMouseEnter={() => state === "idle" && setState("hover")}
          onMouseLeave={() => state === "hover" && setState("idle")}
          aria-label="Open Sentinel intelligence companion"
          className="fixed bottom-6 right-6 z-40 group flex items-center justify-center rounded-full p-2 bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/40 shadow-2xl backdrop-blur-md transition-all hover:scale-105 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <div className="relative">
            <SentinelIdentity size={40} state={state === "hover" ? "active" : state} />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
          </div>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/80 bg-background/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2.5">
              <SentinelIdentity size={24} state={state} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-foreground">Sentinel Companion</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1 border-primary/30 text-primary">
                    Supreme
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {statusMessage || (isConversational ? "Conversational Voice Active" : (fort?.label ? `Context: ${fort.label}` : "Global Intelligence"))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={isConversational ? "default" : "outline"}
                size="sm"
                onClick={toggleVoiceMode}
                className={cn(
                  "h-7 text-xs gap-1.5 px-2.5 rounded-full transition-all",
                  isConversational ? "bg-red-600 hover:bg-red-700 text-white font-medium" : "border-primary/40 hover:bg-primary/10 text-primary",
                )}
              >
                <Mic className="h-3.5 w-3.5" />
                {isConversational ? "Exit Voice" : "Voice"}
              </Button>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {isConversational && (
              <div className="space-y-2">
                <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="font-medium text-foreground">Continuous Dialogue Active</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Hands-Free
                  </Badge>
                </div>

                {recognizedTranscript && (
                  <div className="rounded-lg border border-border/80 bg-background/90 p-2 text-xs">
                    <span className="font-semibold text-muted-foreground">You said: </span>
                    <span className="font-medium text-foreground italic">"{recognizedTranscript}"</span>
                  </div>
                )}

                {/* Live Diagnostic Collapsible */}
                <div className="rounded-lg border border-border/50 bg-background/50 p-2 text-[11px] space-y-1.5">
                  <div
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="flex items-center justify-between font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                    <span>VOICE TELEMETRY DIAGNOSTICS</span>
                    {showDiagnostics ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </div>

                  {showDiagnostics && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] pt-1 border-t border-border/40 font-mono">
                      <div>Stream ID: <span className="font-bold">{telemetry.streamId.slice(0, 16)}</span></div>
                      <div>AudioContext: <span className="font-bold text-primary">{telemetry.audioCtxState}</span> [{telemetry.audioCtxId}]</div>
                      <div>Source Node: <span className="font-bold text-muted-foreground">{telemetry.sourceNodeId}</span></div>
                      <div>Primary Anl: <span className="font-bold text-muted-foreground">{telemetry.primaryAnalyserId}</span></div>
                      <div>Comp Anl: <span className="font-bold text-muted-foreground">{telemetry.comparisonAnalyserId}</span></div>
                      <div>Gain Node: <span className="font-bold text-muted-foreground">{telemetry.silentGainId}</span></div>
                      <div>Primary RMS: <span className={cn("font-bold", telemetry.rms > 2.0 ? "text-emerald-600" : "text-foreground")}>{telemetry.rms.toFixed(1)}</span></div>
                      <div>Comparison RMS: <span className={cn("font-bold", telemetry.comparisonRms > 2.0 ? "text-emerald-600" : "text-foreground")}>{telemetry.comparisonRms.toFixed(1)}</span></div>
                      <div>PCM Tap RMS: <span className={cn("font-bold", telemetry.pcmBufferRms > 2.0 ? "text-emerald-600" : "text-foreground")}>{telemetry.pcmBufferRms.toFixed(1)}</span></div>
                      <div>Raw Min / Max: <span className="font-bold text-primary">{(telemetry.sampleMin ?? 0).toFixed(3)} / {(telemetry.sampleMax ?? 0).toFixed(3)}</span></div>
                      <div>Raw Avg: <span className="font-bold text-primary">{(telemetry.sampleAverage ?? 0).toFixed(4)}</span></div>
                      <div>Capture Ticks: <span className="font-bold text-primary">{telemetry.captureLoopTicks ?? 0}</span> ({telemetry.mediaRecorderState ?? "none"})</div>
                      <div>PCM / Anl Ticks: <span className="font-bold text-primary">{telemetry.pcmTapTicks ?? 0} / {telemetry.analyserReadTicks ?? 0}</span></div>
                      <div>Flux Frames: <span className="font-bold text-primary">{telemetry.framesSent ?? 0} ({((telemetry.totalBytesSent ?? 0) / 1024).toFixed(1)} KB)</span></div>
                      <div>Flux WS: <span className={cn("font-bold", telemetry.fluxConnected ? "text-emerald-600" : "text-amber-500")}>{telemetry.fluxEvent ?? "INIT"}</span></div>
                      <div>VAD Phase: <span className="font-bold text-primary">{telemetry.vadPhase}</span></div>
                      <div>VAD Status: <span className="font-bold text-primary">{telemetry.vadStatus}</span></div>
                      <div>Speech Detected: <span className={cn("font-bold", telemetry.speechDetected ? "text-emerald-600" : "text-muted-foreground")}>{telemetry.speechDetected ? "YES" : "NO"}</span></div>
                      <div>STT: <span className="font-bold">{telemetry.sttStatus}</span></div>
                      <div>Supreme: <span className="font-bold">{telemetry.supremeStatus}</span></div>
                      <div>TTS: <span className="font-bold">{telemetry.ttsStatus}</span></div>
                      <div>Flux Msg Count: <span className="font-bold text-primary">{telemetry.incomingMessageCount ?? 0}</span></div>
                      <div>Last Flux Msg: <span className="font-bold text-foreground">{telemetry.lastFluxMsgType || "none"}</span></div>
                      <div className="col-span-2">Last Transcript: <span className="font-bold text-emerald-600">{telemetry.lastTranscript || "none"}</span></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Supreme Response Content */}
            {running ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <span className="h-3 w-3 animate-pulse rounded-full bg-primary/60" />
                Running real intelligence…
              </div>
            ) : lastExec ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {lastExec.capabilityLabel && (
                      <Badge variant="secondary" className="text-[10px]">
                        {lastExec.capabilityLabel}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        lastExec.success && "border-primary/50 text-primary",
                        lastExec.insufficientData && "border-amber-500/40 text-amber-500/90",
                      )}
                    >
                      {lastExec.disposition}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed">{lastExec.answer}</p>
                </div>
                {lastExec.matched && canOpenSupreme && (
                  <Link
                    to={SUPREME_ROUTE}
                    className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 hover:border-primary/60 transition"
                  >
                    <span className="text-sm font-medium">Open Supreme Intelligence</span>
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  </Link>
                )}
              </div>
            ) : last ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-sm">
                  {last.disposition === "match" ? (
                    <>
                      <div className="font-medium">
                        {last.capabilityLabel ?? "Matched"}
                      </div>
                      <div className="text-xs text-muted-foreground">{last.description}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {last.intent && (
                          <Badge variant="secondary" className="text-[10px]">
                            intent {last.intent}
                          </Badge>
                        )}
                        {last.requiresApproval && (
                          <Badge variant="secondary" className="text-[10px]">
                            approval-gated
                          </Badge>
                        )}
                        {!last.callerAllowed && (
                          <Badge variant="secondary" className="text-[10px]">
                            missing permission
                          </Badge>
                        )}
                      </div>
                    </>
                  ) : last.disposition === "unsupported" ? (
                    <div className="text-muted-foreground">{last.reason}</div>
                  ) : (
                    <div className="text-muted-foreground">
                      Could not match that request to any registered Fort capability.
                    </div>
                  )}
                </div>
                {last.capabilityId && canOpenSupreme && (
                  <Link
                    to={SUPREME_ROUTE}
                    className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface/40 px-3 py-2.5 hover:border-primary/40 transition"
                  >
                    <span className="text-sm font-medium">View in Supreme Intelligence</span>
                    <ArrowUpRight className="h-4 w-4 text-primary" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Suggested inquiries
                </p>
                <div className="flex flex-col gap-1.5">
                  {suggestions.slice(0, 3).map((s) => (
                    <button
                      key={s.prompt}
                      type="button"
                      onClick={() => submit(s.prompt, "text")}
                      className="text-left rounded-lg border border-border/50 bg-background/50 p-2 text-xs hover:border-primary/40 hover:bg-primary/[0.02] transition"
                    >
                      <div className="font-medium text-foreground">{s.prompt}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{s.capability}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 relative">
            <Textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit(undefined, "text");
                }
              }}
              placeholder={isConversational ? "Listening continuously... or type here" : "Ask Sentinel about this Fort context..."}
              className="min-h-[72px] resize-none pr-10 text-xs rounded-xl bg-background/60"
            />
            <Button
              size="icon"
              disabled={!value.trim() || running}
              onClick={() => void submit(undefined, "text")}
              className="absolute bottom-2 right-2 h-7 w-7 rounded-lg"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
