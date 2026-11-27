import { CallDetail } from '@/components/booking/ops'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <CallDetail id={(await params).id} />
}
