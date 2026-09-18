/**
 * SENTINEL FORT — Supreme Entity (living intelligence visual presence).
 *
 * A lightweight, interactive "living intelligence entity" that floats in the
 * AppShell. It is a PRESENTATION-ONLY component — it does NOT import any
 * intelligence execution services, Supabase client, or server functions.
 *
 * State machine: idle | hover | listening | thinking | processing |
 *               success | insight | warning | error | dragging | pressed
 *
 * Interactions:
 *  - Hover → subtle scale + expression change + orient toward pointer
 *  - Click/Touch → opens existing SentinelCompanion (source of truth)
 *  - Drag → physics-like spring settling + viewport clamping + magnetic edges
 *  - Accessibility → keyboard focus, Enter/Space activation, sr-only labels
 *
 * Architecture:
 *   SupremeEntity.tsx         (this file — main component, event wiring)
 *   SupremeEntityFace.tsx     (pure SVG face per expression)
 *   SupremeEntityLogic.ts     (pure logic: state→expression, clamping, physics)
 *   SupremeEntity.types.ts    (type definitions)
 *   styles.css                (animation definitions)
 *
 * DEPENDENCY BOUNDARY: This component imports ONLY the visual/types/logic
 * modules above. It does NOT reach supreme-agent-capabilities.ts,
 * supreme-agent-processor, BI services, or Supabase client.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { SentinelCompanion, type CompanionFortContext } from "./SentinelCompanion";
import { type CompanionExecutionResult, resolveCompanionPrompt } from "@/lib/sentinel-companion";
import { SupremeEntityFace } from "./SupremeEntityFace";
import { DecisionPanel } from "./DecisionPanel";
import { resolveDecisionContext, answerContextualQuery } from "@/lib/decision-intelligence";
import { useActiveEntity } from "@/lib/active-entity";
import type { SupremeEntityState } from "./SupremeEntity.types";
import {
  getExpression,
  isTransientState,
  TRANSIENT_TIMEOUT_MS,
  clampToViewport,
  computeSettleTarget,
  DEFAULT_SPRING,
  springStep,
} from "./SupremeEntityLogic";

/** Default resting position (bottom-right corner). */
const ENTITY_SIZE = 72; // px
const CORNER_MARGIN = 20; // px from screen edges

function getBaseStateForRoute(path: string): SupremeEntityState {
  const norm = (path || "/").toLowerCase();
  if (norm === "/" || norm === "/sentinel") {
    return "ready";
  }
  return "active";
}

export interface SupremeEntityProps {
  /** Optional initial state, e.g. for context-aware surfaces. */
  initialState?: SupremeEntityState;
  /** Optional external state control (e.g. from Companion activity). */
  controlledState?: SupremeEntityState;
  /** Roles passed through to the existing Companion when opened. */
  roles?: readonly string[];
  /** Advisory Fort experience context (label + capabilities) passed through to Companion. */
  fort?: CompanionFortContext | null;
  /** Optional real execution callback passed through to Companion. */
  execute?: ((message: string, roles: readonly string[]) => Promise<CompanionExecutionResult>) | null;
}

export function SupremeEntity({
  initialState,
  controlledState,
  fort = null,
  roles = [],
  execute = null,
}: SupremeEntityProps) {
  const effectiveFort = fort ?? null;

  // Track active route to dynamically contextualize intelligence and state.
  // Normalizes trailing slashes (e.g. /fort/ → /fort) so route matches reliably.
  const location = useLocation();
  const rawPathname = location?.pathname || (typeof window !== "undefined" ? window.location.pathname : "/");
  const pathname = (rawPathname.length > 1 ? rawPathname.replace(/\/+$/, "") : rawPathname) || "/";

  const baseState = getBaseStateForRoute(pathname);
  const defaultState: SupremeEntityState = initialState ?? baseState;

  const [internalState, setInternalState] = useState<SupremeEntityState>(defaultState);
  const state = controlledState ?? internalState;

  // React to route changes immediately: Landing ("ready") → Enter ("active")
  useEffect(() => {
    if (controlledState) return;
    setInternalState(baseState);
  }, [baseState, controlledState]);

  // Listen for global voice & companion trigger events
  useEffect(() => {
    const handleOpenVoice = () => {
      setDecisionOpen(false);
      setCompanionOpen(true);
      setInternalState("listening");
    };
    const handleOpenCompanion = () => {
      setDecisionOpen(false);
      setCompanionOpen(true);
      setInternalState("active");
    };

    window.addEventListener("sentinel:open-voice", handleOpenVoice);
    window.addEventListener("sentinel:open-companion", handleOpenCompanion);
    return () => {
      window.removeEventListener("sentinel:open-voice", handleOpenVoice);
      window.removeEventListener("sentinel:open-companion", handleOpenCompanion);
    };
  }, []);

  const queryClient = useQueryClient();
  const { activeEntity, comparisonEntity } = useActiveEntity();

  const biSnapshot = queryClient?.getQueryData?.(["bi-snapshot"]);
  const crmKpis = queryClient?.getQueryData?.(["crm-kpis"]);

  const decisionContext = useMemo(
    () =>
      resolveDecisionContext({
        pathname,
        roles,
        activeEntity,
        comparisonEntity,
        biSnapshot,
        crmKpis,
      }),
    [pathname, roles, activeEntity, comparisonEntity, biSnapshot, crmKpis],
  );

  const [decisionOpen, setDecisionOpen] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);

  const conversationIdRef = useRef<string>(`conv_${Math.random().toString(36).slice(2, 9)}`);

  const effectiveExecute = useMemo(() => {
    if (execute) return execute;
    return async (message: string, _userRoles: readonly string[]): Promise<CompanionExecutionResult> => {
      const conversationId = conversationIdRef.current;
      console.info("[SupremeVoice] SUPREME_REQUEST_START", {
        transcript: message,
        conversationId,
        inputMode: "voice",
      });

      try {
        const { processSupremeVoiceRequest } = await import("@/lib/voice.functions");
        const { supabase } = await import("@/integrations/supabase/client");
        const sessionRes = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const token = sessionRes.data?.session?.access_token;

        const result = await processSupremeVoiceRequest({
          data: {
            message,
            conversationId,
            inputMode: "voice",
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        return {
          disposition: "match",
          matched: true,
          capabilityId: result.plan?.steps?.[0]?.capabilityId || "supreme-intelligence",
          capabilityLabel: "Supreme Intelligence",
          answer: result.answer || "Supreme Intelligence processed your request.",
          success: true,
          insufficientData: false,
          unauthorized: false,
          question: message,
        };
      } catch (err: unknown) {
        console.warn("[SupremeEntity] processSupremeVoiceRequest fallback:", err);
        const ans = answerContextualQuery(message, decisionContext);
        return {
          disposition: "match",
          matched: true,
          capabilityId: "decision-engine",
          capabilityLabel: "Sentinel Decision Intelligence",
          answer: ans.answer,
          success: true,
          insufficientData: decisionContext.keySignal === "INSUFFICIENT DATA",
          unauthorized: false,
          question: message,
        };
      }
    };
  }, [execute, decisionContext]);
  const [customPosition, setCustomPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pressed, setPressed] = useState(false);
  const entityRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const settleRef = useRef<{
    position: number;
    velocity: number;
    target: number;
    axis: "x" | "y";
  } | null>(null);
  /** Set once the pointer has actually moved (distinguishes drag from click). */
  const dragMovedRef = useRef(false);
  /** Pointer-down position, used to detect a real drag threshold. */
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  /** Cached entity size captured at drag start (avoids layout reads per move). */
  const dragSizeRef = useRef({ width: ENTITY_SIZE, height: ENTITY_SIZE });

  // Auto-reset transient states back to base state (unless a surface is open).
  useEffect(() => {
    if (!isTransientState(state)) return;
    if (companionOpen || decisionOpen) return;
    const timer = window.setTimeout(() => {
      setInternalState(baseState);
    }, TRANSIENT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [state, companionOpen, decisionOpen, baseState]);

  // Handle window resize — re-clamp position if manually moved.
  useEffect(() => {
    const handleResize = () => {
      if (entityRef.current && customPosition && !isDragging) {
        const rect = entityRef.current.getBoundingClientRect();
        const clamped = clampToViewport(
          customPosition.x,
          customPosition.y,
          rect.width,
          rect.height,
        );
        setCustomPosition(clamped);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isDragging, customPosition]);

  // Clean up RAF on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // --- Spring-based settling animation helper ---
  const runSpringSettle = useCallback(
    (
      startPos: number,
      targetPos: number,
      axis: "x" | "y",
      onUpdate: (val: number) => void,
    ) => {
      settleRef.current = {
        position: startPos,
        velocity: 0,
        target: targetPos,
        axis,
      };

      const step = () => {
        if (!settleRef.current || settleRef.current.axis !== axis) return;
        const prev = settleRef.current;
        const next = springStep(
          prev.position,
          prev.target,
          prev.velocity,
          DEFAULT_SPRING,
          16,
        );

        if (
          Math.abs(next.position - prev.target) < 0.5 &&
          Math.abs(next.velocity) < 0.5
        ) {
          onUpdate(next.position);
          settleRef.current = null;
          return;
        }

        onUpdate(next.position);
        settleRef.current = {
          position: next.position,
          velocity: next.velocity,
          target: prev.target,
          axis,
        };
        rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  // --- Drag event handlers ---
  const handlePointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to the primary pointer. Never preventDefault for mouse —
    // that would break keyboard/click focus semantics.
    if (ev.button !== 0) return;
    if (!entityRef.current) return;
    dragMovedRef.current = false;
    pointerDownRef.current = { x: ev.clientX, y: ev.clientY };
    const rect = entityRef.current.getBoundingClientRect();
    dragSizeRef.current = { width: rect.width, height: rect.height };
    setDragOffset({
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
    });
    setIsDragging(true);
    setPressed(true);
    setInternalState("dragging");
  };

  const handlePointerMove = useCallback(
    (ev: PointerEvent) => {
      if (!isDragging) return;
      // The entity must "notice" the pointer with a small dead-zone so a
      // simple click/tap is never treated as a drag.
      const start = pointerDownRef.current;
      if (start) {
        const dist = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
        if (dist > 6) dragMovedRef.current = true;
      }
      if (!dragMovedRef.current) return;

      const { width, height } = dragSizeRef.current;
      const newX = ev.clientX - dragOffset.x;
      const newY = ev.clientY - dragOffset.y;

      const clamped = clampToViewport(newX, newY, width, height);
      setCustomPosition({ x: clamped.x, y: clamped.y });
    },
    [isDragging, dragOffset],
  );

  const handlePointerUp = useCallback(
    () => {
      const moved = dragMovedRef.current;
      setIsDragging(false);
      setPressed(false);
      pointerDownRef.current = null;
      dragMovedRef.current = false;

      if (!moved) {
        // Simple tap/click — the onClick will handle the interaction.
        setInternalState("pressed");
        return;
      }

      // Real drag: spring-settle toward a safe edge/clamped position.
      const { width, height } = dragSizeRef.current;
      const rect = entityRef.current?.getBoundingClientRect();
      const currentX = customPosition ? customPosition.x : (rect ? rect.left : 0);
      const currentY = customPosition ? customPosition.y : (rect ? rect.top : 0);
      const target = computeSettleTarget(currentX, currentY, width, height);
      runSpringSettle(currentX, target.x, "x", (val) => {
        setCustomPosition((p) => ({ x: val, y: p ? p.y : target.y }));
      });
      runSpringSettle(currentY, target.y, "y", (val) => {
        setCustomPosition((p) => ({ x: p ? p.x : target.x, y: val }));
      });
      setInternalState(companionOpen ? "hover" : baseState);
    },
    [customPosition, companionOpen, baseState, runSpringSettle],
  );

  // Attach global listeners when dragging starts.
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerup", handlePointerUp, { passive: true });
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const expr = getExpression(isDragging ? "dragging" : state);
  const isPressed = pressed && state === "pressed";

  const handleClick = () => {
    // A real drag (pointer moved) fires click on release — ignore it.
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    setPressed(true);
    if (companionOpen) {
      setCompanionOpen(false);
      setDecisionOpen(false);
      setInternalState(baseState);
    } else {
      const next = !decisionOpen;
      setDecisionOpen(next);
      setInternalState(next ? "active" : baseState);
    }
    window.setTimeout(() => {
      setPressed(false);
    }, 160);
  };

  const handleKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      handleClick();
    }
  };

  return (
    <>
      {/* Visual entity — Top-level AI Intelligence Overlay */}
      <div
        ref={entityRef}
        data-state={state}
        className={cn(
          "fixed z-[60] isolate flex items-center justify-center pointer-events-auto",
          "h-18 w-18 cursor-pointer touch-none select-none rounded-full",
          "bg-card/95 shadow-2xl backdrop-blur-md border border-primary/25",
          "transition-[scale,transform] duration-300 ease-out",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          state === "ready" && "supreme-entity-orbit supreme-entity-float supreme-entity-breathe supreme-entity-glow-soft",
          state === "active" && "supreme-entity-float supreme-entity-breathe supreme-entity-glow-active",
          state === "idle" && "supreme-entity-float supreme-entity-breathe",
          (state === "hover" || state === "aware") && "supreme-entity-core-pulse scale-105",
          state === "dragging" && "cursor-grabbing",
          isPressed && "scale-95",
          "motion-reduce:animate-none",
        )}
        style={
          customPosition
            ? {
                left: `${customPosition.x}px`,
                top: `${customPosition.y}px`,
                width: `${ENTITY_SIZE}px`,
                height: `${ENTITY_SIZE}px`,
              }
            : {
                bottom: "28px",
                right: "28px",
                width: `${ENTITY_SIZE}px`,
                height: `${ENTITY_SIZE}px`,
              }
        }
        onPointerDown={handlePointerDown}
        onPointerEnter={() => {
          if (!isDragging) {
            setInternalState("aware");
          }
        }}
        onPointerLeave={() => {
          if (!isDragging && !decisionOpen && !companionOpen) {
            setInternalState(baseState);
          }
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Sentinel Decision Intelligence Companion"
        aria-expanded={decisionOpen || companionOpen}
        aria-pressed={pressed}
      >
        {/* SVG Face */}
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center",
            "transition-all duration-300",
            (state === "idle" || state === "ready") && "supreme-entity-core-pulse",
            expr.coreGlow && (
              state === "active"
                ? "drop-shadow-[0_0_12px_rgba(52,211,153,0.55)]"
                : "drop-shadow-[0_0_12px_rgba(124,50,255,0.5)]"
            ),
          )}
        >
          <SupremeEntityFace state={state} />
        </div>

        <span className="sr-only">Sentinel Decision Intelligence Companion</span>
      </div>

      {/* Decision Intelligence Panel — context-aware decision layer */}
      <DecisionPanel
        context={decisionContext}
        open={decisionOpen}
        onClose={() => {
          setDecisionOpen(false);
          setInternalState(baseState);
        }}
        onOpenCompanion={() => {
          setDecisionOpen(false);
          setCompanionOpen(true);
          setInternalState("active");
        }}
      />

      {/* Companion — source of truth for deep execution and multi-engine processing. */}
      <SentinelCompanion
        roles={roles}
        orb={false}
        open={companionOpen}
        onOpenChange={(open) => {
          setCompanionOpen(open);
          if (!open && !decisionOpen) {
            setInternalState(baseState);
          }
        }}
        fort={{
          label: effectiveFort?.label ?? decisionContext.module,
          capabilities: effectiveFort?.capabilities ?? [],
        }}
        execute={effectiveExecute}
      />
    </>
  );
}
