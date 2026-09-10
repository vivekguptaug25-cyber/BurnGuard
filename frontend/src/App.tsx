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
  power: number;
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
  aiReport?: string;
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
  power: number;
  current: number;
}

// --- Constants ---
const TOTAL_READINGS = 5;

const PARAM_CONFIG = {
  temperature: { label: "Temperature", unit: "°C", min: 0, max: 150, warn: 75, crit: 90, direction: "above" as const, normal: [20, 70] },
  voltage: { label: "Voltage", unit: "V", min: 4.5, max: 5.5, warn: 4.90, crit: 4.85, direction: "below" as const, normal: [4.90, 5.10] },
  power: { label: "Power", unit: "W", min: 0, max: 5, warn: 1.3, crit: 1.5, direction: "above" as const, normal: [0.8, 1.2] },
  current: { label: "Current", unit: "A", min: 0, max: 1, warn: 0.25, crit: 0.30, direction: "above" as const, normal: [0, 0.24] },
};

// --- Analysis Helpers ---
function buildParameterStatus(
  readings: Reading[],
  backendStatus?: Record<string, string>
): ParamStatus[] {
  const keys = ["temperature", "voltage", "current", "power"] as const;

  return keys.map((key) => {
    const cfg = PARAM_CONFIG[key];
    const values = readings.map((r) => r[key]);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    const fallbackStatus = (() => {
      if (cfg.direction === "above") {
        if (max >= cfg.crit) return "critical";
        if (max >= cfg.warn) return "high";
        if (max >= cfg.normal[1]) return "medium";
        return "low";
      }

      if (min <= cfg.crit) return "critical";
      if (min <= cfg.warn) return "high";
      if (min <= cfg.normal[0]) return "medium";
      return "low";
    })();

    const backendKey = key;
    const rawStatus = backendStatus?.[backendKey]?.toLowerCase();
    const status =
      rawStatus === "critical" || rawStatus === "high" || rawStatus === "warning" || rawStatus === "medium" || rawStatus === "low" || rawStatus === "normal"
        ? rawStatus === "warning" ? "high" : rawStatus === "normal" ? "low" : rawStatus
        : fallbackStatus;

    return {
      name: cfg.label,
      unit: cfg.unit,
      values,
      avg,
      min,
      max,
      status: status as ParamStatus["status"],
      threshold: { warn: cfg.warn, crit: cfg.crit, direction: cfg.direction },
    };
  });
}

function buildTrendData(readings: Reading[]): TrendPoint[] {
  return readings.map((r, i) => ({
    time: `T${i + 1}`,
    temperature: r.temperature,
    voltage: r.voltage,
    power: r.power,
    current: r.current,
  }));
}

function generateRootCauses(params: ParamStatus[], riskLevel: string): RootCause[] {
  const causes: RootCause[] = [];
  let id = 1;

  const tempP = params.find((p) => p.name === "Temperature")!;
  const voltP = params.find((p) => p.name === "Voltage")!;
  const powerP = params.find((p) => p.name === "Power")!;
  const currP = params.find((p) => p.name === "Current")!;

  if (tempP.status === "critical" || tempP.status === "high") {
    causes.push({ id: id++, title: "Thermal Runaway Risk", description: `Temperature peaked at ${tempP.max.toFixed(1)}°C — exceeding safe operating limits. Likely causes: blocked cooling vents, degraded thermal paste, or sustained overload. Immediate inspection of the cooling subsystem is recommended.`, severity: tempP.status, confidence: tempP.status === "critical" ? 94 : 78 });
  }
  if (powerP.status !== "low") {
    causes.push({ id: id++, title: "Abnormal Power Consumption", description: `Power reached ${powerP.max.toFixed(3)} W. Elevated power consumption can indicate increased load, electrical stress, or abnormal component behavior. Further burn-in observation is recommended.`, severity: powerP.status, confidence: powerP.status === "critical" ? 91 : 72 });
  }
  if (voltP.status !== "low") {
    causes.push({ id: id++, title: "Supply Voltage Instability", description: `Voltage ranged ${voltP.min.toFixed(1)}–${voltP.max.toFixed(1)} V with a spread of ${(voltP.max - voltP.min).toFixed(1)} V. Indicates upstream power quality issues or failing power conditioning stage.`, severity: voltP.status, confidence: 68 });
  }
  if (currP.status !== "low") {
    causes.push({ id: id++, title: "Overcurrent Condition", description: `Load current reached ${currP.max.toFixed(2)} A, exceeding rated capacity. This may be caused by a mechanical jam, bearing seizure, or downstream short circuit.`, severity: currP.status, confidence: currP.status === "critical" ? 88 : 65 });
  }
  if (causes.length === 0 || riskLevel === "low") {
    causes.push({ id: id++, title: "Component Operating Normally", description: "All parameters are within nominal ranges across all 5 readings. No anomalies detected. Continued monitoring at standard intervals is recommended.", severity: "low", confidence: 97 });
  }

  return causes;
}

// --- UI Helpers ---
const RISK_COLORS = {
  critical: {
    text: "text-red-400", bg: "bg-red-950/40", border: "border-red-500/40",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
    bar: "#ef4444", gradBar: "from-red-600 to-red-400",
    glow: "shadow-red-500/25", orb: "rgba(239,68,68,0.15)",
    accent: "#ef4444",
  },
  high: {
    text: "text-orange-400", bg: "bg-orange-950/30", border: "border-orange-500/35",
    badge: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    bar: "#f97316", gradBar: "from-orange-500 to-amber-400",
    glow: "shadow-orange-500/20", orb: "rgba(249,115,22,0.12)",
    accent: "#f97316",
  },
  medium: {
    text: "text-amber-400", bg: "bg-amber-950/30", border: "border-amber-500/35",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    bar: "#f59e0b", gradBar: "from-amber-500 to-yellow-400",
    glow: "shadow-amber-500/20", orb: "rgba(245,158,11,0.1)",
    accent: "#f59e0b",
  },
  low: {
    text: "text-emerald-400", bg: "bg-emerald-950/30", border: "border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    bar: "#22c55e", gradBar: "from-emerald-500 to-teal-400",
    glow: "shadow-emerald-500/20", orb: "rgba(34,197,94,0.1)",
    accent: "#22c55e",
  },
};

function StatusBadge({ status }: { status: string }) {
  const c = RISK_COLORS[status as keyof typeof RISK_COLORS];
  const labels = { critical: "CRITICAL", high: "HIGH RISK", medium: "MODERATE", low: "NOMINAL" };
  const dots = { critical: "bg-red-400", high: "bg-orange-400", medium: "bg-amber-400", low: "bg-emerald-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 mono text-xs px-2.5 py-0.5 rounded-full border font-medium tracking-widest ${c.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status as keyof typeof dots]} animate-pulse`} />
      {labels[status as keyof typeof labels]}
    </span>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/98 border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-xl">
      <p className="mono text-xs text-slate-400 mb-2 pb-1.5 border-b border-white/8">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="mono text-xs mt-1" style={{ color: p.color }}>
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
  power: 0,
  current: 0,
};

function InputForm({ onComplete }: { onComplete: (readings: Reading[]) => void }) {
  const [step, setStep] = useState(0);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [form, setForm] = useState({ ...DEFAULT_READING });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const reading: Reading = { ...form, timestamp: new Date().toISOString() };
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
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="orb w-96 h-96 top-[-100px] left-[-100px] opacity-60" style={{ background: "rgba(99,102,241,0.18)", animationDelay: "0s" }} />
      <div className="orb w-80 h-80 bottom-[-80px] right-[-80px] opacity-50" style={{ background: "rgba(6,182,212,0.15)", animationDelay: "-4s" }} />
      <div className="orb w-64 h-64 top-1/2 right-1/4 opacity-30" style={{ background: "rgba(139,92,246,0.12)", animationDelay: "-8s" }} />

      {/* Header */}
      <div className="w-full max-w-xl mb-10 text-center anim-fade-in relative z-10">
        <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full glass border border-white/10">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span className="mono text-xs text-cyan-300/80 tracking-widest uppercase">Component Health Monitor</span>
        </div>
        <h1 className="text-4xl font-bold mb-2 tracking-tight">
          <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
            Anomaly Detection
          </span>
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent text-glow-purple">
            System
          </span>
        </h1>
        <p className="text-slate-400 text-sm mt-3">
          Submit 5 time-interval readings to generate a full diagnostic report.
        </p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-xl mb-7 anim-fade-in relative z-10" style={{ animationDelay: "0.05s" }}>
        <div className="flex justify-between mb-2">
          <span className="mono text-xs text-slate-500">Reading {step + 1} of {TOTAL_READINGS}</span>
          <span className="mono text-xs text-slate-500">{Math.round((step / TOTAL_READINGS) * 100)}% complete</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)",
              boxShadow: "0 0 12px rgba(99,102,241,0.6)",
            }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          {Array.from({ length: TOTAL_READINGS }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-400"
              style={{
                background: i < step
                  ? "linear-gradient(90deg, #6366f1, #06b6d4)"
                  : i === step
                    ? "rgba(99,102,241,0.5)"
                    : "rgba(255,255,255,0.05)",
                boxShadow: i < step ? "0 0 6px rgba(99,102,241,0.4)" : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        key={step}
        className="w-full max-w-xl glass-bright gradient-border rounded-2xl p-8 anim-fade-in relative z-10"
        style={{ animationDelay: "0.1s", boxShadow: "0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Interval Reading{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mono">
                #{step + 1}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter sensor values for this time interval</p>
          </div>
          <span className="mono text-xs text-slate-500 glass border border-white/8 px-3 py-1.5 rounded-full">
            {new Date().toLocaleTimeString()}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {/* Component ID */}
          <div>
            <label className="mono text-xs text-slate-400 block mb-1.5 tracking-wider uppercase">
              <span className="text-violet-400">◈</span> Component ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. COMP-A7-001"
              value={form.componentId}
              onChange={(e) => setForm({ ...form, componentId: e.target.value })}
              className="input-glow w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-slate-600 mono text-sm transition-all"
            />
          </div>

          {/* Numeric inputs */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "temperature", label: "Temperature", unit: "°C", placeholder: "72.0", step: "0.1", min: "0", max: "150", icon: "🌡", color: "text-orange-400" },
              { key: "voltage", label: "Voltage", unit: "V", placeholder: "5.00", step: "0.001", min: "4.5", max: "5.5", icon: "⚡", color: "text-blue-400" },
              { key: "power", label: "Power", unit: "W", placeholder: "1.0", step: "0.001", min: "0", max: "5", icon: "◉", color: "text-violet-400" },
              { key: "current", label: "Current", unit: "A", placeholder: "0.20", step: "0.001", min: "0", max: "1", icon: "⟳", color: "text-emerald-400" },
            ].map(({ key, label, unit, placeholder, step: s, min, max, icon, color }) => (
              <div key={key}>
                <label className="mono text-xs text-slate-400 block mb-1.5 tracking-wider uppercase">
                  <span className={`${color} mr-1`}>{icon}</span> {label} <span className="text-slate-600">({unit})</span>
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
                  className="input-glow w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-slate-600 mono text-sm transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn-shimmer w-full mt-7 text-white font-bold py-3.5 rounded-xl mono text-sm tracking-wider"
        >
          {isLast ? "▶  RUN ANALYSIS" : `SUBMIT READING  ${step + 1} / ${TOTAL_READINGS}`}
        </button>

        {step > 0 && (
          <p className="mono text-xs text-slate-600 text-center mt-3">
            {readings.length} reading{readings.length !== 1 ? "s" : ""} collected ·{" "}
            <span className="text-emerald-500/60">{TOTAL_READINGS - readings.length} remaining</span>
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
    <div className="min-h-screen bg-mesh text-white relative overflow-x-hidden">
      {/* Ambient orbs */}
      <div className="orb w-[500px] h-[500px] top-[-150px] left-[-150px] opacity-40 pointer-events-none"
        style={{ background: isCritical ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.1)", animationDelay: "0s" }} />
      <div className="orb w-96 h-96 bottom-0 right-[-100px] opacity-30 pointer-events-none"
        style={{ background: "rgba(99,102,241,0.15)", animationDelay: "-5s" }} />

      {/* Top alert banner */}
      <div className={`w-full py-3 px-6 flex items-center justify-between border-b backdrop-blur-xl relative z-20 transition-all duration-500 ${
        isCritical
          ? "bg-red-950/30 border-red-500/15"
          : "bg-emerald-950/25 border-emerald-500/12"
      }`}>
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${isCritical ? "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]"}`} />
          <span className="mono text-xs tracking-widest text-slate-300">
            COMPONENT: <span className={`font-bold ${rc.text}`}>{readings[0].componentId}</span>
          </span>
          <span className="mono text-xs text-slate-600">•</span>
          <span className="mono text-xs text-slate-500 hidden sm:block">
            {new Date(readings[0].timestamp).toLocaleString()} → {new Date(readings[readings.length - 1].timestamp).toLocaleTimeString()}
          </span>
        </div>
        <button
          onClick={onReset}
          className="mono text-xs text-slate-400 hover:text-white glass border border-white/8 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all hover:shadow-lg"
        >
          ← NEW ANALYSIS
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        {/* Score header */}
        <div
          className={`rounded-2xl border p-6 mb-6 scanline-container gradient-border transition-all duration-500 ${rc.bg} ${rc.border} ${isCritical ? "risk-critical stat-glow-red" : "risk-healthy stat-glow-green"}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 anim-fade-in">
            <div className="text-center sm:text-left">
              <p className="mono text-xs text-slate-500 tracking-widest mb-2 uppercase">Failure Risk</p>
              <div className={`text-7xl font-bold mono ${rc.text}`} style={{ textShadow: `0 0 30px ${rc.accent}60` }}>
                {result.failureRiskPercent}%
              </div>
              <div className="mt-2"><StatusBadge status={result.riskLevel} /></div>
            </div>
            <div className="text-center">
              <p className="mono text-xs text-slate-500 tracking-widest mb-2 uppercase">Anomaly Score</p>
              <div className={`text-7xl font-bold mono ${rc.text}`} style={{ textShadow: `0 0 30px ${rc.accent}60` }}>
                {result.anomalyScore}
              </div>
              <p className="mono text-xs text-slate-600 mt-1">/ 100</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="mono text-xs text-slate-500 tracking-widest mb-2 uppercase">Readings Analyzed</p>
              <div className="text-6xl font-bold text-white mono">{readings.length}</div>
              <p className="mono text-xs text-slate-500 mt-1">time-interval samples</p>
            </div>
          </div>

          {/* Risk gradient bar */}
          <div className="mt-6">
            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${result.failureRiskPercent}%`,
                  background: `linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)`,
                  filter: `drop-shadow(0 0 6px ${rc.accent})`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
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
            <h2 className="text-xs font-semibold text-slate-400 tracking-widest mono uppercase mb-1">Parameter Status</h2>
            {result.parameterStatus.map((p, idx) => {
              const pc = RISK_COLORS[p.status];
              return (
                <div
                  key={p.name}
                  className={`rounded-2xl border p-4 anim-fade-in gradient-border transition-all ${pc.bg} ${pc.border}`}
                  style={{ animationDelay: `${idx * 60}ms`, boxShadow: `inset 0 0 30px ${pc.orb}, 0 4px 20px rgba(0,0,0,0.3)` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[["MIN", p.min], ["AVG", p.avg], ["MAX", p.max]].map(([label, val]) => (
                      <div key={label as string} className="bg-black/25 rounded-xl p-2.5">
                        <p className="mono text-xs text-slate-500">{label as string}</p>
                        <p className={`mono text-sm font-bold ${pc.text}`} style={{ textShadow: `0 0 10px ${pc.accent}50` }}>
                          {(val as number).toFixed(2)}
                        </p>
                        <p className="mono text-xs text-slate-600">{p.unit}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={p.values.map((v, i) => ({ t: `T${i + 1}`, v }))}>
                        <Line type="monotone" dataKey="v" stroke={pc.accent} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Charts + Root causes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Time-series charts */}
            <div
              className="glass-bright gradient-border rounded-2xl border border-white/8 p-5"
              style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)" }}
            >
              <h2 className="text-xs font-semibold text-slate-400 tracking-widest mono uppercase mb-5 flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-violet-400 to-cyan-400 inline-block" />
                Time-Series Trends
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { key: "temperature", label: "Temperature (°C)", color: "#f97316", refLine: PARAM_CONFIG.temperature.warn },
                  { key: "voltage", label: "Voltage (V)", color: "#60a5fa", refLine: PARAM_CONFIG.voltage.warn },
                  { key: "power", label: "Power (W)", color: "#a78bfa", refLine: PARAM_CONFIG.power.warn },
                  { key: "current", label: "Current (A)", color: "#34d399", refLine: PARAM_CONFIG.current.warn },
                ].map(({ key, label, color, refLine }) => (
                  <div key={key}>
                    <p className="mono text-xs mb-2" style={{ color }}>{label}</p>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={result.trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                          <defs>
                            <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#64748b", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <ReferenceLine y={refLine} stroke={color} strokeDasharray="3 3" strokeOpacity={0.5} />
                          <Area type="monotone" dataKey={key} stroke={color} strokeWidth={2.5} fill={`url(#grad-${key})`}
                            dot={{ fill: color, r: 3.5, strokeWidth: 0, filter: `drop-shadow(0 0 4px ${color})` }}
                            activeDot={{ r: 5.5, strokeWidth: 0, filter: `drop-shadow(0 0 8px ${color})` }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Root causes */}
            <div
              className="glass-bright gradient-border rounded-2xl border border-white/8 p-5"
              style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(6,182,212,0.2))", border: "1px solid rgba(99,102,241,0.3)" }}>
                  <span className="mono text-xs font-bold bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">AI</span>
                </div>
                <h2 className="text-xs font-semibold text-slate-300 tracking-widest mono uppercase">Root Cause Analysis</h2>
              </div>

              <div className="space-y-4">
                {result.rootCauses.map((cause, idx) => {
                  const cc = RISK_COLORS[cause.severity];
                  return (
                    <div
                      key={cause.id}
                      className={`rounded-xl border p-4 anim-fade-in ${cc.bg} ${cc.border} gradient-border`}
                      style={{
                        animationDelay: `${idx * 80}ms`,
                        boxShadow: `inset 0 0 20px ${cc.orb}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`mono text-xs font-bold ${cc.text}`} style={{ textShadow: `0 0 8px ${cc.accent}60` }}>
                            #{String(cause.id).padStart(2, "0")}
                          </span>
                          <h3 className="font-semibold text-white text-sm">{cause.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={cause.severity} />
                          <span className={`mono text-xs ${cc.text} bg-black/25 px-2 py-0.5 rounded-lg border border-white/8`}>
                            {cause.confidence}%
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">{cause.description}</p>
                      <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${cause.confidence}%`,
                            background: `linear-gradient(90deg, ${cc.accent}80, ${cc.accent})`,
                            boxShadow: `0 0 8px ${cc.accent}60`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Engineering Report */}
            {result.aiReport && (
              <div
                className="glass-bright gradient-border rounded-2xl border border-white/8 p-5"
                style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.2))", border: "1px solid rgba(139,92,246,0.3)" }}
                  >
                    <span className="mono text-xs font-bold bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">AI</span>
                  </div>
                  <h2 className="text-xs font-semibold text-slate-300 tracking-widest mono uppercase">Engineering Assessment</h2>
                </div>
                <div className="bg-black/20 border border-white/6 rounded-xl p-4">
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{result.aiReport}</p>
                </div>
              </div>
            )}

            {/* Raw readings table */}
            <div
              className="glass-bright gradient-border rounded-2xl border border-white/8 p-5"
              style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)" }}
            >
              <h2 className="text-xs font-semibold text-slate-400 tracking-widest mono uppercase mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500 inline-block" />
                Raw Readings Log
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/6">
                      {["#", "Timestamp", "Temp °C", "Voltage V", "Power mA", "Current A"].map((h) => (
                        <th key={h} className="mono text-xs text-slate-500 text-left py-2 pr-4 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((r, i) => (
                      <tr key={i} className="border-b border-white/4 hover:bg-white/3 transition-colors">
                        <td className="mono text-xs text-slate-600 py-2.5 pr-4">T{i + 1}</td>
                        <td className="mono text-xs text-slate-500 py-2.5 pr-4">{new Date(r.timestamp).toLocaleTimeString()}</td>
                        <td className={`mono text-xs py-2.5 pr-4 font-medium ${r.temperature >= PARAM_CONFIG.temperature.crit ? "text-red-400" : r.temperature >= PARAM_CONFIG.temperature.warn ? "text-amber-400" : "text-slate-300"}`}>{r.temperature.toFixed(1)}</td>
                        <td className={`mono text-xs py-2.5 pr-4 font-medium ${r.voltage <= PARAM_CONFIG.voltage.crit ? "text-red-400" : r.voltage <= PARAM_CONFIG.voltage.warn ? "text-amber-400" : "text-slate-300"}`}>{r.voltage.toFixed(1)}</td>
                        <td className={`mono text-xs py-2.5 pr-4 font-medium ${r.power >= PARAM_CONFIG.power.crit ? "text-red-400" : r.power >= PARAM_CONFIG.power.warn ? "text-amber-400" : "text-slate-300"}`}>{r.power.toFixed(3)}</td>
                        <td className={`mono text-xs py-2.5 pr-4 font-medium ${r.current >= PARAM_CONFIG.current.crit ? "text-red-400" : r.current >= PARAM_CONFIG.current.warn ? "text-amber-400" : "text-slate-300"}`}>{r.current.toFixed(2)}</td>
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

  const handleComplete = useCallback(async (r: Reading[]) => {
    setReadings(r);

    try {
      // The existing UI collects 5 readings. Your ML API currently accepts
      // one reading, so the latest reading is sent for model prediction while
      // all 5 readings remain available for the existing dashboard/trends.
      const latest = r[r.length - 1];

      const response = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          component_type: latest.componentId || "Semiconductor Component",
          temperature: latest.temperature,
          voltage: latest.voltage,
          current: latest.current,
          power: latest.power,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend analysis failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log("BurnGuard backend response:", data);

      const backendRisk = String(data.riskLevel || "low").toLowerCase();
      const riskLevel: AnalysisResult["riskLevel"] =
        backendRisk === "critical" || backendRisk === "high" || backendRisk === "medium" || backendRisk === "low"
          ? backendRisk
          : "low";

      const parameterStatus = buildParameterStatus(r, data.parameterStatus);

      const finalResult: AnalysisResult = {
        anomalyScore: Number(data.anomalyScore ?? 0),
        failureRiskPercent: Number(data.failureRiskPercent ?? 0),
        riskLevel,
        rootCauses: generateRootCauses(parameterStatus, riskLevel),
        parameterStatus,
        trendData: buildTrendData(r),
        aiReport: typeof data.aiReport === "string" ? data.aiReport : undefined,
      };

      setResult(finalResult);
      setStage("results");
    } catch (error) {
      console.error("BurnGuard analysis error:", error);

      const message = error instanceof Error ? error.message : "Unknown error";

      alert(
        `Unable to analyze component.\n\n${message}\n\nMake sure:\n1. Express backend is running on port 5000.\n2. Python ML service is running on port 8000.\n3. GROQ_API_KEY is configured in the Python service.`
      );
    }
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