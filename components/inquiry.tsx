'use client'
import { useId, useState, type FormEvent } from 'react'
import Link from 'next/link'
import catalogue from '@/content/catalogue.json'
type Kind = 'quote' | 'contact' | 'career' | 'vendor'

export function Inquiry({ kind = 'quote', product = '' }: { kind?: Kind; product?: string }) {
  const uid = useId()
  const [state, setState] = useState<{ type: 'idle'|'sending'|'done'|'error'; message: string }>({ type:'idle', message:'' })
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    setState({ type:'sending', message:'' })
    try {
      const response = await fetch('/api/inquiries/', { method:'POST', headers: { 'Content-Type':'application/json' }, body:JSON.stringify({ ...data, kind, source:window.location.pathname }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Please try again.')
      form.reset()
      setState({ type:'done', message:'Thanks. PCI has received your submission.' })
    } catch (err) {
      setState({ type:'error', message:err instanceof Error ? err.message : 'Unable to send. Please try again.' })
    }
  }
  return <form className="inquiry-form" onSubmit={submit}>
    <div className="form-grid">
      <label htmlFor={uid+'name'}>Name <span>*</span><input id={uid+'name'} name="name" autoComplete="name" required maxLength={100}/></label>
      <label htmlFor={uid+'email'}>Email <span>*</span><input id={uid+'email'} name="email" autoComplete="email" type="email" required maxLength={200}/></label>
      <label htmlFor={uid+'phone'}>Phone <span>*</span><input id={uid+'phone'} name="phone" autoComplete="tel" type="tel" required maxLength={24}/></label>
      {kind!=='career' && <label htmlFor={uid+'company'}>Company {kind==='vendor' && <span>*</span>}<input id={uid+'company'} name="company" autoComplete="organization" required={kind==='vendor'} maxLength={160}/></label>}
      {kind==='quote' && <div className="full"><label htmlFor={uid+'product'}>Product</label><select id={uid+'product'} name="product" defaultValue={product}><option value="">Select a product (optional)</option>{catalogue.map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}</select></div>}
      <label className="full" htmlFor={uid+'message'}>{kind==='vendor' ? 'Products or services you supply' : kind==='career' ? 'Role or area of interest' : 'How can we help?'} <span>*</span><textarea id={uid+'message'} name="message" rows={4} required minLength={5} maxLength={3000}/></label>
    </div>
    <div className="bot-field" aria-hidden="true"><label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
    <label className="consent"><input type="checkbox" name="consent" value="yes" required/><span>I agree to PCI using these details to respond to my submission. <Link href="/privacy/">Privacy notice</Link></span></label>
    <button className="button dark" type="submit" disabled={state.type==='sending'}>{state.type==='sending' ? 'Sending…' : kind==='quote' ? 'Send inquiry' : 'Submit'} <span aria-hidden="true">↗</span></button>
    {state.message && <p role={state.type==='error' ? 'alert' : 'status'} className={'form-result '+state.type}>{state.message}</p>}
  </form>
}
