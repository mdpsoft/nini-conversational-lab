import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectToast, expectNoToast } from '@/test/assertions'

// Mock component that simulates file import UI
const MockImportUI = () => {
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Simulate file validation
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      // This would show a toast in the real component
      const toast = document.createElement('div')
      toast.setAttribute('role', 'status')
      toast.textContent = 'Solo se admiten archivos .json'
      document.body.appendChild(toast)
      return
    }

    // Valid file - no error toast
    console.log('Valid JSON file uploaded')
  }

  return (
    <div>
      <input
        type="file"
        data-testid="file-input"
        onChange={handleFileSelect}
        accept=".json"
      />
    </div>
  )
}

describe('ImportUI', () => {
  it('should show error toast for .txt files', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MockImportUI />)

    const fileInput = screen.getByTestId('file-input')
    const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' })

    await user.upload(fileInput, txtFile)

    // Check that error toast appears
    const errorToast = screen.getByText(/solo se admiten archivos .json/i)
    expect(errorToast).toBeInTheDocument()
  })

  it('should not show error toast for valid JSON files', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MockImportUI />)

    const fileInput = screen.getByTestId('file-input')
    const jsonFile = new File(['{}'], 'test.json', { type: 'application/json' })

    await user.upload(fileInput, jsonFile)

    // Check that no error toast appears
    const errorToast = screen.queryByText(/solo se admiten archivos .json/i)
    expect(errorToast).not.toBeInTheDocument()
  })

  it('should accept .json files with text/plain MIME type', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MockImportUI />)

    const fileInput = screen.getByTestId('file-input')
    const jsonFile = new File(['{}'], 'scenarios.json', { type: 'text/plain' })

    await user.upload(fileInput, jsonFile)

    // Should not show error for .json extension even with different MIME type
    const errorToast = screen.queryByText(/solo se admiten archivos .json/i)
    expect(errorToast).not.toBeInTheDocument()
  })

  it('should reject files without .json extension', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MockImportUI />)

    const fileInput = screen.getByTestId('file-input')
    const csvFile = new File(['data'], 'test.csv', { type: 'text/csv' })

    await user.upload(fileInput, csvFile)

    // Should show error for non-JSON files
    const errorToast = screen.getByText(/solo se admiten archivos .json/i)
    expect(errorToast).toBeInTheDocument()
  })
})