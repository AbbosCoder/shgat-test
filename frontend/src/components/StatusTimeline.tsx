import { Check, Clock, Send, Undo2 } from 'lucide-react'
import type { Holat } from '../lib/types'

/** Ariza qaysi bosqichda ekanini ko'rsatadi: Yuborildi → Tekshiruv → Hisobga olindi / Qaytarildi. */
export default function StatusTimeline({ holat }: { holat: Holat }) {
  const tekshiruvda = holat === 'yuborilgan'
  const yakun = holat === 'hisobga_olingan' ? 'done' : holat === 'qaytarilgan' ? 'bad' : ''
  return (
    <div className="timeline">
      <div className="tl-step done">
        <span className="tl-dot"><Send size={14} /></span>Yuborildi
      </div>
      <div className="tl-line done" />
      <div className={`tl-step ${tekshiruvda ? 'current' : 'done'}`}>
        <span className="tl-dot">{tekshiruvda ? <Clock size={14} /> : <Check size={14} />}</span>
        Tekshiruv
      </div>
      <div className={`tl-line ${yakun === 'done' ? 'done' : ''}`} />
      <div className={`tl-step ${yakun}`}>
        <span className="tl-dot">{holat === 'qaytarilgan' ? <Undo2 size={14} /> : <Check size={14} />}</span>
        {holat === 'qaytarilgan' ? 'Qaytarildi' : 'Hisobga olindi'}
      </div>
    </div>
  )
}
