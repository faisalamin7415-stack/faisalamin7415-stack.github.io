import { db, getSetting, setSetting } from './db'
import { supabase, type TxRow } from './supabase'
import type { Transaction } from './types'

const LAST_SYNC_KEY = 'lastSyncAt'

export interface SyncResult {
  pulled: number
  pushed: number
  at: string
}

function toRow(tx: Transaction, userId: string): TxRow {
  return {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    amount: tx.amount,
    category: tx.category,
    note: tx.note,
    merchant: tx.merchant,
    occurred_at: tx.occurredAt,
    source: tx.source,
    meta: tx.meta ?? {},
    created_at: tx.createdAt,
    updated_at: tx.updatedAt,
    deleted: tx.deleted === 1,
  }
}

function fromRow(row: TxRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    note: row.note ?? '',
    merchant: row.merchant ?? '',
    occurredAt: row.occurred_at,
    source: (row.source as Transaction['source']) ?? 'manual',
    meta: row.meta ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deleted: row.deleted ? 1 : 0,
    dirty: 0,
  }
}

/** Transaksi lokal yang dibuat sebelum login ikut diunggah ke akun. */
async function claimAnonymous(userId: string): Promise<void> {
  const orphans = await db.transactions.filter((t) => !t.userId).toArray()
  if (!orphans.length) return
  const now = new Date().toISOString()
  await db.transactions.bulkPut(
    orphans.map((t) => ({ ...t, userId, updatedAt: now, dirty: 1 as const })),
  )
}

export async function syncNow(userId: string): Promise<SyncResult> {
  if (!supabase) throw new Error('Cloud belum dikonfigurasi.')
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Sedang offline.')
  }

  await claimAnonymous(userId)

  // 1. Tarik data server lebih dulu, menangkan updated_at terbaru (last-write-wins).
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })

  if (error) throw new Error(`Gagal mengunduh: ${error.message}`)

  const remote = (data ?? []) as TxRow[]
  const localMap = new Map((await db.transactions.toArray()).map((t) => [t.id, t]))
  const merged: Transaction[] = []
  let pulled = 0

  for (const row of remote) {
    const incoming = fromRow(row)
    const local = localMap.get(incoming.id)
    if (!local) {
      merged.push(incoming)
      pulled++
      continue
    }
    if (new Date(incoming.updatedAt).getTime() > new Date(local.updatedAt).getTime()) {
      merged.push(incoming)
      pulled++
    }
  }

  if (merged.length) await db.transactions.bulkPut(merged)

  // 2. Dorong perubahan lokal yang belum tersimpan di server.
  const dirty = await db.transactions.filter((t) => t.dirty === 1).toArray()
  let pushed = 0
  if (dirty.length) {
    const rows = dirty.map((t) => toRow({ ...t, userId }, userId))
    const { error: pushError } = await supabase
      .from('transactions')
      .upsert(rows, { onConflict: 'id' })
    if (pushError) throw new Error(`Gagal mengunggah: ${pushError.message}`)
    await db.transactions.bulkPut(dirty.map((t) => ({ ...t, userId, dirty: 0 as const })))
    pushed = rows.length
  }

  const at = new Date().toISOString()
  await setSetting(LAST_SYNC_KEY, at)
  return { pulled, pushed, at }
}

export async function getLastSync(): Promise<string | null> {
  return getSetting(LAST_SYNC_KEY)
}

export async function deleteCloudAccountData(userId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('transactions').delete().eq('user_id', userId)
  if (error) throw new Error(error.message)
}
