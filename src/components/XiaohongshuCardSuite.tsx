import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import {
  Download,
  PackageCheck,
  Sparkles,
  Copy,
  Check,
  Palette,
  SlidersHorizontal,
  FileText,
  MessageSquareQuote,
  Share2,
  Plus,
  Trash2,
  Loader2,
  Award,
  TrendingUp,
  Layers,
  CheckCircle2,
  XCircle,
  BookOpenCheck,
  ShieldCheck,
} from 'lucide-react';
import type {
  StudioScriptDraft,
  WorkspaceProfile,
  XiaohongshuSlide,
} from '../types';

export interface XiaohongshuCardSuiteProps {
  draft: StudioScriptDraft;
  profile: WorkspaceProfile;
  onUpdateSlide?: (page: number, patch: Partial<XiaohongshuSlide>) => void;
}

export type CardThemeId = 'editorial' | 'obsidian' | 'swiss';

interface ThemeTokens {
  id: CardThemeId;
  name: string;
  subtitle: string;
  swatchBg: string;
  swatchAccent: string;
  cardBg: string;
  cardText: string;
  subText: string;
  mutedText: string;
  borderColor: string;
  strongBorder: string;
  surfaceBg: string;
  elevatedBg: string;
  accentBg: string;
  accentText: string;
  accentSoftBg: string;
  sealBg: string;
  sealText: string;
  sealBorder: string;
}

const LAYOUT_LABELS: Record<XiaohongshuSlide['layout'], string> = {
  cover: '封面大字报 (Cover)',
  contrast: '新旧对比卡 (Contrast)',
  data: '核心数据卡 (Data)',
  steps: '步骤推演图 (Steps)',
  case: '案例切片卡 (Case)',
  cta: '私域转化卡 (CTA)',
};

export const XiaohongshuCardSuite: React.FC<XiaohongshuCardSuiteProps> = ({
  draft,
  profile,
  onUpdateSlide,
}) => {
  const [themeId, setThemeId] = useState<CardThemeId>('editorial');
  const [slides, setSlides] = useState<XiaohongshuSlide[]>(draft.xhsSlides);
  const [selectedPage, setSelectedPage] = useState<number>(
    draft.xhsSlides[0]?.page ?? 1
  );
  const [isExportingSingle, setIsExportingSingle] = useState<number | null>(null);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [exportProgressText, setExportProgressText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const cardNodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Sync slides when draft changes
  useEffect(() => {
    setSlides(draft.xhsSlides);
    if (draft.xhsSlides.length > 0) {
      setSelectedPage(draft.xhsSlides[0].page);
    }
  }, [draft.id, draft.xhsSlides]);

  const triggerToast = useCallback((msg: string, key?: string) => {
    setToastMessage(msg);
    if (key) {
      setCopiedKey(key);
    }
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
      if (key) {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }
    }, 2200);
  }, []);

  const handleCopyText = useCallback(
    async (text: string, label: string, key: string) => {
      try {
        await navigator.clipboard.writeText(text);
        triggerToast(`已复制：${label}`, key);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        triggerToast(`已复制：${label}`, key);
      }
    },
    [triggerToast]
  );

  // Build theme tokens dynamically incorporating workspace accent where appropriate
  const themes: Record<CardThemeId, ThemeTokens> = {
    editorial: {
      id: 'editorial',
      name: '金融时报暖米社论风',
      subtitle: 'Archival Warm Paper · 智库社论质感',
      swatchBg: '#F6F2E9',
      swatchAccent: profile.accentColor || '#C83E2B',
      cardBg: '#F6F2E9',
      cardText: '#161513',
      subText: '#4E4A44',
      mutedText: '#857F75',
      borderColor: 'rgba(22, 21, 19, 0.13)',
      strongBorder: 'rgba(22, 21, 19, 0.75)',
      surfaceBg: '#EFEAE0',
      elevatedBg: '#FAF7F0',
      accentBg: profile.accentColor || '#C83E2B',
      accentText: profile.accentColor || '#C83E2B',
      accentSoftBg: profile.accentSoft || 'rgba(200, 62, 43, 0.10)',
      sealBg: profile.accentColor || '#C83E2B',
      sealText: '#FAF7F0',
      sealBorder: profile.accentColor || '#C83E2B',
    },
    obsidian: {
      id: 'obsidian',
      name: '私享会黑金高定风',
      subtitle: 'Matte Obsidian & Gold · 闭门私董会气场',
      swatchBg: '#141311',
      swatchAccent: '#D4AF6A',
      cardBg: '#141311',
      cardText: '#F5F2EB',
      subText: '#C2BDB2',
      mutedText: '#7D786E',
      borderColor: 'rgba(212, 175, 106, 0.22)',
      strongBorder: 'rgba(212, 175, 106, 0.65)',
      surfaceBg: '#1D1B18',
      elevatedBg: '#25231F',
      accentBg: '#D4AF6A',
      accentText: '#D4AF6A',
      accentSoftBg: 'rgba(212, 175, 106, 0.14)',
      sealBg: 'rgba(212, 175, 106, 0.16)',
      sealText: '#E8C988',
      sealBorder: '#D4AF6A',
    },
    swiss: {
      id: 'swiss',
      name: '瑞士国际主义网格风',
      subtitle: 'Swiss Architectural Grid · 极客理性秩序',
      swatchBg: '#FFFFFF',
      swatchAccent: '#111111',
      cardBg: '#FFFFFF',
      cardText: '#111111',
      subText: '#3A3A3A',
      mutedText: '#737373',
      borderColor: 'rgba(17, 17, 17, 0.18)',
      strongBorder: '#111111',
      surfaceBg: '#F4F4F2',
      elevatedBg: '#FAFAFA',
      accentBg: profile.accentColor || '#C83E2B',
      accentText: profile.accentColor || '#C83E2B',
      accentSoftBg: 'rgba(17, 17, 17, 0.06)',
      sealBg: '#111111',
      sealText: '#FFFFFF',
      sealBorder: '#111111',
    },
  };

  const activeTheme = themes[themeId];
  const selectedSlide =
    slides.find((s) => s.page === selectedPage) || slides[0];

  const handlePatchSlide = useCallback(
    (page: number, patch: Partial<XiaohongshuSlide>) => {
      setSlides((prev) =>
        prev.map((slide) => (slide.page === page ? { ...slide, ...patch } : slide))
      );
      onUpdateSlide?.(page, patch);
    },
    [onUpdateSlide]
  );

  // Export single slide to HD PNG (360x480 @ pixelRatio 3.45 -> ~1242x1656)
  const handleDownloadSinglePng = useCallback(
    async (slide: XiaohongshuSlide) => {
      const node = cardNodeRefs.current[slide.page];
      if (!node) return;

      setIsExportingSingle(slide.page);
      try {
        const dataUrl = await toPng(node, {
          pixelRatio: 3.45,
          cacheBust: true,
          width: 360,
          height: 480,
          backgroundColor: activeTheme.cardBg,
        });

        const link = document.createElement('a');
        const safeTitle = draft.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 18);
        link.download = `${safeTitle}_P0${slide.page}_${themeId}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        triggerToast(`P0${slide.page} 高清 PNG (1242×1656) 已导出`);
      } catch (err) {
        console.error('Failed to export single slide PNG:', err);
        triggerToast('导出 PNG 失败，请重试');
      } finally {
        setIsExportingSingle(null);
      }
    },
    [activeTheme.cardBg, draft.title, themeId, triggerToast]
  );

  // Batch export all 6 slides into a .zip archive
  const handleDownloadAllZip = useCallback(async () => {
    if (isExportingZip) return;
    setIsExportingZip(true);

    try {
      const zip = new JSZip();
      const safeTitle = draft.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 20) || '小红书图文';
      const folder = zip.folder(`${safeTitle}_${themeId}_6张高清套图`);

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        setExportProgressText(`正在渲染高清图层 P0${slide.page} / 0${slides.length}...`);
        const node = cardNodeRefs.current[slide.page];
        if (!node) continue;

        const dataUrl = await toPng(node, {
          pixelRatio: 3.45,
          cacheBust: true,
          width: 360,
          height: 480,
          backgroundColor: activeTheme.cardBg,
        });

        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        folder?.file(
          `0${slide.page}_${slide.layout}_${slide.eyebrow.replace(/[\\/:*?"<>|\s]/g, '')}.png`,
          base64Data,
          { base64: true }
        );
      }

      // Also include a companion copywriting markdown file inside the zip
      const copyDoc = [
        `# ${draft.title}`,
        ``,
        `## 备选爆款标题`,
        ...draft.xhsTitleOptions.map((t, idx) => `${idx + 1}. ${t}`),
        ``,
        `## 小红书正文`,
        draft.xhsCaption,
        ``,
        draft.xhsTags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' '),
        ``,
        `## 朋友圈转发导语`,
        draft.momentsCopy,
        ``,
        `## 评论区置顶引流钩子`,
        draft.pinnedCommentCta,
      ].join('\n');

      folder?.file(`00_配套发布文案与置顶钩子.txt`, copyDoc);

      setExportProgressText('正在压缩打包 ZIP...');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTitle}_小红书6张高清套图_${themeId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      triggerToast('全部 6 张高清 PNG + 配套文案已打包下载 (.zip)');
    } catch (err) {
      console.error('Failed to batch export zip:', err);
      triggerToast('打包下载失败，请尝试单张下载');
    } finally {
      setIsExportingZip(false);
      setExportProgressText('');
    }
  }, [
    activeTheme.cardBg,
    draft.momentsCopy,
    draft.pinnedCommentCta,
    draft.title,
    draft.xhsCaption,
    draft.xhsTags,
    draft.xhsTitleOptions,
    isExportingZip,
    slides,
    themeId,
    triggerToast,
  ]);

  // Render bespoke interior choreography for each of the 6 layouts
  const renderSlideBody = (slide: XiaohongshuSlide, total: number) => {
    const t = activeTheme;
    const isSwiss = themeId === 'swiss';
    const isObsidian = themeId === 'obsidian';

    switch (slide.layout) {
      case 'cover': {
        return (
          <div className="flex-1 flex flex-col justify-between py-2">
            {/* Eyebrow & Giant Editorial Cover Headline */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2">
                <span
                  style={{
                    backgroundColor: t.accentSoftBg,
                    color: t.accentText,
                    borderColor: t.borderColor,
                  }}
                  className="px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded border"
                >
                  {slide.eyebrow}
                </span>
                {slide.highlightMetric && (
                  <span
                    style={{ color: t.accentText }}
                    className="font-mono-num text-[11px] font-semibold"
                  >
                    ● {slide.highlightMetric}
                  </span>
                )}
              </div>

              <h3
                style={{ color: t.cardText }}
                className={`${
                  isSwiss ? 'font-sans font-black tracking-tight' : 'font-editorial font-bold'
                } text-[25px] leading-[1.24]`}
              >
                {slide.headline}
              </h3>

              {slide.subheadline && (
                <p
                  style={{ color: t.subText }}
                  className="text-[12.5px] leading-relaxed font-normal"
                >
                  {slide.subheadline}
                </p>
              )}
            </div>

            {/* Cover Centerpiece: Architectural Key Highlights + Executive Seal */}
            <div
              style={{
                backgroundColor: t.surfaceBg,
                borderColor: isSwiss ? t.strongBorder : t.borderColor,
              }}
              className={`rounded-xl p-3.5 border ${
                isSwiss ? 'border-2' : ''
              } relative overflow-hidden space-y-2`}
            >
              <div
                style={{ color: t.mutedText }}
                className="font-mono-num text-[9.5px] uppercase tracking-widest flex items-center justify-between"
              >
                <span>EXECUTIVE BRIEFING · 核心拆解</span>
                <span>0{slide.page} / 0{total}</span>
              </div>

              <div className="space-y-1.5">
                {slide.bullets.slice(0, 3).map((b, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11.5px] leading-snug">
                    <span
                      style={{ color: t.accentText }}
                      className="font-mono-num font-bold shrink-0 mt-0.5"
                    >
                      0{idx + 1}.
                    </span>
                    <span style={{ color: t.cardText }} className="font-medium">
                      {b}
                    </span>
                  </div>
                ))}
              </div>

              {/* Traditional / Modern Executive Seal Stamp */}
              <div
                style={{
                  backgroundColor: t.sealBg,
                  color: t.sealText,
                  borderColor: t.sealBorder,
                }}
                className="mt-2.5 pt-2 border-t flex items-center justify-between px-2.5 py-1.5 rounded-lg"
              >
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10.5px] font-semibold tracking-wider">
                    {profile.ownerName} · {profile.ownerRole}
                  </span>
                </div>
                <span className="font-mono-num text-[9.5px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-current/30">
                  {profile.sealLabel}
                </span>
              </div>
            </div>
          </div>
        );
      }

      case 'contrast': {
        const oldPoints =
          slide.bullets.length >= 2
            ? slide.bullets.slice(0, Math.ceil(slide.bullets.length / 2))
            : [slide.bullets[0] || '传统盲目堆量，缺乏差异化切口'];
        const newPoints =
          slide.bullets.length >= 2
            ? slide.bullets.slice(Math.ceil(slide.bullets.length / 2))
            : [slide.bullets[1] || '结构化系统打法，精准筛选高客单客户'];

        return (
          <div className="flex-1 flex flex-col justify-between py-1.5 space-y-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span
                  style={{ color: t.accentText }}
                  className="font-mono-num text-[10px] font-bold uppercase tracking-widest"
                >
                  {slide.eyebrow}
                </span>
                {slide.highlightMetric && (
                  <span
                    style={{
                      backgroundColor: t.accentSoftBg,
                      color: t.accentText,
                    }}
                    className="px-2 py-0.5 rounded font-mono-num text-[10px] font-semibold"
                  >
                    {slide.highlightMetric}
                  </span>
                )}
              </div>
              <h3
                style={{ color: t.cardText }}
                className="font-editorial font-bold text-[19px] leading-snug"
              >
                {slide.headline}
              </h3>
            </div>

            {/* Split Contrast Cards: Old Way vs New System */}
            <div className="flex-1 flex flex-col gap-2.5 justify-center">
              {/* Old Approach */}
              <div
                style={{
                  backgroundColor: t.surfaceBg,
                  borderColor: t.borderColor,
                }}
                className="rounded-xl p-3 border space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-500">
                    <XCircle className="w-3.5 h-3.5" />
                    ❌ 传统低效做法 · 常见误区
                  </span>
                  <span
                    style={{ color: t.mutedText }}
                    className="font-mono-num text-[9px] uppercase"
                  >
                    LEGACY TRAP
                  </span>
                </div>
                {oldPoints.map((pt, i) => (
                  <p
                    key={i}
                    style={{ color: t.subText }}
                    className="text-[11.5px] leading-snug pl-1"
                  >
                    • {pt}
                  </p>
                ))}
              </div>

              {/* New Executive System */}
              <div
                style={{
                  backgroundColor: isObsidian ? 'rgba(212,175,106,0.10)' : t.elevatedBg,
                  borderColor: t.accentText,
                }}
                className="rounded-xl p-3 border-2 space-y-1.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span
                    style={{ color: t.accentText }}
                    className="inline-flex items-center gap-1 text-[10.5px] font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ✅ 破局实战体系 · 高维打法
                  </span>
                  <span
                    style={{ color: t.accentText }}
                    className="font-mono-num text-[9px] font-semibold uppercase"
                  >
                    NEW SYSTEM
                  </span>
                </div>
                {newPoints.map((pt, i) => (
                  <p
                    key={i}
                    style={{ color: t.cardText }}
                    className="text-[11.5px] font-medium leading-snug pl-1"
                  >
                    • {pt}
                  </p>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'data': {
        return (
          <div className="flex-1 flex flex-col justify-between py-1.5 space-y-2.5">
            <div className="space-y-1">
              <span
                style={{ color: t.accentText }}
                className="font-mono-num text-[10px] font-bold uppercase tracking-widest"
              >
                {slide.eyebrow}
              </span>
              <h3
                style={{ color: t.cardText }}
                className="font-editorial font-bold text-[19px] leading-snug"
              >
                {slide.headline}
              </h3>
            </div>

            {/* Giant Metric Callout Box with Visual Benchmark Bars */}
            <div
              style={{
                backgroundColor: t.surfaceBg,
                borderColor: isSwiss ? t.strongBorder : t.borderColor,
              }}
              className={`rounded-xl p-3.5 border ${isSwiss ? 'border-2' : ''} space-y-2.5`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div
                    style={{ color: t.mutedText }}
                    className="font-mono-num text-[9px] uppercase tracking-widest"
                  >
                    KEY METRIC BENCHMARK
                  </div>
                  <div
                    style={{ color: t.accentText }}
                    className="font-mono-num text-[26px] font-extrabold tracking-tight leading-none mt-1"
                  >
                    {slide.highlightMetric || '3.8x 转化溢价'}
                  </div>
                </div>
                <TrendingUp
                  style={{ color: t.accentText }}
                  className="w-6 h-6 shrink-0 opacity-85"
                />
              </div>

              {/* Visual Bar Chart Comparison */}
              <div className="space-y-1.5 pt-1">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9.5px] font-mono-num">
                    <span style={{ color: t.cardText }} className="font-semibold">
                      结构化专业立论模型
                    </span>
                    <span style={{ color: t.accentText }} className="font-bold">
                      92% 精准决策触达
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
                    <div
                      style={{ backgroundColor: t.accentBg }}
                      className="h-full w-[92%] rounded-full"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9.5px] font-mono-num">
                    <span style={{ color: t.mutedText }}>泛娱乐盲目追热点</span>
                    <span style={{ color: t.mutedText }}>18% 有效询盘</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
                    <div
                      style={{ backgroundColor: t.mutedText }}
                      className="h-full w-[22%] rounded-full opacity-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Data Evidence Bullets */}
            <div className="space-y-1.5">
              {slide.bullets.map((b, idx) => (
                <div
                  key={idx}
                  style={{ borderColor: t.borderColor }}
                  className="flex items-start gap-2 text-[11.5px] leading-snug pb-1.5 border-b last:border-b-0"
                >
                  <span
                    style={{
                      backgroundColor: t.accentSoftBg,
                      color: t.accentText,
                    }}
                    className="font-mono-num text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0"
                  >
                    #{idx + 1}
                  </span>
                  <span style={{ color: t.cardText }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'steps': {
        return (
          <div className="flex-1 flex flex-col justify-between py-1.5 space-y-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span
                  style={{ color: t.accentText }}
                  className="font-mono-num text-[10px] font-bold uppercase tracking-widest"
                >
                  {slide.eyebrow}
                </span>
                <Layers style={{ color: t.accentText }} className="w-3.5 h-3.5" />
              </div>
              <h3
                style={{ color: t.cardText }}
                className="font-editorial font-bold text-[19px] leading-snug"
              >
                {slide.headline}
              </h3>
            </div>

            {/* Architectural Step Nodes 01 -> 02 -> 03 */}
            <div className="flex-1 flex flex-col justify-center space-y-2 relative">
              {slide.bullets.map((b, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: idx === 0 ? t.elevatedBg : t.surfaceBg,
                    borderColor: idx === 0 ? t.accentText : t.borderColor,
                  }}
                  className="rounded-xl p-2.5 border flex items-start gap-2.5"
                >
                  <div
                    style={{
                      backgroundColor: idx === 0 ? t.accentBg : t.accentSoftBg,
                      color: idx === 0 ? '#FFFFFF' : t.accentText,
                    }}
                    className="w-6 h-6 rounded-lg font-mono-num text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                  >
                    0{idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      style={{ color: t.cardText }}
                      className="text-[11.5px] font-medium leading-snug"
                    >
                      {b}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {slide.highlightMetric && (
              <div
                style={{
                  backgroundColor: t.accentSoftBg,
                  color: t.accentText,
                }}
                className="px-3 py-1.5 rounded-lg text-[10.5px] font-mono-num font-semibold flex items-center justify-between"
              >
                <span>⚡ 闭环执行标准</span>
                <span>{slide.highlightMetric}</span>
              </div>
            )}
          </div>
        );
      }

      case 'case': {
        return (
          <div className="flex-1 flex flex-col justify-between py-1.5 space-y-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span
                  style={{
                    backgroundColor: t.accentSoftBg,
                    color: t.accentText,
                  }}
                  className="px-2 py-0.5 rounded font-mono-num text-[9.5px] font-bold uppercase tracking-wider inline-flex items-center gap-1"
                >
                  <BookOpenCheck className="w-3 h-3" />
                  {slide.eyebrow}
                </span>
                {slide.highlightMetric && (
                  <span
                    style={{ color: t.accentText }}
                    className="font-mono-num text-[11px] font-bold"
                  >
                    {slide.highlightMetric}
                  </span>
                )}
              </div>

              <h3
                style={{ color: t.cardText }}
                className="font-editorial font-bold text-[19px] leading-snug"
              >
                {slide.headline}
              </h3>

              {slide.subheadline && (
                <p style={{ color: t.subText }} className="text-[11.5px] leading-snug">
                  {slide.subheadline}
                </p>
              )}
            </div>

            {/* Case Dossier Evidence Cards */}
            <div
              style={{
                backgroundColor: t.surfaceBg,
                borderColor: t.borderColor,
              }}
              className="rounded-xl p-3 border space-y-2 flex-1 flex flex-col justify-center"
            >
              {slide.bullets.map((b, idx) => {
                const tagLabels = ['痛点切片', '关键动作', '结果验证', '复盘启示'];
                return (
                  <div
                    key={idx}
                    style={{ borderColor: t.borderColor }}
                    className="pb-2 last:pb-0 border-b last:border-b-0 space-y-0.5"
                  >
                    <span
                      style={{ color: t.accentText }}
                      className="font-mono-num text-[9.5px] font-bold uppercase tracking-wider"
                    >
                      ■ {tagLabels[idx] || `证据 0${idx + 1}`}
                    </span>
                    <p
                      style={{ color: t.cardText }}
                      className="text-[11.5px] leading-snug font-medium"
                    >
                      {b}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'cta':
      default: {
        return (
          <div className="flex-1 flex flex-col justify-between py-1.5 space-y-2.5">
            <div className="space-y-1">
              <span
                style={{ color: t.accentText }}
                className="font-mono-num text-[10px] font-bold uppercase tracking-widest"
              >
                {slide.eyebrow}
              </span>
              <h3
                style={{ color: t.cardText }}
                className="font-editorial font-bold text-[19px] leading-snug"
              >
                {slide.headline}
              </h3>
            </div>

            {/* Lead-Magnet Executive Document Mockup Card */}
            <div
              style={{
                backgroundColor: t.surfaceBg,
                borderColor: t.accentText,
              }}
              className="rounded-xl p-3.5 border-2 relative overflow-hidden space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span
                  style={{
                    backgroundColor: t.sealBg,
                    color: t.sealText,
                  }}
                  className="px-2 py-0.5 rounded text-[9.5px] font-mono-num font-semibold uppercase tracking-wider"
                >
                  LEAD MAGNET · 内部工具包
                </span>
                <ShieldCheck style={{ color: t.accentText }} className="w-4 h-4" />
              </div>

              <div
                style={{ color: t.cardText }}
                className="font-editorial font-bold text-[14.5px] leading-snug"
              >
                {profile.leadMagnetTitle}
              </div>

              <div className="space-y-1 pt-0.5">
                {slide.bullets.map((b, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-snug">
                    <span style={{ color: t.accentText }} className="font-bold">
                      ✓
                    </span>
                    <span style={{ color: t.subText }}>{b}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  backgroundColor: t.elevatedBg,
                  borderColor: t.borderColor,
                  color: t.cardText,
                }}
                className="mt-2 p-2 rounded-lg border text-[10.5px] font-medium flex items-center justify-between"
              >
                <span className="truncate">{profile.wechatCta}</span>
                <span
                  style={{ color: t.accentText }}
                  className="font-mono-num text-[9.5px] font-bold shrink-0 ml-2"
                >
                  合规领用 →
                </span>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  const fullCaptionWithTags = `${draft.xhsCaption}\n\n${draft.xhsTags
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    .join(' ')}`;

  return (
    <div className="space-y-6">
      {/* Floating Copy / Export Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#161513] text-[#F5F2EB] text-xs font-medium shadow-xl border border-white/15 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Suite Toolbar: 3 Luxury Editorial Theme Switcher + Batch ZIP Export */}
      <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-secondary)] mr-1">
            <Palette className="w-4 h-4 text-[var(--brand-accent)]" />
            <span>小红书高定视觉母版：</span>
          </div>

          {(Object.values(themes) as ThemeTokens[]).map((t) => {
            const active = t.id === themeId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeId(t.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs transition cursor-pointer border ${
                  active
                    ? 'bg-[var(--ink-primary)] text-[#F6F3EC] border-[var(--ink-primary)] shadow-sm font-semibold'
                    : 'bg-[var(--bg-elevated)] text-[var(--ink-primary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/20 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: t.swatchBg }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: t.swatchAccent }}
                  />
                </span>
                <div className="text-left">
                  <div>{t.name}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Batch Export All 6 HD PNGs (.zip) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isExportingZip}
            onClick={handleDownloadAllZip}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[var(--brand-accent)] hover:opacity-95 text-white shadow-sm transition cursor-pointer disabled:opacity-60"
          >
            {isExportingZip ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{exportProgressText || '正在渲染高清套图...'}</span>
              </>
            ) : (
              <>
                <PackageCheck className="w-4 h-4" />
                <span>📦 一键打包下载全部 6 张高清 PNG (.zip)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Left 6 Cards Grid (360x480) + Right Live Inspector & Copy Suite */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: 6 Xiaohongshu 3:4 Cards Canvas */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center">
          {slides.map((slide) => {
            const isSelected = slide.page === selectedPage;
            const isExportingThis = isExportingSingle === slide.page;
            const t = activeTheme;

            return (
              <div key={slide.page} className="flex flex-col items-center gap-2.5 group">
                {/* Card Top Action Strip */}
                <div className="w-[360px] flex items-center justify-between px-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono-num font-bold px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-[var(--brand-accent)] text-white'
                          : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                      }`}
                    >
                      P0{slide.page}
                    </span>
                    <span className="font-medium text-[var(--ink-secondary)]">
                      {LAYOUT_LABELS[slide.layout]}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadSinglePng(slide)}
                    disabled={isExportingThis}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--bg-elevated)] hover:bg-[var(--ink-primary)] hover:text-white text-[var(--ink-primary)] border border-[var(--border-hairline)] transition cursor-pointer"
                  >
                    {isExportingThis ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    <span>下载单张高清 PNG</span>
                  </button>
                </div>

                {/* Actual 360px × 480px (3:4) Render Target for html-to-image */}
                <div
                  onClick={() => setSelectedPage(slide.page)}
                  className={`relative rounded-2xl transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'ring-3 ring-[var(--brand-accent)] shadow-xl translate-y-[-2px]'
                      : 'ring-1 ring-black/10 hover:ring-2 hover:ring-[var(--brand-accent)]/50 shadow-md'
                  }`}
                >
                  <div
                    ref={(el) => {
                      cardNodeRefs.current[slide.page] = el;
                    }}
                    style={{
                      width: '360px',
                      height: '480px',
                      backgroundColor: t.cardBg,
                      color: t.cardText,
                    }}
                    className="w-[360px] h-[480px] p-6 flex flex-col justify-between relative overflow-hidden select-none"
                  >
                    {/* Subtle Architectural Grid Lines for Obsidian & Swiss Themes */}
                    {themeId === 'swiss' && (
                      <div
                        style={{ borderColor: t.borderColor }}
                        className="pointer-events-none absolute inset-3 border-2"
                      />
                    )}
                    {themeId === 'obsidian' && (
                      <div
                        style={{
                          backgroundImage:
                            'radial-gradient(rgba(212, 175, 106, 0.08) 1px, transparent 0)',
                          backgroundSize: '18px 18px',
                        }}
                        className="pointer-events-none absolute inset-0"
                      />
                    )}

                    {/* Card Top Editorial Header Rule */}
                    <div
                      style={{ borderColor: t.borderColor }}
                      className="pb-2.5 border-b flex items-center justify-between text-[9.5px] font-mono-num tracking-widest uppercase relative z-10"
                    >
                      <span style={{ color: t.mutedText }} className="truncate max-w-[220px]">
                        {profile.englishKicker} · {profile.brandTitle}
                      </span>
                      <span
                        style={{ color: t.accentText }}
                        className="font-bold shrink-0"
                      >
                        0{slide.page} / 0{slides.length}
                      </span>
                    </div>

                    {/* Bespoke Slide Layout Choreography */}
                    <div className="flex-1 flex flex-col justify-center relative z-10 overflow-hidden my-1">
                      {renderSlideBody(slide, slides.length)}
                    </div>

                    {/* Card Bottom Editorial Footer Rule */}
                    <div
                      style={{ borderColor: t.borderColor }}
                      className="pt-2.5 border-t flex items-center justify-between text-[9.5px] relative z-10"
                    >
                      <span
                        style={{ color: t.mutedText }}
                        className="truncate max-w-[230px]"
                      >
                        {slide.footerNote}
                      </span>
                      <span
                        style={{
                          color: t.accentText,
                          borderColor: t.borderColor,
                        }}
                        className="font-mono-num text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0"
                      >
                        {profile.sealLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Inspector Panel (Inline Slide Editor + Copywriting Distribution Box) */}
        <aside className="xl:col-span-4 space-y-5 xl:sticky xl:top-6">
          {/* 1. Selected Slide Live Inspector */}
          {selectedSlide && (
            <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[var(--brand-accent)]" />
                  <h4 className="text-sm font-bold text-[var(--ink-primary)]">
                    卡片实时精修 · P0{selectedSlide.page}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSinglePng(selectedSlide)}
                  disabled={isExportingSingle === selectedSlide.page}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--ink-primary)] text-white hover:opacity-90 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>导出 P0{selectedSlide.page} PNG</span>
                </button>
              </div>

              {/* Page Quick Selector Pills */}
              <div className="flex items-center gap-1.5">
                {slides.map((s) => (
                  <button
                    key={s.page}
                    type="button"
                    onClick={() => setSelectedPage(s.page)}
                    className={`flex-1 py-1.5 rounded-lg font-mono-num text-xs font-semibold transition cursor-pointer border ${
                      s.page === selectedSlide.page
                        ? 'bg-[var(--brand-accent)] text-white border-[var(--brand-accent)]'
                        : 'bg-[var(--bg-elevated)] text-[var(--ink-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    P0{s.page}
                  </button>
                ))}
              </div>

              <div className="space-y-3 text-xs">
                {/* Layout Switcher */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1">
                      版式结构 (Layout)
                    </label>
                    <select
                      value={selectedSlide.layout}
                      onChange={(e) =>
                        handlePatchSlide(selectedSlide.page, {
                          layout: e.target.value as XiaohongshuSlide['layout'],
                        })
                      }
                      className="w-full px-2.5 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--ink-primary)] font-medium focus:outline-none focus:border-[var(--brand-accent)]"
                    >
                      <option value="cover">封面大字报 (cover)</option>
                      <option value="contrast">新旧对比卡 (contrast)</option>
                      <option value="data">核心数据卡 (data)</option>
                      <option value="steps">步骤推演图 (steps)</option>
                      <option value="case">案例切片卡 (case)</option>
                      <option value="cta">私域转化卡 (cta)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1">
                      顶部眉题 (Eyebrow)
                    </label>
                    <input
                      type="text"
                      value={selectedSlide.eyebrow}
                      onChange={(e) =>
                        handlePatchSlide(selectedSlide.page, {
                          eyebrow: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--ink-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                    />
                  </div>
                </div>

                {/* Headline */}
                <div>
                  <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1">
                    主标题 (Headline)
                  </label>
                  <textarea
                    rows={2}
                    value={selectedSlide.headline}
                    onChange={(e) =>
                      handlePatchSlide(selectedSlide.page, {
                        headline: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--ink-primary)] font-medium leading-snug focus:outline-none focus:border-[var(--brand-accent)]"
                  />
                </div>

                {/* Subheadline & Highlight Metric */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1">
                      副标题说明 (Subheadline)
                    </label>
                    <input
                      type="text"
                      value={selectedSlide.subheadline || ''}
                      placeholder="选填副标题..."
                      onChange={(e) =>
                        handlePatchSlide(selectedSlide.page, {
                          subheadline: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--ink-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1">
                      高亮指标 (Highlight Metric)
                    </label>
                    <input
                      type="text"
                      value={selectedSlide.highlightMetric || ''}
                      placeholder="如：3.8x 询盘转化"
                      onChange={(e) =>
                        handlePatchSlide(selectedSlide.page, {
                          highlightMetric: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] font-mono-num text-[var(--ink-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                    />
                  </div>
                </div>

                {/* Bullets List Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-[var(--ink-muted)]">
                      结构化要点 (Bullets)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        handlePatchSlide(selectedSlide.page, {
                          bullets: [...selectedSlide.bullets, '新增实战拆解要点'],
                        })
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-[var(--brand-accent)] font-semibold hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      添加要点
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedSlide.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-1.5">
                        <span className="font-mono-num text-[10px] text-[var(--ink-muted)] w-4">
                          0{bIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={bullet}
                          onChange={(e) => {
                            const updated = [...selectedSlide.bullets];
                            updated[bIdx] = e.target.value;
                            handlePatchSlide(selectedSlide.page, {
                              bullets: updated,
                            });
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--ink-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                        />
                        {selectedSlide.bullets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = selectedSlide.bullets.filter(
                                (_, idx) => idx !== bIdx
                              );
                              handlePatchSlide(selectedSlide.page, {
                                bullets: updated,
                              });
                            }}
                            className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="删除此条"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Note */}
                <div>
                  <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1">
                    底部页脚署名 (Footer Note)
                  </label>
                  <input
                    type="text"
                    value={selectedSlide.footerNote}
                    onChange={(e) =>
                      handlePatchSlide(selectedSlide.page, {
                        footerNote: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--brand-accent)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. Multi-Channel Copywriting Suite (Titles, Caption+Tags, Moments, Pinned CTA) */}
          <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-[var(--border-hairline)] pb-3">
              <Sparkles className="w-4 h-4 text-[var(--brand-accent)]" />
              <h4 className="text-sm font-bold text-[var(--ink-primary)]">
                全渠道配套文案一键复制
              </h4>
            </div>

            {/* Xiaohongshu Title Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--ink-secondary)] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  备选高点击标题 ({draft.xhsTitleOptions.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {draft.xhsTitleOptions.map((titleOpt, idx) => {
                  const key = `title-${idx}`;
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-[var(--ink-primary)] font-medium leading-snug">
                        {titleOpt}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(titleOpt, `备选标题 #${idx + 1}`, key)
                        }
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--ink-primary)] hover:text-white text-[var(--ink-primary)] transition cursor-pointer"
                      >
                        {copiedKey === key ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>已复制</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>复制</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Xiaohongshu Body Caption + #Tags */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--ink-secondary)]">
                  小红书正文 + 垂类标签
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(fullCaptionWithTags, '小红书正文与标签', 'xhs-caption')
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--brand-accent)] text-white hover:opacity-90 transition cursor-pointer"
                >
                  {copiedKey === 'xhs-caption' ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>已复制全文</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>复制正文+标签</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-xs text-[var(--ink-secondary)] space-y-2 max-h-40 overflow-y-auto leading-relaxed">
                <p className="whitespace-pre-line">{draft.xhsCaption}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {draft.xhsTags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-medium text-[var(--brand-accent)]"
                    >
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* WeChat Moments Copy (朋友圈导语) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--ink-secondary)] flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  私域朋友圈转发导语
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(draft.momentsCopy, '朋友圈转发导语', 'moments-copy')
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--ink-primary)] hover:text-white text-[var(--ink-primary)] transition cursor-pointer"
                >
                  {copiedKey === 'moments-copy' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>复制导语</span>
                    </>
                  )}
                </button>
              </div>
              <p className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-xs text-[var(--ink-primary)] leading-relaxed">
                {draft.momentsCopy}
              </p>
            </div>

            {/* Pinned Comment Safe CTA (评论区合规置顶钩子) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--ink-secondary)] flex items-center gap-1.5">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-[var(--brand-accent)]" />
                  评论区置顶合规引流钩子
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      draft.pinnedCommentCta,
                      '评论区置顶引流钩子',
                      'pinned-cta'
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--bg-subtle)] hover:bg-[var(--ink-primary)] hover:text-white text-[var(--ink-primary)] transition cursor-pointer"
                >
                  {copiedKey === 'pinned-cta' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>复制置顶评</span>
                    </>
                  )}
                </button>
              </div>
              <p className="p-3 rounded-xl bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)]/25 text-xs text-[var(--ink-primary)] font-medium leading-relaxed">
                {draft.pinnedCommentCta}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default XiaohongshuCardSuite;
