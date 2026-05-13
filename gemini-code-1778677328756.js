import { useState, useEffect, useCallback, useMemo } from "react";

const ROOMS = [
  { id: "conquista", name: "Sala Conquista", color: "bg-yellow-500", light: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-800", badge: "bg-yellow-500 text-black" },
  { id: "inovacao", name: "Sala Inovação", color: "bg-zinc-800", light: "bg-zinc-100", border: "border-zinc-300", text: "text-zinc-800", badge: "bg-zinc-800 text-white" },
];

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];

function fmt(d) { return d.toISOString().split("T")[0]; }

function getMonday(d) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return m;
}

function getWeek(base) {
  const mon = getMonday(base);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function formatDateBR(str) {
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

const emptyForm = { room: "conquista", date: fmt(new Date()), start: "09:00", end: "10:00", subject: "", responsible: "" };

export default function App() {
  const [bookings, setBookings] = useState([]);
  const [offset, setOffset] = useState(0);
  const [modal, setModal] = useState(null); // "form" | "detail"
  const [form, setForm] = useState(emptyForm);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("week"); // "week" | "list"

  useEffect(() => {
    try {
      const r = localStorage.getItem("booking-salas-v2");
      if (r) setBookings(JSON.parse(r));
    } catch (e) {
      console.error("Erro ao carregar dados locais:", e);
    }
    setLoading(false);
  }, []);

  const persist = useCallback((list) => {
    try {
      localStorage.setItem("booking-salas-v2", JSON.stringify(list));
    } catch (e) {
      console.error("Erro ao salvar dados locais:", e);
    }
  }, []);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const today = new Date();
  const base = new Date(today);
  base.setDate(today.getDate() + offset * 7);
  const week = useMemo(() => getWeek(base), [offset]);

  const openForm = (date = fmt(today)) => {
    setForm({ ...emptyForm, date });
    setModal("form");
  };

  const handleBook = () => {
    if (!form.subject.trim() || !form.responsible.trim()) {
      showToast("Preencha assunto e responsável.", "err"); return;
    }
    if (form.start >= form.end) {
      showToast("Horário final deve ser após o início.", "err"); return;
    }
    const conflict = bookings.find(b =>
      b.room === form.room && b.date === form.date &&
      b.start < form.end && b.end > form.start
    );
    if (conflict) {
      showToast(`Conflito! ${ROOMS.find(r=>r.id===form.room).name} já está reservada nesse horário.`, "err"); return;
    }
    const nb = { ...form, id: `${Date.now()}` };
    const upd = [...bookings, nb].sort((a, b) => a.date+a.start > b.date+b.start ? 1 : -1);
    setBookings(upd); persist(upd);
    setModal(null);
    showToast("✅ Sala reservada com sucesso!");
  };

  const handleDelete = (id) => {
    const upd = bookings.filter(b => b.id !== id);
    setBookings(upd); persist(upd);
    setModal(null); setDetail(null);
    showToast("Reserva cancelada.");
  };

  const room = (id) => ROOMS.find(r => r.id === id);

  const todayStr = fmt(today);
  const upcomingBookings = useMemo(() => 
    bookings.filter(b => b.date >= todayStr).slice(0, 20),
  [bookings, todayStr]);

  return (
    <div className="min-h-screen bg-zinc-50" style={{fontFamily:"system-ui,sans-serif"}}>
      {/* Header */}
      <div className="bg-black shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-yellow-500">📅 Reserva de Salas</h1>
            <div className="flex gap-3 mt-1">
              {ROOMS.map(r => (
                <span key={r.id} className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${r.color}`}></span>
                  {r.name}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => openForm()}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-sm"
          >
            <span>+</span> Nova Reserva
          </button>
        </div>

        {/* View tabs */}
        <div className="max-w-4xl mx-auto px-4 pb-0 flex gap-1 border-t border-zinc-800">
          {[["week","Semana"],["list","Lista"]].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${view===v?"border-yellow-500 text-yellow-500":"border-transparent text-zinc-400 hover:text-zinc-200"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-16 text-zinc-400">Carregando...</div>
        ) : view === "week" ? (
          <>
            {/* Week nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setOffset(o=>o-1)} className="text-sm font-medium text-zinc-600 hover:text-black bg-white border border-zinc-200 rounded-lg px-3 py-1.5 transition shadow-sm">← Anterior</button>
              <div className="text-center">
                <span className="font-semibold text-zinc-800 text-sm">
                  {week[0].getDate()}/{week[0].getMonth()+1} – {week[4].getDate()}/{week[4].getMonth()+1}/{week[4].getFullYear()}
                </span>
                {offset === 0 && <span className="ml-2 text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full border border-yellow-200">Esta semana</span>}
              </div>
              <button onClick={() => setOffset(o=>o+1)} className="text-sm font-medium text-zinc-600 hover:text-black bg-white border border-zinc-200 rounded-lg px-3 py-1.5 transition shadow-sm">Próxima →</button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-5 gap-3">
              {week.map((date, i) => {
                const ds = fmt(date);
                const isToday = ds === todayStr;
                const dayBooks = bookings.filter(b => b.date === ds);
                return (
                  <div key={i} className={`rounded-xl border bg-white overflow-hidden shadow-sm ${isToday ? "border-yellow-500 ring-2 ring-yellow-200" : "border-zinc-200"}`}>
                    <div className={`text-center py-2 px-1 ${isToday ? "bg-black" : "bg-zinc-50 border-b border-zinc-100"}`}>
                      <div className={`text-xs font-bold uppercase tracking-wide ${isToday ? "text-yellow-500" : "text-zinc-500"}`}>{WEEKDAYS[i]}</div>
                      <div className={`text-lg font-black leading-tight ${isToday ? "text-white" : "text-zinc-800"}`}>{date.getDate()}</div>
                    </div>
                    <div className="p-2 space-y-1.5 min-h-[5rem]">
                      {dayBooks.length === 0 && (
                        <div className="text-center text-xs font-medium text-zinc-300 py-4">Livre</div>
                      )}
                      {dayBooks.map(b => {
                        const rm = room(b.room);
                        return (
                          <div key={b.id} onClick={() => { setDetail(b); setModal("detail"); }}
                            className={`${rm.light} ${rm.border} border rounded-lg p-2 cursor-pointer hover:shadow-md transition`}>
                            <div className={`text-xs font-bold ${rm.text}`}>{b.start}–{b.end}</div>
                            <div className="text-xs font-medium text-zinc-900 truncate leading-tight mt-0.5">{b.subject}</div>
                            <div className="text-[10px] text-zinc-500 truncate mt-1">{b.responsible}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-2 pb-2">
                      <button onClick={() => openForm(ds)}
                        className="w-full text-xs font-semibold text-zinc-400 hover:text-black hover:bg-zinc-100 border border-dashed border-transparent hover:border-zinc-300 rounded-lg py-1.5 transition">
                        + Reservar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* List View */
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Próximas Reservas</h2>
            {upcomingBookings.length === 0 && (
              <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-zinc-400 text-sm font-medium shadow-sm">
                Nenhuma reserva encontrada.
              </div>
            )}
            {upcomingBookings.map(b => {
              const rm = room(b.room);
              return (
                <div key={b.id} onClick={() => { setDetail(b); setModal("detail"); }}
                  className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-zinc-300 transition">
                  <div className={`w-1.5 self-stretch rounded-full ${rm.color}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-zinc-900 text-sm truncate">{b.subject}</div>
                    <div className="text-xs font-medium text-zinc-500 mt-1">{formatDateBR(b.date)} · {b.start}–{b.end} · {rm.name}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{b.responsible}</div>
                  </div>
                  <span className={`text-xs font-bold ${rm.badge} px-2.5 py-1 rounded-full whitespace-nowrap`}>
                    {b.date === todayStr ? "Hoje" : "Agendado"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FORM MODAL */}
      {modal === "form" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-zinc-100" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-3 border-b border-zinc-100">
              <h2 className="text-xl font-black text-black">Nova Reserva</h2>
              <p className="text-sm font-medium text-zinc-500 mt-1">Preencha os dados da reunião</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sala</label>
                <div className="flex gap-2 mt-1.5">
                  {ROOMS.map(r => (
                    <button key={r.id} onClick={() => setForm(f => ({ ...f, room: r.id }))}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition ${form.room === r.id ? `${r.color} text-black border-transparent shadow-md` : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300"}`}>
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Data</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full mt-1.5 border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white transition" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Início</label>
                  <input type="time" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                    className="w-full mt-1.5 border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white transition" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Fim</label>
                  <input type="time" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                    className="w-full mt-1.5 border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white transition" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Assunto</label>
                <input type="text" placeholder="Ex: OSI 288 – Reunião com empresa Realiza" value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full mt-1.5 border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white transition" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Responsável(is)</label>
                <input type="text" placeholder="Ex: Fernando + Odival" value={form.responsible}
                  onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                  className="w-full mt-1.5 border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white transition" />
              </div>
            </div>
            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button onClick={() => setModal(null)}
                className="flex-1 border border-zinc-200 bg-white text-zinc-600 py-3 rounded-xl text-sm font-bold hover:bg-zinc-50 transition">
                Cancelar
              </button>
              <button onClick={handleBook}
                className="flex-1 bg-black hover:bg-zinc-800 text-yellow-500 py-3 rounded-xl text-sm font-black transition shadow-lg">
                Confirmar Reserva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {modal === "detail" && detail && (() => {
        const rm = room(detail.room);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className={`${rm.light} px-6 py-5 border-b ${rm.border}`}>
                <div className={`text-[10px] font-black uppercase tracking-widest ${rm.text} mb-1.5`}>{rm.name}</div>
                <div className="font-black text-black text-lg leading-tight">{detail.subject}</div>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-3 text-sm font-medium">
                  <span className="text-zinc-400 w-5 text-center">📅</span>
                  <span className="text-zinc-800">{formatDateBR(detail.date)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium">
                  <span className="text-zinc-400 w-5 text-center">🕐</span>
                  <span className="text-zinc-800">{detail.start} – {detail.end}hrs</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium">
                  <span className="text-zinc-400 w-5 text-center">👤</span>
                  <span className="text-zinc-800">{detail.responsible}</span>
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => setModal(null)}
                  className="flex-1 border border-zinc-200 bg-white text-zinc-600 py-3 rounded-xl text-sm font-bold hover:bg-zinc-50 transition">
                  Fechar
                </button>
                <button onClick={() => handleDelete(detail.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-bold transition shadow-md">
                  Cancelar Reserva
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl text-white text-sm font-bold z-50 transition-all border ${toast.type === "err" ? "bg-red-600 border-red-700" : "bg-black border-zinc-800 text-yellow-500"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}