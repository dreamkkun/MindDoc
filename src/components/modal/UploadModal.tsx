"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Loader2, UploadCloud, X } from "lucide-react";
import { useMindmapStore } from "@/hooks/useMindmapStore";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from "@/lib/uploadLimits";
import { EXTRACTION_STYLES, getLoadingMessage, type ExtractionStyle } from "@/lib/extractionStyle";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

function validateFile(file: File): string | null {
  if (!ALLOWED_EXTENSIONS.includes(fileExtension(file.name))) {
    return "지원하지 않는 파일 형식입니다. (.pdf, .txt, .md)";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "파일 용량은 25MB를 초과할 수 없습니다.";
  }
  return null;
}

export default function UploadModal({ open, onClose }: UploadModalProps) {
  const setRoot = useMindmapStore((s) => s.setRoot);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<ExtractionStyle>("detailed");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setIsLoading(true);
      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
        });
        const res = await fetch("/api/generate-mindmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobUrl: blob.url, maxDepth: 4, style }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error ?? "마인드맵 생성에 실패했습니다.");
          return;
        }
        setRoot(json.data, style === "qna" || style === "outline" ? style : "canvas");
        onClose();
      } catch {
        setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        setIsLoading(false);
      }
    },
    [setRoot, onClose, style],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => !isLoading && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !isLoading) onClose();
        }}
        className="relative w-full max-w-lg rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-white disabled:opacity-40"
          onClick={onClose}
          disabled={isLoading}
          aria-label="닫기"
        >
          <X size={18} />
        </button>
        <h2 id="upload-modal-title" className="mb-1 text-lg font-bold text-white">
          문서 업로드
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          PDF, TXT, MD 파일을 업로드하면 AI가 핵심 개념을 마인드맵으로 정리합니다. (최대 25MB)
        </p>

        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-slate-300">정리 방식 선택</p>
          <div className="grid grid-cols-3 gap-2">
            {EXTRACTION_STYLES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStyle(option.value)}
                aria-pressed={style === option.value}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  style === option.value
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-600 bg-slate-900/40 hover:border-slate-500"
                }`}
              >
                <p className={`text-xs font-semibold ${style === option.value ? "text-blue-400" : "text-slate-200"}`}>
                  {option.label}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition ${
            isDragging ? "border-blue-500 bg-blue-500/10" : "border-slate-600"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) uploadFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="파일을 드래그하거나 선택하여 업로드. pdf, txt, md, 최대 25메가바이트"
        >
          <UploadCloud className="h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-300">파일을 드래그하거나 클릭하여 업로드</p>
          <p className="text-xs text-slate-400">.pdf · .txt · .md (최대 25MB)</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-900/85 backdrop-blur">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <p className="text-sm text-slate-300">{getLoadingMessage(style)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
