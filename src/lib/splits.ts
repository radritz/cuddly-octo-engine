import type {
  Balance,
  Expense,
  ExpenseSplit,
  Member,
  Settlement,
  SettlementTransfer,
  SplitMode,
} from './types'
import { validateCustomSplit } from './validators'

export function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export function calculateSplits(
  amount: number,
  memberIds: string[],
  mode: SplitMode,
  customMap: Record<string, number> = {},
): ExpenseSplit[] {
  if (amount <= 0) {
    throw new Error('Expense amount must be greater than 0.')
  }

  if (memberIds.length === 0) {
    throw new Error('Select at least one member to split with.')
  }

  if (mode === 'custom' && !validateCustomSplit(customMap)) {
    throw new Error('Custom split percentages must add up to 100.')
  }

  const rawSplits = memberIds.map((memberId) => {
    const share =
      mode === 'equal'
        ? amount / memberIds.length
        : amount * ((customMap[memberId] ?? 0) / 100)

    return {
      member_id: memberId,
      amount: roundMoney(share),
      settled: false,
    }
  })

  const roundedTotal = rawSplits.reduce((sum, split) => sum + split.amount, 0)
  const delta = roundMoney(amount - roundedTotal)

  if (delta !== 0) {
    rawSplits[rawSplits.length - 1] = {
      ...rawSplits[rawSplits.length - 1],
      amount: roundMoney(rawSplits[rawSplits.length - 1].amount + delta),
    }
  }

  return rawSplits
}

export function computeBalances(
  expenses: Expense[],
  settlements: Settlement[],
  members: Member[],
): Balance[] {
  const balanceMap = new Map<string, number>(
    members.map((member) => [member.id, 0]),
  )

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.member_id === expense.paid_by) {
        continue
      }

      balanceMap.set(
        expense.paid_by,
        roundMoney((balanceMap.get(expense.paid_by) ?? 0) + split.amount),
      )
      balanceMap.set(
        split.member_id,
        roundMoney((balanceMap.get(split.member_id) ?? 0) - split.amount),
      )
    }
  }

  for (const settlement of settlements) {
    balanceMap.set(
      settlement.from_member_id,
      roundMoney((balanceMap.get(settlement.from_member_id) ?? 0) + settlement.amount),
    )
    balanceMap.set(
      settlement.to_member_id,
      roundMoney((balanceMap.get(settlement.to_member_id) ?? 0) - settlement.amount),
    )
  }

  return members.map((member) => ({
    memberId: member.id,
    amount: roundMoney(balanceMap.get(member.id) ?? 0),
    isInactive: !member.is_active,
  }))
}

export function minimizeSettlements(
  expenses: Expense[],
  settlements: Settlement[],
  members: Member[],
): SettlementTransfer[] {
  const balances = computeBalances(expenses, settlements, members)
  const creditors = balances
    .filter((balance) => balance.amount > 0.009)
    .sort((a, b) => b.amount - a.amount)
  const debtors = balances
    .filter((balance) => balance.amount < -0.009)
    .map((balance) => ({ ...balance, amount: Math.abs(balance.amount) }))
    .sort((a, b) => b.amount - a.amount)
  const transfers: SettlementTransfer[] = []

  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const amount = roundMoney(Math.min(debtor.amount, creditor.amount))

    if (amount > 0) {
      transfers.push({
        from: debtor.memberId,
        to: creditor.memberId,
        amount,
      })
    }

    debtor.amount = roundMoney(debtor.amount - amount)
    creditor.amount = roundMoney(creditor.amount - amount)

    if (debtor.amount <= 0.009) {
      debtorIndex += 1
    }

    if (creditor.amount <= 0.009) {
      creditorIndex += 1
    }
  }

  return transfers
}
