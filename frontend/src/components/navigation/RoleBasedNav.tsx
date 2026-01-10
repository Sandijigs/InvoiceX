'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'
import { Building2, TrendingUp, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function RoleBasedNav() {
  const pathname = usePathname()
  const { role, isBusiness, isInvestor, isLoading } = useUserRole()

  const navItems = [
    {
      href: '/business',
      label: 'Business',
      icon: Building2,
      show: true,
      isActive: pathname?.startsWith('/business'),
      badge: isBusiness ? 'active' : null,
    },
    {
      href: '/investor',
      label: 'Investor',
      icon: TrendingUp,
      show: true,
      isActive: pathname?.startsWith('/investor'),
      badge: isInvestor ? 'active' : null,
    },
    {
      href: '/marketplace',
      label: 'Marketplace',
      icon: Users,
      show: true,
      isActive: pathname === '/marketplace',
      badge: null,
    },
  ]

  return (
    <div className="hidden md:flex items-center space-x-1">
      {navItems.map((item) => {
        if (!item.show) return null

        const Icon = item.icon
        const isActive = item.isActive

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${
                isActive
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
            {item.badge && !isLoading && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-emerald-500 text-white border-none">
                {item.badge}
              </Badge>
            )}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
            )}
          </Link>
        )
      })}
    </div>
  )
}
