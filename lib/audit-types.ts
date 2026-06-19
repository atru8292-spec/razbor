// Результат аудита (раздел 8 ТЗ). Тип используется и воркером (Шаг 4), и выдачей.

export interface LiftScores {
  value_prop: number;
  relevance: number;
  clarity: number;
  anxiety: number;
  distraction: number;
  urgency: number;
}

export interface Finding {
  type: "leak" | "doubt";
  severity: "high" | "medium" | "low" | "ok";
  finding: string;
  why_it_hurts: string;
  evidence: string;
  conversion_impact: "high" | "medium" | "low";
  impact_estimate: string | null;
}

export interface Area {
  key: "value" | "hero" | "structure" | "trust" | "action" | "mobile" | "tech" | "aeo";
  title: string;
  score: number;
  findings: Finding[];
}

export interface CompetitorGap {
  missing: string;
  competitors_have_it: string[];
  impact: string;
}

export interface DetailedFix {
  area: string;
  fix: string;
  effort: "low" | "medium" | "high";
  expected_effect: string;
}

export interface AuditResult {
  site_type: "ecommerce" | "leadgen" | "saas" | "info" | "local" | string;
  goal: string | null;
  overall_score: number;
  conversion_score: number;
  usability_score: number;
  aeo_score: number;
  lift: LiftScores;
  verdict: string;
  areas: Area[];
  competitor_gaps: CompetitorGap[];
  top_priorities: string[];
  detailed_fixes: DetailedFix[];
}

/** Тизер (раздел 8): показывается бесплатно, до контакта. */
export interface AuditTeaser {
  overall_score: number;
  conversion_score: number;
  usability_score: number;
  aeo_score: number;
  lift: LiftScores;
  verdict: string;
  top_priorities: string[];
}

export function toTeaser(r: AuditResult): AuditTeaser {
  return {
    overall_score: r.overall_score,
    conversion_score: r.conversion_score,
    usability_score: r.usability_score,
    aeo_score: r.aeo_score,
    lift: r.lift,
    verdict: r.verdict,
    top_priorities: r.top_priorities ?? [],
  };
}
