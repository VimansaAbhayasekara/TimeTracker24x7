"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface HeroSectionProps {
  title: string
  subtitle: string
  description: string
  badgeText: string
  badgeIcon: React.ReactNode
  primaryAction: {
    text: string
    href: string
  }
  secondaryAction: {
    text: string
    href: string
  }
  backgroundGradient?: string
}

export function HeroSection({
  title,
  description,
  badgeText,
  badgeIcon,
  primaryAction,
  secondaryAction,
  backgroundGradient = "from-primary/20 via-primary/10 to-background",
}: HeroSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${backgroundGradient} p-8`}
    >
      <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
      <motion.div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20">
            {badgeIcon}
          </div>
          <Badge variant="secondary" className="animate-pulse-slow">
            {badgeText}
          </Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-xl text-muted-foreground mb-6">
          {description}
        </p>
        <div className="flex flex-wrap gap-4">
          <Button size="lg" asChild>
            <Link href={primaryAction.href}>
              {primaryAction.text} <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href={secondaryAction.href}>
              {secondaryAction.text}
            </Link>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}