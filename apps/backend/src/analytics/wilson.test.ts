import { wilsonInterval } from "./wilson";

describe("wilsonInterval", () => {
  it("returns bounded interval", () => {
    const { low, high } = wilsonInterval(25, 100);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(1);
    expect(low).toBeLessThan(high);
  });
});
