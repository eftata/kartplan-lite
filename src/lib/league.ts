export const MISSIONS = [
  {
    id: "wallet",
    title: "Cüzdanını hazırla",
    description: "En az bir kartını tanımla.",
    points: 50,
  },
  {
    id: "budget",
    title: "Aylık sınırını belirle",
    description: "En az bir sektör için harcama bütçesi kaydet.",
    points: 75,
  },
  {
    id: "plan",
    title: "Kendi planını kur",
    description: "Bu ay için kampanya ve kart seçimini kaydet.",
    points: 75,
  },
  {
    id: "conditions",
    title: "Koşulları gözden geçir",
    description: "Bir kampanyanın işlem, katılım ve kart koşullarını kontrol et.",
    points: 25,
  },
  {
    id: "join",
    title: "Katılımını takip et",
    description: "Bankada katıldığın bir kampanyayı işaretle.",
    points: 50,
  },
  {
    id: "progress",
    title: "İlk ilerlemeni kaydet",
    description: "Bu ayki kampanyalarından birine harcama kaydı ekle.",
    points: 100,
  },
] as const;
export type MissionId = (typeof MISSIONS)[number]["id"];
export type LeagueMonth = {
  tasks: Partial<Record<MissionId, boolean>>;
  checkins: Record<string, boolean>;
  score: number;
  optIn: boolean;
  nickname: string;
  progressId: string;
};
export type Leader = { id: string; nickname: string; score: number };
export const EMPTY_LEAGUE: LeagueMonth = {
  tasks: {},
  checkins: {},
  score: 0,
  optIn: false,
  nickname: "",
  progressId: "",
};
export function leagueScore(
  tasks: LeagueMonth["tasks"],
  checkins: Record<string, boolean>,
): number {
  return (
    MISSIONS.reduce((s, m) => s + (tasks[m.id] ? m.points : 0), 0) +
    Object.values(checkins).filter(Boolean).length * 10
  );
}
export function leagueLevel(score: number): string {
  return score >= 450
    ? "Kampanya Ustası"
    : score >= 250
      ? "Akıllı Planlayıcı"
      : score >= 100
        ? "Fırsat Kaşifi"
        : "Yeni Kaşif";
}
export function scoreRank(leaders: Leader[], uid: string): number | null {
  const own = leaders.find((l) => l.id === uid);
  return own ? 1 + leaders.filter((l) => l.score > own.score).length : null;
}
