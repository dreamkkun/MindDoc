"use client";

import type { MindmapNode } from "@/types/mindmap";
import { effectiveChildren } from "@/lib/mindmapTree";

function OutlineNode({ node }: { node: MindmapNode }) {
  const children = effectiveChildren(node);
  return (
    <li className="my-1.5">
      <div className="flex items-start gap-2">
        <span
          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: node.color ?? "#64748b" }}
        />
        <span className="text-sm text-slate-200">{node.name}</span>
      </div>
      {children.length > 0 && (
        <ul className="ml-2 border-l border-slate-700 pl-4">
          {children.map((child) => (
            <OutlineNode key={child.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OutlineView({ root }: { root: MindmapNode }) {
  const children = effectiveChildren(root);
  return (
    <div className="h-full w-full overflow-auto bg-slate-900 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-4 text-xl font-bold text-white">{root.name}</h2>
        <ul>
          {children.map((child) => (
            <OutlineNode key={child.id} node={child} />
          ))}
        </ul>
      </div>
    </div>
  );
}
