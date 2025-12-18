import { useMemo } from 'react';
import {
  FocusController,
  FocusControllerOptions,
} from '../utils/focusController';

export const useFocusController = <RowKey, FieldKey>(
  options: FocusControllerOptions<RowKey, FieldKey>,
): FocusController<RowKey, FieldKey> => {
  return useMemo(
    () =>
      new FocusController<RowKey, FieldKey>({
        fieldOrder: options.fieldOrder,
        getRowOrder: options.getRowOrder,
        onBoundary: options.onBoundary,
      }),
    // fieldOrder and getRowOrder are expected to be stable or memoized by caller
    [options.fieldOrder, options.getRowOrder, options.onBoundary],
  );
};
