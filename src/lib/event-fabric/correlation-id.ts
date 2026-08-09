/**
 * Unique identifier used to group related events across multiple domains.
 * Typically a UUID or ULID that is generated at the start of a business transaction
 * and propagated through all related events.
 */
export type CorrelationId = string;

/**
 * Generates a new correlation ID.
 * In a real implementation, this would use a proper UUID/ULID generator.
 * For now, we use a simple random string generator for demonstration.
 * NOTE: In production, replace with a robust UUID/v4 or ULID implementation.
 */
export function generateCorrelationId(): CorrelationId {
  // Simple pseudo-UUID generation (not cryptographically secure)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const random = Math.random() * 16 | 0;
    const value = c === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
}