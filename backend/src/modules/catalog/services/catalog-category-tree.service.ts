import { Injectable } from '@nestjs/common';

export type CatalogCategoryTreeNodeRef = {
  id: string;
  slug: string;
  path: string;
  pathIds: string[];
  depth: number;
};

export type CatalogCategoryTreeFields = {
  parentId: string | null;
  path: string;
  pathIds: string[];
  depth: number;
};

@Injectable()
export class CatalogCategoryTreeService {
  buildTreeFields(
    category: Pick<CatalogCategoryTreeNodeRef, 'id' | 'slug'>,
    parent?: CatalogCategoryTreeNodeRef | null,
  ): CatalogCategoryTreeFields {
    this.assertValidSlug(category.slug);

    if (!parent) {
      return {
        parentId: null,
        path: category.slug,
        pathIds: [category.id],
        depth: 0,
      };
    }

    this.assertValidParent(parent);

    if (parent.pathIds.includes(category.id)) {
      throw new Error(
        `Cannot place category ${category.id} under descendant ${parent.id}`,
      );
    }

    return {
      parentId: parent.id,
      path: `${parent.path}.${category.slug}`,
      pathIds: [...parent.pathIds, category.id],
      depth: parent.depth + 1,
    };
  }

  private assertValidSlug(slug: string): void {
    if (!slug?.trim()) {
      throw new Error('Category slug is required to build tree fields');
    }
  }

  private assertValidParent(parent: CatalogCategoryTreeNodeRef): void {
    if (!parent.path?.trim()) {
      throw new Error(`Parent category ${parent.id} is missing a path`);
    }

    if (parent.pathIds.length !== parent.depth + 1) {
      throw new Error(
        `Parent category ${parent.id} has inconsistent depth and pathIds`,
      );
    }

    if (parent.pathIds[parent.pathIds.length - 1] !== parent.id) {
      throw new Error(
        `Parent category ${parent.id} must appear at the end of pathIds`,
      );
    }
  }
}
