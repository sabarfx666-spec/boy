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
  tag?: "EITHER_OR";
  note?: string;
  indent?: boolean;
}

export type BiasRuleSet = Record<"BULLISH" | "BEARISH", Rule[]>;

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
  outcome?: "WIN" | "LOSS" | "BE" | "MISSED" | "EMOTIONAL" | "WITHDRAW";
  accountBalance: number;
  riskPercent: number;
  riskAmount: number;
  stopLossPips: number;
  lotSize: number;
  rr: number;
  pnl?: number;
  notes?: string;
  chartProof?: string;
  chartProofs?: Partial<Record<"Weekly" | "Daily" | "4H" | "15M" | "5M" | "Result", string>>;
  imgBefore?: string;
  imgAfter?: string;
}

export interface SabarState {
  pairs: WatchlistPair[];
  rules: Rule[];
  biasRules: BiasRuleSet;
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
  | { type: "TOGGLE_BIAS_RULE"; payload: { bias: Bias; id: string } }
  | { type: "ADD_BIAS_RULE"; payload: { bias: Bias; label: string; category: "BASIS" | "ENTRY" } }
  | { type: "REMOVE_BIAS_RULE"; payload: { bias: Bias; id: string } }
  | { type: "REORDER_BIAS_RULES"; payload: { bias: Bias; category: "BASIS" | "ENTRY"; fromIndex: number; toIndex: number } }
  | { type: "RESET_CHECKLIST" }
  | { type: "DELETE_TRADE"; payload: string }
  | { type: "UPDATE_TRADE"; payload: { id: string; outcome?: Trade["outcome"]; notes?: string; pnl?: number; chartProof?: string; chartProofs?: Trade["chartProofs"] } }
  | { type: "SET_ACCOUNT_BALANCE"; payload: number }
  | { type: "SET_RISK_PERCENT"; payload: number }
  | { type: "HYDRATE"; payload: Partial<SabarState> };
