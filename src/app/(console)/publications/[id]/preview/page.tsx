"use client";

import { useParams } from "next/navigation";
import { MapPin, Briefcase, Clock, Tag, GraduationCap, Award, Zap, Compass, TrendingUp } from "lucide-react";
import { publicationsApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import type { JobPublication } from "@/lib/domain/types";

export default function PublicationPreviewPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: pubRaw, loading, error } = useApi(() => publicationsApi.getById(id), [id]);
  const pub = pubRaw as JobPublication | null;

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
      <p className="text-sm text-[#77736B]">加载中...</p>
    </div>
  );

  if (error || !pub) return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-semibold text-[#151515]">{error || "岗位不存在或已下架"}</p>
      </div>
    </div>
  );
  const tags = pub.tags ?? undefined;
  const direction = pub.direction ?? undefined;
  const seniority = pub.seniority ?? undefined;
  const urgent = pub.urgent ?? undefined;

  const parseList = (raw: unknown): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
    if (typeof raw === "string") {
      try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.filter((x): x is string => typeof x === "string"); } catch {}
      return raw.split("\n").filter(Boolean);
    }
    return [];
  };
  const responsibilities = parseList(pub.responsibilities);
  const requirements = parseList(pub.requirements);

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {pub.track && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium bg-[#1A1A1A] text-white">
                <Tag className="w-3 h-3 mr-1" />{pub.track}
              </span>
            )}
            {direction && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium bg-[#1A1A1A]/10 text-[#151515]">
                <Compass className="w-3 h-3 mr-1" />{direction}
              </span>
            )}
            {seniority && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium bg-[#1A1A1A]/10 text-[#151515]">
                <TrendingUp className="w-3 h-3 mr-1" />{seniority}
              </span>
            )}
            {urgent && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-semibold bg-[#D32F2F]/10 text-[#D32F2F]">
                <Zap className="w-3 h-3 mr-1" />急招
              </span>
            )}
            {tags?.map((t: string) => (
              <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs border border-[#E6E2DA] text-[#77736B]">{t}</span>
            ))}
          </div>

          <h1 className="text-4xl font-bold text-[#151515] leading-tight mb-4">{pub.title || "未命名岗位"}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-[#77736B]">
            {pub.city && (
              <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{pub.city}</span>
            )}
            {pub.salary_display && (
              <span className="inline-flex items-center gap-1 font-medium text-[#151515]"><Briefcase className="w-3.5 h-3.5" />{pub.salary_display}</span>
            )}
            {pub.published_at && (
              <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(pub.published_at).toLocaleDateString("zh-CN")}</span>
            )}
          </div>
        </div>

        {/* Summary */}
        {pub.summary && (
          <div className="mb-10 p-6 bg-white rounded-lg border border-[#E6E2DA]">
            <h2 className="text-sm font-semibold text-[#151515] uppercase tracking-wide mb-3">岗位概览</h2>
            <p className="text-[#77736B] leading-relaxed whitespace-pre-wrap">{pub.summary}</p>
          </div>
        )}

        {/* Responsibilities */}
        {responsibilities.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-[#151515] mb-4">工作职责</h2>
            <ol className="list-decimal list-inside space-y-2 text-[#77736B] leading-relaxed">
              {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
            </ol>
          </div>
        )}

        {/* Requirements */}
        {requirements.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-[#151515] mb-4">任职要求</h2>
            <ol className="list-decimal list-inside space-y-2 text-[#77736B] leading-relaxed">
              {requirements.map((r, i) => <li key={i}>{r}</li>)}
            </ol>
          </div>
        )}

        {/* Education & Experience */}
        {(pub.education_requirement || pub.experience_requirement) && (
          <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {pub.education_requirement && (
              <div className="p-5 bg-white rounded-lg border border-[#E6E2DA]">
                <div className="flex items-center gap-2 mb-2"><GraduationCap className="w-4 h-4 text-[#151515]" /><h3 className="text-sm font-semibold text-[#151515]">学历要求</h3></div>
                <p className="text-sm text-[#77736B]">{pub.education_requirement}</p>
              </div>
            )}
            {pub.experience_requirement && (
              <div className="p-5 bg-white rounded-lg border border-[#E6E2DA]">
                <div className="flex items-center gap-2 mb-2"><Award className="w-4 h-4 text-[#151515]" /><h3 className="text-sm font-semibold text-[#151515]">经验要求</h3></div>
                <p className="text-sm text-[#77736B]">{pub.experience_requirement}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-[#E6E2DA] text-center">
          <p className="text-xs text-[#77736B]">此页面为候选人公开视角预览 · 数据来自公开岗位 (JobPublication)</p>
        </div>
      </div>
    </div>
  );
}
