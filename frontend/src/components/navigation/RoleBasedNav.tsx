'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, TrendingUp, Shield, ShoppingBag } from 'lucide-react'

export function RoleBasedNav() {
  const pathname = usePathname()

  // Simple static navigation - always show all links
  // Role badges and admin visibility can be added later after testing basic navigation
  const navItems = [
    {
      href: '/business',
      label: 'Business',
      icon: Building2,
      isActive: pathname?.startsWith('/business'),
    },
    {
      href: '/investor',
      label: 'Investor',
      icon: TrendingUp,
      isActive: pathname?.startsWith('/investor'),
    },
    {
      href: '/marketplace',
      label: 'Marketplace',
      icon: ShoppingBag,
      isActive: pathname?.startsWith('/marketplace'),
    },
    {
      href: '/insurance',
      label: 'Insurance',
      icon: Shield,
      isActive: pathname?.startsWith('/insurance'),
    },
    {
      href: '/admin',
      label: 'Admin',
      icon: Shield,
      isActive: pathname?.startsWith('/admin'),
    },
  ]

  return (
    <nav className="hidden md:flex items-center space-x-1">
      {navItems.map((item) => {
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
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
