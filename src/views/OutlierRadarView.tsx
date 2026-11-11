import React, { useEffect, useState } from 'react';
import {
  Search,
  Flame,
  ExternalLink,
  Download,
  Sparkles,
  X,
  Loader2,
  Plus,
  BarChart3,
  LayoutGrid,
  List,
  CheckCircle2,
  ThumbsUp,
  Share2,
  Bookmark,
} from 'lucide-react';
import type {
  ContentVaultItem,
  RadarVideoItem,
  StudioScriptDraft,
  TrackSummary,
  WorkspaceProfile,
} from '../types';

interface DeconstructPayload {
  hookMechanism: string;
  first20CharsFormula: string;
  emotionalArc: string;
  commonEnemy: string;
  unansweredQuestions: string[];
  adaptationAngles: Array<{
    title: string;
    hookLine: string;
    templateType: 'opinion' | 'three-questions' | 'pain-demo';
  }>;
}

interface Props {
  profile: WorkspaceProfile;
  initialTracks: TrackSummary[];
  selectedModel: string;
  onDraftCreated: (draft: StudioScriptDraft, vaultEntry?: ContentVaultItem) => void;
}

function proxyImg(url?: string, download = false, name = 'douyin_cover'): string {
  if (!url) return '';
  const p = new URLSearchParams({ url });
  if (download) {
    p.set('download', '1');
    p.set('name', name);
  }
  return `/api/media/image?${p.toString()}`;
}

export const OutlierRadarView: React.FC<Props> = ({
  profile,
  initialTracks,
  selectedModel,
  onDraftCreated,
}) => {
  const [tracks, setTracks] = useState<TrackSummary[]>(initialTracks);
  const [selectedTrack, setSelectedTrack] = useState<string>(
    profile.defaultTrackFilter === 'all' ? 'all' : String(profile.defaultTrackFilter)
  );
  const [minRatio, setMinRatio] = useState<number>(2);
  const [audienceFilter, setAudienceFilter] = useState<string>('老板');
  const [angleFilter, setAngleFilter] = useState<string>('all');
  const [lowFansOnly, setLowFansOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<'gallery' | 'table'>('gallery');
  const [showTrackChart, setShowTrackChart] = useState<boolean>(false);

  const [videos, setVideos] = useState<RadarVideoItem[]>([]);
  const [totalMatched, setTotalMatched] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const [inspectingVideo, setInspectingVideo] = useState<RadarVideoItem | null>(null);
  const [deconstructData, setDeconstructData] = useState<DeconstructPayload | null>(null);
  const [deconstructing, setDeconstructing] = useState<boolean>(false);
  const [generatingAngleIdx, setGeneratingAngleIdx] = useState<number | null>(null);

  const [showLiveScan, setShowLiveScan] = useState<boolean>(false);
  const [liveKeyword, setLiveKeyword] = useState<string>('');
  const [liveScanning, setLiveScanning] = useState<boolean>(false);
  const [liveScanNotice, setLiveScanNotice] = useState<string>('');

  useEffect(() => {
    setSelectedTrack(
      profile.defaultTrackFilter === 'all' ? 'all' : String(profile.defaultTrackFilter)
    );
    setAudienceFilter(profile.id === 'sartoria-image' ? 'all' : '老板');
  }, [profile.id, profile.defaultTrackFilter]);

  const fetchRadarItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        trackId: selectedTrack,
        minRatio: String(minRatio),
        audience: audienceFilter,
        angle: angleFilter,
        maxFans: lowFansOnly ? '30000' : '0',
        minShareRate: '0',
        q: searchQuery,
        limit: '60',
      });
      const res = await fetch(`/api/radar?${params.toString()}`);
      const data = await res.json();
      setVideos(data.items || []);
      setTotalMatched(data.totalMatched || 0);
      if (data.tracks?.length) setTracks(data.tracks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarItems();
  }, [selectedTrack, minRatio, audienceFilter, angleFilter, lowFansOnly]);

  const handleOpenDeconstruct = async (v: RadarVideoItem) => {
    setInspectingVideo(v);
    setDeconstructData(null);
    setDeconstructing(true);
    try {
      const res = await fetch('/api/radar/deconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video: v,
          workspaceId: profile.id,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (res.ok) setDeconstructData(data);
    } finally {
      setDeconstructing(false);
    }
  };

  const handleRewriteToStudio = async (
    angle: {
      title: string;
      hookLine: string;
      templateType: 'opinion' | 'three-questions' | 'pain-demo';
    },
    idx: number
  ) => {
    setGeneratingAngleIdx(idx);
    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: profile.id,
          topicTitle: angle.title,
          templateType: angle.templateType,
          referenceHook: angle.hookLine,
          coverUrl: inspectingVideo?.coverUrl,
          refSourceUrl: inspectingVideo?.shareUrl,
          bossVoiceNote: inspectingVideo
            ? `参考真实爆款《${inspectingVideo.title.slice(0, 32)}》（${inspectingVideo.outlierRatio}×）`
            : '',
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.draft) {
        setInspectingVideo(null);
        onDraftCreated(data.draft, data.vaultEntry);
      }
    } finally {
      setGeneratingAngleIdx(null);
    }
  };

  const handleRunLiveScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveKeyword.trim()) return;
    setLiveScanning(true);
    setLiveScanNotice('');
    try {
      const res = await fetch('/api/radar/live-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: liveKeyword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '实时巡检失败');
      setLiveScanNotice(`已实时抓回 ${data.added} 条「${liveKeyword}」真视频与封面`);
      setSelectedTrack('all');
      setAudienceFilter('all');
      setMinRatio(1.2);
      setSearchQuery(liveKeyword.trim());
      await fetchRadarItems();
    } catch (err) {
      setLiveScanNotice(err instanceof Error ? err.message : '巡检异常');
    } finally {
      setLiveScanning(false);
    }
  };

  const sortedTracks = [...tracks].sort((a, b) => b.bossDoublingRate - a.bossDoublingRate);

  return (
    <div className="space-y-5">
      {/* Header with View Switcher & Track Chart Toggle */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
        <div>
          <p className="text-xs font-medium text-[var(--ink-muted)]">
            命中 {totalMatched} 条真实抖音样本 · 支持原片直跳与高清封面下载
          </p>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-[var(--ink-primary)]">
            超常热点库
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-[var(--bg-subtle)] p-1 text-xs">
            <button
              type="button"
              onClick={() => setDisplayMode('gallery')}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold cursor-pointer ${
                displayMode === 'gallery'
                  ? 'bg-white text-[var(--ink-primary)] shadow-2xs'
                  : 'text-[var(--ink-secondary)]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              封面画廊
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('table')}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold cursor-pointer ${
                displayMode === 'table'
                  ? 'bg-white text-[var(--ink-primary)] shadow-2xs'
                  : 'text-[var(--ink-secondary)]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              紧凑列表
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTrackChart((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              showTrackChart
                ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-white'
                : 'border-[var(--border-strong)] bg-white text-[var(--ink-primary)]'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            赛道对比图
          </button>

          <button
            type="button"
            onClick={() => setShowLiveScan((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--ink-primary)] hover:border-[var(--brand-accent)] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            实时搜新词
          </button>
        </div>
      </header>

      {showLiveScan && (
        <form
          onSubmit={handleRunLiveScan}
          className="rounded-xl border border-[var(--brand-accent)] bg-white p-3.5 flex flex-wrap items-center gap-3"
        >
          <input
            type="text"
            value={liveKeyword}
            onChange={(e) => setLiveKeyword(e.target.value)}
            placeholder="输入抖音关键词实时抓回真视频与封面，如：总裁穿搭 / 律所获客…"
            className="flex-1 min-w-[220px] rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs focus:outline-none"
          />
          <button
            type="submit"
            disabled={liveScanning}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
            style={{ backgroundColor: 'var(--brand-accent)' }}
          >
            {liveScanning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            立即抓取
          </button>
          {liveScanNotice && (
            <span className="text-xs text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {liveScanNotice}
            </span>
          )}
        </form>
      )}

      {/* Validated Horizontal Bar Chart for 15 Tracks */}
      {showTrackChart && (
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-white p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--ink-primary)]">
              15 赛道老板受众超常翻倍率 vs 转发率（点击条形筛选该赛道）
            </span>
            <span className="font-mono-num text-[var(--ink-muted)]">
              虚线 = 全库基准线 26.4%
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {sortedTracks.map((t) => {
              const pct = +(t.bossDoublingRate * 100).toFixed(1);
              const active = selectedTrack === String(t.trackId);
              const aboveRef = t.bossDoublingRate >= 0.264;
              return (
                <button
                  key={t.trackId}
                  type="button"
                  onClick={() => setSelectedTrack(active ? 'all' : String(t.trackId))}
                  className={`group flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition cursor-pointer ${
                    active ? 'bg-[var(--bg-subtle)]' : 'hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <span className="w-20 shrink-0 text-xs font-semibold text-[var(--ink-primary)] truncate">
                    {t.trackShort}
                  </span>
                  <div className="relative flex-1 h-4 bg-stone-100 rounded-xs overflow-hidden">
                    <div
                      className="h-full rounded-r-xs transition-all"
                      style={{
                        width: `${Math.min(100, pct * 1.8)}%`,
                        backgroundColor: aboveRef ? '#D1432A' : '#2166AC',
                      }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-px border-l border-dashed border-stone-900/50"
                      style={{ left: `${26.4 * 1.8}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono-num text-xs font-bold text-[var(--ink-primary)]">
                    {pct}%
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Single-Row Clean Filter Strip */}
      <div className="rounded-2xl border border-[var(--border-hairline)] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedTrack}
            onChange={(e) => setSelectedTrack(e.target.value)}
            className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-primary)] focus:outline-none"
          >
            <option value="all">全部行业赛道 (15)</option>
            {sortedTracks.map((t) => (
              <option key={t.trackId} value={String(t.trackId)}>
                {t.trackShort} ({(t.bossDoublingRate * 100).toFixed(0)}%)
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-lg bg-[var(--bg-subtle)] p-0.5 text-xs">
            {[
              { label: '≥2× 超常', val: 2 },
              { label: '≥5× 爆款', val: 5 },
              { label: '≥15× 现象级', val: 15 },
              { label: '全部', val: 0 },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setMinRatio(opt.val)}
                className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                  minRatio === opt.val
                    ? 'bg-white text-[var(--ink-primary)] shadow-2xs font-semibold'
                    : 'text-[var(--ink-secondary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg bg-[var(--bg-subtle)] p-0.5 text-xs">
            {(['老板', 'all'] as const).map((aud) => (
              <button
                key={aud}
                type="button"
                onClick={() => setAudienceFilter(aud)}
                className={`rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                  audienceFilter === aud
                    ? 'bg-white text-[var(--ink-primary)] shadow-2xs font-semibold'
                    : 'text-[var(--ink-secondary)]'
                }`}
              >
                {aud === '老板' ? '老板受众' : '全受众'}
              </button>
            ))}
          </div>

          <select
            value={angleFilter}
            onChange={(e) => setAngleFilter(e.target.value)}
            className="rounded-lg border border-[var(--border-hairline)] bg-white px-2.5 py-1.5 text-xs text-[var(--ink-secondary)] focus:outline-none"
          >
            <option value="all">所有角度</option>
            <option value="A">A 焦虑危机</option>
            <option value="B">B 能力展示</option>
            <option value="C">C 实力案例</option>
            <option value="D">D 商业观点</option>
            <option value="E">E 教程拆解</option>
            <option value="F">F 权威资讯</option>
          </select>

          <button
            type="button"
            onClick={() => setLowFansOnly((v) => !v)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition cursor-pointer ${
              lowFansOnly
                ? 'border-[var(--brand-accent)] bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] font-semibold'
                : 'border-[var(--border-hairline)] text-[var(--ink-secondary)]'
            }`}
          >
            低粉黑马 (&lt;3万粉)
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchRadarItems();
          }}
          className="relative"
        >
          <Search className="h-3.5 w-3.5 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标题或作者…"
            className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] pl-8 pr-3 py-1.5 text-xs w-48 focus:bg-white focus:outline-none"
          />
        </form>
      </div>

      {/* Visual Gallery Grid OR Compact List */}
      {loading ? (
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-white p-14 text-center text-xs text-[var(--ink-muted)] flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载真实视频与封面中…
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-white p-14 text-center text-xs text-[var(--ink-muted)]">
          当前筛选下暂无样本，请切换「全受众」或放宽超常倍数。
        </div>
      ) : displayMode === 'gallery' ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((v) => (
            <article
              key={`${v.trackId}_${v.id}`}
              className="group rounded-2xl border border-[var(--border-hairline)] bg-white overflow-hidden hover:border-[var(--border-strong)] hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Real Douyin Cover Image Header */}
                <div className="relative aspect-[16/10] bg-stone-900 overflow-hidden">
                  {v.coverUrl ? (
                    <img
                      src={proxyImg(v.coverUrl)}
                      alt={v.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">
                      @{v.author}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />

                  <span className="absolute top-2.5 left-2.5 rounded-md bg-black/65 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
                    {v.trackShort} · {v.angleLabel.slice(2)}
                  </span>

                  <span
                    className="absolute top-2.5 right-2.5 inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 font-mono-num text-xs font-extrabold text-white shadow-sm"
                    style={{
                      backgroundColor: v.outlierRatio >= 5 ? 'var(--brand-accent)' : '#161513',
                    }}
                  >
                    {v.outlierRatio >= 5 && <Flame className="h-3 w-3 fill-current" />}
                    {v.outlierRatio.toFixed(1)}×
                  </span>

                  {/* Bottom Author & Date inside Cover */}
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white/95">
                    <span className="font-medium truncate">@{v.author}</span>
                    <span className="font-mono-num text-[10px] opacity-80">{v.createDate}</span>
                  </div>
                </div>

                {/* Title & Engagement Visual Metrics */}
                <div className="p-4 space-y-3">
                  <p className="text-xs font-bold text-[var(--ink-primary)] leading-relaxed line-clamp-2 min-h-[38px]">
                    {v.title || '（无文字标题视频）'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono-num text-[var(--ink-secondary)] pt-1 border-t border-[var(--border-hairline)]">
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" /> {v.likes.toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Share2 className="h-3 w-3" /> {(v.shareRate * 100).toFixed(0)}%转
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Bookmark className="h-3 w-3" /> {(v.collectRate * 100).toFixed(0)}%藏
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Footer: Real Link + Download Image + AI Rewrite */}
              <div className="px-4 pb-3.5 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <a
                    href={v.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="在抖音打开真实原视频"
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ink-primary)] hover:border-[var(--brand-accent)]"
                  >
                    原片 <ExternalLink className="h-3 w-3" />
                  </a>
                  {v.coverUrl && (
                    <a
                      href={proxyImg(v.coverUrl, true, `${v.author}_${v.id}`)}
                      download
                      title="下载原视频高清封面图到本地"
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2 py-1.5 text-[11px] font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    >
                      <Download className="h-3 w-3" /> 存图
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenDeconstruct(v)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-accent)' }}
                >
                  <Sparkles className="h-3 w-3" />
                  拆解改写
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-[var(--border-hairline)] bg-white divide-y divide-[var(--border-hairline)] overflow-hidden">
          {videos.map((v) => (
            <div
              key={`${v.trackId}_${v.id}`}
              className="px-5 py-3.5 hover:bg-[var(--bg-surface)]/70 transition flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1 overflow-hidden">
                {v.coverUrl && (
                  <img
                    src={proxyImg(v.coverUrl)}
                    alt=""
                    loading="lazy"
                    className="w-12 h-14 rounded-lg object-cover shrink-0 bg-stone-200"
                  />
                )}
                <div className="w-14 shrink-0 text-right">
                  <div
                    className="font-mono-num text-sm font-extrabold"
                    style={{
                      color: v.outlierRatio >= 5 ? 'var(--brand-accent)' : 'var(--ink-primary)',
                    }}
                  >
                    {v.outlierRatio.toFixed(1)}×
                  </div>
                  <div className="text-[10px] font-mono-num text-[var(--ink-muted)]">
                    基线{v.baselineMedian}
                  </div>
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                    {v.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                    <span>{v.trackShort}</span>
                    <span>·</span>
                    <span>@{v.author}</span>
                    <span>·</span>
                    <span className="font-mono-num">{v.likes.toLocaleString()}赞</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={v.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                >
                  原片 <ExternalLink className="h-3 w-3" />
                </a>
                {v.coverUrl && (
                  <a
                    href={proxyImg(v.coverUrl, true, `${v.author}_${v.id}`)}
                    download
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  >
                    存封面 <Download className="h-3 w-3" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenDeconstruct(v)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-accent)' }}
                >
                  <Sparkles className="h-3 w-3" />
                  拆解
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Slide-Over Deconstruct Drawer with Cover Preview & Download */}
      {inspectingVideo && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-[1px]">
          <div className="relative w-full max-w-xl bg-white h-full overflow-y-auto p-7 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
              <div className="flex gap-3.5 items-start">
                {inspectingVideo.coverUrl && (
                  <img
                    src={proxyImg(inspectingVideo.coverUrl)}
                    alt=""
                    className="w-16 h-20 rounded-xl object-cover shrink-0 border border-black/10"
                  />
                )}
                <div>
                  <span
                    className="inline-block rounded-md px-2 py-0.5 font-mono-num text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--brand-accent-soft)',
                      color: 'var(--brand-accent)',
                    }}
                  >
                    {inspectingVideo.outlierRatio.toFixed(1)}× 真实爆款解剖
                  </span>
                  <h3 className="mt-1.5 font-editorial text-base font-bold text-[var(--ink-primary)] line-clamp-2">
                    {inspectingVideo.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={inspectingVideo.shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-accent)] hover:underline"
                    >
                      打开抖音原视频 <ExternalLink className="h-3 w-3" />
                    </a>
                    {inspectingVideo.coverUrl && (
                      <a
                        href={proxyImg(
                          inspectingVideo.coverUrl,
                          true,
                          `${inspectingVideo.author}_${inspectingVideo.id}`
                        )}
                        download
                        className="inline-flex items-center gap-1 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                      >
                        · 下载封面素材 <Download className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingVideo(null)}
                className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {deconstructing ? (
              <div className="py-20 text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-[var(--brand-accent)]" />
                <p className="text-xs text-[var(--ink-secondary)]">正在拆解钩子机制与改写切口…</p>
              </div>
            ) : deconstructData ? (
              <div className="space-y-5">
                <div className="rounded-xl bg-[var(--bg-surface)] p-4 border border-[var(--border-hairline)] space-y-2.5">
                  <div>
                    <div className="text-[11px] font-bold text-[var(--brand-accent)]">
                      前 20 字句式模板
                    </div>
                    <p className="mt-0.5 font-editorial text-base font-bold text-[var(--ink-primary)]">
                      「{deconstructData.first20CharsFormula}」
                    </p>
                  </div>
                  <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                    <strong>留人机制：</strong>
                    {deconstructData.hookMechanism}
                  </p>
                  <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                    <strong>共同敌人：</strong>
                    {deconstructData.commonEnemy}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-[var(--ink-primary)]">
                    套入私有大脑一键生成成片包
                  </div>
                  {deconstructData.adaptationAngles.map((ang, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[var(--border-strong)] p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--ink-primary)]">
                          {ang.title}
                        </div>
                        <div className="text-xs text-[var(--ink-muted)] mt-0.5 truncate">
                          「{ang.hookLine}」
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={generatingAngleIdx !== null}
                        onClick={() => handleRewriteToStudio(ang, idx)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: 'var(--brand-accent)' }}
                      >
                        {generatingAngleIdx === idx ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        生成脚本
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-red-700">拆解失败，请重试。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
