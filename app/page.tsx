import { BiasSelector }       from "@/components/journal/BiasSelector";
import { SessionSelector }     from "@/components/journal/SessionSelector";
import { PairWatchlist }       from "@/components/journal/PairWatchlist";
import { PsychologySelector }  from "@/components/journal/PsychologySelector";
import { ChecklistProgress }   from "@/components/journal/ChecklistProgress";
import { RulesList }           from "@/components/journal/RulesList";
import { TradeSummary }        from "@/components/journal/TradeSummary";
import { DailyHeaderStats }    from "@/components/journal/DailyHeaderStats";
export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="anim-fade-down flex items-center gap-3">
        <div className="w-2 h-8 rounded-full anim-glow-green" style={{ background: "#00FF7F" }} />
        <h1 className="font-mono text-xl font-black text-white tracking-widest uppercase">Daily Journal</h1>
        <span className="font-mono text-xs text-[#333] anim-blink">▌</span>
        <DailyHeaderStats />
      </div>

      {/* Top selectors — staggered */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="anim-fade-up d-100"><BiasSelector /></div>
        <div className="anim-fade-up d-200"><SessionSelector /></div>
        <div className="anim-fade-up d-300"><PairWatchlist /></div>
        <div className="anim-fade-up d-400"><PsychologySelector /></div>
      </div>

      {/* Progress */}
      <div className="anim-fade-up d-500">
        <ChecklistProgress />
      </div>

      {/* Rules + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="anim-fade-up d-500"><RulesList category="BASIS" /></div>
        <div className="anim-fade-up d-600"><RulesList category="ENTRY" /></div>
        <div className="anim-slide-right d-600"><TradeSummary /></div>
      </div>

    </div>
  );
}
