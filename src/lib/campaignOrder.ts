import type { ExternalCampaign } from "./externalCampaigns";
/** Show every bank near the start instead of burying other banks behind hundreds of offers. */
export function mixCampaigns(campaigns: ExternalCampaign[]): ExternalCampaign[] {
  const groups = new Map<string, ExternalCampaign[]>();
  for (const campaign of campaigns)
    groups.set(campaign.program, [...(groups.get(campaign.program) ?? []), campaign]);
  const result: ExternalCampaign[] = [];
  for (let i = 0; result.length < campaigns.length; i++)
    for (const group of groups.values()) if (group[i]) result.push(group[i]!);
  return result;
}
