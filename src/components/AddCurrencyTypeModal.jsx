import { useState } from 'react'
import Button from './Button'
import Input from './Input'
import { useToast } from './Toast'
import { createCurrencyType } from '../lib/api.js'
import CreateEntityButton from './CreateEntityButton'

/**
 * Modal component for adding a new currency type
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onSuccess - Function called after successful creation
 * @returns {JSX.Element|null} Modal component or null if closed
 */
export default function AddCurrencyTypeModal({ isOpen, onClose, onSuccess }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const { show } = useToast()
  
  if (!isOpen) return null
  
  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!code.trim() || !name.trim()) {
      show('Currency code and name are required', 'error')
      return
    }
    
    setLoading(true)
    try {
      const newCurrencyType = await createCurrencyType({
        code: code.toUpperCase().trim(),
        name: name.trim(),
        symbol: symbol.trim() || code.toUpperCase().trim()
      })
      
      show(`Currency type ${newCurrencyType.code} created successfully`, 'success')
      
      // Reset form
      setCode('')
      setName('')
      setSymbol('')
      
      if (onSuccess) {
        onSuccess(newCurrencyType)
      }
      
      onClose()
    } catch (error) {
      console.error('Error creating currency type:', error)
      show(error.message || 'Failed to create currency type', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add New Currency Type</h3>
          <button 
            className="text-gray-400 hover:text-gray-600" 
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Currency Code"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="USD"
            maxLength={10}
            required
          />
          
          <Input
            label="Currency Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="US Dollar"
            required
          />
          
          <Input
            label="Currency Symbol (Optional)"
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            placeholder="$"
          />
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <CreateEntityButton 
              type="submit"
              variant="primary"
              disabled={loading || !code || !name}
            >
              {loading ? 'Creating...' : 'Create Currency Type'}
            </CreateEntityButton>
          </div>
        </form>
      </div>
    </div>
  )
}