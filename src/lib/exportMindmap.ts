import * as d3 from "d3";
import type { MindmapAnnotation, MindmapNode } from "@/types/mindmap";

const NODE_HEIGHT = 44;
const LEVEL_WIDTH = 260;
const NODE_RADIUS = 6;
const PADDING = 60;
const LABEL_GAP = 8;
const LABEL_ROOM = 240; // extra canvas width reserved for the rightmost labels

function hasCollapsedChildren(node: MindmapNode): boolean {
  return !!node._children && node._children.length > 0;
}

function isExpandable(node: MindmapNode): boolean {
  return (!!node.children && node.children.length > 0) || hasCollapsedChildren(node);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linkPath(source: { x: number; y: number }, target: { x: number; y: number }): string {
  const generator = d3
    .linkHorizontal<unknown, { x: number; y: number }>()
    .x((d) => d.y)
    .y((d) => d.x);
  return generator({ source, target } as never) ?? "";
}

interface ExportSvg {
  svg: string;
  width: number;
  height: number;
}

/** Builds a static, self-contained, print/export-friendly (light theme) SVG string. */
export function buildExportSvg(root: MindmapNode, annotations: MindmapAnnotation[]): ExportSvg {
  const hierarchyRoot = d3.hierarchy(root, (d) => d.children);
  const layout = d3
    .tree<MindmapNode>()
    .nodeSize([NODE_HEIGHT, LEVEL_WIDTH])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.4));
  const treeRoot = layout(hierarchyRoot);
  const nodes = treeRoot.descendants();
  const links = treeRoot.links();

  // Tree layout uses D3's row/depth convention (d.x = row, d.y = depth), which
  // linkPath/node rendering then swap onto screen axes (svgX = depth, svgY =
  // row) - same convention as the live canvas in useD3Mindmap. Annotation
  // x/y are already plain screen coordinates (see the dblclick handler in
  // useD3Mindmap), so they map straight onto svgX/svgY without swapping.
  const svgXValues = [...nodes.map((d) => d.y), ...annotations.map((a) => a.x), 0];
  const svgYValues = [...nodes.map((d) => d.x), ...annotations.map((a) => a.y), 0];

  const minSvgX = Math.min(...svgXValues);
  const maxSvgX = Math.max(...svgXValues);
  const minSvgY = Math.min(...svgYValues);
  const maxSvgY = Math.max(...svgYValues);

  const offsetSvgX = PADDING - minSvgX;
  const offsetSvgY = PADDING - minSvgY;
  const width = maxSvgX - minSvgX + PADDING * 2 + LABEL_ROOM;
  const height = maxSvgY - minSvgY + PADDING * 2;

  const linksSvg = links
    .map((link) => {
      const d = linkPath(
        { x: link.source.x + offsetSvgY, y: link.source.y + offsetSvgX },
        { x: link.target.x + offsetSvgY, y: link.target.y + offsetSvgX },
      );
      return `<path d="${d}" fill="none" stroke="#94a3b8" stroke-width="1.5" opacity="0.8" />`;
    })
    .join("");

  const nodesSvg = nodes
    .map((d) => {
      const cx = d.y + offsetSvgX;
      const cy = d.x + offsetSvgY;
      const color = d.data.color ?? "#3b82f6";
      const filled = hasCollapsedChildren(d.data);
      const expandable = isExpandable(d.data);
      const textX = expandable ? cx - (NODE_RADIUS + LABEL_GAP) : cx + (NODE_RADIUS + LABEL_GAP);
      const anchor = expandable ? "end" : "start";
      return `
        <circle cx="${cx}" cy="${cy}" r="${NODE_RADIUS}" fill="${filled ? color : "#ffffff"}" stroke="${color}" stroke-width="2" />
        <text x="${textX}" y="${cy}" dy="0.32em" text-anchor="${anchor}" font-size="13" font-family="ui-sans-serif, system-ui, sans-serif" fill="#1e293b">${escapeXml(d.data.name)}</text>
      `;
    })
    .join("");

  const annotationsSvg = annotations
    .map((a) => {
      const cx = a.x + offsetSvgX;
      const cy = a.y + offsetSvgY;
      const text = a.text.trim();
      if (!text) return "";
      const approxWidth = Math.min(280, Math.max(60, text.length * 7)) + 20;
      return `
        <rect x="${cx - approxWidth / 2}" y="${cy - 16}" width="${approxWidth}" height="32" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="1" />
        <text x="${cx}" y="${cy}" dy="0.32em" text-anchor="middle" font-size="13" font-family="ui-sans-serif, system-ui, sans-serif" fill="#78350f">${escapeXml(text)}</text>
      `;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#ffffff" />
    ${linksSvg}
    ${nodesSvg}
    ${annotationsSvg}
  </svg>`;

  return { svg, width, height };
}

async function svgToCanvas(svgString: string, width: number, height: number, scale = 2): Promise<HTMLCanvasElement> {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG를 이미지로 변환하지 못했습니다."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 생성하지 못했습니다.");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned || "mindmap";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 생성에 실패했습니다."))),
      type,
      quality,
    );
  });
}

export async function exportMindmapAsImage(
  root: MindmapNode,
  annotations: MindmapAnnotation[],
  format: "png" | "jpeg",
): Promise<void> {
  const { svg, width, height } = buildExportSvg(root, annotations);
  const canvas = await svgToCanvas(svg, width, height, 2);
  const blob =
    format === "jpeg" ? await canvasToBlob(canvas, "image/jpeg", 0.92) : await canvasToBlob(canvas, "image/png");
  downloadBlob(blob, `${sanitizeFilename(root.name)}.${format === "jpeg" ? "jpg" : "png"}`);
}

export async function exportMindmapAsPdf(root: MindmapNode, annotations: MindmapAnnotation[]): Promise<void> {
  const { svg, width, height } = buildExportSvg(root, annotations);
  const canvas = await svgToCanvas(svg, width, height, 2);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
  });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, width, height);
  pdf.save(`${sanitizeFilename(root.name)}.pdf`);
}

const PRINT_ROOT_ID = "mindmap-print-root";
const PRINT_STYLE_ID = "mindmap-print-style";

/**
 * Prints in the current window rather than a popup: a `window.open()`-based
 * print window is vulnerable to popup blockers even on a direct click, and
 * gains nothing here since we don't need a separate document. A hidden
 * print-only container plus `window.print()` gives the same native
 * preview-then-print dialog without that risk.
 */
export function printMindmap(root: MindmapNode, annotations: MindmapAnnotation[]): void {
  const { svg } = buildExportSvg(root, annotations);

  document.getElementById(PRINT_ROOT_ID)?.remove();
  document.getElementById(PRINT_STYLE_ID)?.remove();

  const container = document.createElement("div");
  container.id = PRINT_ROOT_ID;
  container.innerHTML = svg;
  document.body.appendChild(container);

  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    #${PRINT_ROOT_ID} { display: none; }
    @media print {
      @page { margin: 12mm; }
      body > :not(#${PRINT_ROOT_ID}) { display: none !important; }
      #${PRINT_ROOT_ID} { display: block !important; }
      #${PRINT_ROOT_ID} svg { width: 100%; height: auto; }
    }
  `;
  document.head.appendChild(style);

  const cleanup = () => {
    container.remove();
    style.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  window.print();
}
