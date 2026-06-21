export interface WatchlistPair {
  id: string;
  symbol: string;
  active: boolean;
  custom: boolean;
}

export type PsychologyTag = "FOMO" | "CALM" | "FEAR" | "GREED" | "CUSTOM";
export type Session = "LONDON" | "NEW_YORK";
export type Bias = "BULLISH" | "BEARISH";

export interface Rule {
  id: string;
  label: string;
  category: "BASIS" | "ENTRY";
  checked: boolean;
}

export interface Trade {
  id: string;
  date: string;
  session: Session;
  pair: string;
  bias: Bias;
  psychology: PsychologyTag[];
  rulesChecked: string[];
  totalRules: number;
  checkedCount: number;
  missingRules: string[];
  decision: "TAKE" | "SKIP";
  outcome?: "WIN" | "LOSS" | "BE";
  accountBalance: number;
  riskPercent: number;
  riskAmount: number;
  stopLossPips: number;
  lotSize: number;
  rr: number;
  pnl?: number;
  notes?: string;
  chartProof?: string;
  chartProofs?: Partial<Record<"5M" | "15M" | "4H" | "Daily" | "Result", string>>;
  imgBefore?: string;
  imgAfter?: string;
}

export interface SabarState {
  pairs: WatchlistPair[];
  rules: Rule[];
  trades: Trade[];
  selectedDate: string;
  currentBias: Bias;
  currentSession: Session;
  currentPair: string;
  currentPsychology: PsychologyTag[];
  accountBalance: number;
  riskPercent: number;
}

export type Action =
  | { type: "SET_BIAS"; payload: Bias }
  | { type: "SET_SESSION"; payload: Session }
  | { type: "SET_PAIR"; payload: string }
  | { type: "TOGGLE_RULE"; payload: string }
  | { type: "ADD_RULE"; payload: { label: string; category: "BASIS" | "ENTRY" } }
  | { type: "TOGGLE_PSYCHOLOGY"; payload: PsychologyTag }
  | { type: "TAKE_TRADE"; payload: Partial<Trade> }
  | { type: "SKIP_TRADE"; payload: Partial<Trade> }
  | { type: "SET_DATE"; payload: string }
  | { type: "ADD_PAIR"; payload: string }
  | { type: "TOGGLE_PAIR_ACTIVE"; payload: string }
  | { type: "REMOVE_PAIR"; payload: string }
  | { type: "REMOVE_RULE"; payload: string }
  | { type: "REORDER_RULES"; payload: { category: "BASIS" | "ENTRY"; fromIndex: number; toIndex: number } }
  | { type: "RESET_CHECKLIST" }
  | { type: "DELETE_TRADE"; payload: string }
  | { type: "UPDATE_TRADE"; payload: { id: string; chartProof?: string; notes?: string; chartProofs?: Partial<Record<"5M" | "15M" | "4H" | "Daily" | "Result", string>> } }
  | { type: "SET_ACCOUNT_BALANCE"; payload: number }
  | { type: "SET_RISK_PERCENT"; payload: number }
  | { type: "HYDRATE"; payload: Partial<SabarState> };
