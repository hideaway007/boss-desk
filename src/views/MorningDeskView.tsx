import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Mic,
  Square,
  ArrowUpRight,
  Flame,
  BookOpen,
  Loader2,
  ExternalLink,
  Download,
  Plus,
  Check,
} from 'lucide-react';
import type {
  ContentVaultItem,
  DailyTrendPoint,
  MorningBriefItem,
  StudioScriptDraft,
  WikiCard,
  WorkspaceProfile,
} from '../types';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface Props {
  profile: WorkspaceProfile;
  briefs: MorningBriefItem[];
  cards: WikiCard[];
  vaultItems: ContentVaultItem[];
  dailyTrends: DailyTrendPoint[];
  radarTotalCount: number;
  selectedModel: string;
  onDraftCreated: (draft: StudioScriptDraft, vaultEntry?: ContentVaultItem) => void;
  onVaultItemAdded: (item: ContentVaultItem) => void;
  onOpenCard: (slug: string) => void;
  onNavigateRadar: () => void;
  onNavigateVault: () => void;
}

const TEMPLATE_LABELS: Record<'opinion' | 'three-questions' | 'pain-demo', string> = {
  opinion: '观点反应型',
  'three-questions': '三问清单型',
  'pain-demo': '痛点实拍型',
};

const QUICK_VOICE_PROMPTS: Record<string, string> = {
  'd2-studio':
    '把那个做高端形象定制老板看上9菜单静态工作台却忙到吃灰的真事放进高潮段，强调老板要的是结果不是填表监工。',
  'sartoria-image':
    '结合上周拟上市医疗器械女创始人把纯黑西装换成暖米羊绒套装的案例，强调高管着装是降低谈判前7秒摩擦力。',
  'apex-trade':
    '用德国客户询盘8分钟自动背调官网差评+锁汇1.5%报三档阶梯价的实例，对比传统业务员翻旧表丢单。',
};

function proxyImg(url?: string, download = false, name = 'cover'): string {
  if (!url) return '';
  const p = new URLSearchParams({ url });
  if (download) {
    p.set('download', '1');
    p.set('name', name);
  }
  return `/api/media/image?${p.toString()}`;
}

const MiniSparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  if (values.length < 2) return null;
  const w = 88;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 4 - ((v - min) / (max - min)) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} className="overflow-visible shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts.join(' ')}
      />
    </svg>
  );
};

const InteractiveTrendChart: React.FC<{ data: DailyTrendPoint[]; accent: string }> = ({
  data,
  accent,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (data.length === 0) return null;

  const W = 620;
  const H = 176;
  const padL = 42;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxV = Math.max(...data.map((d) => d.views), 1000) * 1.08;
  const xAt = (i: number) =>
    padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const yAt = (v: number) => padT + plotH - (v / maxV) * plotH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(d.views).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${xAt(data.length - 1).toFixed(1)},${(padT + plotH).toFixed(
    1
  )} L${padL},${(padT + plotH).toFixed(1)} Z`;

  const activePoint = hoverIdx !== null ? data[hoverIdx] : data[data.length - 1];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-xs" style={{ backgroundColor: accent }} />
          <span className="text-xs font-bold text-[var(--ink-primary)]">
            全矩阵内容曝光趋势
          </span>
        </div>
        {activePoint && (
          <div className="flex items-center gap-3 text-xs font-mono-num">
            <span className="text-[var(--ink-muted)]">{activePoint.date}</span>
            <span className="font-bold text-[var(--ink-primary)]">
              {activePoint.views.toLocaleString()} 曝光
            </span>
            <span className="text-[var(--ink-secondary)]">
              {activePoint.interactions.toLocaleString()} 互动
            </span>
            <span className="rounded bg-emerald-50 text-emerald-800 px-1.5 py-0.5 font-bold">
              +{activePoint.leads} 询盘
            </span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[176px] select-none overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Recessive horizontal gridlines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = padT + plotH * (1 - ratio);
          const val = Math.round((maxV * ratio) / 1000);
          return (
            <g key={idx}>
              <line
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke="rgba(22,21,19,0.07)"
                strokeDasharray={ratio === 0 ? undefined : '3 3'}
              />
              <text
                x={padL - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="#8A847A"
                className="font-mono-num"
              >
                {val}k
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#trendFill)" />
        <path
          d={linePath}
          fill="none"
          stroke={accent}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Crosshair & Hit Targets */}
        {data.map((d, i) => {
          const cx = xAt(i);
          const cy = yAt(d.views);
          const isHov = hoverIdx === i;
          const showLabel = i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2);
          return (
            <g key={d.date}>
              {isHov && (
                <line
                  x1={cx}
                  y1={padT}
                  x2={cx}
                  y2={padT + plotH}
                  stroke="rgba(22,21,19,0.22)"
                  strokeDasharray="2 2"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isHov ? 5 : 3}
                fill={isHov ? accent : '#FFFFFF'}
                stroke={accent}
                strokeWidth="2"
              />
              {showLabel && (
                <text
                  x={cx}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#8A847A"
                  className="font-mono-num"
                >
                  {d.date}
                </text>
              )}
              <rect
                x={cx - plotW / data.length / 2}
                y={padT}
                width={plotW / data.length}
                height={plotH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIdx(i)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const MorningDeskView: React.FC<Props> = ({
  profile,
  briefs,
  cards,
  vaultItems,
  dailyTrends,
  radarTotalCount,
  selectedModel,
  onDraftCreated,
  onVaultItemAdded,
  onOpenCard,
  onNavigateRadar,
  onNavigateVault,
}) => {
  const [activeBriefId, setActiveBriefId] = useState<string>(briefs[0]?.id || '');
  const [voiceNotes, setVoiceNotes] = useState<Record<string, string>>({});
  const [templateOverrides, setTemplateOverrides] = useState<
    Record<string, 'opinion' | 'three-questions' | 'pain-demo'>
  >({});
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Quick Idea Capture (inspired by Sharon's 灵感速记)
  const [ideaTitle, setIdeaTitle] = useState<string>('');
  const [ideaSource, setIdeaSource] = useState<string>('');
  const [ideaSaved, setIdeaSaved] = useState<boolean>(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (briefs.length > 0 && !briefs.some((b) => b.id === activeBriefId)) {
      setActiveBriefId(briefs[0].id);
    }
  }, [briefs, activeBriefId]);

  const activeBrief = briefs.find((b) => b.id === activeBriefId) || briefs[0];

  const publishedItems = vaultItems.filter((v) => v.status === 'published');
  const inProgressItems = vaultItems.filter((v) => v.status !== 'published');
  const totalLeads = vaultItems.reduce((s, v) => s + (v.leadsCount || 0), 0);
  const hitCount = publishedItems.filter((v) => v.selfOutlierRatio >= 1.5).length;

  const toggleVoiceRecording = (briefId: string) => {
    if (recordingId === briefId) {
      recognitionRef.current?.stop();
      setRecordingId(null);
      return;
    }
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      const preset = QUICK_VOICE_PROMPTS[profile.id] || QUICK_VOICE_PROMPTS['d2-studio'];
      setVoiceNotes((prev) => ({ ...prev, [briefId]: preset }));
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = 'zh-CN';
      rec.continuous = true;
      rec.interimResults = true;
      const baseText = voiceNotes[briefId] ? voiceNotes[briefId] + ' ' : '';
      rec.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceNotes((prev) => ({ ...prev, [briefId]: baseText + transcript }));
      };
      rec.onerror = () => setRecordingId(null);
      rec.onend = () => setRecordingId(null);
      recognitionRef.current = rec;
      rec.start();
      setRecordingId(briefId);
    } catch {
      setRecordingId(null);
    }
  };

  const handleGeneratePackage = async (brief: MorningBriefItem) => {
    setErrorMsg('');
    setGenerating(true);
    const tpl = templateOverrides[brief.id] || brief.recommendedTemplate;

    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: profile.id,
          topicTitle: brief.title,
          templateType: tpl,
          bossVoiceNote: voiceNotes[brief.id] || '',
          referenceHook: brief.suggestedHook,
          selectedCardSlugs: brief.matchedCards,
          coverUrl: brief.coverUrl,
          refSourceUrl: brief.shareUrl,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.draft) {
        throw new Error(data.error || '生成失败');
      }
      onDraftCreated(data.draft, data.vaultEntry);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '生成请求异常');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveQuickIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim()) return;
    const newItem: ContentVaultItem = {
      id: `idea_${Date.now()}`,
      workspaceId: profile.id,
      title: ideaTitle.trim(),
      folder: '灵感速记池',
      platform: '全矩阵',
      format: '口播视频',
      templateType: 'opinion',
      status: 'idea',
      publishDate: new Date().toISOString().slice(0, 10),
      views: 0,
      likes: 0,
      collects: 0,
      shares: 0,
      leadsCount: 0,
      selfOutlierRatio: 0,
      hookLine: '',
      reviewNote: ideaSource.trim() ? `灵感来源：${ideaSource.trim()}` : '今日速记待展开',
      refSourceUrl: ideaSource.startsWith('http') ? ideaSource.trim() : '',
    };
    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: newItem }),
    });
    const data = await res.json();
    if (res.ok && data.item) {
      onVaultItemAdded(data.item);
      setIdeaTitle('');
      setIdeaSource('');
      setIdeaSaved(true);
      setTimeout(() => setIdeaSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Row 1: 4 Visual KPI Stat Tiles with Sparklines */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={onNavigateRadar}
          className="text-left rounded-2xl border border-[var(--border-hairline)] bg-white p-4 hover:border-[var(--brand-accent)] transition flex items-end justify-between cursor-pointer"
        >
          <div>
            <div className="text-xs font-medium text-[var(--ink-muted)]">24h 超常热点池</div>
            <div className="mt-1.5 font-mono-num text-2xl font-extrabold text-[var(--ink-primary)]">
              {radarTotalCount.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] font-medium text-[var(--brand-accent)]">
              真封面 · 原片直达 ↗
            </div>
          </div>
          <MiniSparkline values={[18, 24, 21, 32, 29, 41, 48]} color="#D1432A" />
        </button>

        <button
          type="button"
          onClick={onNavigateVault}
          className="text-left rounded-2xl border border-[var(--border-hairline)] bg-white p-4 hover:border-[var(--brand-accent)] transition flex items-end justify-between cursor-pointer"
        >
          <div>
            <div className="text-xs font-medium text-[var(--ink-muted)]">待拍 / 在制工单</div>
            <div className="mt-1.5 font-mono-num text-2xl font-extrabold text-[var(--ink-primary)]">
              {inProgressItems.length}{' '}
              <span className="text-xs font-normal text-[var(--ink-muted)]">条</span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--ink-secondary)]">
              弹药充足 · 点击管理排期
            </div>
          </div>
          <MiniSparkline values={[2, 3, 2, 4, 3, 5, inProgressItems.length + 2]} color="#2166AC" />
        </button>

        <button
          type="button"
          onClick={onNavigateVault}
          className="text-left rounded-2xl border border-[var(--border-hairline)] bg-white p-4 hover:border-[var(--brand-accent)] transition flex items-end justify-between cursor-pointer"
        >
          <div>
            <div className="text-xs font-medium text-[var(--ink-muted)]">已归档资产 / 爆款</div>
            <div className="mt-1.5 font-mono-num text-2xl font-extrabold text-[var(--ink-primary)]">
              {publishedItems.length}{' '}
              <span className="text-xs font-semibold text-emerald-700">
                ({hitCount}条超均值)
              </span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--ink-secondary)]">
              已同步复盘库 ↗
            </div>
          </div>
          <MiniSparkline
            values={dailyTrends.slice(-7).map((d) => d.views)}
            color="#1B9E77"
          />
        </button>

        <button
          type="button"
          onClick={onNavigateVault}
          className="text-left rounded-2xl border border-[var(--border-hairline)] bg-white p-4 hover:border-[var(--brand-accent)] transition flex items-end justify-between cursor-pointer"
        >
          <div>
            <div className="text-xs font-medium text-[var(--ink-muted)]">累计精准私信询盘</div>
            <div className="mt-1.5 font-mono-num text-2xl font-extrabold text-[var(--ink-primary)]">
              {totalLeads}{' '}
              <span className="text-xs font-normal text-[var(--ink-muted)]">位老板</span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-700 font-medium">
              私有大脑 {cards.length} 张卡片支撑
            </div>
          </div>
          <MiniSparkline
            values={dailyTrends.slice(-7).map((d) => d.leads)}
            color="#C67608"
          />
        </button>
      </section>

      {/* Row 2: Visual Exposure Trend Chart (8 cols) + Quick Inspiration Capture (4 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 rounded-2xl border border-[var(--border-hairline)] bg-white p-5">
          <InteractiveTrendChart
            data={dailyTrends}
            accent={profile.accentColor || '#C83E2B'}
          />
        </div>

        <form
          onSubmit={handleSaveQuickIdea}
          className="lg:col-span-4 rounded-2xl border border-[var(--border-hairline)] bg-white p-5 flex flex-col justify-between space-y-3"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ink-primary)]">
                ⚡ 灵感速记 · 存入选题存档库
              </span>
              {ideaSaved && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> 已存入存档库
                </span>
              )}
            </div>
            <input
              type="text"
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              placeholder="刷到好点子或客户刚问的一句话，随手记下…"
              className="mt-3 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)]/50 px-3 py-2 text-xs focus:bg-white focus:border-[var(--brand-accent)] focus:outline-none"
            />
            <input
              type="text"
              value={ideaSource}
              onChange={(e) => setIdeaSource(e.target.value)}
              placeholder="参考原视频链接或来源备注（选填）"
              className="mt-2 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/50 px-3 py-2 text-xs focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!ideaTitle.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--ink-primary)] py-2.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            存进选题存档池
          </button>
        </form>
      </section>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Row 3: Today's Visual Hotspots with Real Cover Thumbnails, Real Douyin Links & Image Download */}
      {activeBrief && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Visual Hotspot Cards with Real Cover Images */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[var(--ink-primary)]">
                今日超常热点精选（真实视频与封面）
              </span>
              <button
                type="button"
                onClick={onNavigateRadar}
                className="text-xs font-semibold text-[var(--brand-accent)] inline-flex items-center gap-0.5 cursor-pointer"
              >
                全部热点库 <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {briefs.map((brief) => {
              const selected = brief.id === activeBrief.id;
              return (
                <div
                  key={brief.id}
                  onClick={() => setActiveBriefId(brief.id)}
                  className={`rounded-2xl border p-3.5 transition flex gap-3.5 cursor-pointer ${
                    selected
                      ? 'border-[var(--brand-accent)] bg-white shadow-sm'
                      : 'border-[var(--border-hairline)] bg-white/75 hover:bg-white hover:border-[var(--border-strong)]'
                  }`}
                >
                  {/* Real Cover Image Thumbnail */}
                  <div className="relative w-24 h-28 shrink-0 rounded-xl overflow-hidden bg-stone-200 border border-black/5">
                    {brief.coverUrl ? (
                      <img
                        src={proxyImg(brief.coverUrl)}
                        alt={brief.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-500">
                        封面预览
                      </div>
                    )}
                    {brief.outlierRatio && (
                      <span
                        className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono-num text-[10px] font-extrabold text-white shadow-xs"
                        style={{ backgroundColor: 'var(--brand-accent)' }}
                      >
                        <Flame className="h-2.5 w-2.5 fill-current" />
                        {brief.outlierRatio.toFixed(1)}×
                      </span>
                    )}
                  </div>

                  {/* Info + Real Link & Image Download */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] text-[var(--ink-muted)] truncate">
                        @{brief.sourceAuthor} · {brief.likes?.toLocaleString()}赞
                      </div>
                      <h3 className="mt-1 font-editorial text-sm font-bold leading-snug text-[var(--ink-primary)] line-clamp-2">
                        {brief.title}
                      </h3>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      {brief.shareUrl && (
                        <a
                          href={brief.shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-subtle)] px-2 py-1 text-[11px] font-medium text-[var(--ink-primary)] hover:text-[var(--brand-accent)]"
                        >
                          看原片 <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {brief.coverUrl && (
                        <a
                          href={proxyImg(brief.coverUrl, true, brief.title.slice(0, 20))}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-subtle)] px-2 py-1 text-[11px] font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                        >
                          下载封面 <Download className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Focused Production Launchpad */}
          <div className="lg:col-span-7 rounded-2xl border border-[var(--border-strong)] bg-white p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
              <div className="space-y-1.5">
                <span
                  className="inline-block rounded-md px-2.5 py-0.5 text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--brand-accent-soft)',
                    color: 'var(--brand-accent)',
                  }}
                >
                  {activeBrief.badge}
                </span>
                <h2 className="font-editorial text-xl font-bold leading-snug text-[var(--ink-primary)]">
                  {activeBrief.title}
                </h2>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  {activeBrief.whyItWorks}
                </p>
              </div>

              {activeBrief.shareUrl && (
                <a
                  href={activeBrief.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-primary)] hover:border-[var(--brand-accent)]"
                >
                  打开抖音原片 <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <div className="rounded-xl bg-[var(--bg-canvas)]/70 p-4 border border-[var(--border-hairline)]">
              <div className="text-[11px] font-bold text-[var(--brand-accent)] mb-1">
                推荐前 20 字开场钩子
              </div>
              <p className="font-editorial text-base font-semibold text-[var(--ink-primary)]">
                「{activeBrief.suggestedHook}」
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold text-[var(--ink-secondary)] mb-2 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
                调用私有大脑卡片
              </div>
              <div className="flex flex-wrap gap-2">
                {activeBrief.matchedCards.map((slug) => {
                  const cardObj = cards.find((c) => c.slug === slug);
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => onOpenCard(slug)}
                      className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--brand-accent)] cursor-pointer"
                    >
                      {cardObj ? cardObj.title : slug}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ink-secondary)]">
                  补充个人观点（选填）
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVoiceNotes((prev) => ({
                        ...prev,
                        [activeBrief.id]:
                          QUICK_VOICE_PROMPTS[profile.id] || QUICK_VOICE_PROMPTS['d2-studio'],
                      }))
                    }
                    className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
                  >
                    示例
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVoiceRecording(activeBrief.id)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                      recordingId === activeBrief.id
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
                    }`}
                  >
                    {recordingId === activeBrief.id ? (
                      <>
                        <Square className="h-3 w-3 fill-current" /> 停止
                      </>
                    ) : (
                      <>
                        <Mic className="h-3 w-3" /> 语音输入
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={voiceNotes[activeBrief.id] || ''}
                onChange={(e) =>
                  setVoiceNotes((prev) => ({ ...prev, [activeBrief.id]: e.target.value }))
                }
                placeholder="补两句你的真实看法，生成后将自动同步归档至「存档与复盘」…"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)]/40 px-3.5 py-2 text-xs focus:bg-white focus:border-[var(--brand-accent)] focus:outline-none"
              />
            </div>

            <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-xl bg-[var(--bg-subtle)] p-1">
                {(['opinion', 'three-questions', 'pain-demo'] as const).map((tplKey) => {
                  const currentTpl =
                    templateOverrides[activeBrief.id] || activeBrief.recommendedTemplate;
                  return (
                    <button
                      key={tplKey}
                      type="button"
                      onClick={() =>
                        setTemplateOverrides((prev) => ({
                          ...prev,
                          [activeBrief.id]: tplKey,
                        }))
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        currentTpl === tplKey
                          ? 'bg-white text-[var(--ink-primary)] shadow-2xs'
                          : 'text-[var(--ink-secondary)]'
                      }`}
                    >
                      {TEMPLATE_LABELS[tplKey]}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={generating}
                onClick={() => handleGeneratePackage(activeBrief)}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-accent)' }}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在生成成片包…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    开工 · 生成脚本与 6 张图卡
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
