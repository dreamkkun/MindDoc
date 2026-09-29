export interface MindmapNode {
  id: string;
  name: string;
  color?: string;
  children?: MindmapNode[];
  _children?: MindmapNode[];
  depth?: number;
  x?: number;
  y?: number;
  x0?: number;
  y0?: number;
}

/** A free-floating text note placed anywhere on the canvas, not part of the tree. */
export interface MindmapAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

export type ViewMode = "canvas" | "outline" | "qna";

export interface MindmapStore {
  root: MindmapNode | null;
  selectedNodeId: string | null;
  history: MindmapNode[];
  future: MindmapNode[];
  annotations: MindmapAnnotation[];
  selectedAnnotationId: string | null;
  viewMode: ViewMode;
  setRoot: (data: MindmapNode, viewMode?: ViewMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeName: (id: string, name: string) => void;
  addChildNode: (parentId: string, name?: string) => string | null;
  addSiblingNode: (targetId: string, name?: string) => string | null;
  deleteNode: (id: string) => void;
  toggleCollapse: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  undo: () => void;
  redo: () => void;
  addAnnotation: (x: number, y: number, text?: string) => string;
  updateAnnotationText: (id: string, text: string) => void;
  updateAnnotationPosition: (id: string, x: number, y: number) => void;
  deleteAnnotation: (id: string) => void;
  setSelectedAnnotationId: (id: string | null) => void;
}
