import { nanoid } from "nanoid";
import type { MindmapNode } from "@/types/mindmap";

const PALETTE = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#ec4899"];

export function paletteColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

/** Assigns ids/colors to any nodes missing them and deep-clones the tree. */
export function normalizeTree(node: MindmapNode, depth = 0): MindmapNode {
  return {
    ...node,
    id: node.id ?? nanoid(),
    color: node.color ?? (depth === 0 ? "#3b82f6" : paletteColor(depth)),
    children: node.children?.map((child) => normalizeTree(child, depth + 1)),
  };
}

export function cloneTree(node: MindmapNode): MindmapNode {
  return {
    ...node,
    children: node.children?.map(cloneTree),
    _children: node._children?.map(cloneTree),
  };
}

interface NodeAndParent {
  node: MindmapNode;
  parent: MindmapNode | null;
}

function isPresentChild(node: MindmapNode, id: string): boolean {
  return node.id === id;
}

/** Searches both expanded (children) and collapsed (_children) branches. */
export function findNodeAndParent(root: MindmapNode, id: string, parent: MindmapNode | null = null): NodeAndParent | null {
  if (isPresentChild(root, id)) return { node: root, parent };
  const branches = [root.children, root._children];
  for (const branch of branches) {
    if (!branch) continue;
    for (const child of branch) {
      const found = findNodeAndParent(child, id, root);
      if (found) return found;
    }
  }
  return null;
}

export function collectDescendantIds(node: MindmapNode): string[] {
  const ids: string[] = [];
  const visit = (n: MindmapNode) => {
    for (const child of [...(n.children ?? []), ...(n._children ?? [])]) {
      ids.push(child.id);
      visit(child);
    }
  };
  visit(node);
  return ids;
}

/** Returns a new tree with `updater` applied to the node matching `id` (immutable, structural sharing elsewhere). */
export function updateNodeById(root: MindmapNode, id: string, updater: (node: MindmapNode) => MindmapNode): MindmapNode {
  if (root.id === id) return updater(root);
  return {
    ...root,
    children: root.children?.map((child) => updateNodeById(child, id, updater)),
    _children: root._children?.map((child) => updateNodeById(child, id, updater)),
  };
}

/** Returns a new tree with the node matching `id` removed. Root cannot be removed (returns root unchanged). */
export function removeNodeById(root: MindmapNode, id: string): MindmapNode {
  const filterBranch = (branch?: MindmapNode[]) => branch?.filter((child) => child.id !== id).map((child) => removeNodeById(child, id));
  return {
    ...root,
    children: filterBranch(root.children),
    _children: filterBranch(root._children),
  };
}

/** Inserts `newNode` as a child of `parentId`, expanding the parent if it was collapsed. */
export function addChildToNode(root: MindmapNode, parentId: string, newNode: MindmapNode): MindmapNode {
  return updateNodeById(root, parentId, (node) => {
    if (node._children && !node.children) {
      return { ...node, children: [...node._children, newNode], _children: undefined };
    }
    return { ...node, children: [...(node.children ?? []), newNode] };
  });
}

/** Inserts `newNode` immediately after `targetId` within its parent's children. No-op if target is root or not found. */
export function addSiblingToNode(root: MindmapNode, targetId: string, newNode: MindmapNode): MindmapNode {
  const insertAfter = (branch?: MindmapNode[]) => {
    if (!branch) return branch;
    const index = branch.findIndex((child) => child.id === targetId);
    if (index === -1) return branch.map((child) => addSiblingToNode(child, targetId, newNode));
    const next = [...branch];
    next.splice(index + 1, 0, newNode);
    return next;
  };
  return {
    ...root,
    children: insertAfter(root.children),
    _children: insertAfter(root._children),
  };
}

export function toggleCollapseNode(root: MindmapNode, id: string): MindmapNode {
  return updateNodeById(root, id, (node) => {
    if (node.children && node.children.length > 0) {
      return { ...node, children: undefined, _children: node.children };
    }
    if (node._children && node._children.length > 0) {
      return { ...node, children: node._children, _children: undefined };
    }
    return node;
  });
}

export function setAllCollapsed(node: MindmapNode, collapsed: boolean, isRoot = true): MindmapNode {
  const kids = node.children ?? node._children;
  if (!kids || kids.length === 0) return { ...node };
  const mappedKids = kids.map((child) => setAllCollapsed(child, collapsed, false));
  if (collapsed && !isRoot) {
    return { ...node, children: undefined, _children: mappedKids };
  }
  return { ...node, children: mappedKids, _children: undefined };
}
