export type WorkspaceId = 'd2-studio' | 'sartoria-image' | 'apex-trade';

export type NavTab = 'morning' | 'radar' | 'studio' | 'vault' | 'brain' | 'dealdesk';

export interface WorkspaceProfile {
  id: WorkspaceId;
  brandTitle: string;
  brandSubtitle: string;
  englishKicker: string;
  ownerName: string;
  ownerRole: string;
  accentColor: string;
  accentSoft: string;
  sealLabel: string;
  industryTag: string;
  dealPluginTitle: string;
  dealPluginDesc: string;
  monitoredAccountsCount: number;
  defaultTrackFilter: number | 'all';
  forbiddenWords: string[];
  leadMagnetTitle: string;
  wechatCta: string;
}

export interface MorningBriefItem {
  id: string;
  kind: 'outlier' | 'authority' | 'signal';
  badge: string;
  title: string;
  sourceAuthor: string;
  sourceFans: number;
  outlierRatio?: number;
  shareRate?: number;
  likes?: number;
  baselineLikes?: number;
  whyItWorks: string;
  suggestedHook: string;
  recommendedTemplate: 'opinion' | 'three-questions' | 'pain-demo';
  matchedCards: string[];
  rawVideoId?: string;
  shareUrl?: string;
  coverUrl?: string;
}

export interface RadarVideoItem {
  id: string;
  trackId: number;
  trackShort: string;
  trackName: string;
  author: string;
  fans: number;
  createDate: string;
  likes: number;
  comments: number;
  collects: number;
  shares: number;
  baselineMedian: number;
  outlierRatio: number;
  shareRate: number;
  collectRate: number;
  angle: string;
  angleLabel: string;
  audience: string;
  relevance: string;
  title: string;
  shareUrl: string;
  coverUrl?: string;
  avatarUrl?: string;
  galleryUrls?: string[];
  durationSec?: number;
}

export interface TrackSummary {
  trackId: number;
  trackShort: string;
  trackName: string;
  validAccounts: number;
  scoredVideos: number;
  outlierVideos: number;
  outlierAccounts: number;
  medianBaselineLikes: number;
  doublingRate: number;
  bossDoublingRate: number;
  shareToLikeRatio: number;
  signal: string;
}

export type WikiCardCategory = 'voice' | 'case' | 'faq' | 'offer';

export interface WikiCard {
  id: string;
  slug: string;
  title: string;
  category: WikiCardCategory;
  summary: string;
  content: string;
  tags: string[];
  links: string[];
  updatedAt: string;
  sourceType?: 'voice-memo' | 'interview' | 'manual' | 'data-proof';
}

export interface ScriptBeat {
  id: string;
  section: string;
  spokenText: string;
  deliveryCue: string;
  visualCue: string;
  emotionStage: 'A' | 'B' | 'C';
  citedCard?: string;
}

export interface XiaohongshuSlide {
  page: number;
  layout: 'cover' | 'contrast' | 'data' | 'steps' | 'case' | 'cta';
  eyebrow: string;
  headline: string;
  subheadline?: string;
  bullets: string[];
  highlightMetric?: string;
  footerNote: string;
}

export interface StudioScriptDraft {
  id: string;
  workspaceId: WorkspaceId;
  title: string;
  templateType: 'opinion' | 'three-questions' | 'pain-demo';
  targetAudience: string;
  estimatedSeconds: number;
  sourceBriefId?: string;
  bossVoiceNote?: string;
  beats: ScriptBeat[];
  xhsTitleOptions: string[];
  xhsCaption: string;
  xhsTags: string[];
  xhsSlides: XiaohongshuSlide[];
  momentsCopy: string;
  pinnedCommentCta: string;
  citedCards: string[];
  createdAt: string;
}

export type VaultStatus = 'idea' | 'writing' | 'ready' | 'published';

export interface ContentVaultItem {
  id: string;
  workspaceId: WorkspaceId;
  title: string;
  folder: string; // 归纳系列/栏目
  platform: '抖音' | '小红书' | '视频号' | '全矩阵';
  format: '口播视频' | '6页图文' | '实拍Vlog';
  templateType: 'opinion' | 'three-questions' | 'pain-demo';
  status: VaultStatus;
  publishDate: string;
  views: number;
  likes: number;
  collects: number;
  shares: number;
  leadsCount: number; // 带来的精准私信询盘数
  selfOutlierRatio: number; // 相对本号均值的倍数
  hookLine: string;
  reviewNote: string; // 复盘总结
  coverUrl?: string;
  refSourceUrl?: string;
  draftId?: string;
}

export interface AccountMatrixItem {
  id: string;
  platform: '抖音' | '小红书' | '视频号' | '公众号';
  handle: string;
  role: string;
  postsCount: number;
  totalViews: number;
  avgViews: number;
  weeklyLikes: number;
  weeklyLeads: number;
}

export interface DailyTrendPoint {
  date: string;
  views: number;
  interactions: number;
  leads: number;
}

export interface HookAssetItem {
  id: string;
  workspaceId: WorkspaceId;
  hookType: '量化反差' | '痛点扎心' | '借权威反应' | '结果前置';
  content: string;
  sourceTitle: string;
  effectScore: number; // 1-5
}
