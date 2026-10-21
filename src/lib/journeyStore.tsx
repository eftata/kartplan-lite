import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { watchEnrollments, watchProgress, watchLeague, updateLeague } from "./data";
import { journeyRows, journeyTotals } from "./campaignJourney";
import { EMPTY_LEAGUE, type LeagueMonth, type MissionId } from "./league";
import { useApp } from "./store";
import type { CampaignEnrollment, CampaignProgress } from "./types";
const Ctx = createContext<ReturnType<typeof build> | null>(null);
function build(
  state: ReturnType<typeof useApp>,
  enrollments: CampaignEnrollment[],
  progress: CampaignProgress[],
  game: LeagueMonth,
  loading: boolean,
  error: string,
) {
  const rows = journeyRows(
    state.planCampaigns,
    state.myCards,
    enrollments,
    progress,
    state.today,
    state.catalog,
  );
  return { rows, enrollments, progress, game, totals: journeyTotals(rows), loading, error };
}
export function JourneyProvider({ children }: { children: ReactNode }) {
  const state = useApp();
  const { user, today, profile } = state;
  const season = today.slice(0, 7);
  const [enrollments, setEnrollments] = useState<CampaignEnrollment[]>([]);
  const [progress, setProgress] = useState<CampaignProgress[]>([]);
  const [game, setGame] = useState<LeagueMonth>(EMPTY_LEAGUE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const awarding = useRef(false);
  const [awardRevision, setAwardRevision] = useState(0);
  useEffect(() => {
    setEnrollments([]);
    setProgress([]);
    setGame(EMPTY_LEAGUE);
    setError("");
    setLoading(true);
    if (!user) {
      setLoading(false);
      return;
    }
    let a = false,
      b = false,
      g = false;
    const done = () => {
      if (a && b && g) setLoading(false);
    };
    const fail = (e: Error) => {
      setError(e.message);
      setLoading(false);
    };
    const ea = watchEnrollments(
      user.uid,
      season,
      (x) => {
        setEnrollments(x);
        a = true;
        done();
      },
      fail,
    );
    const ep = watchProgress(
      user.uid,
      season,
      (x) => {
        setProgress(x);
        b = true;
        done();
      },
      fail,
    );
    const eg = watchLeague(
      user.uid,
      season,
      (x) => {
        setGame(x);
        g = true;
        done();
      },
      fail,
    );
    return () => {
      ea();
      ep();
      eg();
    };
  }, [user?.uid, season]);
  useEffect(() => {
    if (!user || !profile || loading || error || awarding.current) return;
    const qualified = progress.find((p) => (p.qualifiedCount ?? 0) > 0);
    const complete = progress.find((p) => p.completed && (p.earnedKurus ?? 0) > 0);
    const ready: Record<MissionId, boolean> = {
      wallet: profile.cardIds.length > 0,
      budget: Object.values(profile.spend).some((v) => (v ?? 0) > 0),
      plan: profile.planMonth === season && !!profile.planChoices?.length,
      conditions: enrollments.length > 0,
      join: enrollments.some((e) => e.bankJoined),
      progress: !!qualified,
      complete: !!complete,
    };
    const tasks = (Object.keys(ready) as MissionId[]).filter((id) => ready[id] && !game.tasks[id]);
    if (!tasks.length) return;
    awarding.current = true;
    void updateLeague(user.uid, season, {
      tasks,
      progressId: complete?.id ?? qualified?.id ?? game.progressId,
    })
      .then(() => {
        awarding.current = false;
        setAwardRevision((n) => n + 1);
      })
      .catch(() => {
        /* Manual claim stays available if a transient write fails. */
      })
      .finally(() => {
        awarding.current = false;
      });
  }, [user?.uid, profile, loading, error, enrollments, progress, game, season, awardRevision]);
  const value = useMemo(
    () => build(state, enrollments, progress, game, loading, error),
    [state, enrollments, progress, game, loading, error],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useJourney() {
  const value = useContext(Ctx);
  if (!value) throw new Error("Kampanya takip sağlayıcısı eksik.");
  return value;
}
