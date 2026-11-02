import Dexie, { type Table } from 'dexie'
import type { NewTransaction, Transaction } from './types'

class FaizDB extends Dexie {
  transactions!: Table<Transaction, string>
  settings!: Table<{ key: string; value: string }, string>

  constructor() {
    super('faiz-money')
    this.version(1).stores({
      transactions: 'id, occurredAt, type, category, source, dirty, deleted, updatedAt',
      settings: 'key',
    })
  }
}

export const db = new FaizDB()

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function createTransaction(input: NewTransaction): Promise<Transaction> {
  const now = new Date().toISOString()
  const tx: Transaction = {
    ...input,
    id: input.id ?? newId(),
    userId: input.userId ?? null,
    merchant: input.merchant ?? '',
    meta: input.meta ?? {},
    createdAt: now,
    updatedAt: now,
    deleted: 0,
    dirty: 1,
  }
  await db.transactions.put(tx)
  return tx
}

export async function updateTransaction(id: string, patch: Partial<Transaction>): Promise<void> {
  const now = new Date().toISOString()
  await db.transactions.update(id, { ...patch, updatedAt: now, dirty: 1 })
}

export async function deleteTransaction(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.transactions.update(id, { deleted: 1, updatedAt: now, dirty: 1 })
}

export async function restoreTransaction(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.transactions.update(id, { deleted: 0, updatedAt: now, dirty: 1 })
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.settings.get(key)
  return row?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value })
}

export interface BackupFile {
  app: 'Faiz.Money'
  version: 1
  exportedAt: string
  transactions: Transaction[]
  settings: Array<{ key: string; value: string }>
}

export async function buildBackup(): Promise<BackupFile> {
  return {
    app: 'Faiz.Money',
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: await db.transactions.toArray(),
    settings: await db.settings.toArray(),
  }
}

export async function restoreBackup(file: BackupFile, mode: 'merge' | 'replace'): Promise<number> {
  if (file.app !== 'Faiz.Money' || !Array.isArray(file.transactions)) {
    throw new Error('File backup tidak dikenali.')
  }
  if (mode === 'replace') {
    await db.transactions.clear()
  }
  const rows = file.transactions.map((t) => ({ ...t, dirty: 1 as const }))
  await db.transactions.bulkPut(rows)
  if (Array.isArray(file.settings)) {
    await db.settings.bulkPut(file.settings)
  }
  return rows.length
}

export async function clearAllData(): Promise<void> {
  await db.transactions.clear()
  await db.settings.clear()
}
