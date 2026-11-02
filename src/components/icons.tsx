import {
  Car,
  CircleEllipsis,
  Clapperboard,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Receipt,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  User,
  Utensils,
  Wallet,
} from 'lucide-react'

const MAP = {
  utensils: Utensils,
  'shopping-bag': ShoppingBag,
  car: Car,
  receipt: Receipt,
  'heart-pulse': HeartPulse,
  clapperboard: Clapperboard,
  home: Home,
  'graduation-cap': GraduationCap,
  'hand-heart': HandHeart,
  users: User,
  'circle-ellipsis': CircleEllipsis,
  wallet: Wallet,
  sparkles: Sparkles,
  store: Store,
  'trending-up': TrendingUp,
  gift: Gift,
} as const

export function CategoryIcon({
  name,
  size = 18,
  strokeWidth = 1.6,
}: {
  name: string
  size?: number
  strokeWidth?: number
}) {
  const Cmp = MAP[name as keyof typeof MAP] ?? CircleEllipsis
  return <Cmp size={size} strokeWidth={strokeWidth} />
}
