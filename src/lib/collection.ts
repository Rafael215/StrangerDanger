import type { AnimalResult } from "@/components/ResultCard";

export interface CollectionEntry extends AnimalResult {
  id: string;
  savedAt: string;
  imagePreview?: string;
}

const STORAGE_KEY = "strangerdanger-collection";

export function getCollection(): CollectionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToCollection(
  result: AnimalResult,
  imagePreview?: string
): CollectionEntry {
  const collection = getCollection();
  const entry: CollectionEntry = {
    ...result,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    imagePreview,
  };
  collection.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
  return entry;
}

export function removeFromCollection(id: string): void {
  const collection = getCollection().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
}

export function isInCollection(name: string): boolean {
  return getCollection().some(
    (e) => e.name.toLowerCase() === name.toLowerCase()
  );
}
