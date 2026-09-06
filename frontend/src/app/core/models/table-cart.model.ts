/**
 * Individual item present in a collaborative table cart.
 */
export interface TableCartItem {
  /**
   * Unique cart item identifier.
   */
  id: number;

  /**
   * Guest session UUID identifying the contributor.
   */
  guestSessionId: string;

  /**
   * Display nickname of the contributor.
   */
  guestName: string;

  /**
   * Cocktail identifier.
   */
  cocktailId: number;

  /**
   * Cocktail display name.
   */
  cocktailNom: string;

  /**
   * Cocktail image URL.
   */
  cocktailImageUrl?: string | null;

  /**
   * Cocktail variant identifier if selected.
   */
  varianteId?: number | null;

  /**
   * Cocktail variant display name if selected.
   */
  varianteNom?: string | null;

  /**
   * Selected quantity.
   */
  quantite: number;

  /**
   * Unit price including variant supplement.
   */
  prixUnitaire: number;

  /**
   * Line subtotal (quantite * prixUnitaire).
   */
  totalLigne: number;

  /**
   * Optional custom preparation notes.
   */
  notes?: string | null;

  /**
   * Timestamp when added.
   */
  createdAt?: string | null;
}

/**
 * Lifecycle status of a collaborative table cart.
 */
export type TableCartStatus = 'OPEN' | 'SUBMITTED' | 'CLOSED';

/**
 * Consolidated collaborative cart state for a table.
 */
export interface TableCart {
  /**
   * Table identifier.
   */
  tableId: number;

  /**
   * Current cart status.
   */
  status: TableCartStatus;

  /**
   * All items contributed by seated guests.
   */
  items: TableCartItem[];

  /**
   * Total number of beverage items across all guests.
   */
  totalItems: number;

  /**
   * Total table bill amount for all cart items.
   */
  totalPrice?: number;

  /**
   * Backend field for total table bill amount.
   */
  tableTotal?: number;


  /**
   * Official order ID once submitted to the bar.
   */
  submittedOrderId?: number | null;

  /**
   * Tracking token for the submitted order.
   */
  trackingToken?: string | null;

  /**
   * Nickname of the guest who submitted the consolidated order.
   */
  submittedBy?: string | null;

  /**
   * Timestamp of latest cart mutation or submission.
   */
  updatedAt?: string | null;
}

/**
 * Payload for adding an item to the table cart.
 */
export interface TableCartItemRequest {
  /**
   * Guest session UUID.
   */
  guestSessionId: string;

  /**
   * Guest nickname.
   */
  guestName: string;

  /**
   * Cocktail identifier.
   */
  cocktailId: number;

  /**
   * Optional variant identifier.
   */
  varianteId?: number | null;

  /**
   * Quantity to add.
   */
  quantite: number;

  /**
   * Optional item notes.
   */
  notes?: string | null;
}

/**
 * Payload for updating a cart item's quantity or notes.
 */
export interface TableCartItemUpdateRequest {
  /**
   * Guest session UUID.
   */
  guestSessionId?: string;

  /**
   * New quantity.
   */
  quantite: number;

  /**
   * Updated preparation notes.
   */
  notes?: string | null;
}


/**
 * Payload for submitting the consolidated table cart.
 */
export interface TableCartSubmitRequest {
  /**
   * Guest session UUID of submitter.
   */
  guestSessionId: string;

  /**
   * Submitter nickname.
   */
  guestName: string;

  /**
   * Optional table session token if anti-fraud is active.
   */
  sessionToken?: string | null;

  /**
   * Global order notes for the barman/server.
   */
  notes?: string | null;
}
