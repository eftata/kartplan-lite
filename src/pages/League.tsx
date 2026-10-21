import { useEffect, useState } from "react";
import { PageHead } from "../components/Layout";
import { updateLeague, watchLeaders } from "../lib/data";
import { MISSIONS, leagueLevel, scoreRank, type Leader, type MissionId } from "../lib/league";
import { useSession } from "../lib/store";
import { monthName } from "../lib/dates";
import { Link } from "../lib/router";
import { useJourney } from "../lib/journeyStore";

export function League() {
  const { user, profile, today } = useSession();
  const season = today.slice(0, 7);

  const [leaders, setLeaders] = useState<Leader[]>([]);
  const { progress, enrollments, totals, game } = useJourney();
  const [nickname, setNickname] = useState("");

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => watchLeaders(season, setLeaders, (e) => setMessage(e.message)), [season]);
  const ready: Record<MissionId, boolean> = {
    wallet: profile.cardIds.length > 0,
    budget: Object.values(profile.spend).some((v) => (v ?? 0) > 0),
    plan: profile.planMonth === season && !!profile.planChoices?.length,
    conditions: enrollments.length > 0,
    join: enrollments.some((e) => e.bankJoined),
    progress: progress.some((p) => (p.qualifiedCount ?? 0) > 0),
    complete: progress.some((p) => p.completed && (p.earnedKurus ?? 0) > 0),
  };
  async function act(action: Parameters<typeof updateLeague>[2]) {
    setBusy(true);
    setMessage("");
    try {
      await updateLeague(user.uid, season, action);
      setMessage("Kaydedildi.");
    } catch {
      setMessage("İşlem tamamlanamadı. Görev koşullarını ve bağlantını kontrol et.");
    } finally {
      setBusy(false);
    }
  }
  const rank = scoreRank(leaders, user.uid);
  return (
    <>
      <PageHead kicker={monthName(today)} title="Kampanya Ligi">
        Kampanya akışını tamamladıkça görev puanların otomatik eklenir. Her ay yeni bir sezon.
      </PageHead>
      <section className="league-hero">
        <div>
          <span className="kicker">{leagueLevel(game.score)}</span>
          <strong className="big num">
            {game.score} <small>puan</small>
          </strong>
          <p>
            {game.optIn
              ? rank === 1
                ? "Bu ayın kampanya liderlerindensin!"
                : rank
                  ? `İlk 50 içinde sıran: ${rank}`
                  : "Ligdesin. İlk 50 için görevleri tamamla."
              : "Puanların sana özel. Takma adla lige katılabilirsin."}
          </p>
        </div>
        <div>
          <p>Günlük plan kontrolü · +10 puan</p>
          <button
            className="btn btn-primary"
            disabled={busy || !!game.checkins[today]}
            onClick={() => act({ checkin: today })}
          >
            {game.checkins[today] ? "Bugünkü kontrol tamamlandı" : "Bugünkü planımı kontrol ettim"}
          </button>
          <p className="small">
            Her gün bir kez. Ay değişince puanlar yeni sezonda sıfırdan başlar.
          </p>
        </div>
      </section>
      <section className="league-path">
        <div>
          <span className="kicker">Bu ayın rotası</span>
          <h2>Katıl, ilerle, tamamla.</h2>
          <p>
            {enrollments.length} katılım ·{" "}
            {progress.filter((p) => (p.qualifiedCount ?? 0) > 0).length} ilerleyen hedef ·{" "}
            {totals.completed} tamamlanan kampanya
          </p>
        </div>
        <div>
          <b>
            {Object.keys(game.tasks).length} / {MISSIONS.length} görev
          </b>
          <progress max={MISSIONS.length} value={Object.keys(game.tasks).length} />
          <span className="small">
            {game.score >= 450
              ? "En üst seviyedesin"
              : `Sıradaki seviyeye ${game.score < 100 ? 100 - game.score : game.score < 250 ? 250 - game.score : 450 - game.score} puan kaldı`}
          </span>
        </div>
        <Link className="btn btn-soft" href="/kampanyalar?stage=active">
          Kampanyaları ilerlet ↗
        </Link>
      </section>
      <div className="league-layout">
        <section>
          <h2>Aylık görevlerin</h2>
          <div className="mission-list">
            {MISSIONS.map((m) => (
              <article className="mission" key={m.id}>
                <div>
                  <span className="kicker">+{m.points} puan</span>
                  <h3>{m.title}</h3>
                  <p>{m.description}</p>
                  {!game.tasks[m.id] && !ready[m.id] && (
                    <Link
                      className="mission-next"
                      href={
                        m.id === "wallet"
                          ? "/kartlarim"
                          : m.id === "budget"
                            ? "/harcama"
                            : m.id === "plan"
                              ? "/plan"
                              : "/kampanyalar"
                      }
                    >
                      Göreve git ↗
                    </Link>
                  )}
                </div>
                <button
                  className="btn btn-soft"
                  disabled={busy || !!game.tasks[m.id] || !ready[m.id]}
                  onClick={() =>
                    act({
                      task: m.id,
                      ...(m.id === "progress" || m.id === "complete"
                        ? {
                            progressId: progress.find((p) =>
                              m.id === "complete"
                                ? p.completed && (p.earnedKurus ?? 0) > 0
                                : (p.qualifiedCount ?? 0) > 0,
                            )!.id,
                          }
                        : {}),
                    })
                  }
                >
                  {game.tasks[m.id]
                    ? "Tamamlandı ✓"
                    : ready[m.id]
                      ? "Puanı kazan"
                      : "Görev bekliyor"}
                </button>
              </article>
            ))}
          </div>
          <Link href="/plan#hedefler">Planıma ve hedeflerime git ↗</Link>
        </section>
        <aside className="panel league-ranking">
          <span className="kicker">{monthName(today)} · İlk 50</span>
          <h2>Aylık liderlik</h2>
          <p className="small muted">
            Eşit puanlı katılımcılar aynı sırayı paylaşır. Yalnızca takma adın ve görev puanın
            görünür.
          </p>
          {!game.optIn ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const n = nickname.trim();
                if (n.length < 2 || n.length > 24) {
                  setMessage("2–24 karakterlik bir takma ad gir.");
                  return;
                }
                act({ optIn: true, nickname: n });
              }}
            >
              <label>
                Herkese açık takma ad
                <input
                  minLength={2}
                  maxLength={24}
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Örn. FırsatKaşifi"
                />
              </label>
              <button className="btn btn-primary" disabled={busy}>
                Takma adımla lige katıl
              </button>
            </form>
          ) : (
            <p>
              <b>{game.nickname}</b> olarak katıldın.{" "}
              <button
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => act({ optIn: false })}
              >
                Ligden ayrıl
              </button>
            </p>
          )}
          {leaders.length === 0 ? (
            <p className="empty">Henüz katılımcı yok. İlk sezon lideri sen olabilirsin.</p>
          ) : (
            <ol className="leader-list">
              {leaders.map((l) => (
                <li key={l.id} className={l.id === user.uid ? "is-me" : ""}>
                  <b>
                    {1 + leaders.filter((x) => x.score > l.score).length === 1 ? "♜ " : ""}
                    {1 + leaders.filter((x) => x.score > l.score).length}
                  </b>
                  <span>{l.nickname}</span>
                  <strong>{l.score} puan</strong>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
      <p role="status">{message}</p>
      <p className="small muted">
        Bu lig öz beyanlı planlama ve takip görevlerine dayanır. Puanlar banka ödülü veya para
        değildir; alışveriş tutarı puanı artırmaz. Kartların, harcama limitlerin ve işlemlerin
        liderlik tablosunda paylaşılmaz.
      </p>
    </>
  );
}
