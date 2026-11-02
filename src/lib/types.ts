export type TxType = 'expense' | 'income'
export type TxSource = 'manual' | 'voice' | 'receipt' | 'qris'
export type AddTab = TxSource

export interface Transaction {
  id: string
  userId: string | null
  type: TxType
  amount: number
  category: string
  note: string
  merchant: string
  occurredAt: string
  source: TxSource
  meta?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  deleted: 0 | 1
  dirty: 0 | 1
}

export type NewTransaction = Omit<
  Transaction,
  'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deleted' | 'dirty'
> &
  Partial<Pick<Transaction, 'id' | 'userId'>>

export interface QrisPayload {
  merchantName: string
  city: string
  amount: number | null
  nmid: string
  merchantId: string
  criteria: string
  valid: boolean
}

export interface ReceiptResult {
  merchant: string
  amount: number | null
  date: string | null
  rawText: string
  confidence: number
}
