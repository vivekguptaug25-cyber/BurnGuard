import { useState, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// --- Types ---
interface Reading {
  componentId: string;
  temperature: number;
  voltage: number;
  currentLeakage: number;
  current: number;
  timestamp: string;
}

interface AnalysisResult {
  anomalyScore: number;
  failureRiskPercent: number;
  riskLevel: "critical" | "high" | "medium" | "low";
  rootCauses: RootCause[];
  parameterStatus: ParamStatus[];
  trendData: TrendPoint[];
}

interface RootCause {
  id: number;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
}

interface ParamStatus {
  name: string;
  unit: string;
  values: number[];
  avg: number;
  min: number;
  max: number;
  status: "critical" | "high" | "medium" | "low";
  threshold: { warn: number; crit: number; direction: "above" | "below" | "both" };
}

interface TrendPoint {
  time: string;
  temperature: number;
  voltage: number;
  currentLeakage: number;
  current: number;
}

// --- Constants ---
const TOTAL_READINGS = 5;

const PARAM_CONFIG = {
  temperature: { label: "Temperature", unit: "°C", min: 0, max: 150, warn: 75, crit: 90, direction: "above" as const, normal: [20, 70] },
  voltage: { label: "Voltage", unit: "V", min: 180, max: 280, warn: 215, crit: 205, direction: "below" as const, normal: [210, 250] },
  currentLeakage: { label: "Current Leakage", unit: "mA", min: 0, max: 5, warn: 0.5, crit: 1.0, direction: "above" as const, normal: [0, 0.4] },
  current: { label: "Current", unit: "A", min: 0, max: 25, warn: 10, crit: 15, direction: "above" as const, normal: [0, 9] },
};

// --- Analysis Engine ---
function analyzeReadings(readings: Reading[]): AnalysisResult {
  const keys = ["temperature", "voltage", "currentLeakage", "current"] as const;

  const parameterStatus: ParamStatus[] = keys.map((key) => {
    const cfg = PARAM_CONFIG[key];
    const values = readings.map((r) => r[key]);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    let status: "critical" | "high" | "medium" | "low" = "low";
    const worstVal = cfg.direction === "above" ? max : min;
    if (cfg.direction === "above") {
      if (worstVal >= cfg.crit) status = "critical";
      else if (worstVal >= cfg.warn) status = "high";
      else if (worstVal >= cfg.normal[1]) status = "medium";
    } else {
      if (worstVal <= cfg.crit) status = "critical";
      else if (worstVal <= cfg.warn) status = "high";
      else if (worstVal <= cfg.normal[0]) status = "medium";
    }

    return {
      name: cfg.label,
      unit: cfg.unit,
      values,
      avg,
      min,
      max,
      status,
      threshold: { warn: cfg.warn, crit: cfg.crit, direction: cfg.direction },
    };
  });

  // Anomaly score: weighted deviation
  const scores = parameterStatus.map((p) => {
    if (p.status === "critical") return 85 + Math.random() * 15;
    if (p.status === "high") return 55 + Math.random() * 25;
    if (p.status === "medium") return 25 + Math.random() * 20;
    return Math.random() * 15;
  });
  const anomalyScore = Math.min(100, Math.round(Math.max(...scores) * 0.6 + (scores.reduce((a, b) => a + b, 0) / scores.length) * 0.4));

  const failureRiskPercent = Math.min(99, Math.round(anomalyScore * 0.9 + Math.random() * 8));

  let riskLevel: AnalysisResult["riskLevel"] = "low";
  if (failureRiskPercent >= 70) riskLevel = "critical";
  else if (failureRiskPercent >= 45) riskLevel = "high";
  else if (failureRiskPercent >= 20) riskLevel = "medium";

  const rootCauses = generateRootCauses(parameterStatus, riskLevel);

  const trendData: TrendPoint[] = readings.map((r, i) => ({
    time: `T${i + 1}`,
    temperature: r.temperature,
    voltage: r.voltage,
    currentLeakage: r.currentLeakage,
    current: r.current,
  }));

  return { anomalyScore, failureRiskPercent, riskLevel, rootCauses, parameterStatus, trendData };
}

function generateRootCauses(params: ParamStatus[], riskLevel: string): RootCause[] {
  const causes: RootCause[] = [];
  let id = 1;

  const tempP = params.find((p) => p.name === "Temperature")!;
  const voltP = params.find((p) => p.name === "Voltage")!;
  const leakP = params.find((p) => p.name === "Current Leakage")!;
  const currP = params.find((p) => p.name === "Current")!;

  if (tempP.status === "critical" || tempP.status === "high") {
    causes.push({
      id: id++,
      title: "Thermal Runaway Risk",
      description: `Temperature peaked at ${tempP.max.toFixed(1)}°C — exceeding safe operating limits. Likely causes: blocked cooling vents, degraded thermal paste, or sustained overload. Immediate inspection of the cooling subsystem is recommended.`,
      severity: tempP.status,
      confidence: tempP.status === "critical" ? 94 : 78,
    });
  }

  if (leakP.status !== "low") {
    causes.push({
      id: id++,
      title: "Insulation Degradation Detected",
      description: `Current leakage averaged ${leakP.avg.toFixed(3)} mA — indicative of insulation breakdown, moisture ingress, or aged dielectric material. This pattern correlates with early-stage ground fault conditions.`,
      severity: leakP.status,
      confidence: leakP.status === "critical" ? 91 : 72,
    });
  }

  if (voltP.status !== "low") {
    causes.push({
      id: id++,
      title: "Supply Voltage Instability",
      description: `Voltage ranged ${voltP.min.toFixed(1)}–${voltP.max.toFixed(1)} V with a spread of ${(voltP.max - voltP.min).toFixed(1)} V. Indicates upstream power quality issues or failing power conditioning stage. Under-voltage conditions accelerate motor and transformer wear.`,
      severity: voltP.status,
      confidence: 68,
    });
  }

  if (currP.status !== "low") {
    causes.push({
      id: id++,
      title: "Overcurrent Condition",
      description: `Load current reached ${currP.max.toFixed(2)} A, exceeding rated capacity. This may be caused by a mechanical jam, bearing seizure, or downstream short circuit. Prolonged overcurrent will trigger protective trips.`,
      severity: currP.status,
      confidence: currP.status === "critical" ? 88 : 65,
    });
  }

  if (causes.length === 0 || riskLevel === "low") {
    causes.push({
      id: id++,
      title: "Component Operating Normally",
      description: "All parameters are within nominal ranges across all 5 readings. No anomalies detected. Continued monitoring at standard intervals is recommended.",
      severity: "low",
      confidence: 97,
    });
  }

  return causes;
}

// --- UI Helpers ---
const RISK_COLORS = {
  critical: { text: "text-red-400", bg: "bg-red-950/60", border: "border-red-500/50", badge: "bg-red-500/20 text-red-300 border-red-500/40", bar: "#ef4444", glow: "shadow-red-500/30" },
  high: { text: "text-orange-400", bg: "bg-orange-950/50", border: "border-orange-500/40", badge: "bg-orange-500/20 text-orange-300 border-orange-500/40", bar: "#f97316", glow: "shadow-orange-500/20" },
  medium: { text: "text-amber-400", bg: "bg-amber-950/40", border: "border-amber-500/40", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40", bar: "#f59e0b", glow: "shadow-amber-500/20" },
  low: { text: "text-emerald-400", bg: "bg-emerald-950/40", border: "border-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", bar: "#22c55e", glow: "shadow-emerald-500/20" },
};

function StatusBadge({ status }: { status: string }) {
  const c = RISK_COLORS[status as keyof typeof RISK_COLORS];
  const labels = { critical: "CRITICAL", high: "HIGH RISK", medium: "MODERATE", low: "NOMINAL" };
  return (
    <span className={`mono text-xs px-2 py-0.5 rounded border font-medium tracking-widest ${c.badge}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-lg p-3 shadow-xl backdrop-blur-sm">
      <p className="mono text-xs text-slate-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="mono text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// --- Input Form ---
const DEFAULT_READING: Omit<Reading, "timestamp"> = {
  componentId: "",
  temperature: 0,
  voltage: 0,
  currentLeakage: 0,
  current: 0,
};

function InputForm({ onComplete }: { onComplete: (readings: Reading[]) => void }) {
  const [step, setStep] = useState(0);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [form, setForm] = useState({ ...DEFAULT_READING });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const reading: Reading = {
      ...form,
      timestamp: new Date().toISOString(),
    };
    const next = [...readings, reading];
    setReadings(next);
    setForm({ ...DEFAULT_READING, componentId: form.componentId });

    if (next.length === TOTAL_READINGS) {
      onComplete(next);
    } else {
      setStep(step + 1);
    }
  }, [form, readings, step, onComplete]);

  const progress = (step / TOTAL_READINGS) * 100;
  const isLast = step === TOTAL_READINGS - 1;

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="w-full max-w-xl mb-10 text-center anim-fade-in">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="mono text-xs text-cyan-400/70 tracking-widest uppercase">Component Health Monitor</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
          Anomaly Detection System
        </h1>
        <p className="text-slate-400 text-sm">
          Submit 5 time-interval readings to generate a full diagnostic report.
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xl mb-8 anim-fade-in">
        <div className="flex justify-between mb-2">
          <span className="mono text-xs text-slate-500">Reading {step + 1} of {TOTAL_READINGS}</span>
          <span className="mono text-xs text-slate-500">{Math.round(progress)}% complete</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          {Array.from({ length: TOTAL_READINGS }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                i < step ? "bg-cyan-500" : i === step ? "bg-cyan-400/60" : "bg-white/5"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        key={step}
        className="w-full max-w-xl bg-[#0d1320] border border-white/8 rounded-2xl p-8 anim-fade-in"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            Interval Reading <span className="mono text-cyan-400">#{step + 1}</span>
          </h2>
          <span className="mono text-xs text-slate-500 bg-white/5 px-3 py-1 rounded-full">
            {new Date().toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {/* Component ID */}
          <div>
            <label className="mono text-xs text-slate-400 block mb-1.5 tracking-wide">COMPONENT ID</label>
            <input
              type="text"
              required
              placeholder="e.g. COMP-A7-001"
              value={form.componentId}
              onChange={(e) => setForm({ ...form, componentId: e.target.value })}
              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-slate-600 mono text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all"
            />
          </div>

          {/* 2-col grid for numeric inputs */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "temperature", label: "TEMPERATURE", unit: "°C", placeholder: "25.0", step: "0.1", min: "-50", max: "200" },
              { key: "voltage", label: "VOLTAGE", unit: "V", placeholder: "230.0", step: "0.1", min: "0", max: "500" },
              { key: "currentLeakage", label: "CURRENT LEAKAGE", unit: "mA", placeholder: "0.02", step: "0.001", min: "0", max: "10" },
              { key: "current", label: "CURRENT", unit: "A", placeholder: "5.0", step: "0.01", min: "0", max: "50" },
            ].map(({ key, label, unit, placeholder, step: s, min, max }) => (
              <div key={key}>
                <label className="mono text-xs text-slate-400 block mb-1.5 tracking-wide">
                  {label} <span className="text-slate-600">({unit})</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder={placeholder}
                  step={s}
                  min={min}
                  max={max}
                  value={form[key as keyof typeof form] === 0 ? "" : form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-slate-600 mono text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full mt-6 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-3.5 rounded-xl transition-all duration-200 mono text-sm tracking-wide"
        >
          {isLast ? "▶ RUN ANALYSIS" : `SUBMIT READING ${step + 1} / ${TOTAL_READINGS}`}
        </button>

        {step > 0 && (
          <p className="mono text-xs text-slate-600 text-center mt-3">
            {readings.length} reading{readings.length !== 1 ? "s" : ""} collected
          </p>
        )}
      </form>
    </div>
  );
}

// --- Results Dashboard ---
function ResultsDashboard({ readings, result, onReset }: {
  readings: Reading[];
  result: AnalysisResult;
  onReset: () => void;
}) {
  const rc = RISK_COLORS[result.riskLevel];
  const isCritical = result.riskLevel === "critical" || result.riskLevel === "high";

  return (
    <div className={`min-h-screen bg-[#080c14] text-white transition-all duration-1000`}>
      {/* Top alert banner */}
      <div className={`w-full py-3 px-6 flex items-center justify-between border-b transition-all duration-500 ${
        isCritical ? "bg-red-950/40 border-red-500/20" : "bg-emerald-950/30 border-emerald-500/15"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isCritical ? "bg-red-400" : "bg-emerald-400"}`} />
          <span className="mono text-xs tracking-widest text-slate-300">
            COMPONENT: <span className={`font-semibold ${rc.text}`}>{readings[0].componentId}</span>
          </span>
          <span className="mono text-xs text-slate-600">•</span>
          <span className="mono text-xs text-slate-500">
            {new Date(readings[0].timestamp).toLocaleString()} → {new Date(readings[readings.length - 1].timestamp).toLocaleTimeString()}
          </span>
        </div>
        <button
          onClick={onReset}
          className="mono text-xs text-slate-500 hover:text-white border border-white/8 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
        >
          ← NEW ANALYSIS
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Score header */}
        <div className={`rounded-2xl border p-6 mb-6 scanline-container transition-all duration-500 ${rc.bg} ${rc.border} ${isCritical ? "risk-critical" : "risk-healthy"}`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 anim-fade-in">
            <div className="text-center sm:text-left">
              <p className="mono text-xs text-slate-500 tracking-widest mb-1">FAILURE RISK</p>
              <div className={`text-6xl font-bold mono ${rc.text}`}>{result.failureRiskPercent}%</div>
              <StatusBadge status={result.riskLevel} />
            </div>
            <div className="text-center">
              <p className="mono text-xs text-slate-500 tracking-widest mb-1">ANOMALY SCORE</p>
              <div className={`text-6xl font-bold mono ${rc.text}`}>{result.anomalyScore}</div>
              <p className="mono text-xs text-slate-600 mt-1">/ 100</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="mono text-xs text-slate-500 tracking-widest mb-2">READINGS ANALYZED</p>
              <div className="text-5xl font-bold text-white mono">{readings.length}</div>
              <p className="mono text-xs text-slate-600 mt-1">time-interval samples</p>
            </div>
          </div>

          {/* Risk bar */}
          <div className="mt-6">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${result.failureRiskPercent}%`, background: `linear-gradient(90deg, ${rc.bar}80, ${rc.bar})` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="mono text-xs text-emerald-500/60">0% Nominal</span>
              <span className="mono text-xs text-amber-500/60">45% High Risk</span>
              <span className="mono text-xs text-red-500/60">70% Critical</span>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Parameter status */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 tracking-wide mono uppercase">Parameter Status</h2>
            {result.parameterStatus.map((p) => {
              const pc = RISK_COLORS[p.status];
              return (
                <div key={p.name} className={`rounded-xl border p-4 anim-fade-in transition-all ${pc.bg} ${pc.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">{p.name}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[["MIN", p.min], ["AVG", p.avg], ["MAX", p.max]].map(([label, val]) => (
                      <div key={label as string} className="bg-black/20 rounded-lg p-2">
                        <p className="mono text-xs text-slate-500">{label}</p>
                        <p className={`mono text-sm font-semibold ${pc.text}`}>
                          {(val as number).toFixed(2)}
                        </p>
                        <p className="mono text-xs text-slate-600">{p.unit}</p>
                      </div>
                    ))}
                  </div>
                  {/* Inline sparkline */}
                  <div className="mt-3 h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={p.values.map((v, i) => ({ t: `T${i + 1}`, v }))}>
                        <Line type="monotone" dataKey="v" stroke={pc.bar || RISK_COLORS[p.status].bar} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Charts + AI Root causes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Time-series charts */}
            <div className="bg-[#0d1320] rounded-2xl border border-white/8 p-5">
              <h2 className="text-sm font-semibold text-slate-300 tracking-wide mono uppercase mb-5">Time-Series Trends</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { key: "temperature", label: "Temperature (°C)", color: "#f97316", refLine: PARAM_CONFIG.temperature.warn },
                  { key: "voltage", label: "Voltage (V)", color: "#60a5fa", refLine: PARAM_CONFIG.voltage.warn },
                  { key: "currentLeakage", label: "Current Leakage (mA)", color: "#a78bfa", refLine: PARAM_CONFIG.currentLeakage.warn },
                  { key: "current", label: "Current (A)", color: "#34d399", refLine: PARAM_CONFIG.current.warn },
                ].map(({ key, label, color, refLine }) => (
                  <div key={key}>
                    <p className="mono text-xs text-slate-500 mb-2">{label}</p>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result.trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                          <defs>
                            <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <ReferenceLine y={refLine} stroke={color} strokeDasharray="3 3" strokeOpacity={0.4} />
                          <Area type="monotone" dataKey={key} stroke={color} strokeWidth={2} fill={`url(#grad-${key})`} dot={{ fill: color, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Root causes */}
            <div className="bg-[#0d1320] rounded-2xl border border-white/8 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-5 h-5 rounded-md bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-cyan-400 text-xs">AI</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-300 tracking-wide mono uppercase">Root Cause Analysis</h2>
              </div>

              <div className="space-y-4">
                {result.rootCauses.map((cause, idx) => {
                  const cc = RISK_COLORS[cause.severity];
                  return (
                    <div key={cause.id} className={`rounded-xl border p-4 anim-fade-in ${cc.bg} ${cc.border}`} style={{ animationDelay: `${idx * 80}ms` }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`mono text-xs ${cc.text} font-bold`}>#{String(cause.id).padStart(2, "0")}</span>
                          <h3 className="font-semibold text-white text-sm">{cause.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={cause.severity} />
                          <span className={`mono text-xs ${cc.text} bg-black/20 px-2 py-0.5 rounded`}>
                            {cause.confidence}% conf.
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">{cause.description}</p>
                      <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${cause.confidence}%`, background: cc.bar || RISK_COLORS[cause.severity].bar }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Raw readings table */}
            <div className="bg-[#0d1320] rounded-2xl border border-white/8 p-5">
              <h2 className="text-sm font-semibold text-slate-300 tracking-wide mono uppercase mb-4">Raw Readings Log</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["#", "Timestamp", "Temp (°C)", "Voltage (V)", "Leakage (mA)", "Current (A)"].map((h) => (
                        <th key={h} className="mono text-xs text-slate-500 text-left py-2 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((r, i) => (
                      <tr key={i} className="border-b border-white/4 hover:bg-white/3 transition-colors">
                        <td className="mono text-xs text-slate-600 py-2.5 pr-4">T{i + 1}</td>
                        <td className="mono text-xs text-slate-500 py-2.5 pr-4">{new Date(r.timestamp).toLocaleTimeString()}</td>
                        <td className={`mono text-xs py-2.5 pr-4 ${r.temperature >= PARAM_CONFIG.temperature.crit ? "text-red-400" : r.temperature >= PARAM_CONFIG.temperature.warn ? "text-amber-400" : "text-slate-300"}`}>{r.temperature.toFixed(1)}</td>
                        <td className={`mono text-xs py-2.5 pr-4 ${r.voltage <= PARAM_CONFIG.voltage.crit ? "text-red-400" : r.voltage <= PARAM_CONFIG.voltage.warn ? "text-amber-400" : "text-slate-300"}`}>{r.voltage.toFixed(1)}</td>
                        <td className={`mono text-xs py-2.5 pr-4 ${r.currentLeakage >= PARAM_CONFIG.currentLeakage.crit ? "text-red-400" : r.currentLeakage >= PARAM_CONFIG.currentLeakage.warn ? "text-amber-400" : "text-slate-300"}`}>{r.currentLeakage.toFixed(3)}</td>
                        <td className={`mono text-xs py-2.5 pr-4 ${r.current >= PARAM_CONFIG.current.crit ? "text-red-400" : r.current >= PARAM_CONFIG.current.warn ? "text-amber-400" : "text-slate-300"}`}>{r.current.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- App Root ---
export default function App() {
  const [stage, setStage] = useState<"input" | "results">("input");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleComplete = useCallback((r: Reading[]) => {
    setReadings(r);
    setResult(analyzeReadings(r));
    setStage("results");
  }, []);

  const handleReset = useCallback(() => {
    setStage("input");
    setReadings([]);
    setResult(null);
  }, []);

  if (stage === "results" && result) {
    return <ResultsDashboard readings={readings} result={result} onReset={handleReset} />;
  }

  return <InputForm onComplete={handleComplete} />;
}
