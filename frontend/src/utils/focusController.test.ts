import { FocusController } from './focusController';

type RowKey = string;
type FieldKey = 'location' | 'quantity' | 'save';

const makeController = (
  rows: RowKey[],
  boundary?: (row: RowKey) => RowKey | null | Promise<RowKey | null>,
) =>
  new FocusController<RowKey, FieldKey>({
    fieldOrder: ['location', 'quantity', 'save'],
    getRowOrder: () => rows,
    onBoundary: boundary,
  });

describe('FocusController', () => {
  it('focuses next field within a row', async () => {
    const calls: string[] = [];
    const controller = makeController(['row-1']);

    controller.register('row-1', 'location', () => calls.push('row-1:location'));
    controller.register('row-1', 'quantity', () => calls.push('row-1:quantity'));
    controller.register('row-1', 'save', () => calls.push('row-1:save'));

    await controller.focusNext('row-1', 'location');
    expect(calls).toContain('row-1:quantity');
  });

  it('advances to next row first field when current row fields are exhausted', async () => {
    const calls: string[] = [];
    const controller = makeController(['row-1', 'row-2']);

    controller.register('row-1', 'save', () => calls.push('row-1:save'));
    controller.register('row-2', 'location', () => calls.push('row-2:location'));

    await controller.focusNext('row-1', 'save');
    expect(calls).toContain('row-2:location');
  });

  it('invokes boundary handler when at the last row', async () => {
    const calls: string[] = [];
    const controller = makeController(['row-1'], (row) => {
      calls.push(`boundary:${row}`);
      return 'row-2';
    });

    controller.register('row-1', 'save', () => calls.push('row-1:save'));
    controller.register('row-2', 'location', () => calls.push('row-2:location'));

    await controller.focusNext('row-1', 'save');
    expect(calls).toEqual(['boundary:row-1', 'row-2:location']);
  });

  it('returns false when target field is missing', async () => {
    const controller = makeController(['row-1']);
    const result = await controller.focusNext('row-1', 'location');
    expect(result).toBe(false);
  });
});
