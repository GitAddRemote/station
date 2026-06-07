import { CatalogCategoryTreeService } from './catalog-category-tree.service';

describe('CatalogCategoryTreeService', () => {
  let service: CatalogCategoryTreeService;

  beforeEach(() => {
    service = new CatalogCategoryTreeService();
  });

  it('builds root category tree fields', () => {
    expect(
      service.buildTreeFields({
        id: '00000000-0000-7000-8000-000000000001',
        slug: 'vehicle',
      }),
    ).toEqual({
      parentId: null,
      path: 'vehicle',
      pathIds: ['00000000-0000-7000-8000-000000000001'],
      depth: 0,
    });
  });

  it('builds child category tree fields from the parent materialized path', () => {
    expect(
      service.buildTreeFields(
        {
          id: '00000000-0000-7000-8000-000000000002',
          slug: 'ship',
        },
        {
          id: '00000000-0000-7000-8000-000000000001',
          slug: 'vehicle',
          path: 'vehicle',
          pathIds: ['00000000-0000-7000-8000-000000000001'],
          depth: 0,
        },
      ),
    ).toEqual({
      parentId: '00000000-0000-7000-8000-000000000001',
      path: 'vehicle.ship',
      pathIds: [
        '00000000-0000-7000-8000-000000000001',
        '00000000-0000-7000-8000-000000000002',
      ],
      depth: 1,
    });
  });

  it('supports reparenting by rebuilding the path from a new parent', () => {
    expect(
      service.buildTreeFields(
        {
          id: '00000000-0000-7000-8000-000000000003',
          slug: 'cargo',
        },
        {
          id: '00000000-0000-7000-8000-000000000002',
          slug: 'ship',
          path: 'vehicle.ship',
          pathIds: [
            '00000000-0000-7000-8000-000000000001',
            '00000000-0000-7000-8000-000000000002',
          ],
          depth: 1,
        },
      ),
    ).toEqual({
      parentId: '00000000-0000-7000-8000-000000000002',
      path: 'vehicle.ship.cargo',
      pathIds: [
        '00000000-0000-7000-8000-000000000001',
        '00000000-0000-7000-8000-000000000002',
        '00000000-0000-7000-8000-000000000003',
      ],
      depth: 2,
    });
  });

  it('rejects cyclic reparenting', () => {
    expect(() =>
      service.buildTreeFields(
        {
          id: '00000000-0000-7000-8000-000000000002',
          slug: 'ship',
        },
        {
          id: '00000000-0000-7000-8000-000000000003',
          slug: 'cargo',
          path: 'vehicle.ship.cargo',
          pathIds: [
            '00000000-0000-7000-8000-000000000001',
            '00000000-0000-7000-8000-000000000002',
            '00000000-0000-7000-8000-000000000003',
          ],
          depth: 2,
        },
      ),
    ).toThrow(
      'Cannot place category 00000000-0000-7000-8000-000000000002 under descendant 00000000-0000-7000-8000-000000000003',
    );
  });

  it('rejects an invalid parent materialized path state', () => {
    expect(() =>
      service.buildTreeFields(
        {
          id: '00000000-0000-7000-8000-000000000004',
          slug: 'medical',
        },
        {
          id: '00000000-0000-7000-8000-000000000001',
          slug: 'vehicle',
          path: 'vehicle',
          pathIds: [],
          depth: 0,
        },
      ),
    ).toThrow(
      'Parent category 00000000-0000-7000-8000-000000000001 has inconsistent depth and pathIds',
    );
  });

  it('rejects a blank slug', () => {
    expect(() =>
      service.buildTreeFields({
        id: '00000000-0000-7000-8000-000000000001',
        slug: '',
      }),
    ).toThrow('Category slug is required to build tree fields');
  });

  it('rejects a whitespace-only slug', () => {
    expect(() =>
      service.buildTreeFields({
        id: '00000000-0000-7000-8000-000000000001',
        slug: '   ',
      }),
    ).toThrow('Category slug is required to build tree fields');
  });

  it('rejects a slug with leading whitespace', () => {
    expect(() =>
      service.buildTreeFields({
        id: '00000000-0000-7000-8000-000000000001',
        slug: ' vehicle',
      }),
    ).toThrow('must not have leading or trailing whitespace');
  });

  it('rejects a slug with trailing whitespace', () => {
    expect(() =>
      service.buildTreeFields({
        id: '00000000-0000-7000-8000-000000000001',
        slug: 'vehicle ',
      }),
    ).toThrow('must not have leading or trailing whitespace');
  });

  it('rejects a slug containing a dot', () => {
    expect(() =>
      service.buildTreeFields({
        id: '00000000-0000-7000-8000-000000000001',
        slug: 'vehi.cle',
      }),
    ).toThrow('must not contain "."');
  });

  it('rejects a parent with a missing path', () => {
    expect(() =>
      service.buildTreeFields(
        { id: '00000000-0000-7000-8000-000000000002', slug: 'ship' },
        {
          id: '00000000-0000-7000-8000-000000000001',
          slug: 'vehicle',
          path: '',
          pathIds: ['00000000-0000-7000-8000-000000000001'],
          depth: 0,
        },
      ),
    ).toThrow(
      'Parent category 00000000-0000-7000-8000-000000000001 is missing a path',
    );
  });

  it('rejects a parent whose pathIds last entry does not match parent.id', () => {
    expect(() =>
      service.buildTreeFields(
        { id: '00000000-0000-7000-8000-000000000003', slug: 'cargo' },
        {
          id: '00000000-0000-7000-8000-000000000002',
          slug: 'ship',
          path: 'vehicle.ship',
          pathIds: [
            '00000000-0000-7000-8000-000000000001',
            '00000000-0000-7000-8000-000000000099',
          ],
          depth: 1,
        },
      ),
    ).toThrow('must appear at the end of pathIds');
  });

  describe('rebuildDescendantTreeFields', () => {
    const ID1 = '00000000-0000-7000-8000-000000000001';
    const ID2 = '00000000-0000-7000-8000-000000000002';
    const ID3 = '00000000-0000-7000-8000-000000000003';
    const ID4 = '00000000-0000-7000-8000-000000000004';

    it('returns empty array when node has no descendants', () => {
      const reparented = {
        id: ID2,
        slug: 'ship',
        path: 'transport.ship',
        pathIds: [ID1, ID2],
        depth: 1,
      };
      expect(service.rebuildDescendantTreeFields(reparented, [])).toEqual([]);
    });

    it('updates a single direct child after reparenting its parent', () => {
      const reparented = {
        id: ID2,
        slug: 'ship',
        path: 'transport.ship',
        pathIds: [ID1, ID2],
        depth: 1,
      };
      const child = {
        id: ID3,
        slug: 'cargo',
        path: 'vehicle.ship.cargo',
        pathIds: [ID1, ID2, ID3],
        depth: 2,
        parentId: ID2,
      };

      const result = service.rebuildDescendantTreeFields(reparented, [child]);

      expect(result).toEqual([
        {
          id: ID3,
          path: 'transport.ship.cargo',
          pathIds: [ID1, ID2, ID3],
          depth: 2,
        },
      ]);
    });

    it('cascades updates through multiple levels', () => {
      // Original tree: vehicle > ship > cargo > container
      // After reparenting "ship" to a new root "transport":
      // transport.ship, transport.ship.cargo, transport.ship.cargo.container
      const reparented = {
        id: ID2,
        slug: 'ship',
        path: 'transport.ship',
        pathIds: [ID1, ID2],
        depth: 1,
      };
      const grandchild = {
        id: ID3,
        slug: 'cargo',
        path: 'vehicle.ship.cargo',
        pathIds: ['old-root', ID2, ID3],
        depth: 2,
        parentId: ID2,
      };
      const greatGrandchild = {
        id: ID4,
        slug: 'container',
        path: 'vehicle.ship.cargo.container',
        pathIds: ['old-root', ID2, ID3, ID4],
        depth: 3,
        parentId: ID3,
      };

      const result = service.rebuildDescendantTreeFields(reparented, [
        grandchild,
        greatGrandchild,
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: ID3,
        path: 'transport.ship.cargo',
        pathIds: [ID1, ID2, ID3],
        depth: 2,
      });
      expect(result[1]).toEqual({
        id: ID4,
        path: 'transport.ship.cargo.container',
        pathIds: [ID1, ID2, ID3, ID4],
        depth: 3,
      });
    });

    it('throws when a descendant references a parent not yet processed (out-of-order input)', () => {
      const reparented = {
        id: ID2,
        slug: 'ship',
        path: 'transport.ship',
        pathIds: [ID1, ID2],
        depth: 1,
      };
      const grandchild = {
        id: ID3,
        slug: 'cargo',
        path: 'vehicle.ship.cargo',
        pathIds: ['old-root', ID2, ID3],
        depth: 2,
        parentId: ID2,
      };
      const greatGrandchild = {
        id: ID4,
        slug: 'container',
        path: 'vehicle.ship.cargo.container',
        pathIds: ['old-root', ID2, ID3, ID4],
        depth: 3,
        parentId: ID3,
      };

      // Pass descendants in reverse order — great-grandchild before grandchild
      expect(() =>
        service.rebuildDescendantTreeFields(reparented, [
          greatGrandchild,
          grandchild,
        ]),
      ).toThrow('top-down (ancestor-first) order');
    });
  });
});
