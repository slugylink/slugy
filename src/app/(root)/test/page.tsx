"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Globe, Smartphone, Monitor, Tablet } from "lucide-react";

interface ApiDeviceInfo {
  device: {
    type: string;
  };
  browser: {
    name: string;
  };
  os: {
    name: string;
  };
}

export default function ApiDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState<ApiDeviceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDeviceInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/test");
      const data = await response.json();
      setDeviceInfo(data);
    } catch (error) {
      console.error("Failed to fetch device info:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceInfo();
  }, []);

  const getDeviceIcon = () => {
    if (!deviceInfo) return <Globe className="h-5 w-5" />;

    switch (deviceInfo.device.type) {
      case "mobile":
        return <Smartphone className="h-5 w-5" />;
      case "tablet":
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          API Route Detection
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>Device info from API endpoint</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDeviceInfo}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center">
            <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        ) : deviceInfo ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2 text-center">
              <div className="flex items-center justify-center gap-2">
                {getDeviceIcon()}
                <h3 className="font-semibold">Device</h3>
              </div>
              <Badge variant="outline" className="px-4 py-2 text-lg">
                {deviceInfo.device.type}
              </Badge>
            </div>

            <div className="space-y-2 text-center">
              <h3 className="font-semibold">Browser</h3>
              <div className="space-y-1">
                <Badge variant="default" className="block">
                  {deviceInfo.browser.name}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-center">
              <h3 className="font-semibold">Operating System</h3>
              <div className="space-y-1">
                <Badge variant="default" className="block">
                  {deviceInfo.os.name}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center">
            Failed to load device info
          </p>
        )}
      </CardContent>
    </Card>
  );
}
