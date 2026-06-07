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
});
