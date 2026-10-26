import { OdontogramaClinico } from '@/components/odontograma-clinico'

export default async function Page({ searchParams }: { searchParams: Promise<{ pacienteId?: string; citaId?: string }> }) {
  const params = await searchParams
  return <OdontogramaClinico pacienteId={params.pacienteId} citaId={params.citaId} />
}
