export function generateId(text: string, length = 6): string {
  let hash = 5381;

  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }

  return Math.abs(hash).toString(36).padStart(length, "0").slice(-length);
}
