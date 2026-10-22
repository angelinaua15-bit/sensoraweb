'use client'

// FILE PATH: components/screens/admin-screen.tsx
import { useState } from 'react'
import AvatarBubble from '@/components/avatar-bubble'
import { ADMIN_USERS, ADMIN_TRANSACTIONS, PAYOUT_REQUESTS } from '@/lib/data'
import type { Screen } from '@/app/page'
import { useLanguage } from '@/components/language-provider'

type Tab = 'users' | 'transactions' | 'payouts'

interface Props {
  onNavigate: (s: Screen) => void
}

export default function AdminScreen({ onNavigate }: Props) {
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>('users')
  const [payouts, setPayouts] = useState(PAYOUT_REQUESTS)

  const totalRevenue = ADMIN_TRANSACTIONS
    .filter(tx => tx.type === 'topup' && tx.status === 'completed')
    .reduce((s, tx) => s + tx.amount, 0)

  const totalUsers = ADMIN_USERS.filter(u => u.role === 'client').length
  const totalExperts = ADMIN_USERS.filter(u => u.role === 'expert').length

  const statusColor: Record<string, string> = {
    completed: '#22C55E',
    pending: '#F5C542',
    failed: '#EF4444',
    approved: '#22C55E',
    rejected: '#EF4444',
  }

  const statusLabel: Record<string, string> = {
    completed: t('admin.status.completed'),
    pending: t('admin.status.pending'),
    failed: t('admin.status.failed'),
    approved: t('admin.status.approved'),
    rejected: t('admin.status.rejected'),
    active: t('admin.status.active'),
    suspended: t('admin.status.suspended'),
  }

  return (
    <div className="h-full overflow-y-auto sensora-bg pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--surface-1)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[var(--text-dim)] text-xs">{t('admin.administrator')}</p>
            <h2 className="text-[var(--text-primary)] text-xl font-medium">{t('admin.title')}</h2>
          </div>
          <div
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(245,197,66,0.15)', color: '#F5C542', border: '1px solid rgba(245,197,66,0.3)' }}
          >
            {t('admin.superAdmin')}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-2 mb-1">
          {[
            { label: t('admin.revenue'), value: `$${totalRevenue}`, color: '#D946EF' },
            { label: t('admin.clients'), value: `${totalUsers}`, color: '#9D5FF5' },
            { label: t('admin.experts'), value: `${totalExperts}`, color: '#22C55E' },
          ].map(k => (
            <div key={k.label} className="flex flex-col items-center py-3 rounded-2xl"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
              <span className="font-semibold text-lg" style={{ color: k.color }}>{k.value}</span>
              <span className="text-[var(--text-dim)] text-[10px] mt-0.5">{k.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-3">
        {(['users', 'transactions', 'payouts'] as Tab[]).map(tabId => (
          <button key={tabId} onClick={() => setTab(tabId)}
            className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
            style={{
              background: tab === tabId ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'var(--surface-1)',
              color: tab === tabId ? '#fff' : 'var(--text-muted)',
            }}>
            {tabId === 'users' ? t('admin.tab.users') : tabId === 'transactions' ? t('admin.tab.transactions') : t('admin.tab.payouts')}
          </button>
        ))}
      </div>

      <div className="px-4">
        {/* Users tab */}
        {tab === 'users' && (
          <div className="flex flex-col gap-2.5">
            {ADMIN_USERS.map(user => (
              <div key={user.id}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
                <AvatarBubble initials={user.name.slice(0, 2)} size={42} online={user.status === 'active'} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[var(--text-primary)] text-sm font-medium truncate">{user.name}</p>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: user.role === 'expert' ? 'rgba(217,70,239,0.2)' : 'rgba(157,95,245,0.2)',
                        color: user.role === 'expert' ? '#D946EF' : '#9D5FF5',
                      }}
                    >
                      {user.role === 'expert' ? t('admin.expert') : t('admin.client')}
                    </span>
                  </div>
                  <p className="text-[var(--text-dim)] text-xs truncate">{user.email}</p>
                  <p className="text-[var(--text-dim)] text-xs">{t('admin.sessionsSince', { n: user.sessions, date: user.joined })}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[#F5C542] text-sm font-semibold">${user.balance}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      background: user.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: statusColor[user.status] ?? 'var(--text-muted)',
                    }}
                  >
                    {statusLabel[user.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transactions tab */}
        {tab === 'transactions' && (
          <div className="flex flex-col gap-2.5">
            {ADMIN_TRANSACTIONS.map(tx => (
              <div key={tx.id}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: tx.type === 'topup' ? 'rgba(34,197,94,0.15)' : tx.type === 'payout' ? 'rgba(245,197,66,0.15)' : 'rgba(239,68,68,0.15)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={tx.type === 'topup' ? '#22C55E' : tx.type === 'payout' ? '#F5C542' : '#EF4444'}
                    strokeWidth="2" strokeLinecap="round">
                    {tx.type === 'topup'
                      ? <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
                      : tx.type === 'payout'
                      ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                      : <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>
                    }
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-medium">{tx.userName}</p>
                  <p className="text-[var(--text-dim)] text-xs capitalize">
                    {tx.type === 'topup' ? t('admin.txType.topup') : tx.type === 'session' ? t('admin.txType.session') : t('admin.txType.payout')} · {tx.date}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="font-semibold text-sm" style={{ color: tx.amount > 0 ? '#22C55E' : '#EF4444' }}>
                    {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount)}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--surface-1)', color: statusColor[tx.status] ?? 'var(--text-muted)' }}
                  >
                    {statusLabel[tx.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payouts tab */}
        {tab === 'payouts' && (
          <div className="flex flex-col gap-2.5">
            {payouts.map(p => (
              <div key={p.id}
                className="p-3.5 rounded-2xl"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[var(--text-primary)] text-sm font-medium">{p.expertName}</p>
                    <p className="text-[var(--text-dim)] text-xs">{p.method}</p>
                    <p className="text-[var(--text-dim)] text-xs">{p.date}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[#F5C542] font-semibold">${p.amount}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--surface-1)', color: statusColor[p.status] ?? 'var(--text-muted)' }}
                    >
                      {statusLabel[p.status]}
                    </span>
                  </div>
                </div>
                {p.status === 'pending' && (
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => setPayouts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'approved' } : x))}
                      className="flex-1 py-2 rounded-xl text-xs font-medium"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}
                    >
                      {t('admin.approve')}
                    </button>
                    <button
                      onClick={() => setPayouts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'rejected' } : x))}
                      className="flex-1 py-2 rounded-xl text-xs font-medium"
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
                    >
                      {t('admin.reject')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}