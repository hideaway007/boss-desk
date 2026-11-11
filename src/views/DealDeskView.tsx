import React, { useState } from 'react';
import {
  Briefcase,
  Sparkles,
  Printer,
  Copy,
  Check,
  Loader2,
  Calculator,
  Palette,
  FileCheck2,
} from 'lucide-react';
import type { WorkspaceProfile } from '../types';

interface Props {
  profile: WorkspaceProfile;
  selectedModel: string;
}

interface SwatchItem {
  name: string;
  hex: string;
  role: string;
}

interface QuoteTier {
  moq: string;
  grossMargin: string;
  fobUsd: number;
  cifUsd: number;
  estGrossProfitUsd: number;
}

function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-[var(--ink-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const ExecutiveMarkdownView: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === '---' || trimmed === '***') {
      blocks.push(
        <hr key={i} className="my-4 border-t border-[var(--border-strong)]" />
      );
    } else if (trimmed.startsWith('# ')) {
      blocks.push(
        <h1
          key={i}
          className="font-editorial text-2xl font-bold tracking-tight text-[var(--ink-primary)] pb-2 border-b border-[var(--border-strong)] mb-3"
        >
          {renderInlineBold(trimmed.slice(2))}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      blocks.push(
        <h2
          key={i}
          className="mt-6 mb-2.5 pl-3 border-l-[3px] font-editorial text-lg font-bold text-[var(--ink-primary)]"
          style={{ borderColor: 'var(--brand-accent)' }}
        >
          {renderInlineBold(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      blocks.push(
        <h3
          key={i}
          className="mt-4 mb-1.5 text-sm font-bold text-[var(--ink-primary)]"
        >
          {renderInlineBold(trimmed.slice(4))}
        </h3>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push(
        <div key={i} className="flex items-start gap-2 pl-2 my-1 text-[13px] leading-relaxed text-[var(--ink-secondary)]">
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: 'var(--brand-accent)' }}
          />
          <div>{renderInlineBold(trimmed.slice(2))}</div>
        </div>
      );
    } else if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
      blocks.push(
        <div key={i} className="flex items-start gap-2 pl-1 my-1.5 text-[13px] leading-relaxed text-[var(--ink-secondary)]">
          <span className="font-mono-num font-bold text-xs text-[var(--brand-accent)] mt-0.5 shrink-0">
            {match?.[1]}
          </span>
          <div>{renderInlineBold(match?.[2] || trimmed)}</div>
        </div>
      );
    } else if (trimmed.startsWith('> ')) {
      blocks.push(
        <blockquote
          key={i}
          className="my-3 rounded-lg bg-[var(--bg-subtle)]/80 px-4 py-2.5 text-xs italic text-[var(--ink-secondary)] border-l-2"
          style={{ borderColor: 'var(--brand-accent)' }}
        >
          {renderInlineBold(trimmed.slice(2))}
        </blockquote>
      );
    } else {
      blocks.push(
        <p key={i} className="my-2 text-[13.5px] leading-7 text-[var(--ink-secondary)]">
          {renderInlineBold(trimmed)}
        </p>
      );
    }
  }

  return <div className="space-y-1">{blocks}</div>;
};

export const DealDeskView: React.FC<Props> = ({ profile, selectedModel }) => {
  // Workspace-specific form states with realistic ready-to-demo defaults
  const [d2Form, setD2Form] = useState({
    prospectName: '林总 · 高端商业形象定制机构创始人（客单 3.8万–6.8万）',
    teamSize: '创始人 1 人 + 形象助理 2 人，高净值老客转介绍为主',
    painPoint:
      '上过别人 AI 课看到 9 菜单静态工作台很心动，但平时给企业家做私密试装太忙，根本没时间手动填表、拼提示词；每次见完客户手写专属形象诊断 PPT 还要熬夜 3 小时',
    goal: '每天只花 15 分钟稳定日更抖音+小红书获客，且见完客户 5 分钟直出高定形象诊断提案书，每月多签 3 个 6.8 万年框',
  });

  const [imageForm, setImageForm] = useState({
    clientName: '张总 · 拟科创板上市医疗器械公司女创始人 (44岁)',
    scenarios: '证监会问询与上市路演答辩 / 欧洲跨国医院院长考察 / 行业千人峰会主旨演讲',
    painPoints:
      '过去习惯穿纯黑硬挺西装+白衬衫显得过于紧绷凌厉，镜头特写面部暗沉有距离感，缺乏现代科技领军者的松弛笃定气场',
    seasonType: '暖秋羊绒型 / 亲和破冰感',
    packageTier: '¥68,000 年度一号位私享陪伴（四季胶囊衣橱重构 + 3 场重大公开亮相定妆督导）',
  });

  const [tradeForm, setTradeForm] = useState({
    buyerCompany: 'NordicLiving GmbH（德国汉堡 18 家门店中高端家居进口商）',
    productName: 'FSC 认证天然白橡木贴皮声学护墙板 (2400×600×21mm)',
    buyerInquiry:
      '询问 2000 片首柜交期、欧盟 REACH/FSC 证书编号及汉堡港 CIF 阶梯报价，特别提到上家供应商边角海运破损率高',
    unitCostRmb: 185,
    packShipLocalRmb: 14,
    fxRate: 7.12,
    fxBufferPct: 1.5,
    targetMarginPct: 28,
    cifFreightUsd: 2.45,
  });

  const [streaming, setStreaming] = useState<boolean>(false);
  const [markdownOut, setMarkdownOut] = useState<string>('');
  const [activeModelUsed, setActiveModelUsed] = useState<string>('');
  const [swatches, setSwatches] = useState<SwatchItem[]>([
    { name: '暖米驼羊绒', hex: '#D8C7B0', role: '主视觉外搭（消解距离感）' },
    { name: '深浓缩咖啡', hex: '#382B24', role: '权威下装/大衣基底' },
    { name: '象牙真丝白', hex: '#F7F3EA', role: '面部提亮内搭' },
    { name: '古铜琥珀金', hex: '#9A6B32', role: '腕表/胸针点睛' },
  ]);
  const [copied, setCopied] = useState<boolean>(false);

  // Live instant math preview for Apex Trade even before clicking AI stream
  const liveTradeCalc = React.useMemo(() => {
    const safeFx = +(tradeForm.fxRate * (1 - tradeForm.fxBufferPct / 100)).toFixed(3);
    const baseUsd = (Number(tradeForm.unitCostRmb) + Number(tradeForm.packShipLocalRmb)) / safeFx;
    const m = Number(tradeForm.targetMarginPct) / 100;
    const tiers: QuoteTier[] = [
      { moq: '500 pcs (试单小批)', qty: 500, margin: Math.min(0.65, m + 0.04) },
      { moq: '2,000 pcs (标准整柜)', qty: 2000, margin: m },
      { moq: '5,000+ pcs (年度框架)', qty: 5000, margin: Math.max(0.12, m - 0.035) },
    ].map((t) => {
      const fob = +(baseUsd / (1 - t.margin)).toFixed(2);
      const cif = +(fob + Number(tradeForm.cifFreightUsd)).toFixed(2);
      return {
        moq: t.moq,
        grossMargin: `${(t.margin * 100).toFixed(1)}%`,
        fobUsd: fob,
        cifUsd: cif,
        estGrossProfitUsd: Math.round((fob - baseUsd) * t.qty),
      };
    });
    return { safeFx, baseUsd: +baseUsd.toFixed(2), tiers };
  }, [tradeForm]);

  const handleRunDealStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setStreaming(true);
    setMarkdownOut('');
    setActiveModelUsed('');

    const formData =
      profile.id === 'sartoria-image'
        ? imageForm
        : profile.id === 'apex-trade'
        ? tradeForm
        : d2Form;

    try {
      const res = await fetch('/api/dealdesk/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: profile.id,
          formData,
          model: selectedModel,
        }),
      });

      if (!res.body) throw new Error('流式通道未建立');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          try {
            const evt = JSON.parse(trimmed.slice(5).trim());
            if (evt.type === 'meta' && evt.swatches) {
              setSwatches(evt.swatches);
            } else if (evt.type === 'model') {
              setActiveModelUsed(evt.model);
            } else if (evt.type === 'delta') {
              setMarkdownOut((prev) => prev + evt.text);
            } else if (evt.type === 'error') {
              setMarkdownOut((prev) => prev + `\n\n> ⚠️ ${evt.message}`);
            }
          } catch {
            // ignore
          }
        }
      }
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="border-b border-[var(--border-hairline)] pb-4">
        <p className="text-xs font-medium text-[var(--ink-muted)]">
          客户交付件自动生成
        </p>
        <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-[var(--ink-primary)]">
          {profile.dealPluginTitle}
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Input Console */}
        <form
          onSubmit={handleRunDealStream}
          className="lg:col-span-5 rounded-2xl border border-[var(--border-strong)] bg-white p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
            <h3 className="text-sm font-bold text-[var(--ink-primary)] flex items-center gap-2">
              {profile.id === 'apex-trade' ? (
                <Calculator className="h-4 w-4 text-[var(--brand-accent)]" />
              ) : profile.id === 'sartoria-image' ? (
                <Palette className="h-4 w-4 text-[var(--brand-accent)]" />
              ) : (
                <FileCheck2 className="h-4 w-4 text-[var(--brand-accent)]" />
              )}
              客户面谈 / 询盘参数录入
            </h3>
            <span className="text-[11px] text-[var(--ink-muted)]">联动私有大脑卡片库</span>
          </div>

          {profile.id === 'sartoria-image' ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">客户称呼与行业一号位身份：</label>
                <input
                  type="text"
                  value={imageForm.clientName}
                  onChange={(e) => setImageForm({ ...imageForm, clientName: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">近期三大核心出席场景：</label>
                <input
                  type="text"
                  value={imageForm.scenarios}
                  onChange={(e) => setImageForm({ ...imageForm, scenarios: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">四季色彩与气质方向判定：</label>
                <select
                  value={imageForm.seasonType}
                  onChange={(e) => setImageForm({ ...imageForm, seasonType: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 font-medium"
                >
                  <option value="暖秋羊绒型 / 亲和破冰感">暖秋羊绒型 / 亲和破冰感</option>
                  <option value="深冬冷曜型 / 沉稳高智感">深冬冷曜型 / 沉稳高智感</option>
                  <option value="净春静奢型 / 儒雅松弛感">净春静奢型 / 儒雅松弛感</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">面谈形象痛点观察：</label>
                <textarea
                  rows={3}
                  value={imageForm.painPoints}
                  onChange={(e) => setImageForm({ ...imageForm, painPoints: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">推荐签约档位：</label>
                <input
                  type="text"
                  value={imageForm.packageTier}
                  onChange={(e) => setImageForm({ ...imageForm, packageTier: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>
            </div>
          ) : profile.id === 'apex-trade' ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">海外买家公司名 / 官网特征：</label>
                <input
                  type="text"
                  value={tradeForm.buyerCompany}
                  onChange={(e) => setTradeForm({ ...tradeForm, buyerCompany: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">询盘产品型号与规格：</label>
                <input
                  type="text"
                  value={tradeForm.productName}
                  onChange={(e) => setTradeForm({ ...tradeForm, productName: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold mb-1">出厂裸成本 (¥ RMB)：</label>
                  <input
                    type="number"
                    value={tradeForm.unitCostRmb}
                    onChange={(e) =>
                      setTradeForm({ ...tradeForm, unitCostRmb: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-1.5 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">加固包材+港杂 (¥ RMB)：</label>
                  <input
                    type="number"
                    value={tradeForm.packShipLocalRmb}
                    onChange={(e) =>
                      setTradeForm({ ...tradeForm, packShipLocalRmb: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-1.5 font-mono-num"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-[var(--bg-subtle)]/70 p-3 space-y-2">
                <div className="flex justify-between font-semibold">
                  <span>目标基准毛利率：{tradeForm.targetMarginPct}%</span>
                  <span className="font-mono-num text-[var(--brand-accent)]">
                    安全锁汇汇率：{liveTradeCalc.safeFx}
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={50}
                  value={tradeForm.targetMarginPct}
                  onChange={(e) =>
                    setTradeForm({ ...tradeForm, targetMarginPct: Number(e.target.value) })
                  }
                  className="w-full accent-[var(--brand-accent)]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">买家邮件关注点：</label>
                <textarea
                  rows={2}
                  value={tradeForm.buyerInquiry}
                  onChange={(e) => setTradeForm({ ...tradeForm, buyerInquiry: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">潜在老板称呼与所处行业：</label>
                <input
                  type="text"
                  value={d2Form.prospectName}
                  onChange={(e) => setD2Form({ ...d2Form, prospectName: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">团队规模与当前获客现状：</label>
                <input
                  type="text"
                  value={d2Form.teamSize}
                  onChange={(e) => setD2Form({ ...d2Form, teamSize: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">面谈挖出的最痛信息流断点：</label>
                <textarea
                  rows={4}
                  value={d2Form.painPoint}
                  onChange={(e) => setD2Form({ ...d2Form, painPoint: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2 leading-relaxed"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">老板期望达成的业务结果：</label>
                <input
                  type="text"
                  value={d2Form.goal}
                  onChange={(e) => setD2Form({ ...d2Form, goal: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border-strong)] px-3 py-2"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={streaming}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
            style={{ backgroundColor: 'var(--brand-accent)' }}
          >
            {streaming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                正在实时流式撰写高客单交付件…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                一键流式生成可成交提案书 / 报价函
              </>
            )}
          </button>
        </form>

        {/* Right Deliverable Preview Document */}
        <div className="lg:col-span-7 rounded-2xl border border-[var(--border-strong)] bg-[#FDFBF7] p-7 shadow-sm space-y-5 min-h-[540px]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-strong)] pb-4">
            <div>
              <p className="text-[10px] font-mono-num tracking-widest uppercase text-[var(--ink-muted)]">
                {profile.englishKicker} · BESPOKE DELIVERABLE
              </p>
              <h3 className="font-editorial text-xl font-bold text-[var(--ink-primary)]">
                {profile.brandTitle} · 客户专属交付件
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {activeModelUsed && (
                <span className="text-[10px] font-mono-num text-[var(--ink-muted)]">
                  引擎：{activeModelUsed.split('/').pop()}
                </span>
              )}
              {markdownOut && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(markdownOut);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-white px-3 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {copied ? (
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
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" /> 打印 / 存为 PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Visual Header Widgets tailored per industry */}
          {profile.id === 'sartoria-image' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {swatches.map((sw) => (
                <div
                  key={sw.name}
                  className="rounded-xl border border-[var(--border-hairline)] bg-white p-2.5"
                >
                  <div
                    className="h-10 w-full rounded-lg border border-black/10"
                    style={{ backgroundColor: sw.hex }}
                  />
                  <div className="mt-2 text-xs font-bold text-[var(--ink-primary)]">
                    {sw.name}
                  </div>
                  <div className="text-[10px] text-[var(--ink-muted)] leading-tight mt-0.5">
                    {sw.role}
                  </div>
                </div>
              ))}
            </div>
          )}

          {profile.id === 'apex-trade' && (
            <div className="rounded-xl border border-[var(--border-strong)] bg-white overflow-hidden">
              <div className="bg-[var(--bg-subtle)] px-4 py-2 text-xs font-bold flex justify-between">
                <span>防亏本阶梯报价实时核算表（已含汇率缓冲 {tradeForm.fxBufferPct}%）</span>
                <span className="font-mono-num">单位裸成本折算：${liveTradeCalc.baseUsd} USD</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] text-left text-[var(--ink-muted)]">
                    <th className="py-2 px-4">订购阶梯 (MOQ)</th>
                    <th className="py-2 px-3">保底毛利率</th>
                    <th className="py-2 px-3">FOB 单价</th>
                    <th className="py-2 px-3">CIF 汉堡港</th>
                    <th className="py-2 px-4 text-right">本单预计毛利</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] font-mono-num">
                  {liveTradeCalc.tiers.map((t) => (
                    <tr key={t.moq}>
                      <td className="py-2.5 px-4 font-sans font-semibold">{t.moq}</td>
                      <td className="py-2.5 px-3">{t.grossMargin}</td>
                      <td className="py-2.5 px-3 font-bold text-[var(--brand-accent)]">
                        ${t.fobUsd.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">${t.cifUsd.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-800">
                        +${t.estGrossProfitUsd.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Streamed Proposal Markdown Body */}
          {markdownOut ? (
            <div className="max-w-none bg-white rounded-xl border border-[var(--border-hairline)] p-7 shadow-2xs">
              <ExecutiveMarkdownView content={markdownOut} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-white/60 py-20 px-6 text-center space-y-2">
              <Sparkles className="h-6 w-6 mx-auto text-[var(--brand-accent)] opacity-80" />
              <p className="text-sm font-semibold text-[var(--ink-primary)]">
                左侧参数已预填真实客户场景，点击下方生成按钮即可实时流式输出完整商业提案书
              </p>
              <p className="text-xs text-[var(--ink-muted)]">
                生成过程将自动融合「私有业务大脑」中的标杆案例与服务报价边界，可直接打印 PDF 发给老板客户签单。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
