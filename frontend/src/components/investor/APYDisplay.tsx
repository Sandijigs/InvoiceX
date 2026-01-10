'use client'

import { TrendingUp } from 'lucide-react'

interface APYDisplayProps {
  apy: number
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export function APYDisplay({ apy, size = 'md', showIcon = true, className = '' }: APYDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showIcon && <TrendingUp className={`${iconSizes[size]} text-emerald-600`} />}
      <span className={`${sizeClasses[size]} font-bold text-emerald-600`}>{apy.toFixed(2)}%</span>
      <span className={`text-xs text-slate-500 ${size === 'sm' ? '' : 'ml-0.5'}`}>APY</span>
    </div>
  )
}
