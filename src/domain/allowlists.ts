import { normalizeName } from '../utils/text.js';

export interface EntityAllowlistItem {
  id: number;
  name: string;
  normalizedName: string;
}

export interface DocumentAllowlists {
  correspondents: EntityAllowlistItem[];
  documentTypes: EntityAllowlistItem[];
}

export function buildAllowlist<T extends { id: number; name: string }>(
  items: T[],
): EntityAllowlistItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    normalizedName: normalizeName(item.name),
  }));
}

export function findAllowlistMatch(
  items: EntityAllowlistItem[],
  name: string,
): EntityAllowlistItem | undefined {
  const normalized = normalizeName(name);
  return items.find((item) => item.normalizedName === normalized);
}
