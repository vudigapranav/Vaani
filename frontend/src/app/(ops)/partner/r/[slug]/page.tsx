import { PartnerPage } from '@/components/booking/partner'

export default async function Page({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tv?: string }>
}) {
  return <PartnerPage service="restaurant" slug={(await params).slug} tv={(await searchParams).tv === '1'} />
}
