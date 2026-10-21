import { expect, it } from "vitest";
import { mixCampaigns } from "./campaignOrder";
import type { ExternalCampaign } from "./externalCampaigns";
it("shows each bank early and preserves every offer exactly once", () => {
  const input = ["bonus", "bonus", "bonus", "maximum", "maximum", "world", "paraf"].map(
    (program, index) => ({
      id: String(index),
      program,
      title: String(index),
      category: "Market",
      summary: "",
      benefit: "",
      endsAt: "",
      sourceUrl: "https://example.com/" + index,
    }),
  ) satisfies ExternalCampaign[];
  const mixed = mixCampaigns(input);
  expect(mixed.slice(0, 4).map((c) => c.program)).toEqual(["bonus", "maximum", "world", "paraf"]);
  expect(mixed.map((c) => c.id).sort()).toEqual(input.map((c) => c.id).sort());
});
