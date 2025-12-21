import { useMemo } from 'react';

interface LocationOption {
  id: number;
  name: string;
}

export const useMemoizedLocations = (
  allLocations: LocationOption[],
  input: string,
  isActive: boolean,
) => {
  const filtered = useMemo(() => {
    if (!isActive) return [];
    const term = input.trim().toLowerCase();
    return allLocations
      .filter((opt) => opt.name.toLowerCase().includes(term))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStarts = aName.startsWith(term);
        const bStarts = bName.startsWith(term);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        const aIndex = aName.indexOf(term);
        const bIndex = bName.indexOf(term);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.name.localeCompare(b.name);
      });
  }, [allLocations, input, isActive]);

  return { filtered };
};
