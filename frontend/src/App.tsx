import { useEffect, useMemo, useState } from "react";
import { authenticateTelegram, loadRemoteState, saveRemoteState } from "./api";

const STORAGE_KEY = "fitness-60-days-v2";
const DAYS = Array.from({ length: 60 }, (_, i) => i + 1);
const WEEKDAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

type View = "overview" | "calendar" | "stats";
type DayNotes = Record<number, string>;

function readLocal() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      completed: Array.isArray(value.completed) ? value.completed.filter((x: unknown) => Number.isInteger(x) && Number(x) >= 1 && Number(x) <= 60) : [],
      notes: value.notes && typeof value.notes === "object" ? value.notes as DayNotes : {},
      startedAt: typeof value.startedAt === "string" ? value.startedAt : new Date().toISOString()
    };
  } catch {
    return { completed: [] as number[], notes: {} as DayNotes, startedAt: new Date().toISOString() };
  }
}

function getStreak(completed: number[]) {
  const set = new Set(completed);
  let streak = 0;
  let day = Math.max(...completed, 0);
  while (day > 0 && set.has(day)) { streak++; day--; }
  return streak;
}

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [completed, setCompleted] = useState<number[]>([]);
  const [notes, setNotes] = useState<DayNotes>({});
  const [selectedDay, setSelectedDay] = useState(1);
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"local" | "synced" | "offline">("local");
  const [startedAt, setStartedAt] = useState(new Date().toISOString());

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const local = readLocal();
      let nextCompleted = local.completed;
      let nextNotes = local.notes;
      let nextStartedAt = local.startedAt;
      try {
        const authToken = await authenticateTelegram();
        if (authToken) {
          const remote = await loadRemoteState(authToken);
          if (Array.isArray(remote.completed_days)) nextCompleted = remote.completed_days as number[];
          if (remote.notes && typeof remote.notes === "object") nextNotes = remote.notes as DayNotes;
          if (typeof remote.started_at === "string") nextStartedAt = remote.started_at;
          if (!cancelled) { setToken(authToken); setSyncStatus("synced"); }
        }
      } catch { if (!cancelled) setSyncStatus("offline"); }
      if (!cancelled) {
        setCompleted(nextCompleted);
        setNotes(nextNotes);
        setStartedAt(nextStartedAt);
        setSelectedDay(Math.min(60, Math.max(1, nextCompleted.length + 1)));
        setReady(true);
      }
    }
    void init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const state = { completed, notes, started_at: startedAt };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed, notes, startedAt }));
    if (token) {
      void saveRemoteState(token, { completed_days: completed, notes, started_at: startedAt })
        .then(() => setSyncStatus("synced"))
        .catch(() => setSyncStatus("offline"));
    }
  }, [completed, notes, token, ready, startedAt]);

  const percent = Math.round(completed.length / 60 * 100);
  const streak = getStreak(completed);
  const nextDay = DAYS.find(day => !completed.includes(day)) ?? 60;
  const firstWeek = Math.min(8, Math.floor((selectedDay - 1) / 7) + 1);
  const weekProgress = completed.filter(day => Math.ceil(day / 7) === firstWeek).length;
  const selectedDone = completed.includes(selectedDay);
  const monthGrid = useMemo(() => {
    const cells: (number | null)[] = [...DAYS];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, []);

  function toggleDay(day: number) {
    setSelectedDay(day);
    setCompleted(current => current.includes(day) ? current.filter(x => x !== day) : [...current, day].sort((a,b) => a-b));
  }

  function updateNote(value: string) {
    setNotes(current => ({ ...current, [selectedDay]: value }));
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="logo" href="#" onClick={e => { e.preventDefault(); setView("overview"); }}>
        <span className="logo-symbol"><span /></span><span className="logo-name">FORM<span>60</span></span>
      </a>
      <div className="side-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <nav className="side-nav">
        <button className={view === "overview" ? "nav-item active" : "nav-item"} onClick={() => setView("overview")}><span className="nav-icon">⌂</span> Обзор</button>
        <button className={view === "calendar" ? "nav-item active" : "nav-item"} onClick={() => setView("calendar")}><span className="nav-icon">▦</span> Календарь <span className="nav-count">60</span></button>
        <button className={view === "stats" ? "nav-item active" : "nav-item"} onClick={() => setView("stats")}><span className="nav-icon">↗</span> Статистика</button>
      </nav>
      <div className="sidebar-bottom">
        <div className="side-challenge">
          <div className="side-challenge-top"><span>ТВОЙ ЧЕЛЛЕНДЖ</span><span className="live-dot" /></div>
          <div className="side-challenge-title">60 дней<br/>последовательно.</div>
          <div className="side-mini-track"><i style={{width: percent + "%"}} /></div>
          <div className="side-challenge-foot"><span>{completed.length}/60 дней</span><b>{percent}%</b></div>
        </div>
        <div className="sidebar-foot"><span className="avatar">60</span><span><b>Мой прогресс</b><small>Личный трекер</small></span><span className="more">···</span></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="mobile-header"><a className="logo" href="#" onClick={e => {e.preventDefault();setView("overview");}}><span className="logo-symbol"><span /></span><span className="logo-name">FORM<span>60</span></span></a><span className={"sync-chip " + syncStatus}>{syncStatus === "synced" ? "● Синхронизировано" : syncStatus === "offline" ? "● Локальный режим" : "● Локально"}</span></header>
      <header className="page-top">
        <div className="breadcrumb">МОЙ ПЛАН <span>/</span> <b>{view === "overview" ? "ОБЗОР" : view === "calendar" ? "КАЛЕНДАРЬ" : "СТАТИСТИКА"}</b></div>
        <div className={"sync-chip " + syncStatus}>{syncStatus === "synced" ? "● Синхронизировано" : syncStatus === "offline" ? "● Локальный режим" : "● Локально"}</div>
      </header>

      {view === "overview" && <div className="content">
        <section className="welcome-row">
          <div><div className="overline"><span className="overline-line" /> ТВОЯ ТОЧКА ОТСЧЁТА</div><h1>Каждый день —<br/><em>шаг вперёд.</em></h1><p className="welcome-copy">60 дней, чтобы выстроить ритм. Отмечай выполненные дни, фиксируй мысли и наблюдай за своим прогрессом.</p></div>
          <div className="hero-stamp"><div className="stamp-ring"><span>60</span><small>ДНЕЙ</small></div><div className="stamp-caption">ONE DAY<br/>AT A TIME</div></div>
        </section>

        <section className="stats-grid">
          <article className="stat-card primary-stat"><div className="stat-top"><span>ОБЩИЙ ПРОГРЕСС</span><span className="stat-icon">◒</span></div><div className="stat-value">{percent}<small>%</small></div><div className="stat-track"><i style={{width: percent + "%"}} /></div><div className="stat-bottom"><span>{completed.length} из 60 дней</span><b>{60 - completed.length} осталось</b></div></article>
          <article className="stat-card"><div className="stat-top"><span>ТЕКУЩАЯ СЕРИЯ</span><span className="stat-icon">↗</span></div><div className="stat-value">{streak}<small> дн.</small></div><div className="stat-hint">Последовательных отметок</div><div className="stat-accent">Держи свой темп</div></article>
          <article className="stat-card"><div className="stat-top"><span>СЛЕДУЮЩИЙ ШАГ</span><span className="stat-icon">→</span></div><div className="stat-value">День <small>{nextDay}</small></div><div className="stat-hint">{completed.length === 60 ? "Все 60 дней отмечены" : "Продолжай с ближайшего дня"}</div><button className="text-action" onClick={() => {setSelectedDay(nextDay);setView("calendar");}}>Открыть день <span>↗</span></button></article>
        </section>

        <section className="dashboard-grid">
          <article className="panel calendar-panel">
            <div className="panel-heading"><div><div className="panel-kicker">60-ДНЕВНЫЙ ПУТЬ</div><h2>Календарь активности</h2></div><button className="quiet-button" onClick={() => setView("calendar")}>Все дни <span>↗</span></button></div>
            <div className="week-labels">{WEEKDAYS.map(x => <span key={x}>{x}</span>)}</div>
            <div className="mini-calendar">{DAYS.slice(0, 35).map(day => <button key={day} className={"calendar-day " + (completed.includes(day) ? "is-done" : "") + (selectedDay === day ? " is-selected" : "")} onClick={() => {setSelectedDay(day);setView("calendar");}}><span>{String(day).padStart(2,"0")}</span>{completed.includes(day) && <b>✓</b>}</button>)}</div>
            <div className="calendar-legend"><span><i className="legend-done"/> Выполнено</span><span><i className="legend-empty"/> Не отмечено</span></div>
          </article>
          <article className="panel focus-panel">
            <div className="panel-kicker">ФОКУС НА СЕГОДНЯ</div><div className="focus-number">{String(nextDay).padStart(2,"0")}<span> / 60</span></div><h2>{completed.length === 60 ? "Путь пройден." : "Сделай свой шаг."}</h2><p>{completed.length === 60 ? "Ты отметил все дни челленджа. Сохрани этот результат." : "Не обязательно идеально. Главное — последовательно возвращаться к своей цели."}</p>
            <button className="primary-button" onClick={() => {setSelectedDay(nextDay);setView("calendar");}}>{completed.length === 60 ? "Посмотреть календарь" : "Открыть день"} <span>↗</span></button>
            <div className="focus-decoration">F<span>60</span></div>
          </article>
        </section>
        <div className="bottom-note"><span className="note-mark">✳</span><span><b>Стабильность важнее идеальности.</b><small>Отмечай только то, что действительно сделал. Честный прогресс — лучший прогресс.</small></span></div>
      </div>}

      {view === "calendar" && <div className="content">
        <section className="subpage-heading"><div className="overline"><span className="overline-line"/> ТВОЙ ПУТЬ</div><h1>Календарь <em>60 дней.</em></h1><p className="welcome-copy">Выбери день, чтобы отметить выполнение или сохранить заметку.</p></section>
        <section className="calendar-workspace">
          <article className="panel full-calendar-panel"><div className="panel-heading"><div><div className="panel-kicker">ПРОГРЕСС ПО ДНЯМ</div><h2>Все 60 дней</h2></div><div className="calendar-total">{completed.length}<span> / 60</span></div></div>
            <div className="week-labels">{WEEKDAYS.map(x => <span key={x}>{x}</span>)}</div>
            <div className="full-calendar">{monthGrid.map((day, i) => day ? <button key={day} className={"calendar-day large-day " + (completed.includes(day) ? "is-done" : "") + (selectedDay === day ? " is-selected" : "")} onClick={() => setSelectedDay(day)}><span>{String(day).padStart(2,"0")}</span>{completed.includes(day) && <b>✓</b>}</button> : <span key={"empty"+i} className="calendar-placeholder" />)}</div>
            <div className="calendar-legend"><span><i className="legend-done"/> Выполнено</span><span><i className="legend-empty"/> Впереди</span><span><i className="legend-selected"/> Выбранный день</span></div>
          </article>
          <aside className="panel day-detail"><div className="panel-kicker">ДЕТАЛИ ДНЯ</div><div className="detail-day">ДЕНЬ <strong>{String(selectedDay).padStart(2,"0")}</strong></div><div className="detail-status"><span className={selectedDone ? "status-check checked" : "status-check"}>{selectedDone ? "✓" : "·"}</span><span><b>{selectedDone ? "День выполнен" : "День ещё впереди"}</b><small>{selectedDone ? "Отметка сохранена в прогрессе" : "Готов отметить этот день?"}</small></span></div><button className={selectedDone ? "secondary-button" : "primary-button"} onClick={() => toggleDay(selectedDay)}>{selectedDone ? "Снять отметку" : "Отметить выполненным"} <span>↗</span></button><div className="detail-divider"/><label className="note-label" htmlFor="day-note">ЗАМЕТКА К ДНЮ</label><textarea id="day-note" value={notes[selectedDay] || ""} onChange={e => updateNote(e.target.value)} placeholder="Что получилось? Что хочешь запомнить?" maxLength={500}/><div className="note-length">{(notes[selectedDay] || "").length}/500</div><div className="detail-tip"><span>✳</span> Маленькие шаги тоже имеют значение.</div></aside>
        </section>
      </div>}

      {view === "stats" && <div className="content">
        <section className="subpage-heading"><div className="overline"><span className="overline-line"/> ЦИФРЫ И ДИНАМИКА</div><h1>Твой прогресс<br/><em>в деталях.</em></h1><p className="welcome-copy">Смотри, как складываются твои ежедневные усилия.</p></section>
        <section className="stats-grid stats-page-grid">
          <article className="stat-card primary-stat"><div className="stat-top"><span>ЗАВЕРШЕНО</span><span className="stat-icon">◒</span></div><div className="stat-value">{completed.length}<small> / 60</small></div><div className="stat-track"><i style={{width: percent + "%"}}/></div><div className="stat-bottom"><span>Общий прогресс</span><b>{percent}%</b></div></article>
          <article className="stat-card"><div className="stat-top"><span>СЕРИЯ</span><span className="stat-icon">↗</span></div><div className="stat-value">{streak}<small> дней</small></div><div className="stat-hint">Текущая последовательность</div></article>
          <article className="stat-card"><div className="stat-top"><span>ОСТАЛОСЬ</span><span className="stat-icon">◷</span></div><div className="stat-value">{60-completed.length}<small> дней</small></div><div className="stat-hint">До завершения челленджа</div></article>
        </section>
        <section className="panel stats-breakdown"><div className="panel-heading"><div><div className="panel-kicker">РИТМ ЧЕЛЛЕНДЖА</div><h2>Активность по неделям</h2></div></div>{Array.from({length:9},(_,i)=>{const start=i*7+1;const end=Math.min(60,start+6);const count=completed.filter(d=>d>=start&&d<=end).length;const max=end-start+1;return <div className="week-row" key={i}><span>Неделя {i+1}</span><div className="week-track"><i style={{width:(count/max*100)+"%"}}/></div><b>{count}<small> / {max}</small></b></div>})}</section>
        <div className="bottom-note"><span className="note-mark">✳</span><span><b>Каждая отметка — часть большой дистанции.</b><small>Сравнивай себя только со своей отправной точкой.</small></span></div>
      </div>}
      <footer className="main-footer"><span>FORM60</span><span>60 ДНЕЙ · ОДИН ШАГ ЗА РАЗ</span></footer>
    </main>
  </div>;
}
