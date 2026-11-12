import { describe, expect, it } from "vitest";
import { cardinal } from "../src/cardinal.js";

describe("cardinal", () => {
  it("names the eight principal points", () => {
    expect(cardinal(0)).toBe("N");
    expect(cardinal(45)).toBe("NE");
    expect(cardinal(90)).toBe("E");
    expect(cardinal(135)).toBe("SE");
    expect(cardinal(180)).toBe("S");
    expect(cardinal(225)).toBe("SW");
    expect(cardinal(270)).toBe("W");
    expect(cardinal(315)).toBe("NW");
  });

  it("resolves 16 points, not 8", () => {
    // 8-point buckets flattened a real veer and invented a false one on live data,
    // which is why this is 16-point. See ADR-0012.
    expect(cardinal(295)).toBe("WNW");
    expect(cardinal(22.5)).toBe("NNE");
    expect(cardinal(343)).toBe("NNW");
  });

  it("wraps through north without emitting an undefined bucket", () => {
    expect(cardinal(354)).toBe("N");
    expect(cardinal(359.9)).toBe("N");
    expect(cardinal(360)).toBe("N");
  });

  it("keeps a steady wind steady across the 9,000 to 15,000 ft band", () => {
    // Measured at Kopaida: these are the same wind within 13 degrees. 8-point
    // rendered them as W, NW, NW, NW, W, W.
    for (const d of [292, 298, 301, 294, 290, 288]) expect(cardinal(d)).toBe("WNW");
  });
});
