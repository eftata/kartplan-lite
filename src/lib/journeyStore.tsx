import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { watchEnrollments, watchProgress } from "./data";
import { journeyRows, journeyTotals } from "./campaignJourney";
import { useApp } from "./store";
import type { CampaignEnrollment, CampaignProgress } from "./types";
function build(
  state: ReturnType<typeof useApp>,
  enrollments: CampaignEnrollment[],
  progress: CampaignProgress[],
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
  return { rows, enrollments, progress, totals: journeyTotals(rows), loading, error };
}
const Ctx = createContext<ReturnType<typeof build> | null>(null);
export function JourneyProvider({ children }: { children: ReactNode }) {
  const state = useApp();
  const { user, today } = state;
  const season = today.slice(0, 7);
  const [enrollments, setEnrollments] = useState<CampaignEnrollment[]>([]);
  const [progress, setProgress] = useState<CampaignProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setEnrollments([]);
    setProgress([]);
    setError("");
    setLoading(true);
    if (!user) {
      setLoading(false);
      return;
    }
    let a = false,
      b = false;
    const done = () => {
      if (a && b) setLoading(false);
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
    return () => {
      ea();
      ep();
    };
  }, [user?.uid, season]);
  const value = useMemo(
    () => build(state, enrollments, progress, loading, error),
    [state, enrollments, progress, loading, error],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useJourney() {
  const value = useContext(Ctx);
  if (!value) throw new Error("Kampanya takip sağlayıcısı eksik.");
  return value;
}
