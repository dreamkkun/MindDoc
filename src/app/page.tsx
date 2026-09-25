"use client";

import { useEffect, useRef, useState } from "react";
import { useMindmapStore } from "@/hooks/useMindmapStore";
import HeaderToolbar from "@/components/common/HeaderToolbar";
import UploadModal from "@/components/modal/UploadModal";
import D3Mindmap, { type D3MindmapHandle } from "@/components/canvas/D3Mindmap";
import type { MindmapNode } from "@/types/mindmap";

const SAMPLE_DATA: MindmapNode = {
  id: "root-1",
  name: "지능형 시스템의 개념",
  color: "#3b82f6",
  children: [
    {
      id: "node-1-1",
      name: "1. 정의 및 핵심 용어",
      color: "#06b6d4",
      children: [
        { id: "node-1-1-1", name: "AI 기반 환경 인식 및 적응 컴퓨터 시스템", children: [] },
        { id: "node-1-1-2", name: "에이전트(Agent)와 환경(Environment)", children: [] },
      ],
    },
    {
      id: "node-1-2",
      name: "2. 지능형 시스템의 유형",
      color: "#10b981",
      children: [
        {
          id: "node-1-2-1",
          name: "반응형 에이전트",
          children: [
            { id: "node-1-2-1-1", name: "규칙 기반 의사결정", children: [] },
            { id: "node-1-2-1-2", name: "실시간 센서 입력 처리", children: [] },
          ],
        },
        { id: "node-1-2-2", name: "학습형 에이전트", children: [] },
        { id: "node-1-2-3", name: "목표 기반 에이전트", children: [] },
      ],
    },
    {
      id: "node-1-3",
      name: "3. 응용 분야",
      color: "#f59e0b",
      children: [
        { id: "node-1-3-1", name: "자율주행 시스템", children: [] },
        { id: "node-1-3-2", name: "추천 시스템", children: [] },
        { id: "node-1-3-3", name: "자연어 처리", children: [] },
      ],
    },
    {
      id: "node-1-4",
      name: "4. 한계와 과제",
      color: "#f43f5e",
      children: [
        { id: "node-1-4-1", name: "설명 가능성 문제", children: [] },
        { id: "node-1-4-2", name: "데이터 편향", children: [] },
      ],
    },
  ],
};

export default function Home() {
  const root = useMindmapStore((s) => s.root);
  const setRoot = useMindmapStore((s) => s.setRoot);
  const expandAll = useMindmapStore((s) => s.expandAll);
  const collapseAll = useMindmapStore((s) => s.collapseAll);
  const mindmapRef = useRef<D3MindmapHandle>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (!root) setRoot(SAMPLE_DATA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-900 text-slate-100">
      <HeaderToolbar
        title="지능형 시스템의 개념 (Intelligent Systems)"
        subtitle="노드 클릭 시 접기/펼치기 · 더블클릭 수정 · 휠 줌 및 드래그 이동"
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onFitToScreen={() => mindmapRef.current?.fitToScreen()}
        onToggleFullscreen={handleToggleFullscreen}
        onUpload={() => setUploadOpen(true)}
      />
      <main className="relative w-full flex-1">
        <D3Mindmap ref={mindmapRef} />
      </main>
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
