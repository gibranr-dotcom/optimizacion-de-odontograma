'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, CircleHelp, FileText, Info, Save, Search, Stethoscope, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const padecimientos = ['Sano', 'Caries', 'Periodontitis', 'Fractura', 'Ausente', 'Endodoncia']
const tratamientos = ['Ninguno', 'Resina', 'Endodoncia', 'Corona', 'Extracción', 'Limpieza']
const colores: Record<string, string> = {
  Sano: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Caries: 'bg-rose-100 text-rose-700 border-rose-200',
  Periodontitis: 'bg-amber-100 text-amber-700 border-amber-200',
  Fractura: 'bg-orange-100 text-orange-700 border-orange-200',
  Ausente: 'bg-slate-100 text-slate-500 border-slate-200',
  Endodoncia: 'bg-violet-100 text-violet-700 border-violet-200',
}

type Registro = { padecimiento: string; tratamiento: string; notas: string }
type OdontogramaClinicoProps = { pacienteId?: string; citaId?: string }

type RegistroRemoto = {
  numero_diente: number
  padecimiento: string
  tratamiento_aplicado: string
  notas: string
}

const obtenerTipoDiente = (numero: number) => {
  const terminación = numero % 10
  if (terminación <= 2) return 'Incisivo'
  if (terminación === 3) return 'Canino'
  if (terminación <= 5) return 'Premolar'
  return 'Molar'
}

const arcadaSuperior = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const arcadaInferior = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

export function OdontogramaClinico({ pacienteId = '00482', citaId = 'cita-demo' }: OdontogramaClinicoProps) {
  const [seleccionado, setSeleccionado] = useState<number | null>(null)
  const [filtro, setFiltro] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [registros, setRegistros] = useState<Record<number, Registro>>({
    16: { padecimiento: 'Caries', tratamiento: 'Resina', notas: 'Lesión oclusal distal' },
    24: { padecimiento: 'Endodoncia', tratamiento: 'Corona', notas: 'Tratamiento finalizado' },
    37: { padecimiento: 'Periodontitis', tratamiento: 'Limpieza', notas: 'Control periodontal' },
  })
  const [borrador, setBorrador] = useState<Registro>({ padecimiento: 'Caries', tratamiento: 'Resina', notas: '' })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    let activo = true
    async function cargarRegistros() {
      setCargando(true)
      const { data, error } = await supabase.from('odontograma').select('numero_diente, padecimiento, tratamiento_aplicado, notas').eq('paciente_id', pacienteId).eq('cita_id', citaId)
      if (!activo) return
      if (!error && data) {
        const registrosCargados = Object.fromEntries((data as RegistroRemoto[]).map((item) => [
          item.numero_diente,
          { padecimiento: item.padecimiento, tratamiento: item.tratamiento_aplicado, notas: item.notas ?? '' },
        ])) as Record<number, Registro>
        setRegistros(registrosCargados)
      } else if (error) {
        setMensaje('No se pudieron cargar los registros de esta cita.')
      }
      setCargando(false)
    }
    cargarRegistros()
    return () => { activo = false }
  }, [pacienteId, citaId])

  const dientesVisibles = useMemo(() => {
    const query = busqueda.trim()
    return (diente: number) => (!query || String(diente).includes(query)) && (filtro === 'Todos' || registros[diente]?.padecimiento === filtro)
  }, [busqueda, filtro, registros])

  const abrirDiente = (numero: number) => {
    setSeleccionado(numero)
    setBorrador(registros[numero] ?? { padecimiento: 'Sano', tratamiento: 'Ninguno', notas: '' })
  }

  const guardar = async () => {
    if (seleccionado === null) return
    setGuardando(true)
    const { error } = await supabase.from('odontograma').upsert({ paciente_id: pacienteId, cita_id: citaId, numero_diente: seleccionado, tipo_diente: obtenerTipoDiente(seleccionado), padecimiento: borrador.padecimiento, tratamiento_aplicado: borrador.tratamiento, notas: borrador.notas, updated_at: new Date().toISOString() }, { onConflict: 'paciente_id,cita_id,numero_diente' })
    if (error) {
      setMensaje('No se pudo guardar. Verifica que la cita esté abierta y tu sesión activa.')
      setGuardando(false)
      return
    }
    setRegistros((actuales) => ({ ...actuales, [seleccionado]: borrador }))
    setMensaje('Registro guardado en la cita.')
    setGuardando(false)
    setSeleccionado(null)
  }

  const renderDiente = (numero: number) => {
    const registro = registros[numero]
    const activo = seleccionado === numero
    const visible = dientesVisibles(numero)
    return (
      <button
        key={numero}
        type="button"
        aria-label={`Diente ${numero}${registro ? `, ${registro.padecimiento}` : ''}`}
        onClick={() => abrirDiente(numero)}
        className={`group relative flex h-[76px] min-w-[42px] flex-1 flex-col items-center justify-end gap-1 rounded-2xl border p-1.5 transition-all hover:-translate-y-1 hover:border-teal-400 hover:shadow-lg hover:shadow-teal-950/10 ${visible ? 'opacity-100' : 'pointer-events-none opacity-15'} ${activo ? 'border-teal-500 bg-teal-50 shadow-md ring-2 ring-teal-200' : 'border-slate-200 bg-white'}`}
      >
        <span className={`absolute top-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${registro ? colores[registro.padecimiento] : 'bg-slate-100 text-slate-500'}`}>
          {registro?.padecimiento?.slice(0, 3).toUpperCase() ?? '—'}
        </span>
        <span className={`tooth-shape flex h-9 w-7 items-center justify-center rounded-[45%] border-2 text-xs font-bold ${registro ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-300 bg-slate-50 text-slate-500'}`}>
          {numero}
        </span>
      </button>
    )
  }

  const totalRegistrados = Object.keys(registros).length
  const conTratamiento = Object.values(registros).filter((item) => item.tratamiento !== 'Ninguno').length

  return (
    <main className="min-h-screen bg-[#f4f8f8] px-4 py-6 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal-700"><Stethoscope className="size-4" /> Clínica Dental Sonrisa</div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Odontograma clínico</h1>
            <p className="mt-2 text-sm text-slate-500">Registra el estado y tratamiento de cada pieza dental.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700">MG</div>
            <div><p className="text-sm font-semibold">María González</p><p className="text-xs text-slate-500">Paciente #00482 · 25 años</p></div>
            <ChevronDown className="ml-3 size-4 text-slate-400" />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[['Piezas registradas', totalRegistrados, 'de 32 piezas'], ['Con tratamiento', conTratamiento, 'requieren seguimiento'], ['Última actualización', 'Hoy', '12 de junio, 2025']].map(([titulo, valor, detalle]) => (
            <div key={titulo} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium uppercase tracking-wider text-slate-400">{titulo}</p><div className="mt-2 flex items-end justify-between"><span className="text-2xl font-semibold text-slate-900">{valor}</span><span className="text-xs text-slate-500">{detalle}</span></div></div>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div><h2 className="text-lg font-semibold">Mapa dental</h2><p className="mt-1 text-sm text-slate-500">Selecciona una pieza para ver o editar su información.</p></div>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1.5">Adulto</span><span className="rounded-full bg-teal-50 px-3 py-1.5 text-teal-700">Dentición permanente</span></div>
          </div>
          <div className="overflow-x-auto pb-2"><div className="min-w-[760px] rounded-2xl bg-[#f8fbfb] p-5 sm:p-8">
            <div className="mb-3 flex items-center justify-between px-2"><span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Arcada superior</span><span className="text-xs text-slate-400">Derecha <span className="mx-2 text-slate-300">|</span> Izquierda</span></div>
            <div className="flex gap-2">{arcadaSuperior.map(renderDiente)}</div>
            <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200" /><span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Línea media</span><div className="h-px flex-1 bg-slate-200" /></div>
            <div className="mb-3 flex items-center justify-between px-2"><span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Arcada inferior</span><span className="text-xs text-slate-400">Derecha <span className="mx-2 text-slate-300">|</span> Izquierda</span></div>
            <div className="flex gap-2">{arcadaInferior.map(renderDiente)}</div>
          </div></div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">{Object.keys(colores).map((estado) => <span key={estado} className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${colores[estado].split(' ')[0]}`} />{estado}</span>)}</div>
        </section>

        {mensaje && <p role="status" className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">{mensaje}</p>}
        {cargando && <p role="status" className="mt-4 text-sm text-slate-500">Cargando los registros de esta cita...</p>}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg font-semibold">Registro de piezas</h2><p className="mt-1 text-sm text-slate-500">Consulta rápidamente los hallazgos de esta cita.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><input aria-label="Buscar por número de diente" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar pieza..." className="h-9 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" /></label><select aria-label="Filtrar por padecimiento" value={filtro} onChange={(e) => setFiltro(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-teal-400"><option>Todos</option>{padecimientos.map((item) => <option key={item}>{item}</option>)}</select></div></div>
          {Object.entries(registros).filter(([numero, registro]) => dientesVisibles(Number(numero)) && (filtro === 'Todos' || registro.padecimiento === filtro)).length > 0 ? <div className="grid gap-3 md:grid-cols-3">{Object.entries(registros).filter(([numero, registro]) => dientesVisibles(Number(numero)) && (filtro === 'Todos' || registro.padecimiento === filtro)).map(([numero, registro]) => <button key={numero} type="button" onClick={() => abrirDiente(Number(numero))} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-left transition hover:border-teal-200 hover:bg-teal-50"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-700 shadow-sm">{numero}</span><div><p className="text-sm font-semibold">{registro.padecimiento}</p><p className="text-xs text-slate-500">{registro.tratamiento}</p></div></div><Info className="size-4 text-slate-400" /></button>)}</div> : <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">No hay piezas que coincidan con la búsqueda.</p>}
        </section>

        {seleccionado !== null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-dialogo"><div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-teal-600">Detalle de pieza</p><h3 id="titulo-dialogo" className="mt-1 text-2xl font-semibold">Diente #{seleccionado}</h3></div><button type="button" aria-label="Cerrar" onClick={() => setSeleccionado(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X /></button></div><div className="flex flex-col gap-4"><label className="flex flex-col gap-2 text-sm font-medium">Padecimiento<select value={borrador.padecimiento} onChange={(e) => setBorrador({ ...borrador, padecimiento: e.target.value })} className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 font-normal outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100">{padecimientos.map((item) => <option key={item}>{item}</option>)}</select></label><label className="flex flex-col gap-2 text-sm font-medium">Tratamiento aplicado<select value={borrador.tratamiento} onChange={(e) => setBorrador({ ...borrador, tratamiento: e.target.value })} className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 font-normal outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100">{tratamientos.map((item) => <option key={item}>{item}</option>)}</select></label><label className="flex flex-col gap-2 text-sm font-medium">Notas clínicas<textarea rows={3} value={borrador.notas} onChange={(e) => setBorrador({ ...borrador, notas: e.target.value })} placeholder="Ej. Cara oclusal, sensibilidad..." className="resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 font-normal outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" /></label></div><div className="mt-6 flex gap-3"><button type="button" onClick={() => setSeleccionado(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button><button type="button" disabled={guardando} onClick={guardar} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-700/20 hover:bg-teal-800"><Save className="size-4" />Guardar cambios</button></div></div></div>}
        <footer className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400"><FileText className="size-3.5" /> Los registros se asociarán a la historia clínica del paciente <CircleHelp className="ml-1 size-3.5" /></footer>
      </div>
    </main>
  )
}
