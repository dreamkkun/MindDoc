"use client";

import { useCallback, useEffect, useRef } from "react";
import * as d3 from "d3";
import type { MindmapNode } from "@/types/mindmap";

export const NODE_HEIGHT = 44;
export const LEVEL_WIDTH = 260;
export const NODE_RADIUS = 6;
export const TRANSITION_DURATION = 300;

type HPoint = d3.HierarchyPointNode<MindmapNode>;
type Point = { x: number; y: number };

export interface D3MindmapHandlers {
  onToggleCollapse: (id: string) => void;
  onSelectNode: (id: string) => void;
  onRequestEdit: (id: string, targetEl: SVGGElement) => void;
  onRequestContextMenu: (id: string, clientX: number, clientY: number) => void;
  onUserInteraction: () => void;
}

function hasCollapsedChildren(node: MindmapNode) {
  return !!node._children && node._children.length > 0;
}

function isExpandable(node: MindmapNode) {
  return (!!node.children && node.children.length > 0) || hasCollapsedChildren(node);
}

function linkPath(source: Point, target: Point) {
  const generator = d3
    .linkHorizontal<unknown, Point>()
    .x((d) => d.y)
    .y((d) => d.x);
  return generator({ source, target } as never) ?? "";
}

export function useD3Mindmap(
  svgRef: React.RefObject<SVGSVGElement>,
  root: MindmapNode | null,
  selectedNodeId: string | null,
  handlers: D3MindmapHandlers,
) {
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const prevPositionsRef = useRef<Map<string, Point>>(new Map());
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const selectedIdRef = useRef(selectedNodeId);
  selectedIdRef.current = selectedNodeId;

  // one-time setup: root <g>, zoom behavior
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("class", "mindmap-canvas");
    gRef.current = g.node();

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2.5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
        if (event.sourceEvent) handlersRef.current.onUserInteraction();
      });

    svg.call(zoom);
    svg.on("dblclick.zoom", null);
    zoomRef.current = zoom;

    return () => {
      svg.on(".zoom", null);
    };
  }, [svgRef]);

  const render = useCallback(
    (data: MindmapNode) => {
      const g = gRef.current;
      if (!g) return;
      const gSel = d3.select(g);

      const hierarchyRoot = d3.hierarchy(data, (d) => d.children);
      const layout = d3
        .tree<MindmapNode>()
        .nodeSize([NODE_HEIGHT, LEVEL_WIDTH])
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.4));
      const treeRoot = layout(hierarchyRoot) as HPoint;

      const nodes = treeRoot.descendants();
      const links = treeRoot.links();

      const prevPositions = prevPositionsRef.current;
      const rootFallback: Point = prevPositions.get(data.id) ?? { x: treeRoot.x, y: treeRoot.y };

      const entryPositions = new Map<string, Point>();
      for (const d of nodes) {
        const prev = prevPositions.get(d.data.id);
        if (prev) {
          entryPositions.set(d.data.id, prev);
        } else {
          const parentEntry = d.parent ? entryPositions.get(d.parent.data.id) : undefined;
          entryPositions.set(d.data.id, parentEntry ?? rootFallback);
        }
      }

      const newPositions = new Map<string, Point>();
      for (const d of nodes) newPositions.set(d.data.id, { x: d.x, y: d.y });

      const survivingPosition = (node: HPoint): Point => {
        let cur: HPoint | null = node;
        while (cur) {
          const pos = newPositions.get(cur.data.id);
          if (pos) return pos;
          cur = cur.parent as HPoint | null;
        }
        return newPositions.get(data.id) ?? rootFallback;
      };

      // ---------- LINKS ----------
      const link = gSel
        .selectAll<SVGPathElement, d3.HierarchyPointLink<MindmapNode>>("path.mindmap-link")
        .data(links, (d) => d.target.data.id);

      const linkEnter = link
        .enter()
        .insert("path", "g.node")
        .attr("class", "mindmap-link")
        .attr("fill", "none")
        .attr("stroke", "#475569")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.8)
        .attr("d", (d) => {
          const o = entryPositions.get(d.source.data.id) ?? rootFallback;
          return linkPath(o, o);
        });

      linkEnter
        .merge(link)
        .transition()
        .duration(TRANSITION_DURATION)
        .attr("d", (d) => linkPath({ x: d.source.x, y: d.source.y }, { x: d.target.x, y: d.target.y }));

      link
        .exit<d3.HierarchyPointLink<MindmapNode>>()
        .transition()
        .duration(TRANSITION_DURATION)
        .attr("d", (d) => {
          const target = survivingPosition(d.source as HPoint);
          return linkPath(target, target);
        })
        .remove();

      // ---------- NODES ----------
      const node = gSel
        .selectAll<SVGGElement, HPoint>("g.node")
        .data(nodes, (d) => d.data.id);

      const nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("data-id", (d) => d.data.id)
        .attr("transform", (d) => {
          const p = entryPositions.get(d.data.id) ?? rootFallback;
          return `translate(${p.y},${p.x})`;
        })
        .style("cursor", "pointer");

      nodeEnter
        .append("circle")
        .attr("class", "node-circle")
        .attr("r", 1e-6)
        .attr("stroke-width", 2);

      nodeEnter
        .append("text")
        .attr("class", "node-label")
        .attr("dy", "0.32em")
        .style("fill", "#e2e8f0")
        .style("font-size", "13px")
        .style("font-family", "ui-sans-serif, system-ui, -apple-system, sans-serif")
        .style("fill-opacity", 1e-6)
        .text((d) => d.data.name);

      const nodeMerge = nodeEnter.merge(node);

      nodeMerge
        .on("click", (event, d) => {
          event.stopPropagation();
          handlersRef.current.onSelectNode(d.data.id);
          if (isExpandable(d.data)) handlersRef.current.onToggleCollapse(d.data.id);
        })
        .on("dblclick", function (event, d) {
          event.stopPropagation();
          handlersRef.current.onRequestEdit(d.data.id, this as SVGGElement);
        })
        .on("contextmenu", (event, d) => {
          event.preventDefault();
          event.stopPropagation();
          handlersRef.current.onRequestContextMenu(d.data.id, event.clientX, event.clientY);
        });

      nodeMerge
        .transition()
        .duration(TRANSITION_DURATION)
        .attr("transform", (d) => `translate(${d.y},${d.x})`);

      nodeMerge
        .select<SVGCircleElement>("circle.node-circle")
        .transition()
        .duration(TRANSITION_DURATION)
        .attr("r", (d) => (d.data.id === selectedIdRef.current ? NODE_RADIUS + 2 : NODE_RADIUS))
        .attr("fill", (d) => (hasCollapsedChildren(d.data) ? d.data.color ?? "#10b981" : "#0f172a"))
        .attr("stroke", (d) => (d.data.id === selectedIdRef.current ? "#f59e0b" : d.data.color ?? "#3b82f6"));

      nodeMerge
        .select<SVGTextElement>("text.node-label")
        .attr("x", (d) => (isExpandable(d.data) ? -(NODE_RADIUS + 6) : NODE_RADIUS + 6))
        .attr("text-anchor", (d) => (isExpandable(d.data) ? "end" : "start"))
        .text((d) => d.data.name)
        .transition()
        .duration(TRANSITION_DURATION)
        .style("fill-opacity", 1);

      const nodeExit = node
        .exit<HPoint>()
        .transition()
        .duration(TRANSITION_DURATION)
        .attr("transform", (d) => {
          const target = survivingPosition(d as HPoint);
          return `translate(${target.y},${target.x})`;
        })
        .remove();

      nodeExit.select("circle.node-circle").attr("r", 1e-6);
      nodeExit.select("text.node-label").style("fill-opacity", 1e-6);

      prevPositionsRef.current = newPositions;
    },
    [],
  );

  useEffect(() => {
    if (!root) return;
    render(root);
    // selectedNodeId is intentionally included: re-running the full coordinated
    // render pass (instead of a separate imperative attr update) avoids racing
    // an in-flight exit transition, which would otherwise strand removed nodes.
  }, [root, selectedNodeId, render]);

  const fitToScreen = useCallback(() => {
    const svgEl = svgRef.current;
    const g = gRef.current;
    const zoom = zoomRef.current;
    if (!svgEl || !g || !zoom) return;
    const bounds = g.getBBox();
    if (bounds.width === 0 || bounds.height === 0) return;
    const { width, height } = svgEl.getBoundingClientRect();
    const padding = 60;
    const scale = Math.min(
      2.5,
      Math.max(0.2, Math.min((width - padding * 2) / bounds.width, (height - padding * 2) / bounds.height)),
    );
    const translateX = width / 2 - scale * (bounds.x + bounds.width / 2);
    const translateY = height / 2 - scale * (bounds.y + bounds.height / 2);
    d3.select(svgEl)
      .transition()
      .duration(TRANSITION_DURATION)
      .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  }, [svgRef]);

  const zoomBy = useCallback(
    (factor: number) => {
      const svgEl = svgRef.current;
      const zoom = zoomRef.current;
      if (!svgEl || !zoom) return;
      d3.select(svgEl).transition().duration(200).call(zoom.scaleBy, factor);
    },
    [svgRef],
  );

  return { fitToScreen, zoomBy };
}
