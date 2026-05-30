import {
  Droplets,
  Flame,
  Home,
  Landmark,
  PlugZap,
  ReceiptText,
  Sparkles,
  Wifi,
} from 'lucide-react'
import type { BillCadence, BillType } from '../lib/types'

export const billTypes: Array<{ value: BillType; label: string; icon: typeof Home }> = [
  { value: 'rent', label: 'Rent', icon: Home },
  { value: 'electricity', label: 'Electricity', icon: PlugZap },
  { value: 'wifi', label: 'Wifi', icon: Wifi },
  { value: 'water', label: 'Water', icon: Droplets },
  { value: 'gas', label: 'Gas', icon: Flame },
  { value: 'maid', label: 'Maid', icon: Sparkles },
  { value: 'society', label: 'Society', icon: Landmark },
  { value: 'other', label: 'Other', icon: ReceiptText },
]

export const billCadences: Array<{ value: BillCadence; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'one-time', label: 'One-time' },
]
