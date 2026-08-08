/**
 * Interface representing minimum fields required for item grouping.
 */
export interface GroupableCommandeItem {
  id?: number;
  cocktailId?: number;
  cocktailNom?: string;
  varianteId?: number;
  varianteNom?: string;
  quantite?: number;
  prixUnitaire?: number;
  notes?: string;
  prioritaire?: boolean;
}

/**
 * Groups identical order items (same cocktail, variant, and custom notes) into consolidated items with summed quantities.
 *
 * @template T Type extending GroupableCommandeItem
 * @param items List of order items to group
 * @returns Array of grouped items with updated quantities
 */
export function groupCommandeItems<T extends GroupableCommandeItem>(items: T[] | undefined | null): T[] {
  if (!items || items.length === 0) {
    return [];
  }

  const map = new Map<string, T>();

  for (const item of items) {
    const cocktailKey = item.cocktailId
      ? `id:${item.cocktailId}`
      : `nom:${(item.cocktailNom ?? '').toString().trim().toLowerCase()}`;

    const varianteKey = item.varianteId
      ? `vid:${item.varianteId}`
      : `vnom:${(item.varianteNom ?? '').toString().trim().toLowerCase()}`;

    const notesKey = (item.notes ?? '').toString().trim().toLowerCase();

    const key = `${cocktailKey}_${varianteKey}_${notesKey}`;
    const qty = (item.quantite && item.quantite > 0) ? item.quantite : 1;

    const existing = map.get(key);
    if (existing) {
      existing.quantite = (existing.quantite ?? 1) + qty;
    } else {
      map.set(key, {
        ...item,
        quantite: qty,
      });
    }
  }

  return Array.from(map.values());
}
