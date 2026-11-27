import { BookingPage } from '@/components/booking/public'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <BookingPage id={(await params).id} />
}
