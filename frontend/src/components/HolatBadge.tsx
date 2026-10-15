import { HOLATLAR } from '../lib/constants'
import type { Holat } from '../lib/types'

export default function HolatBadge({ holat }: { holat: Holat }) {
  return <span className={`badge badge-${holat}`}>{HOLATLAR[holat] ?? holat}</span>
}
