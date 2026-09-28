import type { Theme } from "@/types/bio-links";
import { DEFAULT_THEME_ID } from "./bio-links";

export const themes = [
  {
    // Current bio editor design (light dotted grid)
    id: "default",
    name: "Default",
    background:
      "bg-[#f6f6f7] bg-[radial-gradient(#e4e3e6_1.15px,transparent_1.15px)] bg-[size:18px_18px]",
    buttonStyle: "bg-[#e3e4e6] hover:bg-[#d8d9db] text-zinc-800 font-medium",
    textColor: "text-zinc-900",
    accentColor: "text-zinc-400",
  },
  // {
  //   id: "dotted-grid",
  //   name: "Dotted Grid",
  //   background:
  //     "bg-white bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-[size:20px_20px]",
  //   buttonStyle:
  //     "bg-zinc-50 hover:bg-zinc-100 text-black rounded-md shadow-sm border border-zinc-200/80",
  //   textColor: "text-zinc-800",
  //   accentColor: "text-zinc-600",
  // },
  {
    id: "music",
    name: "Music",
    background: "bg-gradient-to-b from-orange-400 via-amber-700/90 to-zinc-900",
    buttonStyle:
      "bg-white hover:bg-white/90 text-zinc-900 font-medium rounded-xl shadow-sm text-center",
    textColor: "text-white",
    accentColor: "text-orange-300",
  },
  {
    id: "ocean",
    name: "Ocean",
    background: "bg-gradient-to-t from-orange-400 to-sky-400",
    buttonStyle: "bg-white hover:bg-white/90 text-zinc-900 rounded-lg",
    textColor: "text-white",
    accentColor: "text-zinc-100",
  },
  {
    id: "alice",
    name: "Alice",
    background: "bg-gradient-to-b from-emerald-100/80 to-teal-50",
    buttonStyle:
      "bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm",
    textColor: "text-emerald-900",
    accentColor: "text-emerald-600",
  },
  {
    id: "twilight",
    name: "Twilight",
    background: "bg-radial-ellipse-bottom-amber-violet-sky",
    buttonStyle: "bg-white hover:bg-zinc-100 text-zinc-900 rounded-sm",
    textColor: "text-white",
    accentColor: "text-white",
  },
  {
    id: "ember",
    name: "Ember",
    background: "bg-conic-bottom-amber-red-zinc",
    buttonStyle: "bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg",
    textColor: "text-white",
    accentColor: "text-zinc-100",
  },
  // {
  //   id: "monochrome",
  //   name: "Monochrome",
  //   background: "bg-conic-top-gray",
  //   buttonStyle:
  //     "bg-white text-zinc-900 font-medium text-center flex justify-center items-center rounded-md",
  //   textColor: "text-zinc-900",
  //   accentColor: "text-zinc-600",
  // },
  {
    id: "skyfall",
    name: "Skyfall",
    background: "bg-gradient-to-b from-[#8FD2FF] to-[#20A4FE]",
    buttonStyle:
      "bg-white text-black font-medium text-center flex justify-center items-center rounded-full",
    textColor: "text-white",
    accentColor: "text-zinc-100",
  },
  {
    id: "sunset-conic",
    name: "Sunset",
    background:
      "bg-[conic-gradient(at_top_right,_#ffb347_0%,_#ffcc33_25%,_#ff5e62_50%,_#ff9966_75%,_#ffb347_100%)]",
    buttonStyle:
      "bg-white/30 hover:bg-white/60 text-orange-900 font-bold text-center flex justify-center items-center rounded-xl",
    textColor: "text-orange-900",
    accentColor: "text-yellow-400",
  },
  // {
  //   id: "oceanic-wave",
  //   name: "Oceanic",
  //   background: "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700",
  //   buttonStyle:
  //     "bg-white/30 hover:bg-white/60 text-white/90 font-medium text-center flex justify-center items-center rounded-full",
  //   textColor: "text-white",
  //   accentColor: "text-cyan-200",
  // },
  {
    id: "candy-pop",
    name: "Candy",
    background:
      "bg-[radial-gradient(circle_at_60%_40%,_#ffb6b9_0%,_#fae3d9_40%,_#bbded6_100%)]",
    buttonStyle:
      "border border-red-300 bg-red-400/20 hover:bg-red-400/40 text-red-800 font-bold text-center flex justify-center items-center rounded-full",
    textColor: "text-red-800",
    accentColor: "text-red-600",
  },
  // {
  //   id: "midnight-prism",
  //   name: "Midnight",
  //   background: "bg-gradient-to-tr from-zinc-900 via-purple-900 to-blue-900",
  //   buttonStyle:
  //     "bg-white/10 hover:bg-white/20 text-white font-medium text-start flex justify-start items-center rounded-xl",
  //   textColor: "text-white",
  //   accentColor: "text-blue-300",
  // },
  {
    id: "zigzag",
    name: "Zigzag",
    background:
      "bg-amber-50 bg-[linear-gradient(135deg,#fcd34d_25%,transparent_0%),linear-gradient(225deg,#fcd34d_25%,transparent_100%),linear-gradient(45deg,#fcd34d_25%,transparent_80%),linear-gradient(315deg,#fcd34d_25%,transparent_25%)] bg-amber-200 bg-[position:10px_0,10px_0,0_0,0_0] bg-[size:20px_20px] bg-[background-size:20px_20px]",
    buttonStyle: "bg-amber-600/80 hover:bg-amber-700/80 text-white rounded-md",
    textColor: "text-amber-900",
    accentColor: "text-amber-700",
  },
  {
    id: "prism",
    name: "Prism",
    background: "bg-animated-rainbow",
    buttonStyle:
      "bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 rounded-lg transition-all duration-300",
    textColor: "text-white",
    accentColor: "text-white",
  },
  {
    // Spidey suit: night-city navy with red glow + web-ray pattern
    id: "spiderman",
    name: "Spiderman",
    background: "bg-spiderman",
    buttonStyle:
      "bg-[#d81f26] hover:bg-[#b01419] text-white font-bold text-center flex justify-center items-center rounded-xl border border-black/50 shadow-[0_2px_12px_rgba(216,31,38,0.45)]",
    textColor: "text-white",
    accentColor: "text-red-200",
  },
  {
    // Dragon Warrior: valley dusk with golden lantern glow + jade depths
    id: "kung-fu-panda",
    name: "Kung Fu Panda",
    background: "bg-kungfupanda",
    buttonStyle:
      "bg-[#eab308] hover:bg-[#ca8b06] text-stone-900 font-bold text-center flex justify-center items-center rounded-xl border border-black/30 shadow-[0_2px_12px_rgba(234,179,8,0.45)]",
    textColor: "text-white",
    accentColor: "text-amber-200",
  },
  {
    // Neo-brutalist: marker yellow, chunky multi-color buttons, hard shadows
    id: "brutalist",
    name: "Brutalist",
    background: "bg-brutalist",
    buttonStyle:
      "bg-white text-black font-bold border-2 border-black rounded-xl shadow-[3px_3px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000]",
    buttonPalette: [
      "bg-[#FF6B6B]",
      "bg-[#45D8E5]",
      "bg-[#C084FC]",
      "bg-[#FFB020]",
      "bg-[#34D399]",
    ],
    textColor: "text-black",
    accentColor: "text-neutral-800",
  },
  {
    // Vercel-style monochrome: pure black page, white pill buttons
    id: "mono",
    name: "Mono",
    background: "bg-black",
    buttonStyle:
      "bg-white hover:bg-zinc-200 text-black font-medium text-center flex justify-center items-center rounded-full",
    textColor: "text-white",
    accentColor: "text-neutral-400",
  },
] as const;

/**
 * Single shared theme resolver (used by public bio pages, legacy route,
 * editor preview, and theme picker). Unknown or structurally incomplete
 * ids fall back to the default theme — so the API can persist any string.
 */
export function resolveGalleryTheme(
  themeId: string | Theme | null | undefined,
): Theme {
  const fallbackTheme =
    themes.find((theme) => theme.id === DEFAULT_THEME_ID) ?? themes[0];
  const resolvedThemeId = typeof themeId === "string" ? themeId : themeId?.id;
  const selectedTheme =
    themes.find((theme) => theme.id === resolvedThemeId) ?? fallbackTheme;

  if (
    !selectedTheme?.background ||
    !selectedTheme?.textColor ||
    !selectedTheme?.buttonStyle
  ) {
    return fallbackTheme;
  }

  return selectedTheme;
}
