const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");

const readBlobAsArrayBuffer = async (blob: Blob) => {
  return new Response(blob).arrayBuffer();
};

export const calculateFileSha256 = async (
  file: File,
  onProgress?: (percent: number) => void,
  chunkSize = 4 * 1024 * 1024,
) => {
  if (file.size === 0) {
    onProgress?.(100);
    const digest = await crypto.subtle.digest("SHA-256", new Uint8Array());
    return toHex(new Uint8Array(digest));
  }

  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  let offset = 0;

  while (offset < file.size) {
    const chunk = await readBlobAsArrayBuffer(file.slice(offset, offset + chunkSize));
    const bytes = new Uint8Array(chunk);
    chunks.push(bytes);
    totalLength += bytes.length;
    offset += bytes.length;
    onProgress?.(Math.min(100, Math.round((offset / file.size) * 100)));
  }

  const combined = new Uint8Array(totalLength);
  let position = 0;
  for (const chunk of chunks) {
    combined.set(chunk, position);
    position += chunk.length;
  }

  const digest = await crypto.subtle.digest("SHA-256", combined);
  return toHex(new Uint8Array(digest));
};
