import { BusinessPage } from '@/components/booking/public'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <BusinessPage service="hospital" slug={(await params).slug} />
}
