import { useEffect, useMemo, useState } from "react";
import { authenticateTelegram, loadRemoteState, saveRemoteState } from "./api";

const KEY = "fitness-60-days-checkins";
const days = Array.from({ length: 60 }, (_, i) => i + 1);

function readLocal(): number[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value.filter((x): x is number => Number.isInteger(x) && x >= 1 && x <= 60) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [done, setDone] = useState<number[]>([]);
  const [active, setActive] = useState(1);
  const [apiToken, setApiToken] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      let initial = readLocal();
      try {
        const token = await authenticateTelegram();
        if (token) {
          const remote = await loadRemoteState(token);
          const remoteDays = remote.completed_days;
          if (Array.isArray(remoteDays)) {
            initial = remoteDays.filter((x): x is number => Number.isInteger(x) && x >= 1 && x <= 60);
          }
          if (!cancelled) setApiToken(token);
        }
      } catch {
        // Keep the local copy available if the API is not configured or temporarily unavailable.
      }
      if (!cancelled) {
        setDone(initial);
        setReady(true);
      }
    };
    void init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(done));
    if (apiToken) {
      void saveRemoteState(apiToken, { completed_days: done }).catch(() => {
        // Local progress remains saved if the server is temporarily unavailable.
      });
    }
  }, [done, apiToken, ready]);

  const percent = useMemo(() => Math.round(done.length / 60 * 100), [done]);
  const toggle = (day: number) => setDone(current =>
    current.includes(day) ? current.filter(x => x !== day) : [...current, day].sort((a, b) => a - b)
  );

  return <main className="shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">60</span><span>DAY<span className="muted">TRACKER</span></span></div><span className="pill">YOUR CHALLENGE</span></header>
    <section className="hero">
      <div className="eyebrow">ЛИЧНЫЙ ЧЕЛЛЕНДЖ</div>
      <h1>60 дней.<br /><em>Новый ритм.</em></h1>
      <p className="sub">Небольшие действия каждый день складываются в большой результат.</p>
      <div className="progress-card">
        <div className="progress-head"><span>ОБЩИЙ ПРОГРЕСС</span><strong>{percent}%</strong></div>
        <div className="track"><div className="fill" style={{ width: percent + "%" }} /></div>
        <div className="progress-foot"><span>{done.length} из 60 дней завершено</span><span>{60 - done.length} осталось</span></div>
      </div>
    </section>
    <section className="calendar-section">
      <div className="section-heading"><div><div className="eyebrow">ПОСЛЕДОВАТЕЛЬНОСТЬ</div><h2>Твой календарь</h2></div><div className="counter">{done.length}<small> / 60</small></div></div>
      <div className="calendar">{days.map(day => <button key={day} onClick={() => { setActive(day); toggle(day); }} className={`day ${done.includes(day) ? "completed" : ""} ${active === day ? "selected" : ""}`} aria-label={`День ${day}`}>
        <span>{String(day).padStart(2, "0")}</span>{done.includes(day) && <b>✓</b>}
      </button>)}</div>
      <div className="legend"><span><i className="dot done-dot" /> Выполнено</span><span><i className="dot" /> Впереди</span><span><i className="dot active-dot" /> Выбранный день</span></div>
    </section>
    <section className="quote"><span className="quote-mark">“</span><p>Дисциплина — это мост между целью и результатом.</p><span className="quote-caption">ОДИН ДЕНЬ ЗА РАЗ</span></section>
    <footer>60 DAY TRACKER <span>·</span> KEEP MOVING FORWARD</footer>
  </main>;
}
