import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { extractTextFromBuffer } from "@/lib/pdf";
import { generateMindmapTree, type GeminiMindmapNode } from "@/lib/gemini";
import type { MindmapNode } from "@/types/mindmap";

export const runtime = "nodejs";

// Vercel's Node.js serverless functions hard-cap the request body at 4.5MB,
// regardless of any limit we'd like to enforce ourselves.
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".md"];
const MIN_TEXT_LENGTH = 20;

function attachIds(node: GeminiMindmapNode, depth = 0): MindmapNode {
  return {
    id: nanoid(),
    name: node.name,
    color: node.color,
    depth,
    children: node.children?.map((child) => attachIds(child, depth + 1)) ?? [],
  };
}

function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const file = formData.get("file");
  const maxDepthRaw = formData.get("maxDepth");
  const maxDepth = Math.min(6, Math.max(1, Number(maxDepthRaw) || 4));

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "파일이 필요합니다." }, { status: 400 });
  }

  const extension = fileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json(
      { success: false, error: "지원하지 않는 파일 형식입니다. (.pdf, .txt, .md)" },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, error: "파일 용량은 25MB를 초과할 수 없습니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = extension === ".pdf" ? "application/pdf" : "text/plain";

  let sourceText: string;
  try {
    sourceText = await extractTextFromBuffer(buffer, mimeType);
  } catch {
    return NextResponse.json(
      { success: false, error: "파일에서 텍스트를 추출하지 못했습니다. 파일이 손상되었을 수 있습니다." },
      { status: 422 },
    );
  }

  if (!sourceText || sourceText.length < MIN_TEXT_LENGTH) {
    return NextResponse.json(
      { success: false, error: "텍스트 레이어가 없습니다. 이미지로 스캔된 PDF는 지원하지 않습니다." },
      { status: 422 },
    );
  }

  let tree: GeminiMindmapNode | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2 && !tree; attempt += 1) {
    try {
      tree = await generateMindmapTree(sourceText, maxDepth);
    } catch (err) {
      lastError = err;
    }
  }

  if (!tree) {
    console.error("generate-mindmap: Gemini request failed", lastError);
    return NextResponse.json(
      { success: false, error: "AI 마인드맵 생성에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, data: attachIds(tree) });
}
