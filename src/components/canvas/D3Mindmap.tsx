"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useMindmapStore } from "@/hooks/useMindmapStore";
import { useD3Mindmap } from "@/hooks/useD3Mindmap";
import { collectDescendantIds, findNodeAndParent } from "@/lib/mindmapTree";

interface EditState {
  id: string;
  left: number;
  top: number;
  width: number;
  value: string;
}

interface ContextMenuState {
  id: string;
  left: number;
  top: number;
}

export interface D3MindmapHandle {
  fitToScreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const D3Mindmap = forwardRef<D3MindmapHandle>(function D3Mindmap(_props, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  const root = useMindmapStore((s) => s.root);
  const selectedNodeId = useMindmapStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useMindmapStore((s) => s.setSelectedNodeId);
  const updateNodeName = useMindmapStore((s) => s.updateNodeName);
  const addChildNode = useMindmapStore((s) => s.addChildNode);
  const addSiblingNode = useMindmapStore((s) => s.addSiblingNode);
  const deleteNode = useMindmapStore((s) => s.deleteNode);
  const toggleCollapse = useMindmapStore((s) => s.toggleCollapse);

  const [editState, setEditState] = useState<EditState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const closeOverlays = useCallback(() => {
    setEditState(null);
    setContextMenu(null);
  }, []);

  const openEditorForNode = useCallback(
    (id: string, targetEl: SVGGElement) => {
      const container = containerRef.current;
      if (!container) return;
      const nodeRect = targetEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const found = root ? findNodeAndParent(root, id) : null;
      setContextMenu(null);
      setEditState({
        id,
        left: nodeRect.left - containerRect.left - 100,
        top: nodeRect.top - containerRect.top - 14,
        width: 200,
        value: found?.node.name ?? "",
      });
    },
    [root],
  );

  const { fitToScreen, zoomBy } = useD3Mindmap(svgRef, root, selectedNodeId, {
    onToggleCollapse: toggleCollapse,
    onSelectNode: setSelectedNodeId,
    onRequestEdit: openEditorForNode,
    onRequestContextMenu: (id, clientX, clientY) => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      setEditState(null);
      setSelectedNodeId(id);
      setContextMenu({ id, left: clientX - containerRect.left, top: clientY - containerRect.top });
    },
    onUserInteraction: closeOverlays,
  });

  useImperativeHandle(
    ref,
    () => ({
      fitToScreen,
      zoomIn: () => zoomBy(1.3),
      zoomOut: () => zoomBy(1 / 1.3),
    }),
    [fitToScreen, zoomBy],
  );

  useEffect(() => {
    if (editState && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editState]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [contextMenu]);

  useEffect(() => {
    if (!root) return;
    const container = containerRef.current;
    if (!container) return;
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      requestAnimationFrame(() => fitToScreen());
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        observer.disconnect();
        requestAnimationFrame(() => fitToScreen());
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root?.id]);

  const commitEdit = useCallback(() => {
    if (!editState) return;
    updateNodeName(editState.id, editState.value);
    setEditState(null);
  }, [editState, updateNodeName]);

  const handleDeleteNode = useCallback(
    (id: string) => {
      if (!root) return;
      if (id === root.id) return;
      const found = findNodeAndParent(root, id);
      if (!found) return;
      const descendantCount = collectDescendantIds(found.node).length;
      if (descendantCount > 0) {
        const ok = window.confirm(`하위 노드 ${descendantCount}개도 함께 삭제됩니다. 계속할까요?`);
        if (!ok) return;
      }
      deleteNode(id);
    },
    [root, deleteNode],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (editState || contextMenu) return;
      if (!selectedNodeId || !root) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (event.key === "Tab") {
        event.preventDefault();
        addChildNode(selectedNodeId);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (selectedNodeId !== root.id) addSiblingNode(selectedNodeId);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleDeleteNode(selectedNodeId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, root, editState, contextMenu, addChildNode, addSiblingNode, handleDeleteNode]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-900"
      onClick={() => setSelectedNodeId(null)}
    >
      <svg ref={svgRef} className="h-full w-full" onClick={(e) => e.stopPropagation()} />

      {editState && (
        <input
          ref={editInputRef}
          className="absolute z-20 rounded border border-amber-500 bg-slate-800 px-2 py-1 text-sm text-slate-100 shadow-lg outline-none"
          style={{ left: editState.left, top: editState.top, width: editState.width }}
          value={editState.value}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setEditState({ ...editState, value: e.target.value })}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitEdit();
            } else if (e.key === "Escape") {
              setEditState(null);
            }
          }}
        />
      )}

      {contextMenu && root && (
        <div
          className="absolute z-30 w-44 overflow-hidden rounded-md border border-slate-700 bg-slate-800 py-1 text-sm shadow-xl"
          style={{ left: contextMenu.left, top: contextMenu.top }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="block w-full px-3 py-1.5 text-left text-slate-200 hover:bg-slate-700"
            onClick={() => {
              addChildNode(contextMenu.id);
              setContextMenu(null);
            }}
          >
            하위 항목 추가
          </button>
          <button
            className="block w-full px-3 py-1.5 text-left text-slate-200 hover:bg-slate-700"
            onClick={() => {
              const found = findNodeAndParent(root, contextMenu.id);
              const svgNode = svgRef.current?.querySelector<SVGGElement>(
                `g.node[data-id="${contextMenu.id}"]`,
              );
              if (found && svgNode) {
                openEditorForNode(contextMenu.id, svgNode);
              } else if (found) {
                setEditState({ id: contextMenu.id, left: contextMenu.left, top: contextMenu.top, width: 200, value: found.node.name });
              }
              setContextMenu(null);
            }}
          >
            노드 수정
          </button>
          <button
            className="block w-full px-3 py-1.5 text-left text-rose-400 hover:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-600"
            disabled={contextMenu.id === root.id}
            onClick={() => {
              handleDeleteNode(contextMenu.id);
              setContextMenu(null);
            }}
          >
            노드 삭제
          </button>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-10 flex flex-col overflow-hidden rounded-md border border-slate-700 bg-slate-800/90 shadow-lg backdrop-blur">
        <button className="p-2 text-slate-300 hover:bg-slate-700 hover:text-white" title="확대" onClick={() => zoomBy(1.3)}>
          <ZoomIn size={16} />
        </button>
        <button
          className="border-t border-slate-700 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
          title="축소"
          onClick={() => zoomBy(1 / 1.3)}
        >
          <ZoomOut size={16} />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 space-y-1.5 rounded-lg border border-slate-700 bg-slate-800/90 p-3 text-xs shadow-xl backdrop-blur">
        <div className="mb-1 font-semibold text-slate-300">범례 / 조작 안내</div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-blue-500 bg-slate-900" />
          <span className="text-slate-400">테두리만 있음: 하위 항목 펼쳐짐</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-400">색상 채워짐: 접혀있는 상태 (클릭 시 확장)</span>
        </div>
        <div className="text-slate-500">더블클릭: 수정 · 우클릭: 메뉴 · Tab/Enter/Delete</div>
      </div>
    </div>
  );
});

export default D3Mindmap;
