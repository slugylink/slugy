"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Globe, Smartphone, Monitor, Tablet } from "lucide-react"

interface ApiDeviceInfo {
  device: {
    type: string
  }
  browser: {
    name: string
    version: string
  }
  os: {
    name: string
    version: string
  }
}

export default function ApiDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState<ApiDeviceInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDeviceInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test")
      const data = await response.json()
      setDeviceInfo(data)
    } catch (error) {
      console.error("Failed to fetch device info:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeviceInfo()
  }, [])

  const getDeviceIcon = () => {
    if (!deviceInfo) return <Globe className="h-5 w-5" />

    switch (deviceInfo.device.type) {
      case "mobile":
        return <Smartphone className="h-5 w-5" />
      case "tablet":
        return <Tablet className="h-5 w-5" />
      default:
        return <Monitor className="h-5 w-5" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          API Route Detection
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>Device info from API endpoint</span>
          <Button variant="outline" size="sm" onClick={fetchDeviceInfo} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : deviceInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                {getDeviceIcon()}
                <h3 className="font-semibold">Device</h3>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {deviceInfo.device.type}
              </Badge>
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-semibold">Browser</h3>
              <div className="space-y-1">
                <Badge variant="default" className="block">
                  {deviceInfo.browser.name}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  v{deviceInfo.browser.version}
                </Badge>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-semibold">Operating System</h3>
              <div className="space-y-1">
                <Badge variant="default" className="block">
                  {deviceInfo.os.name}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  v{deviceInfo.os.version}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Failed to load device info</p>
        )}
      </CardContent>
    </Card>
  )
}
