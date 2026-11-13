import { useEffect, useMemo, useState } from "react";

const KEY = "fitness-60-days-checkins";
const days = Array.from({ length: 60 }, (_, i) => i + 1);

export default function App() {
  const [done, setDone] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  });
  const [active, setActive] = useState(1);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(done)), [done]);
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
