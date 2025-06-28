"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Bell, Palette, Clock, Database, Shield, Download, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink } from "@/components/ui/breadcrumb"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notifications: {
      emailReports: true,
      weeklyDigest: true,
      overtimeAlerts: false,
      projectDeadlines: true,
    },
    appearance: {
      theme: "dark",
      compactMode: false,
      showAnimations: true,
    },
    timeTracking: {
      defaultWorkHours: "8",
      overtimeThreshold: "8",
      weekendTracking: false,
      autoBreaks: true,
    },
    integration: {
      jiraUrl: process.env.NEXT_PUBLIC_JIRA_BASE_URL || "",
      syncInterval: "15",
      autoSync: true,
    },
  })

  const { toast } = useToast()

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value,
      },
    }))
  }

  const saveSettings = () => {
    // In a real app, this would save to a backend
    localStorage.setItem("timetrack-settings", JSON.stringify(settings))
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully",
    })
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "timetrack-settings.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Settings Exported",
      description: "Settings file downloaded successfully",
    })
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string)
          setSettings(importedSettings)
          toast({
            title: "Settings Imported",
            description: "Settings have been imported successfully",
          })
        } catch (error) {
          toast({
            title: "Import Failed",
            description: "Invalid settings file format",
            variant: "destructive",
          })
        }
      }
      reader.readAsText(file)
    }
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex-1 space-y-6 p-6 overflow-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your application preferences and configurations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportSettings}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </div>
            <Button onClick={saveSettings}>Save Changes</Button>
          </div>
        </motion.div>

        {/* Notifications Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure how you receive updates and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive weekly timesheet reports via email</p>
                </div>
                <Switch
                  checked={settings.notifications.emailReports}
                  onCheckedChange={(checked) => handleSettingChange("notifications", "emailReports", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">Get a summary of your weekly activity</p>
                </div>
                <Switch
                  checked={settings.notifications.weeklyDigest}
                  onCheckedChange={(checked) => handleSettingChange("notifications", "weeklyDigest", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Overtime Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when you exceed daily work hours</p>
                </div>
                <Switch
                  checked={settings.notifications.overtimeAlerts}
                  onCheckedChange={(checked) => handleSettingChange("notifications", "overtimeAlerts", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Project Deadlines</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts for upcoming project deadlines</p>
                </div>
                <Switch
                  checked={settings.notifications.projectDeadlines}
                  onCheckedChange={(checked) => handleSettingChange("notifications", "projectDeadlines", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Appearance Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize the look and feel of your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={settings.appearance.theme}
                    onValueChange={(value) => handleSettingChange("appearance", "theme", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Display Density</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.appearance.compactMode}
                      onCheckedChange={(checked) => handleSettingChange("appearance", "compactMode", checked)}
                    />
                    <Label>Compact Mode</Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Animations</Label>
                  <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
                </div>
                <Switch
                  checked={settings.appearance.showAnimations}
                  onCheckedChange={(checked) => handleSettingChange("appearance", "showAnimations", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Time Tracking Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Time Tracking
              </CardTitle>
              <CardDescription>Configure time tracking preferences and thresholds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Work Hours per Day</Label>
                  <Input
                    type="number"
                    value={settings.timeTracking.defaultWorkHours}
                    onChange={(e) => handleSettingChange("timeTracking", "defaultWorkHours", e.target.value)}
                    min="1"
                    max="24"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Overtime Threshold (hours)</Label>
                  <Input
                    type="number"
                    value={settings.timeTracking.overtimeThreshold}
                    onChange={(e) => handleSettingChange("timeTracking", "overtimeThreshold", e.target.value)}
                    min="1"
                    max="24"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekend Tracking</Label>
                  <p className="text-sm text-muted-foreground">Allow time tracking on weekends</p>
                </div>
                <Switch
                  checked={settings.timeTracking.weekendTracking}
                  onCheckedChange={(checked) => handleSettingChange("timeTracking", "weekendTracking", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Breaks</Label>
                  <p className="text-sm text-muted-foreground">Automatically deduct break time from work hours</p>
                </div>
                <Switch
                  checked={settings.timeTracking.autoBreaks}
                  onCheckedChange={(checked) => handleSettingChange("timeTracking", "autoBreaks", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Integration Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                JIRA Integration
              </CardTitle>
              <CardDescription>Configure your JIRA connection and sync preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>JIRA Base URL</Label>
                <Input
                  value={settings.integration.jiraUrl}
                  onChange={(e) => handleSettingChange("integration", "jiraUrl", e.target.value)}
                  placeholder="https://your-domain.atlassian.net"
                  disabled
                />
                <p className="text-sm text-muted-foreground">
                  This is configured via environment variables for security
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sync Interval (minutes)</Label>
                  <Select
                    value={settings.integration.syncInterval}
                    onValueChange={(value) => handleSettingChange("integration", "syncInterval", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Connection Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                      Connected
                    </Badge>
                    <Button variant="outline" size="sm">
                      Test Connection
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">Automatically sync data at specified intervals</p>
                </div>
                <Switch
                  checked={settings.integration.autoSync}
                  onCheckedChange={(checked) => handleSettingChange("integration", "autoSync", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security & Privacy
              </CardTitle>
              <CardDescription>Manage your security preferences and data privacy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Retention Period</Label>
                  <Select defaultValue="365">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="730">2 years</SelectItem>
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Export Data</Label>
                  <p className="text-sm text-muted-foreground">Download all your data in a portable format</p>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Data
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Delete Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </SidebarInset>
  )
}
