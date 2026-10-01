/**
 * SENTINEL FORT — Motion & Atmosphere Studio Engine
 *
 * Defines motion profiles, atmosphere configurations, and CSS custom property helpers.
 * Fully supports prefers-reduced-motion accessibility standards.
 */

export type MotionProfileId = "off" | "subtle" | "executive" | "immersive";

export type IntensityLevel = "none" | "low" | "medium" | "high";

export interface MotionProfile {
  id: MotionProfileId;
  name: string;
  badge: string;
  description: string;
  enabled: boolean;
  transitionMultiplier: number;
  hoverStrength: IntensityLevel;
  atmosphereIntensity: IntensityLevel;
  particleDensity: IntensityLevel;
  driftIntensity: IntensityLevel;
  glowIntensity: IntensityLevel;
  entityFloatIntensity: IntensityLevel;
  orbitIntensity: IntensityLevel;
}

export interface AtmosphereConfig {
  enabled: boolean;
  gridIntensity: IntensityLevel;
  glowIntensity: IntensityLevel;
  particleDensity: IntensityLevel;
  driftIntensity: IntensityLevel;
  watermarkVisibility: boolean;
}

export const DEFAULT_ATMOSPHERE_CONFIG: AtmosphereConfig = {
  enabled: true,
  gridIntensity: "medium",
  glowIntensity: "medium",
  particleDensity: "medium",
  driftIntensity: "medium",
  watermarkVisibility: true,
};

export const MOTION_PROFILES: MotionProfile[] = [
  {
    id: "off",
    name: "Static Focus (Off)",
    badge: "Maximum Restraint",
    description: "Completely disables ambient background drift, particle fields, and hover transitions for maximum accessibility and static clarity.",
    enabled: false,
    transitionMultiplier: 0,
    hoverStrength: "none",
    atmosphereIntensity: "none",
    particleDensity: "none",
    driftIntensity: "none",
    glowIntensity: "none",
    entityFloatIntensity: "none",
    orbitIntensity: "none",
  },
  {
    id: "subtle",
    name: "Subtle Command",
    badge: "Fast & Crisp",
    description: "Ultra-fast micro-interactions, low-opacity ambient wash, and zero floating particles for a highly responsive, snappy interface.",
    enabled: true,
    transitionMultiplier: 0.75,
    hoverStrength: "low",
    atmosphereIntensity: "low",
    particleDensity: "none",
    driftIntensity: "low",
    glowIntensity: "low",
    entityFloatIntensity: "low",
    orbitIntensity: "none",
  },
  {
    id: "executive",
    name: "Executive Luxury (Default)",
    badge: "Production Standard",
    description: "The official Sentinel Fort standard: graceful 7s breathing cycles, gentle 16s ambient drift, and luxury card elevation.",
    enabled: true,
    transitionMultiplier: 1.0,
    hoverStrength: "medium",
    atmosphereIntensity: "medium",
    particleDensity: "medium",
    driftIntensity: "medium",
    glowIntensity: "medium",
    entityFloatIntensity: "medium",
    orbitIntensity: "medium",
  },
  {
    id: "immersive",
    name: "Immersive Presence",
    badge: "Full Ambiance",
    description: "High particle density, dynamic depth-of-field drift, radiant gold glow, and full Supreme Entity orbital presence.",
    enabled: true,
    transitionMultiplier: 1.25,
    hoverStrength: "high",
    atmosphereIntensity: "high",
    particleDensity: "high",
    driftIntensity: "high",
    glowIntensity: "high",
    entityFloatIntensity: "high",
    orbitIntensity: "high",
  },
];

export const DEFAULT_MOTION_PROFILE: MotionProfile = MOTION_PROFILES[2]; // executive

export function profileToAtmosphereConfig(profile: MotionProfile): AtmosphereConfig {
  return {
    enabled: profile.enabled,
    gridIntensity: profile.atmosphereIntensity,
    glowIntensity: profile.glowIntensity,
    particleDensity: profile.particleDensity,
    driftIntensity: profile.driftIntensity,
    watermarkVisibility: profile.enabled && profile.atmosphereIntensity !== "none",
  };
}

export function getMotionCssVariables(
  profile: MotionProfile = DEFAULT_MOTION_PROFILE,
  prefersReduced: boolean = false
): Record<string, string> {
  const vars: Record<string, string> = {};

  if (!profile.enabled || prefersReduced) {
    vars["--motion-duration-multiplier"] = "0";
    vars["--motion-hover-scale"] = "1";
    vars["--motion-transition-duration"] = "0ms";
    vars["--motion-drift-duration"] = "0s";
    vars["--motion-breathe-duration"] = "0s";
    vars["--motion-pulse-duration"] = "0s";
    vars["--motion-glow-opacity"] = "0";
    return vars;
  }

  vars["--motion-duration-multiplier"] = String(profile.transitionMultiplier);
  vars["--motion-transition-duration"] = `${Math.round(200 * profile.transitionMultiplier)}ms`;

  if (profile.hoverStrength === "none") vars["--motion-hover-scale"] = "1";
  else if (profile.hoverStrength === "low") vars["--motion-hover-scale"] = "1.01";
  else if (profile.hoverStrength === "medium") vars["--motion-hover-scale"] = "1.02";
  else vars["--motion-hover-scale"] = "1.035";

  if (profile.glowIntensity === "none") vars["--motion-glow-opacity"] = "0";
  else if (profile.glowIntensity === "low") vars["--motion-glow-opacity"] = "0.2";
  else if (profile.glowIntensity === "medium") vars["--motion-glow-opacity"] = "0.45";
  else vars["--motion-glow-opacity"] = "0.75";

  if (profile.driftIntensity === "none") {
    vars["--motion-drift-duration"] = "0s";
    vars["--motion-breathe-duration"] = "0s";
    vars["--motion-pulse-duration"] = "0s";
  } else if (profile.driftIntensity === "low") {
    vars["--motion-drift-duration"] = "24s";
    vars["--motion-breathe-duration"] = "9s";
    vars["--motion-pulse-duration"] = "8s";
  } else if (profile.driftIntensity === "medium") {
    vars["--motion-drift-duration"] = "16s";
    vars["--motion-breathe-duration"] = "7s";
    vars["--motion-pulse-duration"] = "6s";
  } else {
    vars["--motion-drift-duration"] = "10s";
    vars["--motion-breathe-duration"] = "4.5s";
    vars["--motion-pulse-duration"] = "3.5s";
  }

  return vars;
}

export function applyMotionToElement(
  element: HTMLElement,
  profile: MotionProfile = DEFAULT_MOTION_PROFILE,
  prefersReduced: boolean = false
): void {
  const vars = getMotionCssVariables(profile, prefersReduced);
  for (const [key, value] of Object.entries(vars)) {
    element.style.setProperty(key, value);
  }
}

export function applyMotionToDOM(
  profile: MotionProfile = DEFAULT_MOTION_PROFILE,
  prefersReduced: boolean = false
): void {
  if (typeof document === "undefined") return;
  applyMotionToElement(document.documentElement, profile, prefersReduced);
}
