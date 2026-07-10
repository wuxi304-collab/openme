// AudioMeterBars — stereo VU meter display for the LosslessAudioPlayer.
// Renders two horizontal bars (L / R) plus a peak-hold tick and a dB
// readout, driven by the frame emitted from useAudioMeter.
//
// Visual design mirrors industrial hi-fi players: green → amber → red
// gradient with a brighter tick on the held peak. Reduced-motion users
// still see the bars; we only disable the flash pulse.
//
// Layout:
//   ┌──────────────────────────────┬───────┐
//   │ ▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱ L  -3.2 dB │ -3.2  │
//   │ ▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱ R  -5.1 dB │ -5.1  │
//   └──────────────────────────────┴───────┘

import { useMemo } from "react";
import { useI18n } from "../../i18n";
import type { MeterFrame } from "../../utils/audioMeter";

interface Props {
  frame: MeterFrame;
  floorDb: number;
  /** Optional channels count (1 = mono — we draw one combined bar). */
  channels?: number;
}

const GRADIENT_STOPS = [
  { pct: 0, color: "#1a7a3e" },
  { pct: 0.55, color: "#62c97a" },
  { pct: 0.75, color: "#f5c94f" },
  { pct: 0.9, color: "#e64231" },
  { pct: 1, color: "#7a1010" },
];

function buildGradient(): string {
  return `linear-gradient(90deg, ${GRADIENT_STOPS.map((s) => `${s.color} ${s.pct * 100}%`).join(", ")})`;
}

function amplitudeToPercent(amp: number): number {
  return Math.max(0, Math.min(100, amp * 100));
}

function formatDb(db: number): string {
  if (db <= -59.5) return "−∞";
  const sign = db < 0 ? "−" : "";
  return `${sign}${Math.abs(db).toFixed(1)}`;
}

interface BarProps {
  amplitude: number;
  peakAmplitude: number;
  label: string;
  db: number;
  peakDb: number;
  ariaSuffix: string;
  gradient: string;
}

function MeterBar({ amplitude, peakAmplitude, label, db, peakDb, ariaSuffix, gradient }: BarProps) {
  const { tf } = useI18n();
  const fillPct = amplitudeToPercent(amplitude);
  const peakPct = amplitudeToPercent(peakAmplitude);
  const aria = `${label} ${ariaSuffix} ${formatDb(db)}`;
  return (
    <div className="ll-meter-row" role="group" aria-label={aria}>
      <span className="ll-meter-channel" aria-hidden="true">{label}</span>
      <div className="ll-meter-track">
        <div className="ll-meter-fill" style={{ width: `${fillPct}%`, background: gradient }} aria-hidden="true" />
        <div
          className={`ll-meter-peak${peakAmplitude > 0.001 ? " is-active" : ""}`}
          style={{ left: `${peakPct}%` }}
          aria-hidden="true"
        />
        {/* Tick marks every 10%. Purely decorative. */}
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="ll-meter-tick" style={{ left: `${(i + 1) * 10}%` }} aria-hidden="true" />
        ))}
      </div>
      <span className="ll-meter-db" aria-hidden="true">{formatDb(db)}</span>
      <span className="sr-only">{tf("losslessMeterPeakHint", { peak: formatDb(peakDb) })}</span>
    </div>
  );
}

export default function AudioMeterBars({ frame, floorDb, channels = 2 }: Props) {
  const { t } = useI18n();
  const gradient = useMemo(buildGradient, []);
  const mono = channels <= 1;
  // Combined mono amplitude for single-channel sources so the bar still moves.
  const monoAmp = mono ? Math.max(frame.left, frame.right) : 0;
  const monoDb = mono ? Math.max(frame.leftDb, frame.rightDb) : floorDb;
  const monoPeakAmp = mono ? Math.max(frame.peakLeft, frame.peakRight) : 0;
  const monoPeakDb = mono ? Math.max(frame.peakLeftDb, frame.peakRightDb) : floorDb;
  return (
    <div className="ll-meter" aria-label={t("losslessMeterLabel")}>
      <div className="ll-meter-header">
        <span className="ll-meter-title">{t("losslessMeterTitle")}</span>
        <span className="ll-meter-scale" aria-hidden="true">−∞  −20  −10  −6  −3  0 dB</span>
      </div>
      {mono ? (
              <MeterBar
                amplitude={monoAmp}
                peakAmplitude={monoPeakAmp}
                label={t("losslessMeterMono")}
                db={monoDb}
                peakDb={monoPeakDb}
                ariaSuffix={t("losslessMeterLevelSuffix")}
                gradient={gradient}
              />
            ) : (
              <>
                <MeterBar
                  amplitude={frame.left}
                  peakAmplitude={frame.peakLeft}
                  label={t("losslessMeterLeft")}
                  db={frame.leftDb}
                  peakDb={frame.peakLeftDb}
                  ariaSuffix={t("losslessMeterLevelSuffix")}
                  gradient={gradient}
                />
                <MeterBar
                  amplitude={frame.right}
                  peakAmplitude={frame.peakRight}
                  label={t("losslessMeterRight")}
                  db={frame.rightDb}
                  peakDb={frame.peakRightDb}
                  ariaSuffix={t("losslessMeterLevelSuffix")}
                  gradient={gradient}
                />
              </>
            )}
    </div>
  );
}