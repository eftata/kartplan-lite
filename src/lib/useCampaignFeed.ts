import { useEffect, useState } from "react";
import { EXTERNAL_CAMPAIGNS, type ExternalCampaign } from "./externalCampaigns";

type Feed = { updatedAt: string; campaigns: ExternalCampaign[] };
let cached: Feed | null = null;
let pending: Promise<Feed | null> | null = null;
async function loadFeed(today: string) {
  let latest = cached;
  for (const url of [
    `/campaign-feed.json?v=${today}`,
    `https://raw.githubusercontent.com/eftata/kartplan-lite/main/public/campaign-feed.json?v=${today}`,
  ]) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const data = (await response.json()) as Feed;
      if (
        Array.isArray(data.campaigns) &&
        data.campaigns.length > 20 &&
        (!latest || data.updatedAt > latest.updatedAt)
      )
        latest = data;
    } catch {
      /* The last published feed remains usable. */
    }
  }
  cached = latest;
  return latest;
}
export function useCampaignFeed(today: string) {
  const [feed, setFeed] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  useEffect(() => {
    let active = true;
    pending ??= loadFeed(today).finally(() => {
      pending = null;
    });
    void pending.then((data) => {
      if (active) {
        setFeed(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [today]);
  return { feed, external: feed?.campaigns ?? EXTERNAL_CAMPAIGNS, loading };
}
