import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Network,
  LayoutGrid,
  ShieldAlert,
  Plus,
  X,
  Save,
  Loader2,
  Link2,
  Check,
} from 'lucide-react';
import type { WikiCard, WikiCardCategory, WorkspaceProfile } from '../types';

interface Props {
  profile: WorkspaceProfile;
  cards: WikiCard[];
  selectedModel: string;
  initialFocusSlug?: string | null;
  onCardAdded: (card: WikiCard) => void;
  onCardUpdated: (card: WikiCard) => void;
  onForbiddenWordsUpdated: (words: string[]) => void;
}

const CATEGORY_META: Record<
  WikiCardCategory,
  { label: string; badgeBg: string; dotColor: string }
> = {
  voice: {
    label: '立场口吻',
    badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
    dotColor: '#B45309',
  },
  case: {
    label: '客户案例',
    badgeBg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    dotColor: '#047857',
  },
  faq: {
    label: '高频问答',
    badgeBg: 'bg-sky-50 text-sky-900 border-sky-200',
    dotColor: '#0369A1',
  },
  offer: {
    label: '产品报价',
    badgeBg: 'bg-rose-50 text-rose-900 border-rose-200',
    dotColor: '#BE123C',
  },
};

const SAMPLE_MEMOS: Record<string, string> = {
  'd2-studio':
    '刚跟一位做连锁口腔门诊的老板聊完，他们花三万请代运营拍段子播放几十万但零预约。我直接告诉他：把院长每天接诊遇到的真实矫正顾虑录成60秒语音喂进私有大脑，每天发一条专业口播+小红书对比图，来15个精准咨询就回本十倍了。',
  'sartoria-image':
    '今天下午给一位准备去香港路演的生物医药男创始人做了试装。他以前总穿紧身亮面藏蓝西装，我们撤掉领带换成无结构深咖羊绒单西配燕麦针织衫，镜头前松弛感一下出来了，当场签了6.8万全年衣橱托管。',
  'apex-trade':
    '复盘波兰建材批发商返单：第一封信先点出对方官网刚上的静音木饰面缺配套收边条，给500/2000/5000三档阶梯价并寄打好Logo色卡的实木小样，客户第三天打样费到账。',
};

export const LivingBrainView: React.FC<Props> = ({
  profile,
  cards,
  selectedModel,
  initialFocusSlug,
  onCardAdded,
  onCardUpdated,
  onForbiddenWordsUpdated,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid');
  const [catFilter, setCatFilter] = useState<WikiCardCategory | 'all'>('all');
  const [rawMemo, setRawMemo] = useState<string>('');
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [ingestFeedback, setIngestFeedback] = useState<string>('');

  const [activeSlug, setActiveSlug] = useState<string | null>(
    initialFocusSlug || cards[0]?.slug || null
  );
  const [editingContent, setEditingContent] = useState<string>('');
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [editingSummary, setEditingSummary] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [savingCard, setSavingCard] = useState<boolean>(false);

  const [newForbiddenWord, setNewForbiddenWord] = useState<string>('');

  const activeCard = useMemo(
    () => cards.find((c) => c.slug === activeSlug) || cards[0] || null,
    [cards, activeSlug]
  );

  React.useEffect(() => {
    if (initialFocusSlug) setActiveSlug(initialFocusSlug);
  }, [initialFocusSlug]);

  React.useEffect(() => {
    if (activeCard) {
      setEditingTitle(activeCard.title);
      setEditingSummary(activeCard.summary);
      setEditingContent(activeCard.content);
      setIsDirty(false);
    }
  }, [activeCard?.slug]);

  const filteredCards = useMemo(() => {
    if (catFilter === 'all') return cards;
    return cards.filter((c) => c.category === catFilter);
  }, [cards, catFilter]);

  const graphNodes = useMemo(() => {
    const cx = 380;
    const cy = 220;
    const n = cards.length || 1;
    return cards.map((card, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const radiusX = i % 2 === 0 ? 245 : 155;
      const radiusY = i % 2 === 0 ? 155 : 105;
      return {
        card,
        x: cx + Math.cos(angle) * radiusX,
        y: cy + Math.sin(angle) * radiusY,
      };
    });
  }, [cards]);

  const graphEdges = useMemo(() => {
    const posMap = new Map(graphNodes.map((gn) => [gn.card.slug, gn]));
    const edges: Array<{ from: string; to: string; x1: number; y1: number; x2: number; y2: number }> =
      [];
    for (const gn of graphNodes) {
      for (const targetSlug of gn.card.links) {
        const target = posMap.get(targetSlug);
        if (target) {
          edges.push({
            from: gn.card.slug,
            to: targetSlug,
            x1: gn.x,
            y1: gn.y,
            x2: target.x,
            y2: target.y,
          });
        }
      }
    }
    return edges;
  }, [graphNodes]);

  const handleIngestMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawMemo.trim()) return;
    setIngesting(true);
    setIngestFeedback('');
    try {
      const res = await fetch('/api/brain/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: profile.id,
          rawInput: rawMemo.trim(),
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.card) throw new Error(data.error || '抽卡失败');
      onCardAdded(data.card);
      setActiveSlug(data.card.slug);
      setRawMemo('');
      setIngestFeedback(`已入库：${data.card.title}`);
    } catch (err) {
      setIngestFeedback(err instanceof Error ? err.message : '抽卡异常');
    } finally {
      setIngesting(false);
    }
  };

  const handleSaveCard = async () => {
    if (!activeCard) return;
    setSavingCard(true);
    try {
      const updated: WikiCard = {
        ...activeCard,
        title: editingTitle,
        summary: editingSummary,
        content: editingContent,
      };
      const res = await fetch(`/api/brain/cards/${activeCard.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: profile.id, card: updated }),
      });
      if (res.ok) {
        onCardUpdated(updated);
        setIsDirty(false);
      }
    } finally {
      setSavingCard(false);
    }
  };

  const handleAddForbidden = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = newForbiddenWord.trim();
    if (!w) return;
    const next = Array.from(new Set([...profile.forbiddenWords, w]));
    setNewForbiddenWord('');
    await fetch('/api/workspace/forbidden-words', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: profile.id, words: next }),
    });
    onForbiddenWordsUpdated(next);
  };

  const handleRemoveForbidden = async (w: string) => {
    const next = profile.forbiddenWords.filter((x) => x !== w);
    await fetch('/api/workspace/forbidden-words', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: profile.id, words: next }),
    });
    onForbiddenWordsUpdated(next);
  };

  return (
    <div className="space-y-5">
      {/* Crisp Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
        <div>
          <p className="text-xs font-medium text-[var(--ink-muted)]">
            共 {cards.length} 张私有双链知识卡 · 本地 Markdown 实时同步
          </p>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-[var(--ink-primary)]">
            业务大脑
          </h1>
        </div>

        <div className="inline-flex rounded-xl bg-[var(--bg-subtle)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white shadow-2xs text-[var(--ink-primary)]'
                : 'text-[var(--ink-secondary)]'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            卡片库
          </button>
          <button
            type="button"
            onClick={() => setViewMode('graph')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold cursor-pointer ${
              viewMode === 'graph'
                ? 'bg-white shadow-2xs text-[var(--ink-primary)]'
                : 'text-[var(--ink-secondary)]'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            双链星图
          </button>
        </div>
      </header>

      {/* Compact Quick Capture Strip */}
      <form
        onSubmit={handleIngestMemo}
        className="rounded-2xl border border-[var(--border-strong)] bg-white p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <input
          type="text"
          value={rawMemo}
          onChange={(e) => setRawMemo(e.target.value)}
          placeholder="随手记一条见客案例、客户提问或核心观点，AI 自动脱敏并抽成双链卡片…"
          className="flex-1 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] px-2 py-1.5 focus:outline-none"
        />
        <div className="flex items-center gap-2 shrink-0">
          {ingestFeedback && (
            <span className="text-xs text-emerald-800 flex items-center gap-1 mr-1">
              <Check className="h-3.5 w-3.5" />
              {ingestFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={() => setRawMemo(SAMPLE_MEMOS[profile.id] || SAMPLE_MEMOS['d2-studio'])}
            className="rounded-lg bg-[var(--bg-subtle)] px-2.5 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
          >
            示例
          </button>
          <button
            type="submit"
            disabled={ingesting || !rawMemo.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-accent)' }}
          >
            {ingesting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            抽取入库
          </button>
        </div>
      </form>

      {/* Main Split: Left Cards/Graph + Right Clean Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCatFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                catFilter === 'all'
                  ? 'bg-[var(--ink-primary)] text-white'
                  : 'bg-white border border-[var(--border-hairline)] text-[var(--ink-secondary)]'
              }`}
            >
              全部 ({cards.length})
            </button>
            {(Object.keys(CATEGORY_META) as WikiCardCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  catFilter === cat
                    ? 'bg-[var(--ink-primary)] text-white'
                    : 'bg-white border border-[var(--border-hairline)] text-[var(--ink-secondary)]'
                }`}
              >
                {CATEGORY_META[cat].label} ({cards.filter((c) => c.category === cat).length})
              </button>
            ))}
          </div>

          {viewMode === 'graph' ? (
            <div className="rounded-2xl border border-[var(--border-strong)] bg-[#151412] text-[#F5F2EB] p-4">
              <div className="flex items-center justify-end gap-4 text-[11px] text-stone-400 px-2">
                {(Object.keys(CATEGORY_META) as WikiCardCategory[]).map((cat) => (
                  <span key={cat} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_META[cat].dotColor }}
                    />
                    {CATEGORY_META[cat].label}
                  </span>
                ))}
              </div>
              <svg viewBox="0 0 760 440" className="w-full h-[410px] select-none">
                {graphEdges.map((edge, idx) => {
                  const highlighted =
                    activeCard &&
                    (edge.from === activeCard.slug || edge.to === activeCard.slug);
                  return (
                    <line
                      key={idx}
                      x1={edge.x1}
                      y1={edge.y1}
                      x2={edge.x2}
                      y2={edge.y2}
                      stroke={highlighted ? '#F59E0B' : 'rgba(255,255,255,0.14)'}
                      strokeWidth={highlighted ? 2 : 1}
                    />
                  );
                })}
                {graphNodes.map((gn) => {
                  const isSelected = activeCard?.slug === gn.card.slug;
                  const isNeighbor = activeCard?.links.includes(gn.card.slug);
                  const color = CATEGORY_META[gn.card.category].dotColor;
                  return (
                    <g
                      key={gn.card.slug}
                      onClick={() => setActiveSlug(gn.card.slug)}
                      className="cursor-pointer"
                    >
                      {isSelected && (
                        <circle
                          cx={gn.x}
                          cy={gn.y}
                          r={18}
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                        />
                      )}
                      <circle
                        cx={gn.x}
                        cy={gn.y}
                        r={isSelected ? 11 : isNeighbor ? 9 : 7.5}
                        fill={color}
                        stroke="#FFF"
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <text
                        x={gn.x}
                        y={gn.y + 23}
                        textAnchor="middle"
                        fill={isSelected ? '#FCD34D' : '#D6D3D1'}
                        fontSize="11"
                        fontWeight={isSelected ? '700' : '500'}
                      >
                        {gn.card.title.slice(0, 11)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredCards.map((card) => {
                const meta = CATEGORY_META[card.category];
                const selected = activeCard?.slug === card.slug;
                return (
                  <button
                    key={card.slug}
                    type="button"
                    onClick={() => setActiveSlug(card.slug)}
                    className={`text-left rounded-2xl border p-4 transition cursor-pointer ${
                      selected
                        ? 'border-[var(--brand-accent)] bg-white shadow-sm'
                        : 'border-[var(--border-hairline)] bg-white/80 hover:bg-white hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${meta.badgeBg}`}
                      >
                        {meta.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ink-muted)]">
                        <Link2 className="h-3 w-3" /> {card.links.length}
                      </span>
                    </div>
                    <h3 className="mt-2.5 font-editorial text-base font-bold text-[var(--ink-primary)] leading-snug">
                      {card.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-[var(--ink-secondary)] line-clamp-2 leading-relaxed">
                      {card.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Clean Card Detail + Compact Forbidden Words Box */}
        <div className="lg:col-span-5 space-y-4">
          {activeCard && (
            <div className="rounded-2xl border border-[var(--border-strong)] bg-white p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                    CATEGORY_META[activeCard.category].badgeBg
                  }`}
                >
                  {CATEGORY_META[activeCard.category].label}
                </span>
                {isDirty && (
                  <button
                    type="button"
                    disabled={savingCard}
                    onClick={handleSaveCard}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--brand-accent)' }}
                  >
                    <Save className="h-3.5 w-3.5" />
                    保存修改
                  </button>
                )}
              </div>

              <input
                type="text"
                value={editingTitle}
                onChange={(e) => {
                  setEditingTitle(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full font-editorial text-xl font-bold text-[var(--ink-primary)] focus:outline-none"
              />

              <textarea
                rows={9}
                value={editingContent}
                onChange={(e) => {
                  setEditingContent(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/60 p-3.5 text-xs leading-relaxed text-[var(--ink-primary)] focus:bg-white focus:border-[var(--brand-accent)] focus:outline-none"
              />

              {activeCard.links.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-[var(--ink-muted)]">关联卡片：</span>
                  {activeCard.links.map((lk) => {
                    const linked = cards.find((c) => c.slug === lk);
                    return (
                      <button
                        key={lk}
                        type="button"
                        onClick={() => setActiveSlug(lk)}
                        className="rounded-md bg-[var(--bg-subtle)] px-2 py-1 text-xs text-[var(--ink-primary)] hover:text-[var(--brand-accent)] cursor-pointer"
                      >
                        {linked ? linked.title.slice(0, 12) : lk}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Compact Anti-Slop Blacklist */}
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ink-primary)] flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-[var(--brand-accent)]" />
                AI 腔禁用词自动拦截
              </span>
              <span className="text-[11px] text-[var(--ink-muted)]">
                {profile.forbiddenWords.length} 词生效中
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {profile.forbiddenWords.map((w) => (
                <span
                  key={w}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-xs text-[var(--ink-secondary)]"
                >
                  {w}
                  <button
                    type="button"
                    onClick={() => handleRemoveForbidden(w)}
                    className="hover:text-red-600 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <form onSubmit={handleAddForbidden} className="flex items-center gap-2">
              <input
                type="text"
                value={newForbiddenWord}
                onChange={(e) => setNewForbiddenWord(e.target.value)}
                placeholder="添加禁用词…"
                className="flex-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                <Plus className="h-3 w-3" /> 添加
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
