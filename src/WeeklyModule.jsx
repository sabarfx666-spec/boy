import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Newspaper, Upload, X, Image } from 'lucide-react';
import { getWeekEvents, getMondayOf, getWeekLabel, addWeeks } from './data/newsEvents.js';

const DISCORD_WEBHOOK = import.meta.env.VITE_DISCORD_WEEKLY;

const YEARS = [2022, 2023, 2024, 2025, 2026];

const CurrencyTag = ({ c }) => {
  const palettes = {
    USD: 'bg-[rgba(74,144,217,0.15)]  text-[#4a90d9]  border-[rgba(74,144,217,0.3)]',
    GBP: 'bg-[rgba(0,200,150,0.15)]   text-[#00c896]  border-[rgba(0,200,150,0.3)]',
    EUR: 'bg-[rgba(245,166,35,0.15)]  text-[#f5a623]  border-[rgba(245,166,35,0.3)]',
    JPY: 'bg-[rgba(255,71,87,0.15)]   text-[#ff4757]  border-[rgba(255,71,87,0.3)]',
  };
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${palettes[c] || 'bg-[#2a2d3e] text-[#8888aa] border-[#2a2d3e]'}`}>
      {c}
    </span>
  );
};

const DAY_LABELS = { Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday' };

const StatusBadge = ({ status }) => {
  const map = {
    Win:          'bg-[rgba(0,200,150,0.15)]  text-[#00c896]',
    Loss:         'bg-[rgba(255,71,87,0.15)]   text-[#ff4757]',
    'Break Even': 'bg-[rgba(245,166,35,0.15)] text-[#f5a623]',
    'No Trade':   'bg-[rgba(138,138,170,0.15)] text-[#8888aa]',
  };
  const lbl = { 'Break Even': 'BE', 'No Trade': 'NO TRADE' };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${map[status] || ''}`}>
      {lbl[status] || status}
    </span>
  );
};

export default function WeeklyModule({ weeklyPlans, setWeeklyPlans, backtestDate, trades = [] }) {
  const initialMonday = getMondayOf(backtestDate || new Date().toISOString().split('T')[0]);
  const [currentMonday, setCurrentMonday] = useState(initialMonday);
  const [discordStatus, setDiscordStatus] = useState('idle'); // idle | sending | sent | error
  const [dragOver, setDragOver] = useState(null); // 'imgBefore' | 'imgAfter' | null
  const [pairInput, setPairInput] = useState('');
  const [savedPairs, setSavedPairs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('profx_saved_pairs')) || ['EUR/USD','GBP/USD','GBP/JPY']; } catch { return ['EUR/USD','GBP/USD','GBP/JPY']; }
  });
  const savePairs = (updated) => { setSavedPairs(updated); localStorage.setItem('profx_saved_pairs', JSON.stringify(updated)); };
  const fileRefBefore = useRef(null);
  const fileRefAfter  = useRef(null);

  const plan = weeklyPlans[currentMonday] || {};
  const events = getWeekEvents(currentMonday);

  // Filter trades Mon–Sun of this week
  const weekEnd = (() => {
    const d = new Date(currentMonday + 'T12:00:00');
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  })();
  const weekTrades = trades
    .filter(t => t.date >= currentMonday && t.date <= weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date));
  const stats = weekTrades.reduce(
    (acc, t) => {
      if (t.status === 'Win')             acc.wins++;
      else if (t.status === 'Loss')       acc.losses++;
      else if (t.status === 'Break Even') acc.be++;
      else if (t.status === 'No Trade')   acc.nt++;
      acc.pnl += t.pnl || 0;
      return acc;
    },
    { wins: 0, losses: 0, be: 0, nt: 0, pnl: 0 }
  );

  const setPlan = (key, val) =>
    setWeeklyPlans(prev => ({
      ...prev,
      [currentMonday]: { ...prev[currentMonday], [key]: val },
    }));

  const readImageFile = (key, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPlan(key, ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleImagePaste = (key) => (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        readImageFile(key, item.getAsFile());
        e.preventDefault();
        break;
      }
    }
  };

  const handleImageDrop = (key) => (e) => {
    e.preventDefault();
    setDragOver(null);
    readImageFile(key, e.dataTransfer.files?.[0]);
  };

  const dataURLtoBlob = (dataURL) => {
    const [header, base64] = dataURL.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const sendToDiscord = async () => {
    setDiscordStatus('sending');
    const label = getWeekLabel(currentMonday);
    const tradeLines = weekTrades.length > 0
      ? weekTrades.map(t => {
          const d = new Date(t.date + 'T12:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
          const pnl = t.pnl !== 0 ? ` | ${t.pnl > 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '';
          return `• ${d} | **${t.pair}** | ${t.direction} | ${t.session} | ${t.status.toUpperCase()}${pnl}`;
        }).join('\n')
      : '  No trades logged.';

    const pnlStr   = `${stats.pnl >= 0 ? '+' : ''}$${stats.pnl.toFixed(2)}`;
    const pnlColor = stats.pnl > 0 ? 0x00c896 : stats.pnl < 0 ? 0xff4757 : 0x8888aa;

    const hasBefore = !!plan.imgBefore;
    const hasAfter  = !!plan.imgAfter;

    const embed = {
      title: `📊  ${label}`,
      color: pnlColor,
      fields: [
        {
          name: '📈 Results',
          value: `✅ **${stats.wins}** Wins   ❌ **${stats.losses}** Losses   ➖ **${stats.be}** BE   🚫 **${stats.nt}** No Trade`,
          inline: false,
        },
        { name: '💰 Week P&L', value: `**${pnlStr} USD**`, inline: true },
        plan.pair  ? { name: '💱 Pair',  value: plan.pair,  inline: true } : null,
        plan.bias  ? { name: '📋 Bias',  value: plan.bias,  inline: true } : null,
        plan.dol   ? { name: '🎯 DOL',   value: plan.dol,   inline: true } : null,
        { name: '📅 Trades', value: tradeLines, inline: false },
        plan.notes ? { name: '📝 Notes', value: plan.notes, inline: false } : null,
      ].filter(Boolean),
      // Reference attached images directly in the embed
      ...(hasBefore ? { thumbnail: { url: 'attachment://before.png' } } : {}),
      ...(hasAfter  ? { image:     { url: 'attachment://after.png'  } } : {}),
      footer: { text: `ProFx Backtesting Journal${plan.done ? '  ·  ✅ Week Complete' : ''}` },
      timestamp: new Date().toISOString(),
    };

    try {
      const formData = new FormData();
      formData.append('payload_json', JSON.stringify({ username: 'ProFx Journal', embeds: [embed] }));
      if (hasBefore) formData.append('files[0]', dataURLtoBlob(plan.imgBefore), 'before.png');
      if (hasAfter)  formData.append('files[1]', dataURLtoBlob(plan.imgAfter),  'after.png');

      const res = await fetch(DISCORD_WEBHOOK, { method: 'POST', body: formData });
      if (res.ok || res.status === 204) {
        setDiscordStatus('sent');
      } else {
        setDiscordStatus('error');
      }
    } catch {
      setDiscordStatus('error');
    }
    setTimeout(() => setDiscordStatus('idle'), 3000);
  };

  const currentYear = new Date(currentMonday + 'T12:00:00').getFullYear();

  const jumpToYear = (yr) => {
    const d = new Date(`${yr}-01-06T12:00:00`);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    setCurrentMonday(d.toISOString().split('T')[0]);
  };

  const groupedByDay = ['Mon','Tue','Wed','Thu','Fri'].reduce((acc, day) => {
    acc[day] = events.filter(e => e.day === day);
    return acc;
  }, {});

  const hasEvents = events.length > 0;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Week Navigator ── */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5">
          {YEARS.map(yr => (
            <button
              key={yr}
              onClick={() => jumpToYear(yr)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
                currentYear === yr
                  ? 'text-white shadow shadow-[rgba(74,144,217,0.4)]'
                  : 'bg-[#161829] border border-[#2a2d3e] text-[#5a5d7a] hover:text-white hover:border-[#4a4d5e]'
              }`}
              style={currentYear === yr ? { background: 'linear-gradient(135deg,#4a90d9,#3a7ac9)' } : {}}
            >
              {yr}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonday(addWeeks(currentMonday, -1))}
            disabled={currentMonday <= '2022-01-03'}
            className="p-2 rounded-lg bg-[#161829] border border-[#2a2d3e] text-[#8888aa] hover:text-white hover:border-[#4a4d5e] disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1 text-center">
            <div className="text-white font-bold text-sm">{getWeekLabel(currentMonday)}</div>
            <div className="text-[10px] text-[#5a5d7a] mt-0.5">{events.length} high-impact event{events.length !== 1 ? 's' : ''} this week</div>
          </div>
          <button
            onClick={() => setCurrentMonday(addWeeks(currentMonday, 1))}
            disabled={currentMonday >= '2026-12-28'}
            className="p-2 rounded-lg bg-[#161829] border border-[#2a2d3e] text-[#8888aa] hover:text-white hover:border-[#4a4d5e] disabled:opacity-30 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Left: Weekly Plan ── */}
        <div className="flex flex-col gap-4">

          {/* Weekly Bias */}
          <div className="rounded-xl border border-[#2a2d3e] bg-[#161829] p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#5a5d7a] mb-3">Weekly Bias</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k:'Bullish', label:'▲ Bullish', cls: plan.bias === 'Bullish' ? 'bg-[#00c896] text-black shadow-lg shadow-[rgba(0,200,150,0.3)]' : '' },
                { k:'Bearish', label:'▼ Bearish', cls: plan.bias === 'Bearish' ? 'bg-[#ff4757] text-white shadow-lg shadow-[rgba(255,71,87,0.3)]'  : '' },
                { k:'Ranging', label:'↔ Ranging', cls: plan.bias === 'Ranging' ? 'bg-[#f5a623] text-black shadow-lg shadow-[rgba(245,166,35,0.3)]' : '' },
              ].map(({ k, label, cls }) => (
                <button key={k} onClick={() => setPlan('bias', plan.bias === k ? null : k)}
                  className={`py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all ${cls || 'bg-[#0f111a] border border-[#2a2d3e] text-[#8888aa] hover:border-[#4a4d5e]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Asset Pair */}
          <div className="rounded-xl border border-[#2a2d3e] bg-[#161829] p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#5a5d7a] mb-3">Asset Pair</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {savedPairs.map(p => (
                <div key={p} className="group relative flex items-center">
                  <button
                    onClick={() => setPlan('pair', plan.pair === p ? null : p)}
                    className={`py-1.5 pl-3 pr-6 rounded-lg text-xs font-mono font-bold transition-all ${
                      plan.pair === p
                        ? 'bg-[#4a90d9] text-white'
                        : 'bg-[#0f111a] border border-[#2a2d3e] text-[#8888aa] hover:border-[#4a4d5e]'
                    }`}
                  >{p}</button>
                  <button
                    onClick={() => { savePairs(savedPairs.filter(x => x !== p)); if (plan.pair === p) setPlan('pair', null); }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[#5a5d7a] hover:text-[#ff4757] text-[10px] leading-none"
                  >×</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type pair… XAU/USD, NAS100"
                value={pairInput}
                onChange={e => { const v = e.target.value.toUpperCase(); setPairInput(v); if (v) setPlan('pair', v); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && pairInput.trim()) {
                    const v = pairInput.trim().toUpperCase();
                    if (!savedPairs.includes(v)) savePairs([...savedPairs, v]);
                    setPlan('pair', v); setPairInput('');
                  }
                }}
                className="flex-1 bg-[#0f111a] border border-[#2a2d3e] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#4a90d9] placeholder-[#3a3d4e]"
              />
              <button
                onClick={() => {
                  const v = pairInput.trim().toUpperCase();
                  if (!v) return;
                  if (!savedPairs.includes(v)) savePairs([...savedPairs, v]);
                  setPlan('pair', v); setPairInput('');
                }}
                className="px-3 py-2 rounded-lg bg-[#0f111a] border border-[#2a2d3e] text-[#4a90d9] text-xs font-bold hover:border-[#4a90d9] transition-all"
              >+ Save</button>
            </div>
          </div>

          {/* DOL */}
          <div className="rounded-xl border border-[#2a2d3e] bg-[#161829] p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#5a5d7a] mb-3">Draw on Liquidity (DOL)</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k:'BSL',   label:'BSL',   sub:'Buyside',  cls: plan.dol === 'BSL'   ? 'bg-[#00c896] text-black' : '' },
                { k:'SSL',   label:'SSL',   sub:'Sellside', cls: plan.dol === 'SSL'   ? 'bg-[#ff4757] text-white' : '' },
                { k:'Mixed', label:'Mixed', sub:'Both',     cls: plan.dol === 'Mixed' ? 'bg-[#f5a623] text-black' : '' },
              ].map(({ k, label, sub, cls }) => (
                <button key={k} onClick={() => setPlan('dol', plan.dol === k ? null : k)}
                  className={`py-3 rounded-lg text-center transition-all flex flex-col items-center gap-0.5 ${cls || 'bg-[#0f111a] border border-[#2a2d3e] text-[#8888aa] hover:border-[#4a4d5e]'}`}>
                  <span className="text-sm font-black">{label}</span>
                  <span className="text-[9px] opacity-70">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chart Screenshots — Before / After */}
          <div className="rounded-xl border border-[#2a2d3e] bg-[#161829] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Image size={13} className="text-[#4a90d9]" />
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#5a5d7a]">Chart Screenshots</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key:'imgBefore', label:'BEFORE', color:'#4a90d9', ref: fileRefBefore },
                { key:'imgAfter',  label:'AFTER',  color:'#00c896', ref: fileRefAfter  },
              ].map(({ key, label, color, ref }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>{label}</span>
                  </div>

                  {plan[key] ? (
                    <div className="relative group rounded-lg overflow-hidden border border-[#2a2d3e]">
                      <img src={plan[key]} alt={label} className="w-full object-cover rounded-lg" style={{ maxHeight: 160 }} />
                      <button
                        onClick={() => setPlan(key, null)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-[rgba(0,0,0,0.7)] text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#ff4757]"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div
                      tabIndex={0}
                      onPaste={handleImagePaste(key)}
                      onDrop={handleImageDrop(key)}
                      onDragOver={e => { e.preventDefault(); setDragOver(key); }}
                      onDragLeave={() => setDragOver(null)}
                      onClick={() => ref.current?.click()}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed cursor-pointer transition-all py-6 focus:outline-none ${
                        dragOver === key
                          ? 'border-[#4a90d9] bg-[rgba(74,144,217,0.08)]'
                          : 'border-[#2a2d3e] hover:border-[#4a4d5e] bg-[#0f111a]'
                      }`}
                    >
                      <Upload size={16} className="text-[#3a3d4e]" />
                      <span className="text-[9px] text-[#3a3d4e] font-bold">Click or Paste</span>
                      <span className="text-[8px] text-[#2a2d3e]">Ctrl+V · Drag & Drop</span>
                    </div>
                  )}

                  <input
                    ref={ref}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => readImageFile(key, e.target.files?.[0])}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-[#2a2d3e] bg-[#161829] p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#5a5d7a] mb-3">Weekly Notes</div>
            <textarea rows={4} placeholder="Write your weekly analysis, narrative, expectations..."
              value={plan.notes || ''} onChange={e => setPlan('notes', e.target.value)}
              className="w-full bg-[#0f111a] border border-[#2a2d3e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#3a3d4e] resize-none focus:outline-none focus:border-[#4a90d9]" />
          </div>
        </div>

        {/* ── Right: News Calendar ── */}
        <div className="rounded-xl border border-[#2a2d3e] bg-[#161829] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper size={14} className="text-[#4a90d9]" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#5a5d7a]">High Impact News</div>
          </div>

          {!hasEvents ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-3xl mb-3">📅</div>
              <div className="text-[#5a5d7a] text-sm">No high-impact events this week.</div>
              <div className="text-[#3a3d4e] text-xs mt-1">Navigate to a different week.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {['Mon','Tue','Wed','Thu','Fri'].map(day => {
                const dayEvts = groupedByDay[day];
                if (!dayEvts || dayEvts.length === 0) return null;
                const dayIdx = ['Mon','Tue','Wed','Thu','Fri'].indexOf(day);
                const dayDate = new Date(currentMonday + 'T12:00:00');
                dayDate.setDate(dayDate.getDate() + dayIdx);
                const dateLabel = dayDate.toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
                return (
                  <div key={day}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="text-[10px] font-black text-[#4a90d9] uppercase tracking-widest">{DAY_LABELS[day]}</div>
                      <div className="text-[10px] text-[#3a3d4e]">{dateLabel}</div>
                      <div className="flex-1 h-px bg-[#2a2d3e]" />
                    </div>
                    <div className="flex flex-col gap-1.5 pl-2">
                      {dayEvts.map((ev, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#0f111a] border border-[#2a2d3e] hover:border-[#3a3d4e] transition-all">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#ff4757] flex-shrink-0 mt-1.5" />
                          <span className="text-[10px] font-mono text-[#5a5d7a] flex-shrink-0 w-9 mt-0.5">{ev.t}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <CurrencyTag c={ev.c} />
                              <span className="text-xs font-bold text-white">{ev.e}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] text-[#5a5d7a] font-bold uppercase">F</span>
                              <span className="text-[10px] font-mono text-[#8888aa]">{ev.f || '—'}</span>
                              <span className="w-px h-3 bg-[#2a2d3e]" />
                              <span className="text-[9px] text-[#5a5d7a] font-bold uppercase">P</span>
                              <span className="text-[10px] font-mono text-[#8888aa]">{ev.p || '—'}</span>
                              <span className="w-px h-3 bg-[#2a2d3e]" />
                              <span className="text-[9px] text-[#5a5d7a] font-bold uppercase">A</span>
                              <span className={`text-[10px] font-mono font-bold ${ev.a && ev.a !== '—' ? 'text-[#f5a623]' : 'text-[#3a3d4e]'}`}>{ev.a || '—'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-[#2a2d3e] flex flex-wrap gap-3">
            {[
              { c:'USD', label:'Federal Reserve / US Data' },
              { c:'GBP', label:'Bank of England' },
              { c:'EUR', label:'ECB' },
            ].map(l => (
              <div key={l.c} className="flex items-center gap-1.5">
                <CurrencyTag c={l.c} />
                <span className="text-[9px] text-[#5a5d7a]">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Week Complete ── */}
      <button
        onClick={() => setPlan('done', !plan.done)}
        className={`w-full py-4 rounded-xl font-black text-sm tracking-widest transition-all active:scale-[0.98] ${
          plan.done
            ? 'bg-[rgba(0,200,150,0.12)] border-2 border-[#00c896] text-[#00c896]'
            : 'border-2 border-dashed border-[#2a2d3e] text-[#5a5d7a] hover:border-[#4a90d9] hover:text-white'
        }`}
      >
        {plan.done ? '✓  WEEK COMPLETE' : '+ MARK WEEK COMPLETE'}
      </button>

      {/* ── Send to Discord ── */}
      <button
        onClick={sendToDiscord}
        disabled={discordStatus === 'sending'}
        className={`w-full py-3.5 rounded-xl font-black text-sm tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
          discordStatus === 'sent'    ? 'bg-[rgba(0,200,150,0.12)] border-2 border-[#00c896] text-[#00c896]' :
          discordStatus === 'error'   ? 'bg-[rgba(255,71,87,0.12)] border-2 border-[#ff4757] text-[#ff4757]' :
          discordStatus === 'sending' ? 'border-2 border-[#5865F2] text-[#5865F2] opacity-70' :
          'border-2 border-[#5865F2] text-[#5865F2] hover:bg-[rgba(88,101,242,0.1)]'
        }`}
      >
        {/* Discord icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
        </svg>
        {discordStatus === 'sending' ? 'Sending...' :
         discordStatus === 'sent'    ? '✓  Sent to Discord!' :
         discordStatus === 'error'   ? '✗  Failed — Try Again' :
         'Send Week Summary to Discord'}
      </button>

    </div>
  );
}
