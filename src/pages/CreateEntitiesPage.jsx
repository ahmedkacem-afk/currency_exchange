import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { createWallet, createUser, createOperation } from '../lib/supabaseApi.js'
import { Card, CardHeader, CardBody } from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import RoleSelector from '../components/RoleSelector.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from '../lib/AuthContext.jsx'

export default function CreateEntitiesPage() {
  const { t } = useI18n()
  const { profile } = useAuth()
  
  // Wallet form
  const [wName, setWName] = useState('')
  const [wUsd, setWUsd] = useState('0')
  const [wLyd, setWLyd] = useState('0')
  
  // User form
  const [uName, setUName] = useState('')
  const [uEmail, setUEmail] = useState('')
  const [uPhone, setUPhone] = useState('')
  const [uPass, setUPass] = useState('')
  const [uRole, setURole] = useState('user')
  
  // Operation form
  const [opName, setOpName] = useState('')
  
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState({ wallet:false, user:false, op:false })
  const { show } = useToast()

  async function onCreateWallet(e) {
    e.preventDefault()
    setLoading(s=>({ ...s, wallet:true }))
    try {
      const { wallet } = await createWallet({ 
        name: wName, 
        usd: Number(wUsd) || 0, 
        lyd: Number(wLyd) || 0,
        user_id: profile?.id // Link wallet to current user if available
      })
      setMsg(`Wallet "${wallet.name}" created successfully`)
      show(`Wallet "${wallet.name}" created successfully`, 'success')
      setWName(''); setWUsd('0'); setWLyd('0')
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
      const { user } = await createUser({ 
        name: uName, 
        email: uEmail, 
        phone: uPhone, 
        password: uPass,
        role: uRole // Selected role
      })
      
      // Success - the auth ID is automatically used as the user ID in the users table
      setMsg(`User "${user.name}" created successfully with ID: ${user.id}`)
      show(`User "${user.name}" created successfully`, 'success')
      
      // Reset form
      setUName(''); 
      setUEmail(''); 
      setUPhone(''); 
      setUPass(''); 
      setURole('user')
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
                <Input placeholder="10000" label={t('create.initUsd')} value={wUsd} onChange={e => setWUsd(e.target.value)} />
                <Input placeholder="75000" label={t('create.initLyd')} value={wLyd} onChange={e => setWLyd(e.target.value)} />
                <Button disabled={loading.wallet} type="submit" variant="success">{loading.wallet ? '...' : t('create.create')}</Button>
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
                
                <Button disabled={loading.user} type="submit" variant="success">{loading.user ? '...' : t('create.create')}</Button>
              </form>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t('create.operation')} subtitle="Dealings types" />
            <CardBody className="space-y-2">
              <form onSubmit={onCreateOperation} className="space-y-3">
                <Input placeholder="Dealings / معاملات" label={t('create.operationName')} value={opName} onChange={e => setOpName(e.target.value)} />
                <Button disabled={loading.op} type="submit" variant="success">{loading.op ? '...' : t('create.create')}</Button>
              </form>
            </CardBody>
          </Card>
        </CardBody>
      </Card>
      {msg && <div className="text-green-700 text-sm">{msg}</div>}
    </div>
  )
}


