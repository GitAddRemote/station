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

export type CatalogCategoryDescendantUpdate = {
  id: string;
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

  /**
   * Given a node whose path/pathIds/depth were just recomputed (e.g. after
   * reparenting) and the ordered list of its current descendants (ancestor-first,
   * as returned by a recursive CTE), returns the updated tree fields for every
   * descendant. The caller is responsible for writing these updates to the DB in
   * the same transaction as the reparented node.
   *
   * Descendants must be provided in top-down order (each node's parent appears
   * before it in the list). The function validates this invariant and throws if a
   * descendant's current parent cannot be found among the already-processed nodes.
   */
  rebuildDescendantTreeFields(
    reparentedNode: CatalogCategoryTreeNodeRef,
    descendants: Array<CatalogCategoryTreeNodeRef & { parentId: string }>,
  ): CatalogCategoryDescendantUpdate[] {
    // Build a live map of id → updated tree fields so each level can inherit
    // from its (already updated) parent.
    const updatedById = new Map<string, CatalogCategoryTreeNodeRef>();
    updatedById.set(reparentedNode.id, reparentedNode);

    const result: CatalogCategoryDescendantUpdate[] = [];

    for (const desc of descendants) {
      const updatedParent = updatedById.get(desc.parentId);
      if (!updatedParent) {
        throw new Error(
          `Descendant ${desc.id} references parent ${desc.parentId} which has not been processed yet — descendants must be provided in top-down (ancestor-first) order`,
        );
      }

      const updated: CatalogCategoryTreeNodeRef = {
        id: desc.id,
        slug: desc.slug,
        path: `${updatedParent.path}.${desc.slug}`,
        pathIds: [...updatedParent.pathIds, desc.id],
        depth: updatedParent.depth + 1,
      };

      updatedById.set(desc.id, updated);
      result.push({
        id: desc.id,
        path: updated.path,
        pathIds: updated.pathIds,
        depth: updated.depth,
      });
    }

    return result;
  }

  private assertValidSlug(slug: string): void {
    if (!slug?.trim()) {
      throw new Error('Category slug is required to build tree fields');
    }
    if (slug !== slug.trim()) {
      throw new Error(
        `Category slug "${slug}" must not have leading or trailing whitespace`,
      );
    }
    if (slug.includes('.')) {
      throw new Error(
        `Category slug "${slug}" must not contain "." (used as path separator)`,
      );
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
