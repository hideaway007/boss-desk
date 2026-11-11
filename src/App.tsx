import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Radar,
  Clapperboard,
  FolderArchive,
  BrainCircuit,
  BriefcaseBusiness,
  ChevronDown,
  Cpu,
  Check,
  Sparkles,
} from 'lucide-react';
import type {
  AccountMatrixItem,
  ContentVaultItem,
  DailyTrendPoint,
  HookAssetItem,
  MorningBriefItem,
  NavTab,
  StudioScriptDraft,
  TrackSummary,
  WikiCard,
  WorkspaceId,
  WorkspaceProfile,
} from './types';
import { MorningDeskView } from './views/MorningDeskView';
import { OutlierRadarView } from './views/OutlierRadarView';
import { LivingBrainView } from './views/LivingBrainView';
import { StudioWorkshopView } from './views/StudioWorkshopView';
import { ContentVaultView } from './views/ContentVaultView';
import { DealDeskView } from './views/DealDeskView';

interface ModelOption {
  id: string;
  label: string;
}

export const App: React.FC = () => {
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>('d2-studio');
  const [workspaces, setWorkspaces] = useState<WorkspaceProfile[]>([]);
  const [profile, setProfile] = useState<WorkspaceProfile | null>(null);
  const [briefs, setBriefs] = useState<MorningBriefItem[]>([]);
  const [cards, setCards] = useState<WikiCard[]>([]);
  const [drafts, setDrafts] = useState<StudioScriptDraft[]>([]);
  const [vaultItems, setVaultItems] = useState<ContentVaultItem[]>([]);
  const [hookAssets, setHookAssets] = useState<HookAssetItem[]>([]);
  const [matrixAccounts, setMatrixAccounts] = useState<AccountMatrixItem[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrendPoint[]>([]);
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [radarTotalCount, setRadarTotalCount] = useState<number>(0);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(
    'remote-magpie/workbuddy-2/deepseek-v4.1-flash'
  );

  const [activeTab, setActiveTab] = useState<NavTab>('morning');
  const [activeDraftId, setActiveDraftId] = useState<string>('');
  const [focusCardSlug, setFocusCardSlug] = useState<string | null>(null);
  const [wsDropdownOpen, setWsDropdownOpen] = useState<boolean>(false);
  const [loadingBoot, setLoadingBoot] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string>('');

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2600);
  };

  const loadWorkspaceBootstrap = async (ws: WorkspaceId) => {
    setLoadingBoot(true);
    try {
      const res = await fetch(`/api/bootstrap?workspace=${ws}`);
      const data = await res.json();
      setWorkspaces(data.workspaces || []);
      setProfile(data.activeWorkspace);
      setBriefs(data.briefs || []);
      setCards(data.cards || []);
      setDrafts(data.drafts || []);
      setVaultItems(data.vaultItems || []);
      setHookAssets(data.hookAssets || []);
      setMatrixAccounts(data.matrixAccounts || []);
      setDailyTrends(data.dailyTrends || []);
      setActiveDraftId(data.drafts?.[0]?.id || '');
      setTracks(data.tracks || []);
      setRadarTotalCount(data.radarTotalCount || 0);
      if (data.models?.length) {
        setModels(data.models);
      }
    } finally {
      setLoadingBoot(false);
    }
  };

  useEffect(() => {
    loadWorkspaceBootstrap(workspaceId);
  }, [workspaceId]);

  const handleOpenCard = (slug: string) => {
    setFocusCardSlug(slug);
    setActiveTab('brain');
  };

  const handleDraftCreated = (newDraft: StudioScriptDraft, vaultEntry?: ContentVaultItem) => {
    setDrafts((prev) => [newDraft, ...prev]);
    if (vaultEntry) {
      setVaultItems((prev) => [vaultEntry, ...prev]);
    }
    setActiveDraftId(newDraft.id);
    setActiveTab('studio');
    triggerToast(`已生成成片包并同步归档：《${newDraft.title.slice(0, 18)}…》`);
  };

  const handleDraftUpdated = (updated: StudioScriptDraft) => {
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleSaveVaultItem = async (item: ContentVaultItem) => {
    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item }),
    });
    const data = await res.json();
    if (res.ok && data.item) {
      setVaultItems((prev) => {
        const exists = prev.some((x) => x.id === data.item.id);
        return exists
          ? prev.map((x) => (x.id === data.item.id ? data.item : x))
          : [data.item, ...prev];
      });
      triggerToast('已更新内容存档库');
    }
  };

  const handleAddHookAsset = async (asset: HookAssetItem) => {
    const res = await fetch('/api/hooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset }),
    });
    const data = await res.json();
    if (res.ok && data.asset) {
      setHookAssets((prev) => [data.asset, ...prev]);
      triggerToast('已沉淀至高转化开头库');
    }
  };

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }> = [
    {
      id: 'morning',
      label: '今日总览',
      icon: LayoutDashboard,
      badge: briefs.length || undefined,
    },
    {
      id: 'radar',
      label: '超常热点库',
      icon: Radar,
      badge: radarTotalCount ? `${(radarTotalCount / 1000).toFixed(1)}k` : undefined,
    },
    {
      id: 'studio',
      label: '成片工坊',
      icon: Clapperboard,
      badge: drafts.length || undefined,
    },
    {
      id: 'vault',
      label: '存档与复盘',
      icon: FolderArchive,
      badge: vaultItems.length || undefined,
    },
    {
      id: 'brain',
      label: '业务大脑',
      icon: BrainCircuit,
      badge: cards.length || undefined,
    },
    {
      id: 'dealdesk',
      label: '客户提案',
      icon: BriefcaseBusiness,
    },
  ];

  return (
    <div
      data-workspace={workspaceId}
      className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-canvas)] text-[var(--ink-primary)]"
    >
      {/* Clean Minimal Architectural Sidebar */}
      <aside className="w-full lg:w-60 shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between lg:sticky lg:top-0 lg:h-screen z-30">
        <div className="p-4 space-y-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => setWsDropdownOpen((o) => !o)}
              className="w-full text-left rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 hover:border-[var(--brand-accent)] transition flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center font-editorial text-base font-black text-white"
                  style={{ backgroundColor: 'var(--brand-accent)' }}
                >
                  {profile?.brandTitle.slice(0, 1) || 'B'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[var(--ink-primary)] truncate">
                    {profile?.brandTitle.split(' · ')[0] || 'BossDesk'}
                  </div>
                  <div className="text-[11px] text-[var(--ink-muted)] truncate">
                    {profile?.brandTitle.split(' · ')[1] || profile?.sealLabel}
                  </div>
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[var(--ink-muted)] shrink-0" />
            </button>

            {wsDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-[var(--border-strong)] bg-white p-1.5 shadow-xl z-50 space-y-1">
                {workspaces.map((ws) => {
                  const active = ws.id === workspaceId;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        setWorkspaceId(ws.id);
                        setWsDropdownOpen(false);
                        setFocusCardSlug(null);
                        triggerToast(`已切换至「${ws.brandTitle}」`);
                      }}
                      className={`w-full text-left rounded-lg px-2.5 py-2 transition flex items-center justify-between gap-2 cursor-pointer ${
                        active ? 'bg-[var(--bg-subtle)]' : 'hover:bg-[var(--bg-canvas)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--ink-primary)] flex items-center gap-1.5 truncate">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: ws.accentColor }}
                          />
                          {ws.brandTitle}
                        </div>
                      </div>
                      {active && (
                        <Check className="h-3.5 w-3.5 text-[var(--brand-accent)] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-[var(--ink-primary)] text-[#FDFBF7] shadow-xs'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]/70 hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-[#FDFBF7]' : 'text-[var(--brand-accent)]'
                      }`}
                    />
                    <span className="text-[13px] font-semibold">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`font-mono-num rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                        isActive ? 'bg-white/15 text-white' : 'text-[var(--ink-muted)]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[var(--border-hairline)]">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-muted)] mb-1.5">
            <Cpu className="h-3 w-3" />
            <span>推理模型</span>
          </div>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-hairline)] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[var(--ink-primary)] focus:outline-none"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label.split(' · ')[0]}
              </option>
            ))}
          </select>
        </div>
      </aside>

      {/* Main Content Stage */}
      <main className="flex-1 min-w-0 px-6 sm:px-10 lg:px-12 py-7 max-w-[1440px]">
        {loadingBoot || !profile ? (
          <div className="py-28 text-center text-sm text-[var(--ink-muted)]">加载中…</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${workspaceId}_${activeTab}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {activeTab === 'morning' && (
                <MorningDeskView
                  profile={profile}
                  briefs={briefs}
                  cards={cards}
                  vaultItems={vaultItems}
                  dailyTrends={dailyTrends}
                  radarTotalCount={radarTotalCount}
                  selectedModel={selectedModel}
                  onDraftCreated={handleDraftCreated}
                  onVaultItemAdded={(it) => setVaultItems((prev) => [it, ...prev])}
                  onOpenCard={handleOpenCard}
                  onNavigateRadar={() => setActiveTab('radar')}
                  onNavigateVault={() => setActiveTab('vault')}
                />
              )}
              {activeTab === 'radar' && (
                <OutlierRadarView
                  profile={profile}
                  initialTracks={tracks}
                  selectedModel={selectedModel}
                  onDraftCreated={handleDraftCreated}
                />
              )}
              {activeTab === 'studio' && (
                <StudioWorkshopView
                  profile={profile}
                  drafts={drafts}
                  activeDraftId={activeDraftId}
                  selectedModel={selectedModel}
                  onSelectDraft={setActiveDraftId}
                  onDraftUpdated={handleDraftUpdated}
                  onDraftCreated={(d) => handleDraftCreated(d)}
                  onOpenCard={handleOpenCard}
                />
              )}
              {activeTab === 'vault' && (
                <ContentVaultView
                  profile={profile}
                  vaultItems={vaultItems}
                  matrixAccounts={matrixAccounts}
                  hookAssets={hookAssets}
                  onSaveVaultItem={handleSaveVaultItem}
                  onAddHookAsset={handleAddHookAsset}
                  onOpenDraftInStudio={(did) => {
                    setActiveDraftId(did);
                    setActiveTab('studio');
                  }}
                />
              )}
              {activeTab === 'brain' && (
                <LivingBrainView
                  profile={profile}
                  cards={cards}
                  selectedModel={selectedModel}
                  initialFocusSlug={focusCardSlug}
                  onCardAdded={(newCard) => setCards((prev) => [newCard, ...prev])}
                  onCardUpdated={(upd) =>
                    setCards((prev) => prev.map((c) => (c.slug === upd.slug ? upd : c)))
                  }
                  onForbiddenWordsUpdated={(words) =>
                    setProfile((prev) => (prev ? { ...prev, forbiddenWords: words } : prev))
                  }
                />
              )}
              {activeTab === 'dealdesk' && (
                <DealDeskView profile={profile} selectedModel={selectedModel} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#161513] text-[#FDFBF7] px-4 py-2.5 text-xs font-semibold shadow-xl flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default App;
