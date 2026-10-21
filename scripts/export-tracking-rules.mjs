// Reviewed numeric rules are deployed to an admin-only collection so clients cannot forge rewards.
import { createServer } from "vite";
const server = await createServer({ logLevel: "silent", server: { middlewareMode: true } });
try {
  const { PLAN_CAMPAIGNS } = await server.ssrLoadModule("/src/lib/planCampaigns.ts");
  const { SEED_CARDS } = await server.ssrLoadModule("/src/lib/seed.ts");
  const { ruleModel } = await server.ssrLoadModule("/src/lib/campaignJourney.ts");
  process.stdout.write(
    JSON.stringify(PLAN_CAMPAIGNS.map((c) => ({ id: c.id, data: ruleModel(c, SEED_CARDS) }))),
  );
} finally {
  await server.close();
}
