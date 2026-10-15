import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FileInput from './FileInput'

describe('FileInput', () => {
  it("tanlangan faylni onChange'ga beradi va xatoni ko'rsatadi", () => {
    const onChange = vi.fn()
    const { container } = render(<FileInput label="Asosiy chizma" value={null} onChange={onChange} error="Hajmi 20 MB dan oshmasin" />)
    const file = new File(['%PDF'], 'chizma.pdf', { type: 'application/pdf' })
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } })
    expect(onChange).toHaveBeenCalledWith(file)
    expect(screen.getByText('Hajmi 20 MB dan oshmasin')).toBeInTheDocument()
  })

  it("tahrirlashda joriy fayl nomini ko'rsatadi", () => {
    render(<FileInput label="Xat" value={null} onChange={() => {}} mavjud="eski.pdf" />)
    expect(screen.getByText(/Joriy: eski.pdf/)).toBeInTheDocument()
  })
})
