"use client";

import type { MindmapNode } from "@/types/mindmap";

function isLeaf(node: MindmapNode): boolean {
  return !node.children || node.children.length === 0;
}

function QnaCard({ question, answers }: { question: string; answers: MindmapNode[] }) {
  return (
    <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <p className="mb-2 flex items-start gap-2 text-sm font-semibold text-blue-300">
        <span className="mt-0.5 shrink-0 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
          Q
        </span>
        {question}
      </p>
      <ul className="space-y-1.5 pl-1">
        {answers.map((a) => (
          <li key={a.id} className="flex items-start gap-2 text-sm text-slate-300">
            <span className="mt-0.5 shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
              A
            </span>
            {a.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QnaSection({ node }: { node: MindmapNode }) {
  const children = node.children ?? [];
  if (children.length === 0) return null;

  const leafChildren = children.filter(isLeaf);
  const nonLeafChildren = children.filter((c) => !isLeaf(c));
  const isPureQuestion = leafChildren.length > 0 && nonLeafChildren.length === 0;

  if (isPureQuestion) {
    return <QnaCard question={node.name} answers={leafChildren} />;
  }

  return (
    <section className="mb-5">
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">{node.name}</p>
      {leafChildren.length > 0 && (
        <ul className="mb-3 space-y-1 pl-1">
          {leafChildren.map((leaf) => (
            <li key={leaf.id} className="text-sm text-slate-300">
              • {leaf.name}
            </li>
          ))}
        </ul>
      )}
      {nonLeafChildren.map((child) => (
        <QnaSection key={child.id} node={child} />
      ))}
    </section>
  );
}

export default function QnaView({ root }: { root: MindmapNode }) {
  const children = root.children ?? [];
  return (
    <div className="h-full w-full overflow-auto bg-slate-900 px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-5 text-xl font-bold text-white">{root.name}</h2>
        {children.map((child) => (
          <QnaSection key={child.id} node={child} />
        ))}
      </div>
    </div>
  );
}
