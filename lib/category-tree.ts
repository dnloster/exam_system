type CategoryLink = {
  id: number;
  parentId: number | null;
};

export type FlatCategory = CategoryLink & {
  name: string;
  _count: { questions: number; children?: number };
};

export type CategoryTreeNode = FlatCategory & {
  depth: number;
  path: string;
};

export function buildCategoryTree(categories: FlatCategory[]): CategoryTreeNode[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const pathCache = new Map<number, string>();

  function getPath(id: number): string {
    if (pathCache.has(id)) return pathCache.get(id)!;
    const cat = byId.get(id);
    if (!cat) return "";
    const path = cat.parentId
      ? `${getPath(cat.parentId)} / ${cat.name}`
      : cat.name;
    pathCache.set(id, path);
    return path;
  }

  const roots = categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const result: CategoryTreeNode[] = [];

  function walk(parentId: number | null, depth: number) {
    const children = categories
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));

    for (const child of children) {
      result.push({
        ...child,
        depth,
        path: getPath(child.id),
      });
      walk(child.id, depth + 1);
    }
  }

  for (const root of roots) {
    result.push({
      ...root,
      depth: 0,
      path: getPath(root.id),
    });
    walk(root.id, 1);
  }

  return result;
}

/** Các id không được chọn làm cha (bản thân + toàn bộ con cháu) */
export function getDescendantIds(
  categoryId: number,
  categories: CategoryLink[]
): Set<number> {
  const blocked = new Set<number>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const cat of categories) {
      if (
        cat.parentId != null &&
        blocked.has(cat.parentId) &&
        !blocked.has(cat.id)
      ) {
        blocked.add(cat.id);
        changed = true;
      }
    }
  }
  return blocked;
}

export function wouldCreateCycle(
  categoryId: number,
  newParentId: number | null,
  categories: CategoryLink[]
): boolean {
  if (newParentId == null) return false;
  if (newParentId === categoryId) return true;
  const blocked = getDescendantIds(categoryId, categories);
  return blocked.has(newParentId);
}
