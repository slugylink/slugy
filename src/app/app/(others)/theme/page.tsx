"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GradientShowcase() {
  const gradients = [
    {
      title: "Sunset",
      description: "Amber to Violet to Sky",
      type: "Radial",
      className: "bg-radial-ellipse-bottom-amber-violet-sky",
    },
    {
      title: "Golden",
      description: "Amber to Yellow",
      type: "Radial",
      className: "bg-radial-ellipse-bottom-amber-yellow",
    },
    {
      title: "Ocean",
      description: "Orange to Sky",
      type: "Linear",
      className: "bg-gradient-to-t from-orange-400 to-sky-400",
    },
    {
      title: "Aurora",
      description: "White via Sky",
      type: "Conic",
      className: "bg-conic-bottom-white-sky",
    },
    {
      title: "Monochrome",
      description: "Gray Spectrum",
      type: "Conic",
      className: "bg-conic-top-gray",
    },
    {
      title: "Twilight",
      description: "Gray to Purple to Violet",
      type: "Linear",
      className: "bg-gradient-to-b from-gray-900 via-purple-900 to-violet-600",
    },
    {
      title: "Firefly",
      description: "Sky via Orange to Yellow",
      type: "Conic",
      className: "bg-conic-top-sky-orange-yellow",
    },
    {
      title: "Lagoon",
      description: "Teal via Stone to Cyan",
      type: "Radial",
      className: "bg-radial-bottom-teal-stone-cyan",
    },
    {
      title: "Neon",
      description: "Slate via Violet to Pink",
      type: "Conic",
      className: "bg-conic-center-slate-violet-pink",
    },
    {
      title: "Steel",
      description: "Blue via Gray to Zinc",
      type: "Conic",
      className: "bg-conic-center-blue-gray-zinc",
    },
    {
      title: "Spring",
      description: "Rose via Slate to Lime",
      type: "Conic",
      className: "bg-conic-bottom-rose-slate-lime",
    },
    {
      title: "Ember",
      description: "Neutral via Gray to Red",
      type: "Conic",
      className: "bg-conic-bottom-neutral-gray-red",
    },
    {
      title: "Smoke",
      description: "Slate via Neutral to Gray",
      type: "Conic",
      className: "bg-conic-center-slate-neutral-gray",
    },
    {
      title: "Sunset",
      description: "Slate via Fuchsia to Amber",
      type: "Conic",
      className: "bg-conic-bottom-slate-fuchsia-amber",
    },
    {
      title: "Copper",
      description: "Amber via Red to Zinc",
      type: "Conic",
      className: "bg-conic-bottom-amber-red-zinc",
    },
    {
      title: "Forest",
      description: "Emerald via Green to Neutral",
      type: "Conic",
      className: "bg-conic-top-right-emerald-green-neutral",
    },
    {
      title: "Mint",
      description: "Indigo via Gray to Lime",
      type: "Conic",
      className: "bg-conic-center-indigo-gray-lime",
    },
    {
      title: "Royal",
      description: "Purple via Neutral to Lime",
      type: "Conic",
      className: "bg-conic-bottom-purple-neutral-lime",
    },
    {
      title: "Coral",
      description: "Sky via Pink to Red",
      type: "Conic",
      className: "bg-conic-bottom-sky-pink-red",
    },
    {
      title: "Prism",
      description: "Animated Rainbow with Noise",
      type: "Animated",
      className: "bg-animated-rainbow",
    },
  ];

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Linear":
        return "bg-blue-100 text-blue-800";
      case "Radial":
        return "bg-green-100 text-green-800";
      case "Conic":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-4xl font-bold text-transparent">
            Gradient Showcase
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            Beautiful gradient combinations using Tailwind CSS with radial,
            linear, and conic variations
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {gradients.map((gradient, index) => (
            <Card
              key={index}
              className="group overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className={`relative h-48 ${gradient.className}`}>
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
              </div>
              <CardHeader className="pb-3">
                <div className="mb-2 flex items-center justify-between">
                  <Badge className={getTypeColor(gradient.type)}>
                    {gradient.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(gradient.className)}
                    className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg leading-tight font-semibold text-gray-900">
                  {gradient.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  {gradient.description}
                </p>
                <div className="rounded-lg border bg-gray-50 p-3">
                  <code className="font-mono text-xs leading-relaxed break-all text-gray-800">
                    {gradient.className}
                  </code>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Usage Instructions
            </h2>
            <div className="grid gap-6 text-left md:grid-cols-3">
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Linear Gradients
                </h3>
                <p className="text-sm text-gray-600">
                  Use{" "}
                  <code className="rounded bg-gray-100 px-1">
                    bg-gradient-to-*
                  </code>{" "}
                  for directional gradients
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Radial Gradients
                </h3>
                <p className="text-sm text-gray-600">
                  Use{" "}
                  <code className="rounded bg-gray-100 px-1">
                    bg-[radial-gradient(...)]
                  </code>{" "}
                  for circular effects
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Conic Gradients
                </h3>
                <p className="text-sm text-gray-600">
                  Use{" "}
                  <code className="rounded bg-gray-100 px-1">
                    bg-[conic-gradient(...)]
                  </code>{" "}
                  for angular transitions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
