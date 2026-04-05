import type { AnimalResult } from "@/components/ResultCard";

export interface CollectionEntry extends AnimalResult {
  id: string;
  savedAt: string;
  imagePreview?: string;
}

export interface PlantEntry {
  id: string;
  name: string;
  scientificName: string;
  category: string;
  detail: string;
  edible: boolean;
  medicinal: boolean;
  toxic: boolean;
  savedAt: string;
  imagePreview?: string;
}

const STORAGE_KEY = "strangerdanger-collection";
const PLANTS_STORAGE_KEY = "strangerdanger-plants";

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

// Plant collection
export function getPlantCollection(): PlantEntry[] {
  try {
    const raw = localStorage.getItem(PLANTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToPlantCollection(
  plant: Omit<PlantEntry, "id" | "savedAt">,
): PlantEntry {
  const collection = getPlantCollection();
  const entry: PlantEntry = {
    ...plant,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  collection.unshift(entry);
  localStorage.setItem(PLANTS_STORAGE_KEY, JSON.stringify(collection));
  return entry;
}

export function removeFromPlantCollection(id: string): void {
  const collection = getPlantCollection().filter((e) => e.id !== id);
  localStorage.setItem(PLANTS_STORAGE_KEY, JSON.stringify(collection));
}

export function isPlantInCollection(name: string): boolean {
  return getPlantCollection().some(
    (e) => e.name.toLowerCase() === name.toLowerCase()
  );
}
