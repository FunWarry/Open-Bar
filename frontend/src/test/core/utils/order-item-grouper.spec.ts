import { groupCommandeItems, GroupableCommandeItem } from '../../../app/core/utils/order-item-grouper';

describe('order-item-grouper utility', () => {
  it('should return empty array when items are null or empty', () => {
    expect(groupCommandeItems(null)).toEqual([]);
    expect(groupCommandeItems([])).toEqual([]);
  });

  it('should group identical items and sum quantities', () => {
    const items: GroupableCommandeItem[] = [
      { id: 1, cocktailId: 10, cocktailNom: 'Mojito', quantite: 1, prixUnitaire: 9.5 },
      { id: 2, cocktailId: 10, cocktailNom: 'Mojito', quantite: 2, prixUnitaire: 9.5 },
      { id: 3, cocktailId: 11, cocktailNom: 'Negroni', quantite: 1, prixUnitaire: 10.0 },
    ];

    const grouped = groupCommandeItems(items);
    expect(grouped).toHaveSize(2);
    expect(grouped[0].cocktailNom).toBe('Mojito');
    expect(grouped[0].quantite).toBe(3);
    expect(grouped[1].cocktailNom).toBe('Negroni');
    expect(grouped[1].quantite).toBe(1);
  });

  it('should keep items separate if variants or notes differ', () => {
    const items: GroupableCommandeItem[] = [
      { id: 1, cocktailId: 10, cocktailNom: 'Mojito', quantite: 1, notes: 'Sans glaçons' },
      { id: 2, cocktailId: 10, cocktailNom: 'Mojito', quantite: 1, notes: 'Extra menthe' },
      { id: 3, cocktailId: 10, cocktailNom: 'Mojito', quantite: 1, varianteId: 2, varianteNom: 'Grand Format' },
    ];

    const grouped = groupCommandeItems(items);
    expect(grouped).toHaveSize(3);
  });
});
