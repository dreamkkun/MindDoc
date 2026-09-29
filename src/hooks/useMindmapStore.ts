import { create } from "zustand";
import { nanoid } from "nanoid";
import type { MindmapAnnotation, MindmapNode, MindmapStore } from "@/types/mindmap";
import {
  addChildToNode,
  addSiblingToNode,
  cloneTree,
  findNodeAndParent,
  normalizeTree,
  paletteColor,
  removeNodeById,
  setAllCollapsed,
  toggleCollapseNode,
  updateNodeById,
} from "@/lib/mindmapTree";

const MAX_HISTORY = 50;

function pushHistory(history: MindmapNode[], snapshot: MindmapNode | null): MindmapNode[] {
  if (!snapshot) return history;
  const next = [...history, cloneTree(snapshot)];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

export const useMindmapStore = create<MindmapStore>((set, get) => ({
  root: null,
  selectedNodeId: null,
  history: [],
  future: [],
  annotations: [],
  selectedAnnotationId: null,
  viewMode: "canvas",

  setRoot: (data, viewMode = "canvas") =>
    set({
      root: normalizeTree(data),
      selectedNodeId: null,
      history: [],
      future: [],
      annotations: [],
      selectedAnnotationId: null,
      viewMode,
    }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  updateNodeName: (id, name) => {
    const { root, history } = get();
    if (!root) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    set({
      root: updateNodeById(root, id, (node) => ({ ...node, name: trimmed })),
      history: pushHistory(history, root),
      future: [],
    });
  },

  addChildNode: (parentId, name = "새 항목") => {
    const { root, history } = get();
    if (!root) return null;
    const found = findNodeAndParent(root, parentId);
    if (!found) return null;
    const depth = (found.node.depth ?? 0) + 1;
    const newNode: MindmapNode = { id: nanoid(), name, color: paletteColor(depth), children: [] };
    set({
      root: addChildToNode(root, parentId, newNode),
      history: pushHistory(history, root),
      future: [],
      selectedNodeId: newNode.id,
    });
    return newNode.id;
  },

  addSiblingNode: (targetId, name = "새 항목") => {
    const { root, history } = get();
    if (!root) return null;
    if (root.id === targetId) return null;
    const found = findNodeAndParent(root, targetId);
    if (!found || !found.parent) return null;
    const depth = found.node.depth ?? 0;
    const newNode: MindmapNode = { id: nanoid(), name, color: paletteColor(depth), children: [] };
    set({
      root: addSiblingToNode(root, targetId, newNode),
      history: pushHistory(history, root),
      future: [],
      selectedNodeId: newNode.id,
    });
    return newNode.id;
  },

  deleteNode: (id) => {
    const { root, history, selectedNodeId } = get();
    if (!root || root.id === id) return;
    set({
      root: removeNodeById(root, id),
      history: pushHistory(history, root),
      future: [],
      selectedNodeId: selectedNodeId === id ? null : selectedNodeId,
    });
  },

  toggleCollapse: (id) => {
    const { root } = get();
    if (!root) return;
    set({ root: toggleCollapseNode(root, id) });
  },

  expandAll: () => {
    const { root } = get();
    if (!root) return;
    set({ root: setAllCollapsed(root, false) });
  },

  collapseAll: () => {
    const { root } = get();
    if (!root) return;
    set({ root: setAllCollapsed(root, true) });
  },

  undo: () => {
    const { root, history, future } = get();
    if (history.length === 0 || !root) return;
    const previous = history[history.length - 1];
    set({
      root: previous,
      history: history.slice(0, -1),
      future: pushHistory(future, root),
      selectedNodeId: null,
    });
  },

  redo: () => {
    const { root, history, future } = get();
    if (future.length === 0 || !root) return;
    const next = future[future.length - 1];
    set({
      root: next,
      future: future.slice(0, -1),
      history: pushHistory(history, root),
      selectedNodeId: null,
    });
  },

  addAnnotation: (x, y, text = "") => {
    const newAnnotation: MindmapAnnotation = { id: nanoid(), x, y, text };
    set((state) => ({
      annotations: [...state.annotations, newAnnotation],
      selectedAnnotationId: newAnnotation.id,
      selectedNodeId: null,
    }));
    return newAnnotation.id;
  },

  updateAnnotationText: (id, text) => {
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? { ...a, text } : a)),
    }));
  },

  updateAnnotationPosition: (id, x, y) => {
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? { ...a, x, y } : a)),
    }));
  },

  deleteAnnotation: (id) => {
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    }));
  },

  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),
}));
