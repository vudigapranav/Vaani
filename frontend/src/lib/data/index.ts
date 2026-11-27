import type { DataSource } from './contracts'
import { mockData } from './mock'
import { liveData } from './live'
import { isLive } from './session'

export function getDataSource(): DataSource {
  return isLive ? liveData : mockData
}
