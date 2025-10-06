import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { createWallet, createUser, createOperation, getAllCurrencyTypes } from '../lib/api.js'
import { Card, CardHeader, CardBody } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import CreateEntityButton from '../components/CreateEntityButton.jsx'
import Input from '../components/Input.jsx'
import RoleSelector from '../components/RoleSelector.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import AddCurrencyTypeModal from '../components/AddCurrencyTypeModal.jsx'
import CurrencySelect from '../components/CurrencySelect.jsx'

export default function CreateEntitiesPage() {
  const { t } = useI18n()
  const { userData } = useAuth()
  
  // Wallet form
  const [wName, setWName] = useState('')
  const [wUsd, setWUsd] = useState('0')
  const [wLyd, setWLyd] = useState('0')
  const [additionalCurrencies, setAdditionalCurrencies] = useState([])
  const [currencyTypes, setCurrencyTypes] = useState([])
  const [isAddCurrencyTypeModalOpen, setIsAddCurrencyTypeModalOpen] = useState(false)
  
  // User form
  const [uName, setUName] = useState('')
  const [uEmail, setUEmail] = useState('')
  const [uPhone, setUPhone] = useState('')
  const [uPass, setUPass] = useState('')
  const [uRole, setURole] = useState('')
  
  // Operation form
  const [opName, setOpName] = useState('')
  
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState({ wallet:false, user:false, op:false })
  const { show } = useToast()
  
  // Fetch currency types when component mounts
  useEffect(() => {
    async function fetchCurrencyTypes() {
      try {
        const types = await getAllCurrencyTypes()
        setCurrencyTypes(types)
      } catch (error) {
        console.error('Error fetching currency types:', error)
        show('Error loading currency types', 'error')
      }
    }
    
    fetchCurrencyTypes()
  }, [])

  async function onCreateWallet(e) {
    e.preventDefault()
    setLoading(s=>({ ...s, wallet:true }))
    try {
      // Prepare currencies payload
      const currencies = {};
      
      // Add USD and LYD for legacy support
      currencies.USD = Number(wUsd) || 0;
      currencies.LYD = Number(wLyd) || 0;
      
      // Add additional currencies
      additionalCurrencies.forEach(curr => {
        if (curr.code && curr.balance) {
          currencies[curr.code] = Number(curr.balance) || 0;
        }
      });
      
      const { wallet } = await createWallet({ 
        name: wName, 
        usd: Number(wUsd) || 0, 
        lyd: Number(wLyd) || 0,
        currencies
      })
      setMsg(`Wallet "${wallet.name}" created successfully`)
      show(`Wallet "${wallet.name}" created successfully`, 'success')
      setWName(''); 
      setWUsd('0'); 
      setWLyd('0');
      setAdditionalCurrencies([]);
    } catch (error) {
      console.error('Error creating wallet:', error)
      show(error.message || 'Failed to create wallet', 'error')
    } finally { 
      setLoading(s=>({ ...s, wallet:false })) 
    }
  }

  async function onCreateUser(e) {
    e.preventDefault()
    
    // Basic validation
    if (!uName || !uEmail || !uPass) {
      show('Please fill in all required fields', 'error')
      return
    }
    
    if (uPass.length < 6) {
      show('Password must be at least 6 characters', 'error')
      return
    }
    
    setLoading(s=>({ ...s, user:true }))
    try {
      // Create user with auth integration - this will:
      // 1. Create the user in Supabase Auth with a UUID
      // 2. Create a profile in the users table with the same UUID
      const { user, message } = await createUser({ 
        name: uName, 
        email: uEmail, 
        phone: uPhone, 
        password: uPass,
        role: uRole // Selected role
      })
      
      // Success - the auth ID is automatically used as the user ID in the users table
      setMsg(`User "${user.name}" created successfully with ID: ${user.id}`)
      
      // Check if email verification is needed
      if (user.needsEmailVerification) {
        show(`User "${user.name}" created successfully. Email verification is required before login.`, 'info')
      } else {
        show(`User "${user.name}" created successfully`, 'success')
      }
      
      // Reset form
      setUName(''); 
      setUEmail(''); 
      setUPhone(''); 
      setUPass(''); 
      setURole('')
    } catch (error) {
      console.error('Error creating user:', error)
      
      // Show specific error message based on the error
      if (error.message.includes('already registered')) {
        show('This email is already registered', 'error')
      } else {
        show(error.message || 'Failed to create user', 'error')
      }
    } finally { 
      setLoading(s=>({ ...s, user:false })) 
    }
  }

  async function onCreateOperation(e) {
    e.preventDefault()
    setLoading(s=>({ ...s, op:true }))
    try {
      const { operation } = await createOperation({ name: opName })
      setMsg(`Operation "${operation.name}" created successfully`)
      show(`Operation "${operation.name}" created successfully`, 'success')
      setOpName('')
    } catch (error) {
      console.error('Error creating operation:', error)
      show(error.message || 'Failed to create operation', 'error')
    } finally { 
      setLoading(s=>({ ...s, op:false })) 
    }
  }
  
  // Helper functions for managing additional currencies
  function addCurrencyField() {
    setAdditionalCurrencies([...additionalCurrencies, { code: '', balance: '0' }]);
  }
  
  function updateCurrency(index, field, value) {
    const updated = [...additionalCurrencies];
    updated[index][field] = value;
    setAdditionalCurrencies(updated);
  }
  
  function removeCurrency(index) {
    setAdditionalCurrencies(additionalCurrencies.filter((_, i) => i !== index));
  }
  
  function handleCurrencyTypeSuccess(newType) {
    setCurrencyTypes([...currencyTypes, newType]);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title={t('create.title')} subtitle={t('nav.create')} />
        <CardBody className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader title={t('create.wallet')} subtitle="Branch cashbox" />
            <CardBody className="space-y-2">
              <form onSubmit={onCreateWallet} className="space-y-3">
                <Input placeholder="Branch A" label={t('create.name')} value={wName} onChange={e => setWName(e.target.value)} />
                
                {/* Legacy currency inputs */}
                <Input placeholder="10000" label={t('create.initUsd')} value={wUsd} onChange={e => setWUsd(e.target.value)} />
                <Input placeholder="75000" label={t('create.initLyd')} value={wLyd} onChange={e => setWLyd(e.target.value)} />
                
                {/* Additional currency inputs */}
                {additionalCurrencies.map((currency, index) => (
                  <div key={index} className="flex space-x-2 items-end">
                    <div className="flex-grow">
                      <CurrencySelect
                        label={`Currency ${index + 1}`}
                        value={currency.code}
                        onChange={(value) => updateCurrency(index, 'code', value)}
                        excludeCurrencies={{ 
                          USD: true, 
                          LYD: true,
                          ...additionalCurrencies.reduce((acc, c, i) => {
                            if (i !== index && c.code) acc[c.code] = true;
                            return acc;
                          }, {})
                        }}
                      />
                    </div>
                    <div className="flex-grow">
                      <Input
                        placeholder="0"
                        label="Initial Balance"
                        type="number"
                        min="0"
                        step="0.01"
                        value={currency.balance}
                        onChange={(e) => updateCurrency(index, 'balance', e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="mb-2"
                      onClick={() => removeCurrency(index)}
                      type="button"
                    >
                      X
                    </Button>
                  </div>
                ))}
                
                {/* Add currency button */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={addCurrencyField}
                    type="button"
                    className="mb-2"
                  >
                    + Add Currency
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setIsAddCurrencyTypeModalOpen(true)}
                    type="button"
                    className="mb-2"
                  >
                    + New Currency Type
                  </Button>
                </div>
                
                <CreateEntityButton disabled={loading.wallet} type="submit" variant="success">
                  {loading.wallet ? '...' : t('create.create')}
                </CreateEntityButton>
              </form>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('create.user')} subtitle="Manager account" />
            <CardBody className="space-y-2">
              <form onSubmit={onCreateUser} className="space-y-3">
                <Input placeholder="Ahmed Ali" label={t('create.name')} value={uName} onChange={e => setUName(e.target.value)} />
                <Input placeholder="user@example.com" label={t('create.email')} value={uEmail} onChange={e => setUEmail(e.target.value)} />
                <Input placeholder="+218 91 0000000" label={t('create.phone')} value={uPhone} onChange={e => setUPhone(e.target.value)} />
                <Input placeholder="strongpassword" type="password" label={t('create.password')} value={uPass} onChange={e => setUPass(e.target.value)} />
                
                <RoleSelector
                  value={uRole}
                  onChange={setURole}
                  required={true}
                />
                
                <CreateEntityButton disabled={loading.user} type="submit" variant="success">{loading.user ? '...' : t('create.create')}</CreateEntityButton>
              </form>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('create.operation')} subtitle="Dealings types" />
            <CardBody className="space-y-2">
              <form onSubmit={onCreateOperation} className="space-y-3">
                <Input placeholder="Dealings / معاملات" label={t('create.operationName')} value={opName} onChange={e => setOpName(e.target.value)} />
                <CreateEntityButton disabled={loading.op} type="submit" variant="success">{loading.op ? '...' : t('create.create')}</CreateEntityButton>
              </form>
            </CardBody>
          </Card>
        </CardBody>
      </Card>
      {msg && <div className="text-green-700 text-sm">{msg}</div>}
      
      {/* Currency Type Modal */}
      <AddCurrencyTypeModal
        isOpen={isAddCurrencyTypeModalOpen}
        onClose={() => setIsAddCurrencyTypeModalOpen(false)}
        onSuccess={handleCurrencyTypeSuccess}
      />
    </div>
  )
}


