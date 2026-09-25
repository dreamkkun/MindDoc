import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AIMindmapNode } from "./aiTypes";

// Structured outputs use strict JSON schema, where every property must be
// present (nullable stands in for "optional") - so the raw shape uses
// `.nullable()` and gets normalized into AIMindmapNode's optional fields below.
interface RawNode {
  name: string;
  color: string | null;
  children: RawNode[] | null;
}

const RawNodeSchema: z.ZodType<RawNode> = z.lazy(() =>
  z.object({
    name: z.string().describe("단원명 또는 세부 개념 (간결한 명사형)"),
    color: z.string().nullable().describe("HEX 색상 코드 (상위 항목별 구분)"),
    children: z.array(RawNodeSchema).nullable(),
  }),
);

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

const MAX_SOURCE_CHARS = 60000;

// z.lazy() has no built-in depth limit (unlike Gemini's manually-unrolled
// schema), so depth is enforced defensively here regardless of how well the
// model follows the prompt's depth instruction.
function normalize(node: RawNode, remainingDepth: number): AIMindmapNode {
  const color = node.color ?? undefined;
  if (remainingDepth <= 0 || !node.children) return { name: node.name, color };
  return { name: node.name, color, children: node.children.map((child) => normalize(child, remainingDepth - 1)) };
}

export async function generateMindmapTreeWithClaude(sourceText: string, maxDepth: number): Promise<AIMindmapNode> {
  const client = getClient();

  const prompt = `다음은 강의 자료에서 추출한 텍스트입니다. 핵심 개념을 계층 구조로 정리하여 학습 마인드맵을 생성하세요.
- 최상위 루트 노드는 문서 전체를 아우르는 핵심 주제로 작성하세요.
- 각 하위 노드는 간결한 명사형으로 작성하고, 최대 ${maxDepth}단계 깊이까지만 구성하세요.
- color 필드는 상위 항목(형제 그룹)별로 구분되는 HEX 색상 코드를 지정하세요.
- 문서에 없는 내용을 지어내지 마세요.

--- 문서 내용 ---
${sourceText.slice(0, MAX_SOURCE_CHARS)}`;

  const response = await client.messages.parse({
    model: process.env.CLAUDE_MODEL ?? "claude-opus-5",
    max_tokens: 8000,
    output_config: {
      format: zodOutputFormat(RawNodeSchema),
      effort: "low",
    },
    messages: [{ role: "user", content: prompt }],
  });

  if (!response.parsed_output) {
    throw new Error("Claude가 유효한 JSON을 반환하지 않았습니다.");
  }

  return normalize(response.parsed_output, Math.max(0, maxDepth - 1));
}
