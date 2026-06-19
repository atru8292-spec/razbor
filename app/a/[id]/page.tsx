import type { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import { env } from "@/lib/env";
import type { AuditResult } from "@/lib/audit-types";
import AuditClient from "@/components/AuditClient";

export const runtime = "nodejs";

// OG-карточка результата для шеринга (раздел 13.1/13.8): красивая ссылка с PNG.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  let host = "сайта";
  let verdict = "AI-аудит сайта: где и почему он теряет заявки.";
  try {
    const { data } = await getSupabase().from("audits").select("url, result, status").eq("id", id).single();
    if (data?.url) host = hostOf(data.url);
    if (data?.status === "done" && data.result) {
      const v = (data.result as AuditResult).verdict;
      if (v) verdict = v.slice(0, 200);
    }
  } catch {
    /* дефолты */
  }

  const ogImage = `${env.APP_BASE_URL}/api/audit/${id}/og`;
  return {
    title: `Разбор ${host} — RAZBOR`,
    description: verdict,
    openGraph: {
      title: `Разбор ${host} — RAZBOR`,
      description: verdict,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: `Разбор ${host}`, description: verdict, images: [ogImage] },
  };
}

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuditClient id={id} />;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
