import React, { useState } from 'react';
import {
  Play,
  Sparkles,
  Plus,
  Loader2,
  Copy,
  Check,
  Save,
} from 'lucide-react';
import type {
  ScriptBeat,
  StudioScriptDraft,
  WorkspaceProfile,
  XiaohongshuSlide,
} from '../types';
import { CinemaTeleprompter } from '../components/CinemaTeleprompter';
import { XiaohongshuCardSuite } from '../components/XiaohongshuCardSuite';

interface Props {
  profile: WorkspaceProfile;
  drafts: StudioScriptDraft[];
  activeDraftId: string;
  selectedModel: string;
  onSelectDraft: (id: string) => void;
  onDraftUpdated: (draft: StudioScriptDraft) => void;
  onDraftCreated: (draft: StudioScriptDraft) => void;
  onOpenCard: (slug: string) => void;
}

export const StudioWorkshopView: React.FC<Props> = ({
  profile,
  drafts,
  activeDraftId,
  selectedModel,
  onSelectDraft,
  onDraftUpdated,
  onDraftCreated,
  onOpenCard,
}) => {
  const [subTab, setSubTab] = useState<'script' | 'xhs' | 'private'>('script');
  const [showTeleprompter, setShowTeleprompter] = useState<boolean>(false);
  const [rewritingBeatId, setRewritingBeatId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newTopic, setNewTopic] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');
  const [newTpl, setNewTpl] = useState<'opinion' | 'three-questions' | 'pain-demo'>('opinion');
  const [creatingNew, setCreatingNew] = useState<boolean>(false);

  const activeDraft = drafts.find((d) => d.id === activeDraftId) || drafts[0] || null;

  const persistDraft = async (nextDraft: StudioScriptDraft) => {
    onDraftUpdated(nextDraft);
    setSaving(true);
    try {
      await fetch(`/api/studio/drafts/${nextDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: nextDraft }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBeatEdit = (beatId: string, field: keyof ScriptBeat, value: string) => {
    if (!activeDraft) return;
    const nextBeats = activeDraft.beats.map((b) =>
      b.id === beatId ? { ...b, [field]: value } : b
    );
    onDraftUpdated({ ...activeDraft, beats: nextBeats });
  };

  const handleRewriteBeat = async (
    beat: ScriptBeat,
    mode: 'sharper' | 'inject-case' | 'shorter'
  ) => {
    if (!activeDraft) return;
    setRewritingBeatId(`${beat.id}_${mode}`);
    try {
      const res = await fetch('/api/studio/rewrite-beat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: profile.id,
          beat,
          mode,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.beat) {
        const nextBeats = activeDraft.beats.map((b) => (b.id === beat.id ? data.beat : b));
        await persistDraft({ ...activeDraft, beats: nextBeats });
      }
    } finally {
      setRewritingBeatId(null);
    }
  };

  const handleUpdateSlide = (page: number, patch: Partial<XiaohongshuSlide>) => {
    if (!activeDraft) return;
    const nextSlides = activeDraft.xhsSlides.map((s) =>
      s.page === page ? { ...s, ...patch } : s
    );
    persistDraft({ ...activeDraft, xhsSlides: nextSlides });
  };

  const handleCreateCustomDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    setCreatingNew(true);
    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: profile.id,
          topicTitle: newTopic.trim(),
          templateType: newTpl,
          bossVoiceNote: newNote.trim(),
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.draft) {
        setShowNewModal(false);
        setNewTopic('');
        setNewNote('');
        onDraftCreated(data.draft);
      }
    } finally {
      setCreatingNew(false);
    }
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1800);
  };

  const totalChars = activeDraft
    ? activeDraft.beats.reduce((acc, b) => acc + b.spokenText.length, 0)
    : 0;
  const estSeconds = Math.max(30, Math.round(totalChars / 6.8));

  return (
    <div className="space-y-5">
      {/* Clean Single-Row Studio Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <select
            value={activeDraft?.id || ''}
            onChange={(e) => onSelectDraft(e.target.value)}
            className="rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2 text-xs font-bold text-[var(--ink-primary)] max-w-sm truncate focus:outline-none"
          >
            {drafts.map((d, i) => (
              <option key={d.id} value={d.id}>
                #{drafts.length - i} · {d.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink-primary)] hover:border-[var(--brand-accent)] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            新建脚本
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-[var(--bg-subtle)] p-1 text-xs">
            {[
              { id: 'script' as const, label: '口播分镜' },
              { id: 'xhs' as const, label: '小红书 6 图' },
              { id: 'private' as const, label: '朋友圈与群钩子' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`rounded-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
                  subTab === t.id
                    ? 'bg-white text-[var(--ink-primary)] shadow-2xs'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeDraft && (
            <button
              type="button"
              onClick={() => setShowTeleprompter(true)}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-accent)' }}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              全屏提词开拍 ({estSeconds}s)
            </button>
          )}
        </div>
      </header>

      {!activeDraft ? (
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-white p-12 text-center text-xs text-[var(--ink-muted)]">
          暂无草稿，请从「今日选题」一键生成或点击「新建脚本」。
        </div>
      ) : subTab === 'xhs' ? (
        <XiaohongshuCardSuite
          draft={activeDraft}
          profile={profile}
          onUpdateSlide={handleUpdateSlide}
        />
      ) : subTab === 'private' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-white p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--ink-primary)]">
                微信朋友圈转发导语
              </h3>
              <button
                type="button"
                onClick={() => copyText('moments', activeDraft.momentsCopy)}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                {copiedKey === 'moments' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-700" /> 已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> 复制
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={5}
              value={activeDraft.momentsCopy}
              onChange={(e) => persistDraft({ ...activeDraft, momentsCopy: e.target.value })}
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/60 p-4 text-sm leading-relaxed focus:bg-white focus:outline-none"
            />
          </div>

          <div className="rounded-2xl border border-[var(--border-hairline)] bg-white p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--ink-primary)]">
                首评置顶引流话术（防封号合规版）
              </h3>
              <button
                type="button"
                onClick={() => copyText('cta', activeDraft.pinnedCommentCta)}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                {copiedKey === 'cta' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-700" /> 已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> 复制
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={5}
              value={activeDraft.pinnedCommentCta}
              onChange={(e) =>
                persistDraft({ ...activeDraft, pinnedCommentCta: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/60 p-4 text-sm leading-relaxed focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-white overflow-hidden">
          <div className="border-b border-[var(--border-hairline)] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-editorial text-xl font-bold text-[var(--ink-primary)]">
                {activeDraft.title}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)] font-mono-num">
                {totalChars} 字 · 约 {estSeconds} 秒
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  copyText(
                    'fullscript',
                    activeDraft.beats.map((b) => b.spokenText).join('\n\n')
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                {copiedKey === 'fullscript' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-700" /> 已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> 复制全文
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => persistDraft(activeDraft)}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? '已存' : '保存'}
              </button>
            </div>
          </div>

          <div className="divide-y divide-[var(--border-hairline)]">
            {activeDraft.beats.map((beat, idx) => (
              <div
                key={beat.id}
                className="group p-5 hover:bg-[var(--bg-surface)]/50 transition grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
              >
                <div className="lg:col-span-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-num text-xs font-bold text-[var(--ink-muted)]">
                      0{idx + 1}
                    </span>
                    <span className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[10px] font-semibold text-[var(--ink-secondary)]">
                      {beat.emotionStage}段
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[var(--ink-primary)]">
                    {beat.section.replace(/^\d+\.\s*/, '')}
                  </div>
                  {beat.citedCard && (
                    <button
                      type="button"
                      onClick={() => onOpenCard(beat.citedCard!)}
                      className="text-[11px] font-mono-num text-[var(--brand-accent)] hover:underline cursor-pointer"
                    >
                      #{beat.citedCard.slice(0, 14)}
                    </button>
                  )}
                </div>

                <div className="lg:col-span-7 space-y-2">
                  <textarea
                    rows={3}
                    value={beat.spokenText}
                    onChange={(e) => handleBeatEdit(beat.id, 'spokenText', e.target.value)}
                    className="w-full rounded-xl border border-transparent hover:border-[var(--border-hairline)] focus:border-[var(--brand-accent)] bg-transparent focus:bg-white px-3 py-2 text-sm leading-relaxed text-[var(--ink-primary)] focus:outline-none transition"
                  />
                  <div className="flex items-center gap-1.5 pl-3 opacity-75 group-hover:opacity-100 transition">
                    {[
                      { mode: 'sharper' as const, label: '更犀利' },
                      { mode: 'inject-case' as const, label: '融案例' },
                      { mode: 'shorter' as const, label: '精简' },
                    ].map((btn) => {
                      const busy = rewritingBeatId === `${beat.id}_${btn.mode}`;
                      return (
                        <button
                          key={btn.mode}
                          type="button"
                          disabled={rewritingBeatId !== null}
                          onClick={() => handleRewriteBeat(beat, btn.mode)}
                          className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] disabled:opacity-40 cursor-pointer"
                        >
                          {busy && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-2 text-xs">
                  <div>
                    <span className="text-[11px] text-[var(--ink-muted)]">语气：</span>
                    <input
                      type="text"
                      value={beat.deliveryCue}
                      onChange={(e) => handleBeatEdit(beat.id, 'deliveryCue', e.target.value)}
                      className="w-full font-medium text-[var(--brand-accent)] bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--ink-muted)]">画面：</span>
                    <input
                      type="text"
                      value={beat.visualCue}
                      onChange={(e) => handleBeatEdit(beat.id, 'visualCue', e.target.value)}
                      className="w-full text-[var(--ink-secondary)] bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTeleprompter && activeDraft && (
        <CinemaTeleprompter
          draft={activeDraft}
          brandTitle={profile.brandTitle}
          onClose={() => setShowTeleprompter(false)}
        />
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCreateCustomDraft}
            className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-white p-6 shadow-2xl space-y-4"
          >
            <h3 className="font-editorial text-lg font-bold text-[var(--ink-primary)]">
              新建口播与图文成片包
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                required
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="输入选题标题…"
                className="w-full rounded-xl border border-[var(--border-strong)] px-3.5 py-2 text-xs focus:border-[var(--brand-accent)] focus:outline-none"
              />
              <select
                value={newTpl}
                onChange={(e) =>
                  setNewTpl(e.target.value as 'opinion' | 'three-questions' | 'pain-demo')
                }
                className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2 text-xs"
              >
                <option value="opinion">观点反应型</option>
                <option value="three-questions">三问清单型</option>
                <option value="pain-demo">痛点实拍型</option>
              </select>
              <textarea
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="补充要点或个人案例（选填）…"
                className="w-full rounded-xl border border-[var(--border-strong)] px-3.5 py-2 text-xs focus:border-[var(--brand-accent)] focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-xl border border-[var(--border-hairline)] px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={creatingNew}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
                style={{ backgroundColor: 'var(--brand-accent)' }}
              >
                {creatingNew ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                生成
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
