import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import type {
  ContentVaultItem,
  HookAssetItem,
  MorningBriefItem,
  RadarVideoItem,
  ScriptBeat,
  StudioScriptDraft,
  WikiCard,
  WikiCardCategory,
  WorkspaceId,
  XiaohongshuSlide,
} from '../src/types.ts';
import { AVAILABLE_MODELS, callLlmJson, streamLlmMarkdown } from './llmGateway.ts';
import { loadRadarDataset } from './radarDataset.ts';
import { WORKSPACE_PROFILES, ensureWorkspaceFilesSeeded } from './seedWorkspaces.ts';

function runProcessSafe(bin: string, args: string[], timeoutMs = 55000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Process timed out'));
    }, timeoutMs);
    child.stdout.on('data', (d) => {
      out += String(d);
    });
    child.stderr.on('data', (d) => {
      err += String(d);
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(err || `Exit code ${code}`));
    });
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const WORKSPACES_DIR = path.join(ROOT_DIR, 'workspaces');
const MEDIA_CACHE_DIR = path.join(__dirname, 'media_cache');
const DB_PATH = path.join(__dirname, 'runtime.sqlite');

fs.mkdirSync(WORKSPACES_DIR, { recursive: true });
fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.prepare(
  'CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL)'
).run();
db.prepare(
  'CREATE TABLE IF NOT EXISTS deconstructions (video_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL, created_at TEXT NOT NULL)'
).run();
db.prepare(
  'CREATE TABLE IF NOT EXISTS custom_forbidden (workspace_id TEXT PRIMARY KEY, words_json TEXT NOT NULL)'
).run();
db.prepare(
  'CREATE TABLE IF NOT EXISTS vault_items (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL)'
).run();
db.prepare(
  'CREATE TABLE IF NOT EXISTS hook_assets (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL)'
).run();

const seededState = ensureWorkspaceFilesSeeded(WORKSPACES_DIR);

for (const wsId of Object.keys(WORKSPACE_PROFILES) as WorkspaceId[]) {
  const draftCount = db
    .prepare('SELECT COUNT(*) as c FROM drafts WHERE workspace_id = ?')
    .get(wsId) as { c: number };
  if (draftCount.c === 0) {
    const ins = db.prepare(
      'INSERT OR REPLACE INTO drafts (id, workspace_id, payload_json, created_at) VALUES (?, ?, ?, ?)'
    );
    for (const d of seededState[wsId]?.drafts || []) {
      ins.run(d.id, wsId, JSON.stringify(d), d.createdAt);
    }
  }

  const vaultCount = db
    .prepare('SELECT COUNT(*) as c FROM vault_items WHERE workspace_id = ?')
    .get(wsId) as { c: number };
  if (vaultCount.c === 0) {
    const insV = db.prepare(
      'INSERT OR REPLACE INTO vault_items (id, workspace_id, payload_json, updated_at) VALUES (?, ?, ?, ?)'
    );
    for (const item of seededState[wsId]?.vaultItems || []) {
      insV.run(item.id, wsId, JSON.stringify(item), item.publishDate);
    }
  }

  const hookCount = db
    .prepare('SELECT COUNT(*) as c FROM hook_assets WHERE workspace_id = ?')
    .get(wsId) as { c: number };
  if (hookCount.c === 0) {
    const insH = db.prepare(
      'INSERT OR REPLACE INTO hook_assets (id, workspace_id, payload_json, created_at) VALUES (?, ?, ?, ?)'
    );
    for (const hk of seededState[wsId]?.hookAssets || []) {
      insH.run(hk.id, wsId, JSON.stringify(hk), new Date().toISOString());
    }
  }
}

function getForbiddenWords(wsId: WorkspaceId): string[] {
  const row = db
    .prepare('SELECT words_json FROM custom_forbidden WHERE workspace_id = ?')
    .get(wsId) as { words_json: string } | undefined;
  if (row) {
    try {
      return JSON.parse(row.words_json);
    } catch {
      // ignore
    }
  }
  return WORKSPACE_PROFILES[wsId].forbiddenWords;
}

function extractWikilinks(body: string): string[] {
  const links: string[] = [];
  let idx = 0;
  while (idx < body.length) {
    const open = body.indexOf('[[', idx);
    if (open === -1) break;
    const close = body.indexOf(']]', open + 2);
    if (close === -1) break;
    const rawTarget = body.slice(open + 2, close).split('|')[0].split('#')[0].trim();
    if (rawTarget) links.push(rawTarget);
    idx = close + 2;
  }
  return links;
}

function readWorkspaceCards(wsId: WorkspaceId): WikiCard[] {
  const wikiDir = path.join(WORKSPACES_DIR, wsId, 'wiki');
  if (!fs.existsSync(wikiDir)) return seededState[wsId]?.cards || [];
  const files = fs.readdirSync(wikiDir).filter((f) => f.endsWith('.md'));
  const cards: WikiCard[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(wikiDir, file), 'utf-8');
    const slug = file.replace(/\.md$/, '');
    if (!raw.startsWith('---\n')) continue;
    const endFm = raw.indexOf('\n---\n', 4);
    if (endFm === -1) continue;
    const fmText = raw.slice(4, endFm);
    const body = raw.slice(endFm + 5).trim();

    const fmMap: Record<string, string> = {};
    for (const line of fmText.split('\n')) {
      const colon = line.indexOf(':');
      if (colon > 0) {
        fmMap[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
      }
    }
    const unquote = (val?: string) => (val ? val.replace(/^["']|["']$/g, '') : '');
    const parseArray = (key: string): string[] => {
      const rawVal = fmMap[key] || '';
      if (!rawVal.startsWith('[')) return [];
      try {
        return JSON.parse(rawVal.replace(/'/g, '"'));
      } catch {
        return rawVal
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
    };

    const mergedLinks = Array.from(
      new Set([...parseArray('links'), ...extractWikilinks(body)])
    ).filter((x) => x !== slug);
    const catRaw = unquote(fmMap.category) as WikiCardCategory;
    const category: WikiCardCategory = ['voice', 'case', 'faq', 'offer'].includes(catRaw)
      ? catRaw
      : 'case';

    cards.push({
      id: slug,
      slug,
      title: unquote(fmMap.title) || slug,
      category,
      summary: unquote(fmMap.summary) || body.slice(0, 90),
      content: body,
      tags: parseArray('tags'),
      links: mergedLinks,
      updatedAt: unquote(fmMap.updatedAt) || '2026-11-11',
      sourceType: (unquote(fmMap.sourceType) as WikiCard['sourceType']) || 'manual',
    });
  }
  return cards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function writeWikiCardToDisk(wsId: WorkspaceId, card: WikiCard): void {
  const wikiDir = path.join(WORKSPACES_DIR, wsId, 'wiki');
  fs.mkdirSync(wikiDir, { recursive: true });
  const md = [
    '---',
    `title: ${JSON.stringify(card.title)}`,
    `category: ${card.category}`,
    `summary: ${JSON.stringify(card.summary)}`,
    `tags: ${JSON.stringify(card.tags)}`,
    `links: ${JSON.stringify(card.links)}`,
    `updatedAt: ${JSON.stringify(card.updatedAt)}`,
    `sourceType: ${JSON.stringify(card.sourceType || 'voice-memo')}`,
    '---',
    '',
    card.content.trim(),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(wikiDir, `${card.slug}.md`), md, 'utf-8');
}

function scrubForbiddenWords(text: string, forbidden: string[]): string {
  let out = text;
  for (const w of forbidden) {
    if (w) out = out.split(w).join('');
  }
  return out;
}

const app = express();
app.use(express.json({ limit: '4mb' }));

const liveExtraRadarVideos: RadarVideoItem[] = [];

// High-speed Image Proxy & One-Click Attachment Downloader (bypasses Douyin CDN anti-hotlink + caches locally)
app.get('/api/media/image', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '');
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      res.status(400).send('Invalid URL');
      return;
    }
    const download = req.query.download === '1';
    const customName = String(req.query.name || 'cover').replace(/[^a-zA-Z0-9_一-龥-]/g, '_');

    const hash = crypto.createHash('sha1').update(rawUrl).digest('hex');
    const cacheFile = path.join(MEDIA_CACHE_DIR, `${hash}.jpg`);

    let imgBuf: Buffer;
    if (fs.existsSync(cacheFile)) {
      imgBuf = fs.readFileSync(cacheFile);
    } else {
      const upstream = await fetch(rawUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Referer: '',
        },
      });
      if (!upstream.ok) {
        res.status(502).send('Upstream media unavailable');
        return;
      }
      const ab = await upstream.arrayBuffer();
      imgBuf = Buffer.from(ab);
      if (imgBuf.length > 500) {
        fs.writeFileSync(cacheFile, imgBuf);
      }
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    if (download) {
      const encodedFilename = encodeURIComponent(`${customName.slice(0, 36)}.jpg`);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="cover.jpg"; filename*=UTF-8''${encodedFilename}`
      );
    }
    res.send(imgBuf);
  } catch {
    res.status(500).send('Media proxy error');
  }
});

app.get('/api/bootstrap', (req, res) => {
  const wsParam = (req.query.workspace as string) || 'd2-studio';
  const wsId: WorkspaceId =
    wsParam in WORKSPACE_PROFILES ? (wsParam as WorkspaceId) : 'd2-studio';

  const profile = {
    ...WORKSPACE_PROFILES[wsId],
    forbiddenWords: getForbiddenWords(wsId),
  };
  const cards = readWorkspaceCards(wsId);
  const briefs: MorningBriefItem[] = seededState[wsId]?.briefs || [];

  const draftRows = db
    .prepare('SELECT payload_json FROM drafts WHERE workspace_id = ? ORDER BY created_at DESC')
    .all(wsId) as Array<{ payload_json: string }>;
  const drafts: StudioScriptDraft[] = draftRows
    .map((r) => {
      try {
        return JSON.parse(r.payload_json) as StudioScriptDraft;
      } catch {
        return null;
      }
    })
    .filter((x): x is StudioScriptDraft => x !== null);

  const vaultRows = db
    .prepare('SELECT payload_json FROM vault_items WHERE workspace_id = ? ORDER BY updated_at DESC')
    .all(wsId) as Array<{ payload_json: string }>;
  const vaultItems: ContentVaultItem[] = vaultRows
    .map((r) => {
      try {
        return JSON.parse(r.payload_json) as ContentVaultItem;
      } catch {
        return null;
      }
    })
    .filter((x): x is ContentVaultItem => x !== null);

  const hookRows = db
    .prepare('SELECT payload_json FROM hook_assets WHERE workspace_id = ? ORDER BY created_at DESC')
    .all(wsId) as Array<{ payload_json: string }>;
  const hookAssets: HookAssetItem[] = hookRows
    .map((r) => {
      try {
        return JSON.parse(r.payload_json) as HookAssetItem;
      } catch {
        return null;
      }
    })
    .filter((x): x is HookAssetItem => x !== null);

  const { tracks, videos } = loadRadarDataset();

  res.json({
    workspaces: Object.values(WORKSPACE_PROFILES),
    activeWorkspace: profile,
    briefs,
    cards,
    drafts,
    vaultItems,
    hookAssets,
    matrixAccounts: seededState[wsId]?.matrixAccounts || [],
    dailyTrends: seededState[wsId]?.dailyTrends || [],
    tracks,
    radarTotalCount: videos.length + liveExtraRadarVideos.length,
    models: AVAILABLE_MODELS,
  });
});

// Content Vault CRUD (Quick Idea Capture, Status Update, Review Note, Archive)
app.post('/api/vault', (req, res) => {
  const { item } = req.body as { item: ContentVaultItem };
  if (!item?.workspaceId || !item.title) {
    res.status(400).json({ error: '缺少必要字段' });
    return;
  }
  const saved: ContentVaultItem = {
    ...item,
    id: item.id || `vault_${Date.now()}`,
    publishDate: item.publishDate || new Date().toISOString().slice(0, 10),
  };
  db.prepare(
    'INSERT OR REPLACE INTO vault_items (id, workspace_id, payload_json, updated_at) VALUES (?, ?, ?, ?)'
  ).run(saved.id, saved.workspaceId, JSON.stringify(saved), saved.publishDate);
  res.json({ item: saved });
});

app.delete('/api/vault/:id', (req, res) => {
  db.prepare('DELETE FROM vault_items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/hooks', (req, res) => {
  const { asset } = req.body as { asset: HookAssetItem };
  if (!asset?.workspaceId || !asset.content) {
    res.status(400).json({ error: '缺少内容' });
    return;
  }
  const saved: HookAssetItem = {
    ...asset,
    id: asset.id || `hk_${Date.now()}`,
  };
  db.prepare(
    'INSERT OR REPLACE INTO hook_assets (id, workspace_id, payload_json, created_at) VALUES (?, ?, ?, ?)'
  ).run(saved.id, saved.workspaceId, JSON.stringify(saved), new Date().toISOString());
  res.json({ asset: saved });
});

app.get('/api/radar', (req, res) => {
  const { videos, tracks } = loadRadarDataset();
  const merged = [...liveExtraRadarVideos, ...videos];

  const trackId = req.query.trackId ? String(req.query.trackId) : 'all';
  const minRatio = req.query.minRatio ? Number(req.query.minRatio) : 0;
  const audience = req.query.audience ? String(req.query.audience) : 'all';
  const angle = req.query.angle ? String(req.query.angle) : 'all';
  const maxFans = req.query.maxFans ? Number(req.query.maxFans) : 0;
  const minShareRate = req.query.minShareRate ? Number(req.query.minShareRate) : 0;
  const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
  const limit = Math.min(Number(req.query.limit) || 60, 300);

  const filtered = merged.filter((v) => {
    if (trackId !== 'all' && v.trackId !== Number(trackId)) return false;
    if (minRatio > 0 && v.outlierRatio < minRatio) return false;
    if (audience !== 'all' && v.audience !== audience) return false;
    if (angle !== 'all' && v.angle !== angle) return false;
    if (maxFans > 0 && v.fans > maxFans) return false;
    if (minShareRate > 0 && v.shareRate < minShareRate) return false;
    if (q) {
      const hay = `${v.title} ${v.author} ${v.trackName} ${v.angleLabel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  res.json({
    totalMatched: filtered.length,
    items: filtered.slice(0, limit),
    tracks,
  });
});

app.post('/api/radar/deconstruct', async (req, res) => {
  try {
    const { video, workspaceId, model } = req.body as {
      video: RadarVideoItem;
      workspaceId: WorkspaceId;
      model?: string;
    };
    const cacheKey = `${workspaceId}_${video.id}`;
    const cached = db
      .prepare('SELECT payload_json FROM deconstructions WHERE video_id = ?')
      .get(cacheKey) as { payload_json: string } | undefined;
    if (cached) {
      res.json(JSON.parse(cached.payload_json));
      return;
    }

    const ws = WORKSPACE_PROFILES[workspaceId] || WORKSPACE_PROFILES['d2-studio'];
    const cards = readWorkspaceCards(workspaceId).slice(0, 6);

    interface DeconstructResult {
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

    const { data, modelUsed } = await callLlmJson<DeconstructResult>({
      preferredModel: model,
      system: `你是顶级商业短视频拆解顾问，服务于「${ws.brandTitle}」（行业：${ws.industryTag}）。请精准拆解这条超常爆款视频的结构机制，并给出该老板可直接借壳重写的3个选题切口。`,
      user: `待拆解超常视频：
- 标题/文案：${video.title}
- 账号：${video.author}（粉丝 ${video.fans}）
- 超常倍数：${video.outlierRatio}×（本条点赞 ${video.likes} / 日常前10条中位赞 ${video.baselineMedian}）
- 转发/点赞比：${(video.shareRate * 100).toFixed(1)}%，收藏/点赞比：${(video.collectRate * 100).toFixed(1)}%

当前老板私有知识库已有卡片：
${cards.map((c) => `- [[${c.slug}]] ${c.title}: ${c.summary}`).join('\n')}

请返回严格 JSON：
{
  "hookMechanism": "一句话指出它前3秒留住人的核心机制",
  "first20CharsFormula": "提炼可复用的前20字句式模板",
  "emotionalArc": "拆解 A段引入 → B段举证 → C段情绪拔高的节奏",
  "commonEnemy": "它替观众骂了哪个共同敌人或旧做法？",
  "unansweredQuestions": ["高意向买方最可能追问的问题1", "问题2"],
  "adaptationAngles": [
    {"title": "迁移选题名1", "hookLine": "前20字开场白1", "templateType": "opinion"},
    {"title": "迁移选题名2", "hookLine": "前20字开场白2", "templateType": "three-questions"},
    {"title": "迁移选题名3", "hookLine": "前20字开场白3", "templateType": "pain-demo"}
  ]
}`,
    });

    const payload = { ...data, modelUsed };
    db.prepare(
      'INSERT OR REPLACE INTO deconstructions (video_id, payload_json, created_at) VALUES (?, ?, ?)'
    ).run(cacheKey, JSON.stringify(payload), new Date().toISOString());

    res.json(payload);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : '拆解失败',
    });
  }
});

app.post('/api/radar/live-scan', async (req, res) => {
  try {
    const { keyword, trackId } = req.body as { keyword: string; trackId?: number };
    const cleanKw = (keyword || '').trim();
    if (!cleanKw) {
      res.status(400).json({ error: '请输入要巡检的抖音行业关键词' });
      return;
    }
    const monidBin = path.join(os.homedir(), '.local', 'bin', 'monid');
    if (!fs.existsSync(monidBin)) {
      res.status(400).json({ error: '本机未检测到 monid CLI' });
      return;
    }

    const stdout = await runProcessSafe(monidBin, [
      'run',
      '-p',
      'tikhub',
      '-e',
      '/api/v1/douyin/index/fetch_item_query',
      '--query',
      JSON.stringify({
        query: cleanKw,
        date_type: 30,
        category_id: '0',
        duration_type: 0,
        label_type: 0,
      }),
      '-w',
      '45',
      '-j',
    ]);

    const parsed = JSON.parse(stdout);
    const items = parsed?.output?.data;
    if (!Array.isArray(items) || items.length === 0) {
      res.json({ added: 0, items: [] });
      return;
    }

    const likesArr = items
      .map((x: Record<string, unknown>) => Number(x.likes || 0))
      .filter((n) => n > 0);
    likesArr.sort((a, b) => a - b);
    const groupMedian = Math.max(
      25,
      likesArr.length ? likesArr[Math.floor(likesArr.length / 2)] : 60
    );

    const addedItems: RadarVideoItem[] = [];
    for (const it of items.slice(0, 12)) {
      const aid = String(it.itemId || '');
      if (!aid) continue;
      const likes = Number(it.likes || 0);
      const fans = Number(it.fans || 10000);
      const estBaseline = Math.max(
        20,
        Math.round(Math.min(groupMedian, Math.max(25, fans * 0.004)))
      );
      const ratio = +(likes / estBaseline).toFixed(2);
      if (ratio < 1.2) continue;
      const rec: RadarVideoItem = {
        id: aid,
        trackId: trackId || 14,
        trackShort: `实时:${cleanKw.slice(0, 5)}`,
        trackName: `实时巡检 · ${cleanKw}`,
        author: String(it.nickname || '抖音创作者'),
        fans,
        createDate: String(it.createTime || '').slice(0, 10) || '2026-11-11',
        likes,
        comments: Math.round(likes * 0.08),
        collects: Math.round(likes * 0.32),
        shares: Math.round(likes * 0.18),
        baselineMedian: estBaseline,
        outlierRatio: ratio,
        shareRate: 0.18,
        collectRate: 0.32,
        angle: it.isLowFansButHot ? 'B' : 'D',
        angleLabel: it.isLowFansButHot ? 'B 能力展示' : 'D 价值观/观点',
        audience: '老板',
        relevance: '主要',
        title: String(it.title || ''),
        shareUrl: `https://www.douyin.com/video/${aid}`,
        coverUrl: String(it.thumbnail || ''),
        avatarUrl: String(it.avatarUrl || ''),
      };
      liveExtraRadarVideos.unshift(rec);
      addedItems.push(rec);
    }

    res.json({
      added: addedItems.length,
      costUsd: parsed?.cost?.value ?? 0.001,
      items: addedItems,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : '实时巡检调用失败',
    });
  }
});

app.post('/api/brain/ingest', async (req, res) => {
  try {
    const { workspaceId, rawInput, preferredCategory, model } = req.body as {
      workspaceId: WorkspaceId;
      rawInput: string;
      preferredCategory?: WikiCardCategory;
      model?: string;
    };
    if (!rawInput?.trim()) {
      res.status(400).json({ error: '请输入或录入一段语音闪念/案例复盘' });
      return;
    }

    const ws = WORKSPACE_PROFILES[workspaceId] || WORKSPACE_PROFILES['d2-studio'];
    const existingCards = readWorkspaceCards(workspaceId);

    interface ExtractedCardPayload {
      slug: string;
      title: string;
      category: WikiCardCategory;
      summary: string;
      content: string;
      tags: string[];
      links: string[];
    }

    const { data, modelUsed } = await callLlmJson<ExtractedCardPayload>({
      preferredModel: model,
      system: `你是「${ws.brandTitle}」的 Karpathy LLM Wiki 知识工程师。请将老板口述复盘脱敏并抽取成高密度 Markdown 双链卡片。`,
      user: `老板口述：
"""
${rawInput.trim()}
"""
现有卡片索引：
${existingCards.map((c) => `- slug: "${c.slug}" | ${c.title} (${c.category})`).join('\n')}

返回严格 JSON：
{
  "slug": "kebab-case-id",
  "title": "卡片标题(18字内)",
  "category": "voice | case | faq | offer",
  "summary": "一句话结论摘要(45字内)",
  "content": "结构化 Markdown 正文，包含关键动作与数据，嵌入 [[已有slug]] 双链",
  "tags": ["标签1", "标签2"],
  "links": ["关联slug1"]
}`,
    });

    const safeSlug =
      (data.slug || `memo-${Date.now()}`)
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 48) || `memo-${Date.now()}`;

    const validSlugs = new Set(existingCards.map((c) => c.slug));
    const filteredLinks = (data.links || []).filter((l) => validSlugs.has(l));

    const newCard: WikiCard = {
      id: safeSlug,
      slug: safeSlug,
      title: data.title || '新入库业务卡片',
      category: ['voice', 'case', 'faq', 'offer'].includes(data.category)
        ? data.category
        : preferredCategory || 'case',
      summary: data.summary || rawInput.slice(0, 60),
      content: data.content || rawInput,
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 5) : ['语音闪念'],
      links:
        filteredLinks.length > 0 ? filteredLinks : existingCards.slice(0, 1).map((c) => c.slug),
      updatedAt: '2026-11-11',
      sourceType: 'voice-memo',
    };

    writeWikiCardToDisk(workspaceId, newCard);
    res.json({ card: newCard, modelUsed });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '抽卡入库失败' });
  }
});

app.put('/api/brain/cards/:slug', (req, res) => {
  const { workspaceId, card } = req.body as { workspaceId: WorkspaceId; card: WikiCard };
  if (!workspaceId || !card) {
    res.status(400).json({ error: '参数缺失' });
    return;
  }
  writeWikiCardToDisk(workspaceId, { ...card, updatedAt: '2026-11-11' });
  res.json({ ok: true });
});

app.put('/api/workspace/forbidden-words', (req, res) => {
  const { workspaceId, words } = req.body as { workspaceId: WorkspaceId; words: string[] };
  const cleaned = Array.from(new Set((words || []).map((w) => w.trim()).filter(Boolean)));
  db.prepare(
    'INSERT OR REPLACE INTO custom_forbidden (workspace_id, words_json) VALUES (?, ?)'
  ).run(workspaceId, JSON.stringify(cleaned));
  res.json({ ok: true, words: cleaned });
});

app.post('/api/studio/generate', async (req, res) => {
  try {
    const {
      workspaceId,
      topicTitle,
      templateType,
      bossVoiceNote,
      referenceHook,
      selectedCardSlugs,
      coverUrl,
      refSourceUrl,
      model,
    } = req.body as {
      workspaceId: WorkspaceId;
      topicTitle: string;
      templateType: 'opinion' | 'three-questions' | 'pain-demo';
      bossVoiceNote?: string;
      referenceHook?: string;
      selectedCardSlugs?: string[];
      coverUrl?: string;
      refSourceUrl?: string;
      model?: string;
    };

    const ws = WORKSPACE_PROFILES[workspaceId] || WORKSPACE_PROFILES['d2-studio'];
    const forbidden = getForbiddenWords(workspaceId);
    const allCards = readWorkspaceCards(workspaceId);
    const chosenCards =
      selectedCardSlugs && selectedCardSlugs.length > 0
        ? allCards.filter((c) => selectedCardSlugs.includes(c.slug))
        : allCards.slice(0, 6);

    const templateGuide =
      templateType === 'opinion'
        ? `采用《观点反应型》骨架：借权威/真事钩子 → 即时感叹 → 翻译成老板体感 → 三项答案 → 数据判词【↑】 → 亲历案例与共同敌人反问(C段) → 主张收尾。`
        : templateType === 'three-questions'
        ? `采用《三问方法清单型》骨架：数字反差钩子 → 【↑】反常识论点 → 三问目录 → 第1/2/3问（否定蠢做法+口诀+真实案例） → 二选一收尾。`
        : `采用《痛点前置实拍型》骨架：业务损耗画面前置 → 反常识切口 → 三步系统实操演示 → 人工5分钟把关 → 合规进群领清单收尾。`;

    interface GeneratedDraftPayload {
      title: string;
      targetAudience: string;
      estimatedSeconds: number;
      beats: Array<{
        section: string;
        spokenText: string;
        deliveryCue: string;
        visualCue: string;
        emotionStage: 'A' | 'B' | 'C';
        citedCard?: string;
      }>;
      xhsTitleOptions: string[];
      xhsCaption: string;
      xhsTags: string[];
      xhsSlides: XiaohongshuSlide[];
      momentsCopy: string;
      pinnedCommentCta: string;
      citedCards: string[];
    }

    const { data, modelUsed } = await callLlmJson<GeneratedDraftPayload>({
      preferredModel: model,
      timeoutMs: 60000,
      system: `你是「${ws.brandTitle}」导演级内容官。直接交付【一鱼三吃】成品包。
硬纪律：
1. 前20字直接给具体数字或痛点画面，禁说“大家好”！
2. 严禁出现禁用词：${forbidden.join('、')}。
3. 深度引用下方【私有业务大脑卡片】，在 citedCard 填卡片 slug！
4. 同步生成 6 页小红书 3:4 卡片（page 1..6，layout 为 cover, contrast, data, steps, case, cta）。
5. 私域合规引流统一引导「${ws.wechatCta}」领取 ${ws.leadMagnetTitle}。`,
      user: `题目：${topicTitle}
参考钩子：${referenceHook || '无'}
老板补充观点：${bossVoiceNote || '按知识库主张发挥'}
结构要求：${templateGuide}

私有大脑卡片：
${chosenCards
  .map((c) => `--- [[${c.slug}]] ${c.title} ---\n${c.summary}\n${c.content.slice(0, 380)}`)
  .join('\n\n')}

返回严格 JSON（字段同 StudioScriptDraft：title, targetAudience, estimatedSeconds, beats, xhsTitleOptions, xhsCaption, xhsTags, xhsSlides[6], momentsCopy, pinnedCommentCta, citedCards）。`,
    });

    const cleanedBeats: ScriptBeat[] = (data.beats || []).map((b, idx) => ({
      id: `beat_${idx + 1}`,
      section: b.section,
      spokenText: scrubForbiddenWords(b.spokenText, forbidden),
      deliveryCue: b.deliveryCue,
      visualCue: b.visualCue,
      emotionStage: ['A', 'B', 'C'].includes(b.emotionStage) ? b.emotionStage : 'B',
      citedCard: b.citedCard || undefined,
    }));

    const draftId = `draft_${Date.now()}`;
    const draft: StudioScriptDraft = {
      id: draftId,
      workspaceId,
      title: scrubForbiddenWords(data.title || topicTitle, forbidden),
      templateType,
      targetAudience: data.targetAudience || ws.industryTag,
      estimatedSeconds: data.estimatedSeconds || 105,
      bossVoiceNote: bossVoiceNote || undefined,
      beats: cleanedBeats,
      xhsTitleOptions: (data.xhsTitleOptions || []).map((t) => scrubForbiddenWords(t, forbidden)),
      xhsCaption: scrubForbiddenWords(data.xhsCaption || '', forbidden),
      xhsTags: data.xhsTags || [],
      xhsSlides: data.xhsSlides || [],
      momentsCopy: scrubForbiddenWords(data.momentsCopy || '', forbidden),
      pinnedCommentCta: data.pinnedCommentCta || ws.wechatCta,
      citedCards: data.citedCards || chosenCards.slice(0, 3).map((c) => c.slug),
      createdAt: new Date().toISOString(),
    };

    db.prepare(
      'INSERT OR REPLACE INTO drafts (id, workspace_id, payload_json, created_at) VALUES (?, ?, ?, ?)'
    ).run(draft.id, workspaceId, JSON.stringify(draft), draft.createdAt);

    // Automatically archive into Content Vault as 'ready' work order!
    const vaultEntry: ContentVaultItem = {
      id: `vault_${Date.now()}`,
      workspaceId,
      title: draft.title,
      folder: 'AI新生成工单',
      platform: '全矩阵',
      format: '口播视频',
      templateType,
      status: 'ready',
      publishDate: new Date().toISOString().slice(0, 10),
      views: 0,
      likes: 0,
      collects: 0,
      shares: 0,
      leadsCount: 0,
      selfOutlierRatio: 0,
      hookLine: cleanedBeats[0]?.spokenText || referenceHook || '',
      reviewNote: '已生成完整口播分镜与小红书 6 页图卡，待实拍发布。',
      coverUrl: coverUrl || '',
      refSourceUrl: refSourceUrl || '',
      draftId,
    };
    db.prepare(
      'INSERT OR REPLACE INTO vault_items (id, workspace_id, payload_json, updated_at) VALUES (?, ?, ?, ?)'
    ).run(vaultEntry.id, workspaceId, JSON.stringify(vaultEntry), vaultEntry.publishDate);

    res.json({ draft, vaultEntry, modelUsed });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : '生成成品包失败',
    });
  }
});

app.put('/api/studio/drafts/:id', (req, res) => {
  const { draft } = req.body as { draft: StudioScriptDraft };
  if (!draft?.id) {
    res.status(400).json({ error: '无效草稿' });
    return;
  }
  db.prepare(
    'INSERT OR REPLACE INTO drafts (id, workspace_id, payload_json, created_at) VALUES (?, ?, ?, ?)'
  ).run(draft.id, draft.workspaceId, JSON.stringify(draft), draft.createdAt);
  res.json({ ok: true });
});

app.post('/api/studio/rewrite-beat', async (req, res) => {
  try {
    const { workspaceId, beat, mode, model } = req.body as {
      workspaceId: WorkspaceId;
      beat: ScriptBeat;
      mode: 'sharper' | 'inject-case' | 'shorter';
      model?: string;
    };
    const ws = WORKSPACE_PROFILES[workspaceId] || WORKSPACE_PROFILES['d2-studio'];
    const forbidden = getForbiddenWords(workspaceId);
    const cards = readWorkspaceCards(workspaceId).filter(
      (c) => c.category === 'case' || c.category === 'voice'
    );

    const instruction =
      mode === 'sharper'
        ? '改得更犀利扎心，去掉温吞铺垫'
        : mode === 'inject-case'
        ? '融入下方私有卡片里的真实细节或数字'
        : '压缩 30% 字数，口语干脆利落';

    const { data, modelUsed } = await callLlmJson<{
      spokenText: string;
      deliveryCue: string;
      visualCue: string;
    }>({
      preferredModel: model,
      system: `你是「${ws.brandTitle}」口播精修导演。禁用词：${forbidden.join('、')}。`,
      user: `原段落：${beat.spokenText}\n要求：${instruction}\n卡片：\n${cards
        .slice(0, 4)
        .map((c) => `- ${c.title}: ${c.summary}`)
        .join('\n')}\n返回 JSON：{"spokenText":"...","deliveryCue":"...","visualCue":"..."}`,
    });

    res.json({
      beat: {
        ...beat,
        spokenText: scrubForbiddenWords(data.spokenText, forbidden),
        deliveryCue: data.deliveryCue || beat.deliveryCue,
        visualCue: data.visualCue || beat.visualCue,
      },
      modelUsed,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : '重写失败' });
  }
});

app.post('/api/dealdesk/generate-stream', async (req, res) => {
  const { workspaceId, formData, model } = req.body as {
    workspaceId: WorkspaceId;
    formData: Record<string, unknown>;
    model?: string;
  };
  const ws = WORKSPACE_PROFILES[workspaceId] || WORKSPACE_PROFILES['d2-studio'];
  const cards = readWorkspaceCards(workspaceId);
  const cardContext = cards
    .slice(0, 6)
    .map((c) => `【${c.title}】：${c.summary}\n${c.content.slice(0, 240)}`)
    .join('\n\n');

  if (workspaceId === 'sartoria-image') {
    const seasonType = String(formData.seasonType || '暖秋羊绒型 / 亲和破冰感');
    const palettes: Record<string, Array<{ name: string; hex: string; role: string }>> = {
      '暖秋羊绒型 / 亲和破冰感': [
        { name: '暖米驼羊绒', hex: '#D8C7B0', role: '主视觉外搭（消解距离感）' },
        { name: '深浓缩咖啡', hex: '#382B24', role: '权威下装/大衣基底' },
        { name: '象牙真丝白', hex: '#F7F3EA', role: '面部提亮内搭' },
        { name: '古铜琥珀金', hex: '#9A6B32', role: '腕表/胸针点睛' },
      ],
      '深冬冷曜型 / 沉稳高智感': [
        { name: '午夜海军蓝', hex: '#1B2432', role: '路演/敲钟主战西装' },
        { name: '冷岩羊绒灰', hex: '#5A5E66', role: '日常董事会叠穿' },
        { name: '冰川骨瓷白', hex: '#F4F6F8', role: '高对比度挺括衬衫' },
        { name: '勃艮第暗红', hex: '#6E2630', role: '领带/口袋巾权力锚点' },
      ],
      '净春静奢型 / 儒雅松弛感': [
        { name: '鼠尾草灰绿', hex: '#7D8B7E', role: '私享晚宴/闭门会单西' },
        { name: '燕麦亚麻色', hex: '#E5DEC9', role: '松弛老钱感针织基底' },
        { name: '深炭石板灰', hex: '#2B2E2D', role: '垂感西裤稳住气场' },
        { name: '焦糖马鞍皮', hex: '#8C5230', role: '皮具鞋履质感呼应' },
      ],
    };

    await streamLlmMarkdown({
      res,
      preferredModel: model,
      metaPayload: { swatches: palettes[seasonType] || palettes['暖秋羊绒型 / 亲和破冰感'] },
      system: `你是「${ws.brandTitle}」首席高管形象顾问。输出《一号位专属商业形象诊断与衣橱重构提案书》（Markdown）。`,
      user: `客户：${formData.clientName}\n场景：${formData.scenarios}\n痛点：${formData.painPoints}\n色盘：${seasonType}\n档位：${formData.packageTier}\n知识库：\n${cardContext}\n按5节输出：1.视觉资产现状归因 2.专属色彩与面料秩序 3.三大商业场景胶囊矩阵 4.30天零逛街交付排期 5.合作确认项。`,
    });
    return;
  }

  if (workspaceId === 'apex-trade') {
    const unitCostRmb = Number(formData.unitCostRmb || 185);
    const packShipLocalRmb = Number(formData.packShipLocalRmb || 14);
    const fxRate = Number(formData.fxRate || 7.12);
    const fxBufferPct = Number(formData.fxBufferPct || 1.5) / 100;
    const targetMarginPct = Number(formData.targetMarginPct || 28) / 100;
    const cifFreightPerUnitUsd = Number(formData.cifFreightUsd || 2.45);
    const safeFx = +(fxRate * (1 - fxBufferPct)).toFixed(3);
    const baseCostUsd = (unitCostRmb + packShipLocalRmb) / safeFx;

    const tiers = [
      { moq: '500 pcs (Trial Order)', qty: 500, margin: targetMarginPct + 0.04 },
      { moq: '2,000 pcs (Standard Container)', qty: 2000, margin: targetMarginPct },
      { moq: '5,000+ pcs (Annual Framework)', qty: 5000, margin: Math.max(0.12, targetMarginPct - 0.035) },
    ].map((t) => {
      const fob = +(baseCostUsd / (1 - t.margin)).toFixed(2);
      const cif = +(fob + cifFreightPerUnitUsd).toFixed(2);
      return {
        moq: t.moq,
        grossMargin: `${(t.margin * 100).toFixed(1)}%`,
        fobUsd: fob,
        cifUsd: cif,
        estGrossProfitUsd: +((fob - baseCostUsd) * t.qty).toFixed(0),
      };
    });

    await streamLlmMarkdown({
      res,
      preferredModel: model,
      metaPayload: { quoteCalc: { safeFx, baseCostUsd: +baseCostUsd.toFixed(2), tiers } },
      system: `你是「${ws.brandTitle}」资深外贸总监。输出《买家背调洞察 + 高回复率定制英文回复邮件 + 谈判底线备忘》。`,
      user: `买家：${formData.buyerCompany}\n产品：${formData.productName}\n询盘关注点：${formData.buyerInquiry}\n阶梯报价：${JSON.stringify(tiers)}\n参考：\n${cardContext}`,
    });
    return;
  }

  await streamLlmMarkdown({
    res,
    preferredModel: model,
    system: `你是「${ws.brandTitle}」主理人 D2。针对潜在老板客户输出《企业信息流断点诊断与 AI 业务大脑部署提案书》。`,
    user: `客户：${formData.prospectName}\n现状：${formData.teamSize}\n卡点：${formData.painPoint}\n目标：${formData.goal}\n参考：\n${cardContext}\n按4节输出：1.现状病灶诊断 2.每日15分钟冠名工作台闭环 3.首月交钥匙交付清单 4.投入产出算式与7天验证邀约。`,
  });
});

async function startServer() {
  const port = Number(process.env.PORT || 5188);
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: ROOT_DIR,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`\n✨ BossDesk Full-Stack Server running at http://localhost:${port}\n`);
  });
}

startServer();
