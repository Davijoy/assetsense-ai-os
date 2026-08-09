/**
 * Identifier of the event that directly caused this event to be generated.
 * Forms a causal chain for debugging and auditability.
 */
export type CausationId = string;

/**
 * Generates a new causation ID.
 * Same implementation as correlation ID for simplicity.
 */
export function generateCausationId(): CausationId {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const random = Math.random() * 16 | 0;
    const value = c === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
}