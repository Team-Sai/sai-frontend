export type LegalListItem = string | { text: string; children: string[] };

export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered?: boolean; items: LegalListItem[] }
  | { type: 'contact'; groups: { title: string; rows: [label: string, value: string][] }[] };

export interface LegalArticle {
  /** 조 제목. "제N조"는 순서대로 자동으로 붙는다. */
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  effectiveDate: string;
  intro: string[];
  articles: LegalArticle[];
  /** 본문 뒤에 붙는 부칙 */
  addenda?: string[];
}
