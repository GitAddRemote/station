type FocusCallback = () => void;

export interface FocusControllerOptions<RowKey, FieldKey> {
  fieldOrder: FieldKey[];
  /**
   * Returns the current rendered row order (after filters/sorts/pagination).
   */
  getRowOrder: () => RowKey[];
  /**
   * Invoked when focus tries to advance past the last row.
   * Return a row key to focus (e.g., first row on next page) or null/undefined to stop.
   */
  onBoundary?: (rowKey: RowKey) => Promise<RowKey | null> | RowKey | null;
}

/**
 * FocusController centralizes focus transitions for grid-like UIs (e.g., Editor Mode).
 * It keeps a registry of focusable fields per row and provides deterministic
 * navigation across fields and rows, including pagination boundaries.
 */
export class FocusController<RowKey, FieldKey> {
  private readonly registry = new Map<RowKey, Map<FieldKey, FocusCallback>>();
  private readonly fieldOrder: FieldKey[];
  private readonly getRowOrder: () => RowKey[];
  private readonly onBoundary?: (
    rowKey: RowKey,
  ) => Promise<RowKey | null> | RowKey | null;

  constructor(options: FocusControllerOptions<RowKey, FieldKey>) {
    this.fieldOrder = options.fieldOrder;
    this.getRowOrder = options.getRowOrder;
    this.onBoundary = options.onBoundary;
  }

  /**
   * Register a focus callback for a row/field combination.
   * Returns an unregister function.
   */
  register(rowKey: RowKey, fieldKey: FieldKey, focus: FocusCallback): () => void {
    let fields = this.registry.get(rowKey);
    if (!fields) {
      fields = new Map<FieldKey, FocusCallback>();
      this.registry.set(rowKey, fields);
    }
    fields.set(fieldKey, focus);
    return () => this.unregister(rowKey, fieldKey);
  }

  unregister(rowKey: RowKey, fieldKey?: FieldKey): void {
    const fields = this.registry.get(rowKey);
    if (!fields) {
      return;
    }
    if (fieldKey === undefined) {
      this.registry.delete(rowKey);
      return;
    }
    fields.delete(fieldKey);
    if (fields.size === 0) {
      this.registry.delete(rowKey);
    }
  }

  /**
   * Attempt to focus a specific row/field.
   */
  focus(rowKey: RowKey, fieldKey: FieldKey): boolean {
    const fields = this.registry.get(rowKey);
    const focus = fields?.get(fieldKey);
    if (!focus) {
      return false;
    }
    // Defer to next frame to avoid focusing an element that is being re-rendered.
    requestAnimationFrame(() => {
      focus();
    });
    return true;
  }

  /**
   * Advance focus to the next field in the same row, or the next row's first field.
   * If at the last row, delegates to onBoundary to resolve the next target (e.g., next page).
   */
  async focusNext(currentRow: RowKey, currentField: FieldKey): Promise<boolean> {
    const fieldIndex = this.fieldOrder.indexOf(currentField);
    const rowOrder = this.getRowOrder();
    const rowIndex = rowOrder.indexOf(currentRow);

    if (fieldIndex < 0 || rowIndex < 0) {
      return false;
    }

    // Next field in the same row
    if (fieldIndex < this.fieldOrder.length - 1) {
      const nextField = this.fieldOrder[fieldIndex + 1];
      return this.focus(currentRow, nextField);
    }

    // Next row's first field
    const nextRow = rowOrder[rowIndex + 1];
    if (nextRow !== undefined) {
      return this.focus(nextRow, this.fieldOrder[0]);
    }

    // Boundary handler (e.g., next page)
    if (this.onBoundary) {
      const boundaryRow = await this.onBoundary(currentRow);
      if (boundaryRow) {
        return this.focus(boundaryRow, this.fieldOrder[0]);
      }
    }

    return false;
  }
}
