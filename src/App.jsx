import { useState, useEffect, useCallback } from "react";

const ROOMS = [
  { id: "conquista", name: "Sala Conquista", color: "bg-rose-500", light: "bg-rose-50", border: "border-rose-300", text: "text-rose-700", badge: "bg-rose-500" },
  { id: "inovacao", name: "Sala Inovação", color: "bg-blue-500", light: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", badge: "bg-blue-500" },
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
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("week");

  // CORREÇÃO 1: Substituição de window.storage por localStorage nativo no carregamento
  useEffect(() => {
    try {
      const r = localStorage.getItem("booking-salas-v2");
      if (r) setBookings(JSON.parse(r));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  }, []);

  // CORREÇÃO 2: Substituição de window.storage por localStorage nativo na gravação
  const persist = useCallback((list) => {
    try {
      localStorage.setItem("booking-salas-v2", JSON.stringify(list));
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
    }
  }, []);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const today = new Date();
  const base = new Date(today);
  base.setDate(today.getDate() + offset * 7);
  const week = getWeek(base);

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
  const upcomingBookings = bookings.filter(b => b.date >= todayStr).slice(0, 20);

  return (
    <div className="min-h-screen bg-gray-100" style={{fontFamily:"system-ui,sans-serif"}}>
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">📅 Reserva de Salas</h1>
            <div className="flex gap-3 mt-1">
              {ROOMS.map(r => (
                <span key={r.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${r.color}`}></span>
                  {r.name}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => openForm()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
          >
            <span>+</span> Nova Reserva
          </button>
        </div>

        {/* View tabs */}
        <div className="max-w-4xl mx-auto px-4 pb-0 flex gap-1 border-t">
          {[["week","Semana"],["list","Lista"]].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${view===v?"border-blue-600 text-blue-600":"border-transparent text-gray-500 hover:text-gray-700"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Carregando...</div>
        ) : view === "week" ? (
          <>
            {/* Week nav */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setOffset(o=>o-1)} className="text-sm text-gray-500 hover:text-gray-800 bg-white border rounded-lg px-3 py-1.5 transition">← Anterior</button>
              <div className="text-center">
                <span className="font-semibold text-gray-700 text-sm">
                  {week[0].getDate()}/{week[0].getMonth()+1} – {week[4].getDate()}/{week[4].getMonth()+1}/{week[4].getFullYear()}
                </span>
                {offset === 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Esta semana</span>}
              </div>
              <button onClick={() => setOffset(o=>o+1)} className="text-sm text-gray-500 hover:text-gray-800 bg-white border rounded-lg px-3 py-1.5 transition">Próxima →</button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-5 gap-2">
              {week.map((date, i) => {
                const ds = fmt(date);
                const isToday = ds === todayStr;
                const dayBooks = bookings.filter(b => b.date === ds);
                return (
                  <div key={i} className={`rounded-xl border bg-white overflow-hidden ${isToday ? "border-blue-400 ring-2 ring-blue-200" : "border-gray-200"}`}>
                    <div className={`text-center py-2 px-1 ${isToday ? "bg-blue-600" : "bg-gray-50 border-b border-gray-100"}`}>
                      <div className={`text-xs font-medium uppercase tracking-wide ${isToday ? "text-blue-100" : "text-gray-400"}`}>{WEEKDAYS[i]}</div>
                      <div className={`text-lg font-bold leading-tight ${isToday ? "text-white" : "text-gray-700"}`}>{date.getDate()}</div>
                    </div>
                    <div className="p-1.5 space-y-1 min-h-20">
                      {dayBooks.length === 0 && (
                        <div className="text-center text-xs text-gray-300 py-3">livre</div>
                      )}
                      {dayBooks.map(b => {
                        const rm = room(b.room);
                        return (
                          <div key={b.id} onClick={() => { setDetail(b); setModal("detail"); }}
                            className={`${rm.light} ${rm.border} border rounded-lg p-1.5 cursor-pointer hover:brightness-95 transition`}>
                            <div className={`text-xs font-bold ${rm.text}`}>{b.start}–{b.end}</div>
                            <div className="text-xs text-gray-700 truncate leading-tight">{b.subject}</div>
                            <div className="text-xs text-gray-400 truncate">{b.responsible}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-1.5 pb-1.5">
                      <button onClick={() => openForm(ds)}
                        className="w-full text-xs text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg py-1 transition">
                        + reservar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* List View */
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Próximas Reservas</h2>
            {upcomingBookings.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                Nenhuma reserva encontrada.
              </div>
            )}
            {upcomingBookings.map(b => {
              const rm = room(b.room);
              return (
                <div key={b.id} onClick={() => { setDetail(b); setModal("detail"); }}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4 cursor-pointer hover:shadow-sm transition">
                  <div className={`w-1 self-stretch rounded-full ${rm.color}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 text-sm truncate">{b.subject}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{formatDateBR(b.date)} · {b.start}–{b.end} · {rm.name}</div>
                    <div className="text-xs text-gray-400">{b.responsible}</div>
                  </div>
                  <span className={`text-xs text-white ${rm.badge} px-2 py-0.5 rounded-full whitespace-nowrap`}>
                    {b.date === todayStr ? "Hoje" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FORM MODAL */}
      {modal === "form" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-lg font-bold text-gray-800">Nova Reserva</h2>
              <p className="text-sm text-gray-400 mt-0.5">Preencha os dados da reunião</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sala</label>
                <div className="flex gap-2 mt-1">
                  {ROOMS.map(r => (
                    <button key={r.id} onClick={() => setForm(f => ({ ...f, room: r.id }))}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${form.room === r.id ? `${r.color} text-white border-transparent` : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Início</label>
                  <input type="time" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fim</label>
                  <input type="time" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assunto</label>
                <input type="text" placeholder="Ex: OSI 288 – Reunião com empresa Realiza" value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsável(is)</label>
                <input type="text" placeholder="Ex: Fernando + Odival" value={form.responsible}
                  onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setModal(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleBook}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition">
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
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className={`${rm.light} px-6 py-4 rounded-t-2xl border-b ${rm.border}`}>
                <div className={`text-xs font-bold uppercase tracking-wide ${rm.text} mb-1`}>{rm.name}</div>
                <div className="font-bold text-gray-800 text-base">{detail.subject}</div>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400">📅</span>
                  <span className="text-gray-700">{formatDateBR(detail.date)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400">🕐</span>
                  <span className="text-gray-700">{detail.start} – {detail.end}hrs</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400">👤</span>
                  <span className="text-gray-700">{detail.responsible}</span>
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => setModal(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  Fechar
                </button>
                <button onClick={() => handleDelete(detail.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                  Cancelar Reserva
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold z-50 transition-all ${toast.type === "err" ? "bg-red-500" : "bg-green-500"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
