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

export interface MindmapStore {
  root: MindmapNode | null;
  selectedNodeId: string | null;
  history: MindmapNode[];
  setRoot: (data: MindmapNode) => void;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeName: (id: string, name: string) => void;
  addChildNode: (parentId: string, name?: string) => string | null;
  addSiblingNode: (targetId: string, name?: string) => string | null;
  deleteNode: (id: string) => void;
  toggleCollapse: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  undo: () => void;
}
