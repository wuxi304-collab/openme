// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AudioMeterBars from "./AudioMeterBars";
import { emptyMeterFrame, type MeterFrame } from "../../utils/audioMeter";
import { I18nProvider } from "../../i18n";

function frame(overrides: Partial<MeterFrame> = {}): MeterFrame {
  return { ...emptyMeterFrame(), ...overrides };
}

function renderBars(props: Partial<React.ComponentProps<typeof AudioMeterBars>> = {}) {
  try { localStorage.setItem("openme.lang", "en"); } catch { /* ignore */ }
  return render(
    <I18nProvider>
      <AudioMeterBars frame={frame()} floorDb={-60} channels={2} {...props} />
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  try { localStorage.removeItem("openme.lang"); } catch { /* ignore */ }
});

describe("AudioMeterBars", () => {
  it("renders two rows by default (stereo)", () => {
    const { getAllByRole } = renderBars();
    expect(getAllByRole("group")).toHaveLength(2);
  });

  it("renders a single row for mono sources", () => {
    const { getAllByRole } = renderBars({ channels: 1 });
    expect(getAllByRole("group")).toHaveLength(1);
  });

  it("shows the live level title and a scale row", () => {
    const { getByText } = renderBars();
    expect(getByText("Live level")).toBeTruthy();
    expect(getByText(/0 dB/)).toBeTruthy();
  });

  it("shows −∞ when silence is below the floor", () => {
    const { container } = renderBars({ frame: frame({ leftDb: -60, rightDb: -60 }) });
    const dbCells = container.querySelectorAll(".ll-meter-db");
    expect(dbCells[0].textContent).toBe("−∞");
    expect(dbCells[1].textContent).toBe("−∞");
  });

  it("shows a positive dB value when amplitude is loud", () => {
    const { container } = renderBars({ frame: frame({ leftDb: -2.5, rightDb: -3.1 }) });
    const dbCells = container.querySelectorAll(".ll-meter-db");
    expect(dbCells[0].textContent).toBe("−2.5");
    expect(dbCells[1].textContent).toBe("−3.1");
  });

  it("clamps the fill width to 100% even when amplitude exceeds 1", () => {
    const { container } = renderBars({ frame: frame({ left: 1.4, right: 0.5 }) });
    const fills = container.querySelectorAll(".ll-meter-fill");
    expect((fills[0] as HTMLElement).style.width).toBe("100%");
    expect((fills[1] as HTMLElement).style.width).toBe("50%");
  });

  it("positions the peak tick at the held amplitude", () => {
    const { container } = renderBars({
      frame: frame({ peakLeft: 0.62, peakRight: 0.18, peakLeftDb: -4.1, peakRightDb: -14.9 }),
    });
    const peaks = container.querySelectorAll(".ll-meter-peak");
    expect((peaks[0] as HTMLElement).style.left).toBe("62%");
    expect((peaks[1] as HTMLElement).style.left).toBe("18%");
    expect(peaks[0].classList.contains("is-active")).toBe(true);
  });

  it("uses the Chinese title and scale row under zh locale", () => {
      try { localStorage.setItem("openme.lang", "zh"); } catch { /* ignore */ }
      const { getByText } = render(
        <I18nProvider>
          <AudioMeterBars frame={frame()} floorDb={-60} channels={2} />
        </I18nProvider>,
      );
      expect(getByText("实时电平")).toBeTruthy();
      try { localStorage.removeItem("openme.lang"); } catch { /* ignore */ }
    });
});