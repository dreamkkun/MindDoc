export type ExtractionStyle = "summary" | "outline" | "qna" | "detailed";

export const EXTRACTION_STYLES: { value: ExtractionStyle; label: string; description: string }[] = [
  { value: "detailed", label: "상세 마인드맵", description: "가능한 한 세부적으로 전체 내용을 정리" },
  { value: "summary", label: "핵심 요약 중심", description: "가장 중요한 개념만 간결하게" },
  { value: "outline", label: "목차·구조 중심", description: "문서의 장/절 구조를 그대로 반영" },
  { value: "qna", label: "Q&A 형태", description: "질문과 답변 쌍으로 구성" },
];

const DEFAULT_STYLE: ExtractionStyle = "detailed";

export function normalizeExtractionStyle(value: unknown): ExtractionStyle {
  return EXTRACTION_STYLES.some((s) => s.value === value) ? (value as ExtractionStyle) : DEFAULT_STYLE;
}

export function getStyleInstruction(style: ExtractionStyle): string {
  switch (style) {
    case "summary":
      return "- 문서 전체에서 가장 중요한 핵심 개념만 선별하여 간결하게 정리하세요. 지엽적인 세부사항, 예시, 부연설명은 과감히 생략하세요.";
    case "outline":
      return "- 문서에 장/절/소제목 구조가 있다면 그 목차 구조를 그대로 반영하여 노드를 구성하세요. 각 장/절 제목을 노드명으로 우선 사용하세요.";
    case "qna":
      return "- 각 핵심 개념을 질문 형태의 노드(예: '~란 무엇인가?', '~의 원인은?')로 만들고, 그 바로 아래 자식 노드에 해당 질문에 대한 답변을 간결하게 작성하세요.";
    case "detailed":
    default:
      return "- 문서에 담긴 개념들을 가능한 한 세부적으로, 빠짐없이 계층 구조에 반영하세요.";
  }
}
