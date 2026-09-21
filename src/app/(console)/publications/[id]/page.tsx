"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  Calendar,
  ExternalLink,
  Save,
  X,
  Zap,
  Globe,
  MapPin,
  Building2,
  Shield,
  Star,
  Clock,
  AlertTriangle,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { publicationsApi, jobsApi, companiesApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { LoadingPage } from "@/components/loading-page";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { JobCode } from "@/components/job-code";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/tag-input";
import { DynamicListInput } from "@/components/dynamic-list-input";
import type { JobPublication } from "@/lib/domain/types";
import {
  QUANTUM_TRACKS,
  getQuantumTrackLabel,
  isDirtyTrack,
} from "@/lib/domain/quantum-tracks";
import {
  isUrgentActive,
  isUrgentExpired,
  canEnableUrgent,
} from "@/lib/domain/publication-rules";

const inputClass =
  "w-full bg-muted border-none rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";
const textareaClass =
  "w-full bg-muted border-none rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-none";
const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function PublicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pubId = params.id;
  const {
    data: pubRaw,
    loading,
    error: loadError,
    refetch,
  } = useApi(() => publicationsApi.getById(pubId), [pubId]);
  const pub = pubRaw as JobPublication | null;
  const tagsEnList = parseListField(pub?.tags_en);

  // Resolve internal company identity: Publication → Job → Company
  const { data: job } = useApi(
    () => (pub ? jobsApi.getById(pub.job_id) : Promise.resolve(null)),
    [pub?.job_id]
  );
  const { data: company } = useApi(
    () => (job ? companiesApi.getById(job.company_id) : Promise.resolve(null)),
    [job?.company_id]
  );
  const internalCompanyName = company?.name || company?.display_name || null;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState<"publish" | "offline" | null>(
    null
  );
  const [actionError, setActionError] = useState("");

  // Permission state: fail closed (default false)
  const [permissions, setPermissions] = useState<{
    canWrite: boolean;
    canPublish: boolean;
    canOperate: boolean;
  }>({ canWrite: false, canPublish: false, canOperate: false });

  useEffect(() => {
    // Fetch user permissions from /api/auth/me
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('unauthorized');
        return res.json();
      })
      .then(json => {
        // /api/auth/me returns { authenticated, role, is_break_glass, profile, teams, permissions }
        const perms: string[] = json.permissions ?? [];
        setPermissions({
          canWrite: perms.includes('publication_edit'),
          canPublish: perms.includes('publication_publish'),
          canOperate: perms.includes('publication_operate'),
        });
      })
      .catch(() => {
        // Fail closed: API failure must NOT fallback to allow all
      });
  }, []);

  // Edit state
  const [editPublicTitle, setEditPublicTitle] = useState("");
  const [editPublicTitleEn, setEditPublicTitleEn] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editSalaryEn, setEditSalaryEn] = useState("");
  const [editTrack, setEditTrack] = useState("");
  const [editDirection, setEditDirection] = useState("");
  const [editDirectionEn, setEditDirectionEn] = useState("");
  const [editSeniority, setEditSeniority] = useState("");
  const [editSeniorityEn, setEditSeniorityEn] = useState("");
  const [editEducation, setEditEducation] = useState("");
  const [editEducationEn, setEditEducationEn] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [editExperienceEn, setEditExperienceEn] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editSummaryEn, setEditSummaryEn] = useState("");
  const [editResponsibilities, setEditResponsibilities] = useState<string[]>([]);
  const [editResponsibilitiesEn, setEditResponsibilitiesEn] = useState<string[]>([]);
  const [editRequirements, setEditRequirements] = useState<string[]>([]);
  const [editRequirementsEn, setEditRequirementsEn] = useState<string[]>([]);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagsEn, setEditTagsEn] = useState<string[]>([]);
  const [editUrgent, setEditUrgent] = useState(false);
  const [editUrgentStartedAt, setEditUrgentStartedAt] = useState("");
  const [editUrgentExpiresAt, setEditUrgentExpiresAt] = useState("");
  const [editFeatured, setEditFeatured] = useState(false);

  const startEdit = () => {
    if (!pub) return;
    setEditPublicTitle(pub.title ?? "");
    setEditPublicTitleEn(pub.title_en ?? "");
    setEditCity(pub.city ?? "");
    setEditSalary(pub.salary_display ?? "");
    setEditSalaryEn(pub.salary_display_en ?? "");
    setEditTrack(pub.track ?? "");
    setEditDirection(pub.direction ?? "");
    setEditDirectionEn(pub.direction_en ?? "");
    setEditSeniority(pub.seniority ?? "");
    setEditSeniorityEn(pub.seniority_en ?? "");
    setEditEducation(pub.education_requirement ?? "");
    setEditEducationEn(pub.education_en ?? "");
    setEditExperience(pub.experience_requirement ?? "");
    setEditExperienceEn(pub.experience_en ?? "");
    setEditSummary(pub.summary ?? "");
    setEditSummaryEn(pub.summary_en ?? "");
    setEditResponsibilities(parseListField(pub.responsibilities));
    setEditResponsibilitiesEn(parseListField(pub.responsibilities_en));
    setEditRequirements(parseListField(pub.requirements));
    setEditRequirementsEn(parseListField(pub.requirements_en));
    setEditTags(pub.tags ?? []);
    setEditTagsEn(parseListField(pub.tags_en));
    setEditUrgent(pub.urgent ?? false);
    setEditUrgentStartedAt(toDatetimeLocal(pub.urgent_started_at));
    setEditUrgentExpiresAt(toDatetimeLocal(pub.urgent_expires_at));
    setEditFeatured(pub.featured ?? false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError("");
  };

  const handleUrgentToggle = (checked: boolean) => {
    setEditUrgent(checked);
    if (checked && !editUrgentStartedAt) {
      setEditUrgentStartedAt(toDatetimeLocal(new Date().toISOString()));
    }
  };

  const handleSave = async () => {
    if (!pub) return;
    setSaving(true);
    setError("");
    try {
      const update: Record<string, unknown> = {
        title: editPublicTitle.trim(),
        title_en: editPublicTitleEn.trim(),
        city: editCity.trim(),
        salary_display: editSalary.trim(),
        salary_display_en: editSalaryEn.trim() || null,
        track: editTrack || null,
        direction: editDirection.trim(),
        direction_en: editDirectionEn.trim(),
        seniority: editSeniority.trim(),
        seniority_en: editSeniorityEn.trim(),
        education_requirement: editEducation.trim(),
        education_en: editEducationEn.trim(),
        experience_requirement: editExperience.trim(),
        experience_en: editExperienceEn.trim(),
        summary: editSummary.trim(),
        summary_en: editSummaryEn.trim(),
        responsibilities: editResponsibilities.length
          ? JSON.stringify(editResponsibilities.filter(Boolean))
          : undefined,
        responsibilities_en: editResponsibilitiesEn.length
          ? JSON.stringify(editResponsibilitiesEn.filter(Boolean))
          : undefined,
        requirements: editRequirements.length
          ? JSON.stringify(editRequirements.filter(Boolean))
          : undefined,
        requirements_en: editRequirementsEn.length
          ? JSON.stringify(editRequirementsEn.filter(Boolean))
          : undefined,
        tags: editTags.filter(Boolean),
        tags_en: editTagsEn.length
          ? JSON.stringify(editTagsEn.filter(Boolean))
          : undefined,
        urgent: editUrgent,
        featured: editFeatured,
      };
      // 仅在开启急招时提交生命周期时间；关闭急招时保留历史 started_at / expires_at。
      if (editUrgent) {
        update.urgent_started_at = fromDatetimeLocal(editUrgentStartedAt);
        update.urgent_expires_at = fromDatetimeLocal(editUrgentExpiresAt);
      }
      await publicationsApi.update(pub.id, update);
      setEditing(false);
      refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!pub) return;
    setActionError("");
    try {
      await publicationsApi.publish(pub.id);
      refetch();
      setShowConfirm(null);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const handleOffline = async () => {
    if (!pub) return;
    setActionError("");
    try {
      await publicationsApi.offline(pub.id);
      refetch();
      setShowConfirm(null);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const handleFeature = async () => {
    if (!pub) return;
    setActionError("");
    try {
      await publicationsApi.feature(pub.id);
      refetch();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const handleUnfeature = async () => {
    if (!pub) return;
    setActionError("");
    try {
      await publicationsApi.unfeature(pub.id);
      refetch();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  if (loading) return <LoadingPage />;
  if (loadError || !pub)
    return <ErrorState message="加载公开岗位失败" onRetry={refetch} />;

  const isPublished = pub.status === "published";
  const trackLabel = getQuantumTrackLabel(pub.track);
  const dirtyTrack = isDirtyTrack(pub.track);
  const urgentActive = isUrgentActive(pub);
  const urgentExpired = isUrgentExpired(pub);
  const allowUrgentEdit = canEnableUrgent(pub);

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <Link
        href="/publications"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回公开岗位列表
      </Link>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {pub.title || "未命名公开岗位"}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <span className="text-xs text-muted-foreground/70">公开岗位编号</span>
              <JobCode code={pub.public_job_code} />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              {job && (
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  来源内部岗位：
                  <JobCode code={job.job_code} />
                  <span className="text-muted-foreground/80">｜{job.title}</span>
                </span>
              )}
              {internalCompanyName && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {internalCompanyName}
                  <span className="text-xs text-muted-foreground/60 ml-1">
                    <Shield className="w-3 h-3 inline" /> 仅内部可见
                  </span>
                </span>
              )}
              {pub.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {pub.city}
                </span>
              )}
              {pub.slug && (
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  {pub.slug}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Featured / Unfeature - always visible, disabled if no operate permission */}
            {pub.featured ? (
              <button
                onClick={handleUnfeature}
                disabled={!permissions.canOperate}
                title={!permissions.canOperate ? '当前账号暂无该权限，请联系 Team Lead' : undefined}
                className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  permissions.canOperate
                    ? 'text-amber-500 hover:text-amber-600'
                    : 'text-muted-foreground/40 cursor-not-allowed'
                }`}
              >
                <Star className="w-4 h-4 fill-current" />
                取消精选
              </button>
            ) : (
              <button
                onClick={handleFeature}
                disabled={!permissions.canOperate}
                title={!permissions.canOperate ? '当前账号暂无该权限，请联系 Team Lead' : undefined}
                className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  permissions.canOperate
                    ? 'text-muted-foreground hover:text-amber-500'
                    : 'text-muted-foreground/40 cursor-not-allowed'
                }`}
              >
                <Star className="w-4 h-4" />
                设为精选
              </button>
            )}
            {/* Publish / Offline - always visible, disabled if no publish permission */}
            {isPublished ? (
              <button
                onClick={() => setShowConfirm("offline")}
                disabled={!permissions.canPublish}
                title={!permissions.canPublish ? '当前账号暂无该权限，请联系 Team Lead' : undefined}
                className={`inline-flex items-center gap-1.5 text-sm font-medium transition-opacity ${
                  permissions.canPublish
                    ? 'text-destructive hover:opacity-80'
                    : 'text-muted-foreground/40 cursor-not-allowed'
                }`}
              >
                <X className="w-4 h-4" />
                下架
              </button>
            ) : (
              <button
                onClick={() => setShowConfirm("publish")}
                disabled={!permissions.canPublish}
                title={!permissions.canPublish ? '当前账号暂无该权限，请联系 Team Lead' : undefined}
                className={`inline-flex items-center gap-1.5 text-sm font-medium transition-opacity ${
                  permissions.canPublish
                    ? 'text-primary hover:opacity-80'
                    : 'text-muted-foreground/40 cursor-not-allowed'
                }`}
              >
                <Zap className="w-4 h-4" />
                发布
              </button>
            )}
            <Link
              href={`/publications/${pub.id}/preview`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="w-4 h-4" />
              预览
            </Link>
            {/* Edit - always visible, disabled if no write permission */}
            {!editing && (
              <button
                onClick={startEdit}
                disabled={!permissions.canWrite}
                title={!permissions.canWrite ? '当前账号暂无该权限，请联系 Team Lead' : undefined}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-opacity ${
                  permissions.canWrite
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                编辑
              </button>
            )}
            {editing && (
              <button
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            )}
          </div>
        </div>

        {/* Status + recognition bar */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge type="publication" value={pub.status} />
          {dirtyTrack && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 rounded-full px-2.5 py-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              需要重新选择赛道
            </span>
          )}
          {trackLabel && !dirtyTrack && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-1">
              <Layers className="w-3.5 h-3.5" />
              {trackLabel}
            </span>
          )}
          {urgentActive && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-500/10 rounded-full px-2.5 py-1">
              <Zap className="w-3.5 h-3.5" />
              急招中
            </span>
          )}
          {urgentExpired && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-1">
              <Clock className="w-3.5 h-3.5" />
              急招已到期
            </span>
          )}
          {pub.featured && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-500/10 rounded-full px-2.5 py-1">
              <Star className="w-3.5 h-3.5 fill-current" />
              精选
            </span>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {actionError && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {!editing ? (
          <>
            {/* 岗位归类 */}
            <div className="bg-card rounded-lg shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">岗位归类</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoField
                  label="所属赛道"
                  value={trackLabel || (dirtyTrack ? "需要重新选择赛道" : "—")}
                />
                <InfoField label="方向 (Direction)" value={pub.direction} />
                <InfoField label="方向英文 (Direction EN)" value={pub.direction_en} />
              </div>
              {dirtyTrack && (
                <p className="mt-3 text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  当前赛道值「{pub.track || "空"}」不属于四大赛道，请重新选择或设为未归类。
                </p>
              )}
            </div>

            {/* 岗位运营 */}
            <div className="bg-card rounded-lg shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">岗位运营</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoField
                  label="急招状态"
                  value={urgentActive ? "急招中" : urgentExpired ? "急招已到期" : "否"}
                />
                <InfoField label="精选状态" value={pub.featured ? "精选" : "否"} />
                <InfoField
                  label="急招开始时间"
                  value={pub.urgent_started_at ? formatDateTime(pub.urgent_started_at) : "—"}
                />
                <InfoField
                  label="急招截止时间"
                  value={pub.urgent_expires_at ? formatDateTime(pub.urgent_expires_at) : "—"}
                />
              </div>
            </div>

            {/* 公开信息 */}
            <div className="bg-card rounded-lg shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">公开信息</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoField label="公开标题" value={pub.title} />
                <InfoField label="公开标题英文 (Title EN)" value={pub.title_en} />
                <InfoField label="公开公司名" value={pub.company_display_name} />
                <InfoField label="城市" value={pub.city} />
                <InfoField label="薪资展示" value={pub.salary_display} />
                <InfoField label="薪资展示英文 (Salary EN)" value={pub.salary_display_en} />
                <InfoField label="职级" value={pub.seniority} />
                <InfoField label="职级英文 (Seniority EN)" value={pub.seniority_en} />
                <InfoField label="学历要求" value={pub.education_requirement} />
                <InfoField label="学历要求英文 (Education EN)" value={pub.education_en} />
                <InfoField label="经验要求" value={pub.experience_requirement} />
                <InfoField label="经验要求英文 (Experience EN)" value={pub.experience_en} />
              </div>
              <div className="mt-4">
                <InfoField label="一句话摘要" value={pub.summary} />
              </div>
              <div className="mt-4">
                <InfoField label="一句话摘要英文 (Summary EN)" value={pub.summary_en} />
              </div>
              {pub.tags && pub.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {pub.tags.map((t, i) => (
                    <span
                      key={t}
                      className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-1"
                    >
                      {t}
                      {tagsEnList[i] ? <span className="ml-1 text-muted-foreground/50">/ {tagsEnList[i]}</span> : null}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 职责与要求 */}
            <div className="bg-card rounded-lg shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">岗位职责与任职要求</h2>
              </div>
              {(() => {
                const responsibilities = parseListField(pub.responsibilities);
                const requirements = parseListField(pub.requirements);
                const responsibilitiesEn = parseListField(pub.responsibilities_en);
                const requirementsEn = parseListField(pub.requirements_en);
                const bulletList = (items: string[]) => (
                  <ul className="mt-2 space-y-1.5">
                    {items.map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary mt-1">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                );
                return (
                  <>
                    {responsibilities.length > 0 && (
                      <div className="mb-4">
                        <span className="text-sm font-medium text-foreground">岗位职责</span>
                        {bulletList(responsibilities)}
                        {responsibilitiesEn.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs font-medium text-muted-foreground/70">Responsibilities (EN)</span>
                            {bulletList(responsibilitiesEn)}
                          </div>
                        )}
                      </div>
                    )}
                    {requirements.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-foreground">任职要求</span>
                        {bulletList(requirements)}
                        {requirementsEn.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs font-medium text-muted-foreground/70">Requirements (EN)</span>
                            {bulletList(requirementsEn)}
                          </div>
                        )}
                      </div>
                    )}
                    {responsibilities.length === 0 && requirements.length === 0 && (
                      <p className="text-sm text-muted-foreground/60">暂无职责与任职要求信息</p>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        ) : (
          <>
            {/* 岗位归类 */}
            <div className="bg-card rounded-lg shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">岗位归类</h2>
              </div>
              <label className={labelClass}>所属赛道</label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                    editTrack === ""
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="track"
                    value=""
                    checked={editTrack === ""}
                    onChange={() => setEditTrack("")}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">未归类</span>
                  <span className="text-[11px] text-muted-foreground/60 ml-auto">
                    null
                  </span>
                </label>
                {QUANTUM_TRACKS.map((t) => (
                  <label
                    key={t.value}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                      editTrack === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-foreground hover:bg-accent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="track"
                      value={t.value}
                      checked={editTrack === t.value}
                      onChange={() => setEditTrack(t.value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="text-[11px] text-muted-foreground/60 ml-auto">
                      {t.value}
                    </span>
                  </label>
                ))}
              </div>
              {dirtyTrack && (
                <p className="mt-3 text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  当前为历史非标准赛道「{pub.track || "空"}」，请重新选择或设为未归类。
                </p>
              )}
              <div className="mt-4">
                <label className={labelClass}>方向 (Direction)</label>
                <input
                  type="text"
                  value={editDirection}
                  onChange={(e) => setEditDirection(e.target.value)}
                  placeholder="如：量子软件与编译、超导硬件、产业战略与经营"
                  className={inputClass}
                />
                <div className="mt-2">
                  <label className={labelClass}>方向英文 (Direction EN)</label>
                  <input
                    type="text"
                    value={editDirectionEn}
                    onChange={(e) => setEditDirectionEn(e.target.value)}
                    placeholder="如：Quantum Software & Compilation（留空则前台英文模式显示中文）"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* 岗位运营 */}
            <div className="bg-card rounded-lg shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">岗位运营</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      急招岗位
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      仅已发布岗位可开启急招
                    </p>
                  </div>
                  <Switch
                    checked={editUrgent}
                    onCheckedChange={handleUrgentToggle}
                    disabled={!allowUrgentEdit}
                  />
                </div>
                {!allowUrgentEdit && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    请先发布岗位，再设置为急招。
                  </p>
                )}
                {editUrgent && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>急招开始时间</label>
                      <input
                        type="datetime-local"
                        value={editUrgentStartedAt}
                        onChange={(e) => setEditUrgentStartedAt(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>急招截止时间</label>
                      <input
                        type="datetime-local"
                        value={editUrgentExpiresAt}
                        onChange={(e) => setEditUrgentExpiresAt(e.target.value)}
                        className={inputClass}
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground/60">
                        截止时间必须晚于开始时间
                      </p>
                    </div>
                  </div>
                )}
                <div className="border-t border-border/40 pt-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500" />
                      精选岗位
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      与急招完全独立，可同时开启
                    </p>
                  </div>
                  <Switch checked={editFeatured} onCheckedChange={setEditFeatured} />
                </div>
              </div>
            </div>

            {/* 公开信息 */}
            <div className="bg-card rounded-lg shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">公开信息</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>公开标题</label>
                  <input
                    type="text"
                    value={editPublicTitle}
                    onChange={(e) => setEditPublicTitle(e.target.value)}
                    className={inputClass}
                  />
                  <div className="mt-2">
                    <label className={labelClass}>公开标题英文 (Title EN)</label>
                    <input
                      type="text"
                      value={editPublicTitleEn}
                      onChange={(e) => setEditPublicTitleEn(e.target.value)}
                      placeholder="如：Quantum Compiler Engineer（留空则前台英文模式显示中文）"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>公开公司名</label>
                  <input
                    type="text"
                    value={pub.company_display_name ?? ""}
                    disabled
                    className={`${inputClass} opacity-60 cursor-not-allowed`}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground/60">
                    由关联公司决定，不可在此编辑
                  </p>
                </div>
                <div>
                  <label className={labelClass}>城市</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>薪资展示</label>
                  <input
                    type="text"
                    value={editSalary}
                    onChange={(e) => setEditSalary(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>薪资展示英文 (Salary EN)</label>
                  <input
                    type="text"
                    value={editSalaryEn}
                    onChange={(e) => setEditSalaryEn(e.target.value)}
                    placeholder="如 30-60k · 15-month salary，留空则英文模式显示中文"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>职级</label>
                  <input
                    type="text"
                    value={editSeniority}
                    onChange={(e) => setEditSeniority(e.target.value)}
                    className={inputClass}
                  />
                  <div className="mt-2">
                    <label className={labelClass}>职级英文 (Seniority EN)</label>
                    <input
                      type="text"
                      value={editSeniorityEn}
                      onChange={(e) => setEditSeniorityEn(e.target.value)}
                      placeholder="如：Senior Engineer（留空则前台英文模式显示中文）"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>学历要求</label>
                  <input
                    type="text"
                    value={editEducation}
                    onChange={(e) => setEditEducation(e.target.value)}
                    className={inputClass}
                  />
                  <div className="mt-2">
                    <label className={labelClass}>学历要求英文 (Education EN)</label>
                    <input
                      type="text"
                      value={editEducationEn}
                      onChange={(e) => setEditEducationEn(e.target.value)}
                      placeholder="如：Master's degree or above（留空则回落映射表或中文）"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>经验要求</label>
                  <input
                    type="text"
                    value={editExperience}
                    onChange={(e) => setEditExperience(e.target.value)}
                    className={inputClass}
                  />
                  <div className="mt-2">
                    <label className={labelClass}>经验要求英文 (Experience EN)</label>
                    <input
                      type="text"
                      value={editExperienceEn}
                      onChange={(e) => setEditExperienceEn(e.target.value)}
                      placeholder="如：3+ years in quantum control systems（留空则回落映射表或中文）"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className={labelClass}>一句话摘要</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={2}
                  className={textareaClass}
                />
                <div className="mt-2">
                  <label className={labelClass}>一句话摘要英文 (Summary EN)</label>
                  <textarea
                    value={editSummaryEn}
                    onChange={(e) => setEditSummaryEn(e.target.value)}
                    rows={2}
                    placeholder="留空则前台英文模式显示中文"
                    className={textareaClass}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className={labelClass}>技术标签</label>
                <TagInput value={editTags} onChange={setEditTags} />
              </div>
              <div className="mt-4">
                <label className={labelClass}>技术标签英文 (Tags EN)</label>
                <TagInput value={editTagsEn} onChange={setEditTagsEn} />
                <p className={`mt-1 text-xs text-muted-foreground/70`}>留空则前台英文模式显示中文标签，顺序需与中文标签一一对应</p>
              </div>
            </div>

            {/* 岗位职责 */}
            <div className="bg-card rounded-lg shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">岗位职责</h2>
              </div>
              <DynamicListInput
                value={editResponsibilities}
                onChange={setEditResponsibilities}
                placeholder="添加一条职责"
              />
              <div className="mt-4">
                <label className={labelClass}>岗位职责英文 (Responsibilities EN)</label>
                <DynamicListInput
                  value={editResponsibilitiesEn}
                  onChange={setEditResponsibilitiesEn}
                  placeholder="Add a responsibility (English)"
                />
                <p className="mt-1 text-xs text-muted-foreground/60">留空则前台英文模式显示中文</p>
              </div>
            </div>

            {/* 任职要求 */}
            <div className="bg-card rounded-lg shadow-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">任职要求</h2>
              </div>
              <DynamicListInput
                value={editRequirements}
                onChange={setEditRequirements}
                placeholder="添加一条任职要求"
              />
              <div className="mt-4">
                <label className={labelClass}>任职要求英文 (Requirements EN)</label>
                <DynamicListInput
                  value={editRequirementsEn}
                  onChange={setEditRequirementsEn}
                  placeholder="Add a requirement (English)"
                />
                <p className="mt-1 text-xs text-muted-foreground/60">留空则前台英文模式显示中文</p>
              </div>
            </div>

            {/* 保存 */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </>
        )}

        <ConfirmDialog
          open={showConfirm === "publish"}
          onOpenChange={(v) => !v && setShowConfirm(null)}
          title="确认发布"
          description={
            dirtyTrack
              ? "当前岗位赛道值无效，发布将被阻止。请重新选择赛道或设为未归类。"
              : "发布后该岗位将对外可见。"
          }
          confirmText="发布"
          onConfirm={handlePublish}
        />
        <ConfirmDialog
          open={showConfirm === "offline"}
          onOpenChange={(v) => !v && setShowConfirm(null)}
          title="确认下架"
          description="下架后该岗位将不再对外可见，急招状态将自动失效。"
          confirmText="下架"
          destructive
          onConfirm={handleOffline}
        />
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="block text-sm text-foreground mt-0.5">{value || "—"}</span>
    </div>
  );
}

function parseListField(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed))
        return parsed.filter((v): v is string => typeof v === "string");
    } catch {
      return value.split("\n").filter(Boolean);
    }
  }
  return [];
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
