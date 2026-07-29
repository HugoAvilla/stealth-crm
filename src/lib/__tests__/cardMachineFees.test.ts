import { describe, expect, it } from "vitest";
import {
  calculateCardMachineFeeAmount,
  calculateCardMachineNetAmount,
  cardMachinePaymentFee,
  formatCardMachineRatePercent,
  type MachineForFee,
  type RateForFee,
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

describe("cardMachinePaymentFee", () => {
  const machines = new Map<number, MachineForFee>([[1, { debit_rate: 1.5 }]]);
  const rates: RateForFee[] = [
    { machine_id: 1, brand: "Visa", installments: 1, rate: 3.2 },
    { machine_id: 1, brand: null, installments: 3, rate: 6.5 },
  ];

  it("uses the machine debit_rate for débito payments", () => {
    const fee = cardMachinePaymentFee(
      { method: "Débito", amount: 1000, installments: 1, machine_id: 1, brand: null },
      machines,
      rates
    );
    expect(fee).toBe(15);
  });

  it("matches the crédito rate by installments and brand", () => {
    const fee = cardMachinePaymentFee(
      { method: "Crédito", amount: 1000, installments: 1, machine_id: 1, brand: "Visa" },
      machines,
      rates
    );
    expect(fee).toBe(32);
  });

  it("returns 0 without a machine or for non-card methods", () => {
    expect(
      cardMachinePaymentFee(
        { method: "Crédito", amount: 1000, installments: 1, machine_id: null, brand: null },
        machines,
        rates
      )
    ).toBe(0);
    expect(
      cardMachinePaymentFee(
        { method: "Pix", amount: 1000, installments: 1, machine_id: 1, brand: null },
        machines,
        rates
      )
    ).toBe(0);
  });
});
