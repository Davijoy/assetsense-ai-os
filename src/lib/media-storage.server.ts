// In-memory and server-side media cache for uploaded videos, brochures, and images
// Ensures fast zero-latency video streaming across all connected users (localhost & remote tunnel)

interface MediaItem {
  id: string;
  buffer: Buffer;
  mimeType: string;
  filename: string;
  size: number;
  createdAt: number;
}

// Global store attached to globalThis to persist across hot reloads in dev server
declare global {
  // eslint-disable-next-line no-var
  var __ASSET_MEDIA_STORE__: Map<string, MediaItem> | undefined;
}

if (!globalThis.__ASSET_MEDIA_STORE__) {
  globalThis.__ASSET_MEDIA_STORE__ = new Map<string, MediaItem>();
}

export const mediaStore = globalThis.__ASSET_MEDIA_STORE__;

export function storeMedia(id: string, buffer: Buffer, mimeType: string, filename: string): MediaItem {
  const item: MediaItem = {
    id,
    buffer,
    mimeType,
    filename,
    size: buffer.length,
    createdAt: Date.now(),
  };
  mediaStore.set(id, item);
  return item;
}

export function getMedia(id: string): MediaItem | undefined {
  return mediaStore.get(id);
}

export function deleteMedia(id: string): boolean {
  return mediaStore.delete(id);
}
