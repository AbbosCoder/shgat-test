import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HolatBadge from './HolatBadge'

describe('HolatBadge', () => {
  it("holatni o'qiladigan matn va rang klassi bilan ko'rsatadi", () => {
    render(<HolatBadge holat="hisobga_olingan" />)
    const el = screen.getByText('Hisobga olingan')
    expect(el).toHaveClass('badge-hisobga_olingan')
  })
})
