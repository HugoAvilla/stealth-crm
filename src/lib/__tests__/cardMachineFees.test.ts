import { describe, expect, it } from "vitest";
import {
  calculateCardMachineFeeAmount,
  calculateCardMachineNetAmount,
  formatCardMachineRatePercent,
} from "@/lib/cardMachineFees";

describe("card machine fees", () => {
  it("calculates the card machine fee amount from the sale amount and percentage", () => {
    expect(calculateCardMachineFeeAmount(999, 7.96)).toBe(79.52);
  });

  it("normalizes rates saved without decimal separators", () => {
    expect(formatCardMachineRatePercent(675)).toBe("6.75");
    expect(calculateCardMachineFeeAmount(999, 675)).toBe(67.43);
    expect(calculateCardMachineNetAmount(999, 675)).toBe(931.57);
  });

  it("keeps the net amount calculation separate from the fee amount", () => {
    expect(calculateCardMachineFeeAmount(999, 7.92)).toBe(79.12);
    expect(calculateCardMachineNetAmount(999, 7.92)).toBe(919.88);
  });
});
