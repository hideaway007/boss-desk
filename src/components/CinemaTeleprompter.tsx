import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FlipHorizontal2,
  Camera,
  CameraOff,
  X,
  Gauge,
  Type,
  MoveHorizontal,
  Clapperboard,
  Eye,
  MonitorPlay,
  Sparkles,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Smartphone,
  Monitor,
  Move,
} from 'lucide-react';
import type { StudioScriptDraft, ScriptBeat } from '../types';

export interface CinemaTeleprompterProps {
  draft: StudioScriptDraft;
  brandTitle: string;
  onClose: () => void;
}

interface CueMeta {
  code: string;
  label: string;
  shortTag: string;
  className: string;
}

const CUE_DICTIONARY: Record<string, CueMeta> = {
  '【停】': {
    code: '【停】',
    label: '⏸ 停顿半秒留气口',
    shortTag: '⏸ 停顿留气口',
    className:
      'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.22)]',
  },
  '【↑】': {
    code: '【↑】',
    label: '↑ 抬高音量与音调',
    shortTag: '↑ 拔高重音',
    className:
      'bg-[#C83E2B]/25 text-[#FF8A75] border border-[#E0523C]/60 shadow-[0_0_16px_rgba(200,62,43,0.28)]',
  },
  '【慢】': {
    code: '【慢】',
    label: '⏳ 放慢语速·字字砸实',
    shortTag: '⏳ 压慢语速',
    className: 'bg-sky-500/15 text-sky-300 border border-sky-400/40',
  },
  '【快】': {
    code: '【快】',
    label: '⚡ 加快节奏·制造密集感',
    shortTag: '⚡ 紧凑加速',
    className: 'bg-purple-500/20 text-purple-300 border border-purple-400/45',
  },
  '【转】': {
    code: '【转】',
    label: '↪ 语气转折·眼神微顿',
    shortTag: '↪ 转折换气',
    className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40',
  },
  '【近】': {
    code: '【近】',
    label: '🎯 前倾半步·拉近压迫感',
    shortTag: '🎯 前倾贴镜',
    className: 'bg-rose-500/20 text-rose-300 border border-rose-400/45',
  },
};

const EMOTION_STAGE_META: Record<
  ScriptBeat['emotionStage'],
  {
    badge: string;
    subtitle: string;
    borderColor: string;
    badgeBg: string;
    dotColor: string;
  }
> = {
  A: {
    badge: 'A 低沉引入',
    subtitle: '压低胸腔共鸣 · 平静抛出反常识切口',
    borderColor: 'border-l-[#64748B]',
    badgeBg: 'bg-slate-500/15 text-slate-300 border-slate-500/35',
    dotColor: 'bg-slate-400',
  },
  B: {
    badge: 'B 认同举证',
    subtitle: '中速沉稳拆解 · 配合手势指向屏幕证据',
    borderColor: 'border-l-[#D4AF6A]',
    badgeBg: 'bg-[#D4AF6A]/15 text-[#E5C687] border-[#D4AF6A]/40',
    dotColor: 'bg-[#D4AF6A]',
  },
  C: {
    badge: 'C 情绪拔高',
    subtitle: '眼神锁定镜头 · 金句收尾引发转发',
    borderColor: 'border-l-[#E0523C]',
    badgeBg: 'bg-[#C83E2B]/20 text-[#FF8A75] border-[#E0523C]/50',
    dotColor: 'bg-[#E0523C]',
  },
};

function parseCueBadges(cueText: string): CueMeta[] {
  if (!cueText) return [];
  const matches = cueText.match(/【[^】]+】/g) || [];
  const result: CueMeta[] = [];
  const seen = new Set<string>();

  for (const token of matches) {
    if (seen.has(token)) continue;
    seen.add(token);
    if (CUE_DICTIONARY[token]) {
      result.push(CUE_DICTIONARY[token]);
    } else {
      result.push({
        code: token,
        label: token.replace(/【|】/g, ''),
        shortTag: token.replace(/【|】/g, ''),
        className: 'bg-stone-700/60 text-stone-200 border border-stone-500/40',
      });
    }
  }

  const Remainder = cueText.replace(/【[^】]+】/g, '').trim();
  if (Remainder) {
    result.push({
      code: Remainder,
      label: Remainder,
      shortTag: Remainder,
      className: 'bg-stone-800/80 text-stone-300 border border-stone-600/40',
    });
  }

  return result;
}

function renderSpokenTextWithInlineCues(text: string): React.ReactNode {
  const parts = text.split(/(【[^】]+】)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('【') && part.endsWith('】')) {
      const meta = CUE_DICTIONARY[part];
      if (meta) {
        return (
          <span
            key={idx}
            className={`inline-flex items-center mx-1.5 px-2.5 py-0.5 rounded-full text-[0.46em] font-sans font-semibold tracking-wider align-middle select-none ${meta.className}`}
          >
            {meta.label}
          </span>
        );
      }
      return (
        <span
          key={idx}
          className="inline-flex items-center mx-1.5 px-2.5 py-0.5 rounded-full text-[0.46em] font-sans font-semibold tracking-wider align-middle bg-amber-500/20 text-amber-200 border border-amber-400/40 select-none"
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const CinemaTeleprompter: React.FC<CinemaTeleprompterProps> = ({
  draft,
  brandTitle,
  onClose,
}) => {
  // Teleprompter playback & layout states
  const [isPlaying, setIsPlaying] = useState(false);
  const [charsPerSec, setCharsPerSec] = useState<number>(6.8);
  const [fontSize, setFontSize] = useState<number>(42);
  const [columnWidth, setColumnWidth] = useState<number>(820);
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [activeBeatIndex, setActiveBeatIndex] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Countdown & Take Timer states
  const [countdown, setCountdown] = useState<number | null>(null);
  const [takeCount, setTakeCount] = useState<number>(1);
  const [takeElapsedMs, setTakeElapsedMs] = useState<number>(0);

  // Live Camera PIP states
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(false);
  const [cameraAspect, setCameraAspect] = useState<'9:16' | '16:9'>('9:16');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pipPosition, setPipPosition] = useState<{ x: number; y: number }>({
    x: 28,
    y: 96,
  });
  const [isDraggingPip, setIsDraggingPip] = useState<boolean>(false);

  // Refs for smooth 60fps scrolling & media
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const subPixelScrollRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const beatRefs = useRef<Array<HTMLDivElement | null>>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dragOffsetRef = useRef<{ startX: number; startY: number; origX: number; origY: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // Total character count (excluding cue brackets)
  const totalScriptChars = useMemo(() => {
    return draft.beats.reduce((acc, beat) => {
      const clean = beat.spokenText.replace(/【[^】]+】/g, '').trim();
      return acc + clean.length;
    }, 0);
  }, [draft.beats]);

  const estimatedTotalSeconds = useMemo(() => {
    return Math.max(5, Math.round(totalScriptChars / charsPerSec));
  }, [totalScriptChars, charsPerSec]);

  const remainingSeconds = useMemo(() => {
    return Math.max(0, Math.round(estimatedTotalSeconds * (1 - scrollProgress / 100)));
  }, [estimatedTotalSeconds, scrollProgress]);

  // Update active beat & progress on scroll
  const handleScrollUpdate = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    const current = el.scrollTop;
    const pct = Math.min(100, Math.max(0, (current / maxScroll) * 100));
    setScrollProgress(pct);

    // Determine which beat aligns with the 32% eye-line focus band
    const containerRect = el.getBoundingClientRect();
    const eyeLineY = containerRect.top + containerRect.height * 0.32;

    let closestIdx = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    beatRefs.current.forEach((node, idx) => {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      // If eyeLineY is inside the beat, pick it immediately
      if (eyeLineY >= rect.top - 24 && eyeLineY <= rect.bottom + 24) {
        closestIdx = idx;
        minDistance = 0;
      } else if (minDistance > 0) {
        const center = (rect.top + rect.bottom) / 2;
        const dist = Math.abs(center - eyeLineY);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      }
    });

    setActiveBeatIndex(closestIdx);
  }, []);

  // 60fps requestAnimationFrame auto-scroll loop
  useEffect(() => {
    if (!isPlaying) {
      lastFrameTimeRef.current = null;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const container = scrollContainerRef.current;
    if (container) {
      subPixelScrollRef.current = container.scrollTop;
    }

    const step = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }
      const deltaMs = Math.min(64, timestamp - lastFrameTimeRef.current);
      lastFrameTimeRef.current = timestamp;

      const el = scrollContainerRef.current;
      if (el) {
        const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
        // Compute exact pixel/sec speed so total scrollable distance matches totalScriptChars / charsPerSec
        // Fallback minimum speed ensures smooth motion even on short drafts
        const totalDurationSec = Math.max(6, totalScriptChars / charsPerSec);
        const calibratedPxPerSec = Math.max(
          charsPerSec * (fontSize * 0.22),
          maxScroll / totalDurationSec
        );

        subPixelScrollRef.current += (calibratedPxPerSec * deltaMs) / 1000;
        el.scrollTop = subPixelScrollRef.current;

        if (subPixelScrollRef.current >= maxScroll - 1) {
          setIsPlaying(false);
          return;
        }
      }

      setTakeElapsedMs((prev) => prev + deltaMs);
      rafIdRef.current = requestAnimationFrame(step);
    };

    rafIdRef.current = requestAnimationFrame(step);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying, charsPerSec, fontSize, totalScriptChars]);

  // 3-2-1 Countdown sequence
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      setIsPlaying(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 850);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const handleStartCountdownTake = useCallback(() => {
    setIsPlaying(false);
    const el = scrollContainerRef.current;
    if (el && el.scrollTop >= el.scrollHeight - el.clientHeight - 20) {
      el.scrollTop = 0;
      subPixelScrollRef.current = 0;
    }
    setTakeElapsedMs(0);
    setCountdown(3);
  }, []);

  const handleResetToTop = useCallback(() => {
    setIsPlaying(false);
    setCountdown(null);
    setTakeElapsedMs(0);
    setTakeCount((c) => c + 1);
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
      subPixelScrollRef.current = 0;
    }
    setScrollProgress(0);
    setActiveBeatIndex(0);
  }, []);

  // Keyboard shortcuts: Space play/pause, ArrowUp/ArrowDown speed, R reset, M mirror, Esc close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setCountdown(null);
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setCharsPerSec((prev) => Math.min(12.0, Number((prev + 0.4).toFixed(1))));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setCharsPerSec((prev) => Math.max(3.0, Number((prev - 0.4).toFixed(1))));
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleResetToTop();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMirrored((prev) => !prev);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleResetToTop, onClose]);

  // Camera PIP lifecycle
  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const toggleCameraPip = useCallback(async () => {
    if (cameraEnabled) {
      stopCameraStream();
      setCameraEnabled(false);
      setCameraError(null);
      return;
    }

    setCameraEnabled(true);
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('当前浏览器环境未挂载物理摄像头，已切换为标准黄金构图参考线模式');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraError('未授予摄像头权限或无可用设备 · 已启用标准人像构图标尺');
    }
  }, [cameraEnabled, stopCameraStream]);

  useEffect(() => {
    if (cameraEnabled && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraEnabled, cameraAspect]);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // PIP Drag handlers
  const handlePipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPip(true);
    dragOffsetRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pipPosition.x,
      origY: pipPosition.y,
    };
  };

  useEffect(() => {
    if (!isDraggingPip) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragOffsetRef.current.startX;
      const dy = e.clientY - dragOffsetRef.current.startY;
      setPipPosition({
        x: Math.max(16, Math.min(window.innerWidth - 260, dragOffsetRef.current.origX - dx)),
        y: Math.max(76, Math.min(window.innerHeight - 280, dragOffsetRef.current.origY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingPip(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPip]);

  const formatTimer = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins}:${secs}.${tenths}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D0D0C] text-[#F5F2EB] flex flex-col select-none overflow-hidden">
      {/* Top Progress Bar */}
      <div className="h-1 w-full bg-white/5 relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#C83E2B] via-[#D4AF6A] to-emerald-400 transition-[width] duration-75"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Studio Top Control Bar */}
      <header className="px-6 py-3.5 bg-[#141412]/95 border-b border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 z-30">
        {/* Left: Brand & Script Meta */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPlaying
                  ? 'bg-[#E0523C] animate-pulse shadow-[0_0_10px_#E0523C]'
                  : 'bg-amber-400/80'
              }`}
            />
            <span className="font-mono-num text-xs tracking-widest uppercase text-stone-300">
              {isPlaying ? 'ON AIR · 提词滚屏中' : 'STUDIO STANDBY'}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span className="font-semibold text-[#D4AF6A]">{brandTitle}</span>
              <span>·</span>
              <span>TAKE #{String(takeCount).padStart(2, '0')}</span>
              <span>·</span>
              <span className="font-mono-num text-stone-300">
                已录 {formatTimer(takeElapsedMs)}
              </span>
              <span>·</span>
              <span className="font-mono-num text-emerald-400">
                预计剩余 {remainingSeconds}s
              </span>
            </div>
            <h2 className="text-sm font-medium text-[#F5F2EB] truncate max-w-md">
              {draft.title}
            </h2>
          </div>
        </div>

        {/* Center: Primary Transport & Sliders */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 3-2-1 Slate Take Button */}
          <button
            type="button"
            onClick={handleStartCountdownTake}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#C83E2B] hover:bg-[#d94834] text-white shadow-sm transition cursor-pointer"
            title="3-2-1 倒计时打板开拍"
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>3-2-1 开拍</span>
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={() => {
              setCountdown(null);
              setIsPlaying((p) => !p);
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                : 'bg-[#F5F2EB] text-[#0D0D0C] hover:bg-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>暂停 (Space)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>滚屏 (Space)</span>
              </>
            )}
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleResetToTop}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] text-stone-200 border border-white/10 transition cursor-pointer"
            title="回到顶部并开启新一条 Take (快捷键 R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重录 (R)</span>
          </button>

          <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Speed Slider (3.0 - 12.0 chars/sec) */}
          <div className="flex items-center gap-2 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/10">
            <Gauge className="w-3.5 h-3.5 text-[#D4AF6A]" />
            <span className="text-[11px] text-stone-400">语速</span>
            <input
              type="range"
              min={3.0}
              max={12.0}
              step={0.2}
              value={charsPerSec}
              onChange={(e) => setCharsPerSec(parseFloat(e.target.value))}
              className="w-20 accent-[#D4AF6A] cursor-pointer"
            />
            <span className="font-mono-num text-xs font-semibold text-[#F5F2EB] w-16 text-right">
              {charsPerSec.toFixed(1)} 字/秒
            </span>
          </div>

          {/* Font Size Slider (28px - 64px) */}
          <div className="flex items-center gap-2 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/10">
            <Type className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[11px] text-stone-400">字号</span>
            <input
              type="range"
              min={28}
              max={64}
              step={2}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              className="w-16 accent-[#D4AF6A] cursor-pointer"
            />
            <span className="font-mono-num text-xs text-stone-200 w-9 text-right">
              {fontSize}px
            </span>
          </div>

          {/* Reading Column Width Slider */}
          <div className="hidden xl:flex items-center gap-2 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/10">
            <MoveHorizontal className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[11px] text-stone-400">行宽</span>
            <input
              type="range"
              min={540}
              max={1080}
              step={20}
              value={columnWidth}
              onChange={(e) => setColumnWidth(parseInt(e.target.value, 10))}
              className="w-16 accent-[#D4AF6A] cursor-pointer"
            />
            <span className="font-mono-num text-xs text-stone-200 w-12 text-right">
              {columnWidth}px
            </span>
          </div>
        </div>

        {/* Right: Mirror Flip + Camera PIP + Exit */}
        <div className="flex items-center gap-2.5">
          {/* Mirror Flip Toggle */}
          <button
            type="button"
            onClick={() => setIsMirrored((m) => !m)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
              isMirrored
                ? 'bg-[#D4AF6A]/20 text-[#E5C687] border-[#D4AF6A]/50'
                : 'bg-white/[0.05] text-stone-300 border-white/10 hover:bg-white/[0.1]'
            }`}
            title="分光镜物理提词器水平镜像翻转 (快捷键 M)"
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
            <span>{isMirrored ? '已镜像翻转' : '分光镜镜像'}</span>
          </button>

          {/* Camera Framing PIP Toggle */}
          <button
            type="button"
            onClick={toggleCameraPip}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
              cameraEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                : 'bg-white/[0.05] text-stone-300 border-white/10 hover:bg-white/[0.1]'
            }`}
          >
            {cameraEnabled ? (
              <>
                <CameraOff className="w-3.5 h-3.5" />
                <span>关闭构图自检</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>📷 开启镜头构图自检</span>
              </>
            )}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-400/40 text-stone-300 border border-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>退出 (Esc)</span>
          </button>
        </div>
      </header>

      {/* Main Teleprompter Viewport */}
      <div className="relative flex-1 overflow-hidden">
        {/* Top & Bottom Soft Darkroom Vignettes */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 z-20"
          style={{
            background:
              'linear-gradient(to bottom, rgba(13,13,12,0.96) 0%, rgba(13,13,12,0.65) 55%, rgba(13,13,12,0) 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 z-20"
          style={{
            background:
              'linear-gradient(to top, rgba(13,13,12,0.98) 0%, rgba(13,13,12,0.72) 55%, rgba(13,13,12,0) 100%)',
          }}
        />

        {/* Eye-line Focus Band (~32% from top) */}
        <div
          className="pointer-events-none absolute inset-x-0 z-10 flex items-center justify-between px-6"
          style={{
            top: '24%',
            height: '18%',
            background:
              'linear-gradient(90deg, rgba(212,175,106,0.06) 0%, rgba(212,175,106,0.09) 50%, rgba(212,175,106,0.06) 100%)',
            borderTop: '1px solid rgba(212, 175, 106, 0.28)',
            borderBottom: '1px solid rgba(212, 175, 106, 0.28)',
          }}
        >
          <div className="flex items-center gap-2 text-[#D4AF6A]/85 text-xs font-mono-num tracking-wider">
            <Eye className="w-3.5 h-3.5" />
            <span>◀ 眼神平视锁定带 · 32% 黄金机位线</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[#D4AF6A]/70 text-xs font-mono-num tracking-wider">
            <span>视线保持在此区域，无需低头看稿 ▶</span>
          </div>
        </div>

        {/* 3-2-1 Studio Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-36 h-36 rounded-full border-2 border-[#D4AF6A] flex items-center justify-center bg-[#141412] shadow-[0_0_60px_rgba(212,175,106,0.3)]">
              <span className="font-mono-num text-7xl font-bold text-[#F5F2EB]">
                {countdown}
              </span>
            </div>
            <p className="mt-5 text-sm tracking-widest uppercase text-[#D4AF6A] font-semibold">
              眼神锁定镜头上方 32% 基准线 · 深呼吸准备开讲
            </p>
            <p className="mt-1.5 text-xs text-stone-400">
              TAKE #{String(takeCount).padStart(2, '0')} · {draft.title}
            </p>
          </div>
        )}

        {/* Live Camera Framing PIP Floating Window */}
        {cameraEnabled && (
          <div
            style={{
              right: `${pipPosition.x}px`,
              top: `${pipPosition.y}px`,
              width: cameraAspect === '9:16' ? '220px' : '320px',
            }}
            className="fixed z-30 rounded-2xl bg-[#161614]/95 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-md"
          >
            {/* PIP Header Bar (Draggable) */}
            <div
              onMouseDown={handlePipMouseDown}
              className="px-3 py-2 bg-black/60 border-b border-white/10 flex items-center justify-between cursor-move"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-300">
                <Move className="w-3 h-3 text-[#D4AF6A]" />
                <span>镜头构图自检</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCameraAspect('9:16')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono-num inline-flex items-center gap-1 cursor-pointer ${
                    cameraAspect === '9:16'
                      ? 'bg-[#D4AF6A] text-stone-950 font-semibold'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-2.5 h-2.5" />
                  9:16
                </button>
                <button
                  type="button"
                  onClick={() => setCameraAspect('16:9')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono-num inline-flex items-center gap-1 cursor-pointer ${
                    cameraAspect === '16:9'
                      ? 'bg-[#D4AF6A] text-stone-950 font-semibold'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-2.5 h-2.5" />
                  16:9
                </button>
              </div>
            </div>

            {/* PIP Viewport with Rule-of-Thirds & Head/Shoulder Guides */}
            <div
              className={`relative w-full bg-[#0A0A09] overflow-hidden ${
                cameraAspect === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]'
              }`}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Fallback studio framing silhouette when camera permission is unavailable */}
              {cameraError && (
                <div className="absolute inset-0 bg-gradient-to-b from-[#171614] via-[#121110] to-[#0B0B0A] flex flex-col items-center justify-between p-3 text-center">
                  <span className="text-[10px] text-[#D4AF6A] bg-[#D4AF6A]/10 border border-[#D4AF6A]/30 px-2 py-0.5 rounded-full">
                    标准人像机位标尺
                  </span>
                  <p className="text-[10px] text-stone-400 leading-relaxed px-2">
                    {cameraError}
                  </p>
                </div>
              )}

              {/* Rule of Thirds Grid + Headroom & Shoulder Guide Overlay */}
              <div className="pointer-events-none absolute inset-0">
                {/* Vertical Thirds */}
                <div className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-white/15" />
                {/* Horizontal Thirds */}
                <div className="absolute inset-x-0 top-1/3 h-px bg-white/15" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-white/15" />

                {/* 32% Eye-Line Laser Guide */}
                <div
                  className="absolute inset-x-0 border-t border-dashed border-[#D4AF6A]/80 flex justify-between px-2"
                  style={{ top: '32%' }}
                >
                  <span className="text-[9px] font-mono-num text-[#D4AF6A] bg-black/60 px-1 rounded -mt-2">
                    EYE 32%
                  </span>
                </div>

                {/* Head & Shoulders Framing SVG Guide */}
                <svg
                  viewBox="0 0 200 260"
                  className="w-full h-full opacity-55"
                  preserveAspectRatio="xMidYMid slice"
                >
                  {/* Top headroom bracket */}
                  <line
                    x1="60"
                    y1="26"
                    x2="140"
                    y2="26"
                    stroke="#34D399"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                  />
                  {/* Head oval */}
                  <ellipse
                    cx="100"
                    cy="84"
                    rx="32"
                    ry="42"
                    fill="none"
                    stroke="#D4AF6A"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                  />
                  {/* Shoulders curve */}
                  <path
                    d="M 28 245 C 34 168, 66 146, 100 146 C 134 146, 166 168, 172 245"
                    fill="none"
                    stroke="#D4AF6A"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                  />
                </svg>
              </div>
            </div>

            <div className="px-3 py-1.5 bg-black/75 border-t border-white/10 flex items-center justify-between text-[10px] text-stone-400">
              <span>头顶留白 10% · 双眼压 32% 线</span>
              <span className="text-emerald-400 font-mono-num">{cameraAspect}</span>
            </div>
          </div>
        )}

        {/* Scrollable Teleprompter Script Canvas */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScrollUpdate}
          className={`h-full overflow-y-auto px-6 md:px-12 transition-transform duration-300 ${
            isMirrored ? 'scale-x-[-1]' : ''
          }`}
        >
          {/* Top Padding so Beat 1 starts right inside the 32% Eye-Line Focus Band */}
          <div className="h-[26vh]" />

          <div
            className="mx-auto space-y-8"
            style={{ maxWidth: `${columnWidth + 280}px` }}
          >
            {/* Boss Voice Note Reminder Banner if present */}
            {draft.bossVoiceNote && (
              <div className="rounded-2xl bg-white/[0.03] border border-[#D4AF6A]/30 px-6 py-4 flex items-start gap-3.5">
                <Sparkles className="w-5 h-5 text-[#D4AF6A] shrink-0 mt-0.5" />
                <div className="text-sm text-stone-300 leading-relaxed">
                  <span className="font-semibold text-[#D4AF6A] mr-2">
                    [老板原声底色提醒]
                  </span>
                  {draft.bossVoiceNote}
                </div>
              </div>
            )}

            {/* Script Beats */}
            {draft.beats.map((beat, idx) => {
              const stageMeta = EMOTION_STAGE_META[beat.emotionStage] || EMOTION_STAGE_META.A;
              const cueBadges = parseCueBadges(beat.deliveryCue);
              const isActive = idx === activeBeatIndex;

              return (
                <div
                  key={beat.id}
                  ref={(el) => {
                    beatRefs.current[idx] = el;
                  }}
                  onClick={() => {
                    const node = beatRefs.current[idx];
                    const container = scrollContainerRef.current;
                    if (node && container) {
                      const targetTop =
                        node.offsetTop - container.clientHeight * 0.28;
                      container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
                      subPixelScrollRef.current = Math.max(0, targetTop);
                    }
                  }}
                  className={`group rounded-2xl border-l-4 transition-all duration-300 cursor-pointer ${
                    stageMeta.borderColor
                  } ${
                    isActive
                      ? 'bg-white/[0.055] border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.65)] opacity-100 scale-[1.01]'
                      : 'bg-white/[0.015] border border-white/[0.05] opacity-45 hover:opacity-75'
                  }`}
                >
                  <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-6 lg:items-start">
                    {/* Left Main Reading Column */}
                    <div
                      className="flex-1 min-w-0"
                      style={{ maxWidth: `${columnWidth}px` }}
                    >
                      {/* Beat Header: Index + Section + Emotion Stage + Delivery Cues */}
                      <div className="flex flex-wrap items-center gap-2.5 mb-4">
                        <span className="font-mono-num text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-stone-300">
                          BEAT 0{idx + 1}
                        </span>
                        <span className="text-xs font-semibold tracking-wide text-stone-300 uppercase">
                          {beat.section}
                        </span>

                        {/* Emotion Stage Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${stageMeta.badgeBg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${stageMeta.dotColor}`} />
                          {stageMeta.badge}
                        </span>

                        {/* Parsed Director Cue Chips */}
                        {cueBadges.map((cue, cIdx) => (
                          <span
                            key={cIdx}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${cue.className}`}
                          >
                            {cue.label}
                          </span>
                        ))}
                      </div>

                      {/* Main Spoken Script Text */}
                      <div
                        style={{
                          fontSize: `${fontSize}px`,
                          lineHeight: 1.52,
                        }}
                        className="font-medium tracking-tight text-[#F5F2EB] break-words"
                      >
                        {renderSpokenTextWithInlineCues(beat.spokenText)}
                      </div>
                    </div>

                    {/* Right Rail: Visual Cue (B-Roll / Action) & Cited Wiki Card */}
                    <aside className="lg:w-64 shrink-0 rounded-xl bg-black/45 border border-white/10 p-4 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-mono-num uppercase tracking-wider text-[#D4AF6A]">
                        <span className="inline-flex items-center gap-1.5">
                          <MonitorPlay className="w-3.5 h-3.5" />
                          画面与手势提示
                        </span>
                        <span>B-ROLL</span>
                      </div>

                      <p className="text-xs text-stone-200 leading-relaxed font-normal">
                        {beat.visualCue}
                      </p>

                      <div className="pt-2 border-t border-white/10 text-[11px] text-stone-400">
                        {stageMeta.subtitle}
                      </div>

                      {beat.citedCard && (
                        <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 text-[11px] text-emerald-300">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">证据卡：{beat.citedCard}</span>
                        </div>
                      )}
                    </aside>
                  </div>
                </div>
              );
            })}

            {/* End of Script Slate */}
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF6A]/15 text-[#D4AF6A] text-xs font-medium">
                <span>🎬 口播收尾定格 · 保持眼神微笑 1.5 秒再按停止</span>
              </div>
              <p className="text-xs text-stone-400">
                全稿共 {totalScriptChars} 字 · 评论区置顶钩子：{draft.pinnedCommentCta}
              </p>
            </div>
          </div>

          {/* Bottom Padding so final beat can scroll smoothly through the 32% Eye-Line */}
          <div className="h-[62vh]" />
        </div>
      </div>

      {/* Bottom Keyboard Shortcuts & Quick Beat Jump Footer */}
      <footer className="px-6 py-2.5 bg-[#141412] border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400 z-30">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-stone-500">段落速跳：</span>
          {draft.beats.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                const node = beatRefs.current[i];
                const container = scrollContainerRef.current;
                if (node && container) {
                  const targetTop = node.offsetTop - container.clientHeight * 0.28;
                  container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
                  subPixelScrollRef.current = Math.max(0, targetTop);
                }
              }}
              className={`px-2.5 py-1 rounded-md text-xs transition cursor-pointer ${
                i === activeBeatIndex
                  ? 'bg-[#D4AF6A] text-stone-950 font-semibold'
                  : 'bg-white/[0.05] text-stone-300 hover:bg-white/[0.1]'
              }`}
            >
              0{i + 1} · {b.section}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 font-mono-num text-[11px] text-stone-400">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-stone-200">Space</kbd>
            播放/暂停
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-stone-200 inline-flex items-center">
              <ChevronUp className="w-3 h-3" />
              <ChevronDown className="w-3 h-3" />
            </kbd>
            微调语速
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-stone-200">M</kbd>
            镜像翻转
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-stone-200">R</kbd>
            回到片头
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-stone-200">Esc</kbd>
            退出暗房
          </span>
        </div>
      </footer>
    </div>
  );
};

export default CinemaTeleprompter;
