import React, { useMemo, useState } from 'react';
import {
  FolderKanban,
  Flame,
  Plus,
  Search,
  ExternalLink,
  Download,
  BookmarkPlus,
  Copy,
  Check,
  X,
  Save,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type {
  AccountMatrixItem,
  ContentVaultItem,
  HookAssetItem,
  VaultStatus,
  WorkspaceProfile,
} from '../types';

interface Props {
  profile: WorkspaceProfile;
  vaultItems: ContentVaultItem[];
  matrixAccounts: AccountMatrixItem[];
  hookAssets: HookAssetItem[];
  onSaveVaultItem: (item: ContentVaultItem) => Promise<void>;
  onAddHookAsset: (asset: HookAssetItem) => Promise<void>;
  onOpenDraftInStudio: (draftId: string) => void;
}

const STATUS_META: Record<VaultStatus, { label: string; badgeCls: string }> = {
  idea: {
    label: '待做灵感',
    badgeCls: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  writing: {
    label: '制作中',
    badgeCls: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  ready: {
    label: '待发布',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  published: {
    label: '已发归档',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};

const TEMPLATE_NAMES: Record<string, string> = {
  opinion: '观点反应型',
  'three-questions': '三问清单型',
  'pain-demo': '痛点实拍型',
};

const PLATFORM_COLORS: Record<string, string> = {
  抖音: '#D1432A',
  小红书: '#2166AC',
  视频号: '#1B9E77',
  公众号: '#C67608',
};

function proxyImg(url?: string, download = false, name = 'archive_cover'): string {
  if (!url) return '';
  const p = new URLSearchParams({ url });
  if (download) {
    p.set('download', '1');
    p.set('name', name);
  }
  return `/api/media/image?${p.toString()}`;
}

export const ContentVaultView: React.FC<Props> = ({
  profile,
  vaultItems,
  matrixAccounts,
  hookAssets,
  onSaveVaultItem,
  onAddHookAsset,
  onOpenDraftInStudio,
}) => {
  const [statusFilter, setStatusFilter] = useState<VaultStatus | 'all' | 'hits'>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [searchQ, setSearchQ] = useState<string>('');
  const [activeSubView, setActiveSubView] = useState<'vault' | 'hooks'>('vault');

  const [editingItem, setEditingItem] = useState<ContentVaultItem | null>(null);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string>('');

  const folders = useMemo(
    () => Array.from(new Set(vaultItems.map((x) => x.folder).filter(Boolean))),
    [vaultItems]
  );

  const filteredItems = useMemo(() => {
    return vaultItems.filter((it) => {
      if (statusFilter === 'hits') {
        if (it.status !== 'published' || it.selfOutlierRatio < 1.5) return false;
      } else if (statusFilter !== 'all' && it.status !== statusFilter) {
        return false;
      }
      if (folderFilter !== 'all' && it.folder !== folderFilter) return false;
      if (searchQ.trim()) {
        const hay = `${it.title} ${it.folder} ${it.hookLine} ${it.reviewNote}`.toLowerCase();
        if (!hay.includes(searchQ.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [vaultItems, statusFilter, folderFilter, searchQ]);

  // Template Formula Performance Induction (自动复盘归纳哪种题型最能打)
  const formulaStats = useMemo(() => {
    const pub = vaultItems.filter((v) => v.status === 'published');
    return (['opinion', 'three-questions', 'pain-demo'] as const).map((tpl) => {
      const sub = pub.filter((x) => x.templateType === tpl);
      const avgRatio =
        sub.length > 0
          ? +(sub.reduce((s, x) => s + x.selfOutlierRatio, 0) / sub.length).toFixed(2)
          : 0;
      const totalLeads = sub.reduce((s, x) => s + x.leadsCount, 0);
      return {
        tpl,
        label: TEMPLATE_NAMES[tpl],
        count: sub.length,
        avgRatio,
        totalLeads,
      };
    });
  }, [vaultItems]);

  const maxMatrixAvg = Math.max(...matrixAccounts.map((a) => a.avgViews), 1000);

  const handleCycleStatus = async (item: ContentVaultItem) => {
    const order: VaultStatus[] = ['idea', 'writing', 'ready', 'published'];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    await onSaveVaultItem({ ...item, status: next });
  };

  const handlePromoteHook = async (item: ContentVaultItem) => {
    if (!item.hookLine.trim()) return;
    await onAddHookAsset({
      id: `hk_${Date.now()}`,
      workspaceId: profile.id,
      hookType: item.templateType === 'opinion' ? '借权威反应' : '结果前置',
      content: item.hookLine,
      sourceTitle: item.title,
      effectScore: item.selfOutlierRatio >= 2 ? 5 : 4,
    });
    setCopiedId(`saved_${item.id}`);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleCreateBlankArchive = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const views = Number(fd.get('views') || 0);
    const status = (fd.get('status') as VaultStatus) || 'published';
    const avgBase = 8000;
    const newItem: ContentVaultItem = {
      id: `vault_${Date.now()}`,
      workspaceId: profile.id,
      title: String(fd.get('title') || ''),
      folder: String(fd.get('folder') || '日常归档'),
      platform: (fd.get('platform') as ContentVaultItem['platform']) || '抖音',
      format: (fd.get('format') as ContentVaultItem['format']) || '口播视频',
      templateType: (fd.get('templateType') as ContentVaultItem['templateType']) || 'opinion',
      status,
      publishDate: new Date().toISOString().slice(0, 10),
      views,
      likes: Number(fd.get('likes') || 0),
      collects: Number(fd.get('collects') || 0),
      shares: Number(fd.get('shares') || 0),
      leadsCount: Number(fd.get('leadsCount') || 0),
      selfOutlierRatio: views > 0 ? +(views / avgBase).toFixed(2) : 0,
      hookLine: String(fd.get('hookLine') || ''),
      reviewNote: String(fd.get('reviewNote') || ''),
    };
    await onSaveVaultItem(newItem);
    setShowNewModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
        <div>
          <p className="text-xs font-medium text-[var(--ink-muted)]">
            全生命周期内容资产归档 · 矩阵表现对比 · 爆款公式归纳
          </p>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-[var(--ink-primary)]">
            存档与复盘
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-[var(--bg-subtle)] p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveSubView('vault')}
              className={`rounded-lg px-3 py-1.5 font-semibold cursor-pointer ${
                activeSubView === 'vault'
                  ? 'bg-white text-[var(--ink-primary)] shadow-2xs'
                  : 'text-[var(--ink-secondary)]'
              }`}
            >
              内容存档库 ({vaultItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('hooks')}
              className={`rounded-lg px-3 py-1.5 font-semibold cursor-pointer ${
                activeSubView === 'hooks'
                  ? 'bg-white text-[var(--ink-primary)] shadow-2xs'
                  : 'text-[var(--ink-secondary)]'
              }`}
            >
              高转化开头库 ({hookAssets.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
            style={{ backgroundColor: 'var(--brand-accent)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            录入归档 / 复盘
          </button>
        </div>
      </header>

      {/* Top Dual Visual Analytics Row: Account Matrix Bar Chart + Formula Review Induction */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Account Matrix Comparison */}
        <div className="lg:col-span-7 rounded-2xl border border-[var(--border-hairline)] bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--ink-primary)]">
              账号矩阵条均曝光与获客对比
            </h2>
            <span className="text-[11px] text-[var(--ink-muted)]">
              共 {matrixAccounts.length} 个矩阵入口
            </span>
          </div>

          <div className="space-y-3">
            {matrixAccounts.map((acc) => {
              const barColor = PLATFORM_COLORS[acc.platform] || '#2166AC';
              const pct = Math.max(8, Math.round((acc.avgViews / maxMatrixAvg) * 100));
              return (
                <div key={acc.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: barColor }}
                      />
                      <span className="font-bold text-[var(--ink-primary)]">
                        {acc.platform} {acc.handle}
                      </span>
                      <span className="text-[var(--ink-muted)] truncate hidden sm:inline">
                        · {acc.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono-num shrink-0">
                      <span className="text-[var(--ink-secondary)]">
                        条均 <strong>{acc.avgViews.toLocaleString()}</strong>
                      </span>
                      <span className="rounded bg-emerald-50 text-emerald-800 px-1.5 py-0.5 text-[11px] font-bold">
                        {acc.weeklyLeads} 询盘
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full rounded-xs bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-r-xs transition-all"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Content Formula Review Induction */}
        <div className="lg:col-span-5 rounded-2xl border border-[var(--border-hairline)] bg-white p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-[var(--ink-primary)]">
                复盘归纳：最能打的脚本题型对比
              </h2>
              <span className="text-[11px] text-[var(--ink-muted)]">按本号超均值倍数</span>
            </div>

            <div className="space-y-3">
              {formulaStats.map((fs) => (
                <div key={fs.tpl} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--ink-primary)]">
                      {fs.label}{' '}
                      <span className="text-[var(--ink-muted)] font-normal">
                        ({fs.count}篇已发)
                      </span>
                    </span>
                    <span className="font-mono-num font-bold text-[var(--ink-primary)]">
                      {fs.avgRatio > 0 ? `${fs.avgRatio}× 均值` : '待发验证'} · {fs.totalLeads} 询盘
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-xs bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-r-xs"
                      style={{
                        width: `${Math.min(100, fs.avgRatio * 26)}%`,
                        backgroundColor: fs.avgRatio >= 2 ? '#D1432A' : '#1B9E77',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--bg-surface)] px-3.5 py-2.5 text-xs text-[var(--ink-secondary)] border border-[var(--border-hairline)]">
            <strong className="text-[var(--ink-primary)]">自动复盘结论：</strong>
            带真实数据表或系统实拍画面的内容私信转化效率最高，建议下周维持「观点拉新 + 实拍建信」1:1 交替排期。
          </div>
        </div>
      </section>

      {activeSubView === 'hooks' ? (
        /* Reusable Hook Assets Vault */
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hookAssets.map((hk) => (
            <div
              key={hk.id}
              className="rounded-2xl border border-[var(--border-hairline)] bg-white p-5 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: 'var(--brand-accent-soft)',
                      color: 'var(--brand-accent)',
                    }}
                  >
                    {hk.hookType}
                  </span>
                  <span className="font-mono-num text-xs text-amber-600 font-bold">
                    {'★'.repeat(hk.effectScore)}
                  </span>
                </div>
                <p className="mt-3 font-editorial text-base font-bold text-[var(--ink-primary)] leading-snug">
                  「{hk.content}」
                </p>
              </div>
              <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
                <span className="truncate">验证来源：{hk.sourceTitle}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(hk.content);
                    setCopiedId(hk.id);
                    setTimeout(() => setCopiedId(''), 1800);
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-[var(--ink-primary)] hover:text-[var(--brand-accent)] cursor-pointer shrink-0"
                >
                  {copiedId === hk.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-700" /> 已复制
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> 复制套用
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : (
        /* Content Archive & Production Pipeline Table */
        <section className="space-y-4">
          {/* Status & Folder Filter Bar */}
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all' as const, label: '全部' },
                { id: 'idea' as const, label: '待做灵感' },
                { id: 'writing' as const, label: '制作中' },
                { id: 'ready' as const, label: '待发布' },
                { id: 'published' as const, label: '已发归档' },
                { id: 'hits' as const, label: '🔥 爆款(≥1.5×)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-[var(--ink-primary)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="ml-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink-primary)] focus:outline-none"
              >
                <option value="all">全部归纳栏目 ({folders.length})</option>
                {folders.map((fd) => (
                  <option key={fd} value={fd}>
                    📁 {fd}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="搜存档标题 / 复盘笔记…"
                className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] pl-8 pr-3 py-1.5 text-xs w-48 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Archive Cards / Rows */}
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-white divide-y divide-[var(--border-hairline)] overflow-hidden">
            {filteredItems.map((item) => {
              const st = STATUS_META[item.status];
              return (
                <div
                  key={item.id}
                  className="p-4 sm:px-5 hover:bg-[var(--bg-surface)]/60 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <div className="w-14 h-18 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-black/5 flex items-center justify-center">
                      {item.coverUrl ? (
                        <img
                          src={proxyImg(item.coverUrl)}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FolderKanban className="h-5 w-5 text-stone-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCycleStatus(item)}
                          title="点击切换进度状态"
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-bold cursor-pointer ${st.badgeCls}`}
                        >
                          {st.label} ↻
                        </button>
                        <span className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-secondary)]">
                          📁 {item.folder}
                        </span>
                        <span className="text-[11px] text-[var(--ink-muted)]">
                          {item.platform} · {item.format} · {item.publishDate}
                        </span>
                        {item.selfOutlierRatio >= 1.5 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 text-red-700 px-2 py-0.5 font-mono-num text-[11px] font-bold">
                            <Flame className="h-3 w-3 fill-current" />
                            {item.selfOutlierRatio}× 本号爆款
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[var(--ink-primary)] truncate">
                        {item.title}
                      </h3>

                      {item.reviewNote && (
                        <p className="text-xs text-[var(--ink-secondary)] line-clamp-1">
                          📝 复盘：{item.reviewNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Metrics & Actions */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {item.status === 'published' && (
                      <div className="flex items-center gap-3 pr-2 border-r border-[var(--border-hairline)] font-mono-num text-xs">
                        <div>
                          <div className="text-[10px] text-[var(--ink-muted)]">曝光</div>
                          <div className="font-bold">{item.views.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[var(--ink-muted)]">赞/藏</div>
                          <div className="font-bold">
                            {item.likes}/{item.collects}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[var(--ink-muted)]">询盘</div>
                          <div className="font-bold text-emerald-700">+{item.leadsCount}</div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      {item.coverUrl && (
                        <a
                          href={proxyImg(item.coverUrl, true, item.title.slice(0, 18))}
                          download
                          title="下载参考封面图"
                          className="rounded-lg border border-[var(--border-hairline)] p-1.5 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {item.refSourceUrl && (
                        <a
                          href={item.refSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="打开参考原片"
                          className="rounded-lg border border-[var(--border-hairline)] p-1.5 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {item.hookLine && (
                        <button
                          type="button"
                          onClick={() => handlePromoteHook(item)}
                          title="将开头存入高转化钩子库"
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--brand-accent)] cursor-pointer"
                        >
                          {copiedId === `saved_${item.id}` ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-700" /> 已存钩子
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="h-3 w-3" /> 存钩子
                            </>
                          )}
                        </button>
                      )}
                      {item.draftId && (
                        <button
                          type="button"
                          onClick={() => onOpenDraftInStudio(item.draftId!)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-primary)] cursor-pointer"
                        >
                          打开脚本 <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="rounded-lg bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        复盘编辑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Slide-Over Review & Categorization Drawer */}
      {editingItem && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/35">
          <div className="w-full max-w-md bg-white h-full overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <h3 className="font-editorial text-lg font-bold text-[var(--ink-primary)]">
                内容归档与数据复盘
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-[var(--ink-muted)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">作品标题</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold mb-1">归纳栏目 / 文件夹</label>
                  <input
                    type="text"
                    value={editingItem.folder}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, folder: e.target.value })
                    }
                    className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">当前状态</label>
                  <select
                    value={editingItem.status}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        status: e.target.value as VaultStatus,
                      })
                    }
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2"
                  >
                    <option value="idea">待做灵感</option>
                    <option value="writing">制作中</option>
                    <option value="ready">待发布</option>
                    <option value="published">已发归档</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">总曝光</label>
                  <input
                    type="number"
                    value={editingItem.views}
                    onChange={(e) => {
                      const views = Number(e.target.value);
                      setEditingItem({
                        ...editingItem,
                        views,
                        selfOutlierRatio: +(views / 12000).toFixed(2),
                      });
                    }}
                    className="w-full rounded-xl border border-[var(--border-strong)] px-2.5 py-1.5 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">点赞数</label>
                  <input
                    type="number"
                    value={editingItem.likes}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, likes: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-[var(--border-strong)] px-2.5 py-1.5 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">带来询盘数</label>
                  <input
                    type="number"
                    value={editingItem.leadsCount}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        leadsCount: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-[var(--border-strong)] px-2.5 py-1.5 font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">前 20 字开头钩子留档</label>
                <textarea
                  rows={2}
                  value={editingItem.hookLine}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, hookLine: e.target.value })
                  }
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">复盘结论（爆因 / 改进点）</label>
                <textarea
                  rows={4}
                  value={editingItem.reviewNote}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, reviewNote: e.target.value })
                  }
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2 leading-relaxed"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await onSaveVaultItem(editingItem);
                setEditingItem(null);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white cursor-pointer"
              style={{ backgroundColor: 'var(--brand-accent)' }}
            >
              <Save className="h-3.5 w-3.5" />
              保存归档与复盘
            </button>
          </div>
        </div>
      )}

      {/* New Archive Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCreateBlankArchive}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-3.5 text-xs"
          >
            <h3 className="font-editorial text-lg font-bold text-[var(--ink-primary)]">
              新增内容归档与复盘记录
            </h3>
            <input
              name="title"
              required
              placeholder="作品标题…"
              className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                name="folder"
                defaultValue="老板认知破圈"
                placeholder="归纳文件夹…"
                className="rounded-xl border border-[var(--border-strong)] px-3 py-2"
              />
              <select
                name="status"
                defaultValue="published"
                className="rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2"
              >
                <option value="published">已发归档</option>
                <option value="ready">待发布</option>
                <option value="writing">制作中</option>
                <option value="idea">待做灵感</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                name="views"
                type="number"
                placeholder="曝光量"
                className="rounded-xl border border-[var(--border-strong)] px-3 py-1.5 font-mono-num"
              />
              <input
                name="likes"
                type="number"
                placeholder="点赞数"
                className="rounded-xl border border-[var(--border-strong)] px-3 py-1.5 font-mono-num"
              />
              <input
                name="leadsCount"
                type="number"
                placeholder="私信询盘数"
                className="rounded-xl border border-[var(--border-strong)] px-3 py-1.5 font-mono-num"
              />
            </div>
            <input
              name="hookLine"
              placeholder="本条使用的前20字开头钩子…"
              className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
            />
            <textarea
              name="reviewNote"
              rows={3}
              placeholder="复盘得失备注…"
              className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-xl border border-[var(--border-hairline)] px-4 py-2 font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl px-4 py-2 font-bold text-white cursor-pointer"
                style={{ backgroundColor: 'var(--brand-accent)' }}
              >
                <Sparkles className="h-3.5 w-3.5" /> 保存入库
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
