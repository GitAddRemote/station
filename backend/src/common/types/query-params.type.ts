export interface QueryParams {
  [key: string]: string | string[] | QueryParams | QueryParams[] | undefined;
}

/** Narrows a query param value to string | undefined, ignoring arrays/objects. */
export function asString(value: QueryParams[string]): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
