export const themes = [
  {
    id: "default",
    name: "Default",
    background: "bg-gradient-to-b from-zinc-900 to-zinc-700",
    buttonStyle: "bg-white/10 hover:bg-white/20 text-white rounded-md",
    textColor: "text-white",
    accentColor: "text-emerald-400",
    preview: "/themes/default.png",
  },
  {
    id: "music",
    name: "Music",
    background: "bg-gradient-to-b from-orange-500 via-amber-700 to-zinc-900",
    buttonStyle:
      "bg-white hover:bg-white/90 text-zinc-900 font-medium rounded-xl shadow-sm text-center",
    textColor: "text-white",
    accentColor: "text-orange-300",
    preview: "/themes/music.png",
  },
  {
    id: "ulster",
    name: "Ulster",
    background: "bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-700",
    buttonStyle: "bg-red-500 hover:bg-red-600 text-white rounded-none",
    textColor: "text-white",
    accentColor: "text-red-300",
    preview: "/themes/ulster.png",
  },
  {
    id: "alice",
    name: "Alice",
    background: "bg-gradient-to-b from-emerald-100/80 to-teal-50",
    buttonStyle:
      "bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm",
    textColor: "text-emerald-900",
    accentColor: "text-emerald-600",
    preview: "/themes/subtle-waves.png",
  },
  {
    id: "threesell",
    name: "Threesell",
    background: "bg-[linear-gradient(135deg,#f44336_50%,#3a4b5e_50%)]",
    buttonStyle: "bg-white hover:bg-zinc-100 text-zinc-900 rounded-none",
    textColor: "text-white",
    accentColor: "text-white",
    preview: "/themes/threesell.png",
  },
  {
    id: "stubbs",
    name: "Stubbs",
    background: "bg-white",
    buttonStyle:
      "bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-full",
    textColor: "text-zinc-900",
    accentColor: "text-blue-600",
    preview: "/themes/stubbs.png",
  },
  {
    id: "skyfall",
    name: "Skyfall",
    background: "bg-gradient-to-b from-[#8FD2FF] to-[#20A4FE]",
    buttonStyle:
      "bg-white text-black font-medium text-center flex justify-center items-center rounded-full",
    textColor: "text-white",
    accentColor: "text-zinc-100",
    preview: "/themes/aurora-radial.png",
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
    preview: "/themes/sunset-conic.png",
  },
  {
    id: "oceanic-wave",
    name: "Oceanic",
    background: "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700",
    buttonStyle:
      "bg-white/30 hover:bg-white/60 text-white/90 font-medium text-center flex justify-center items-center rounded-full",
    textColor: "text-white",
    accentColor: "text-cyan-200",
    preview: "/themes/oceanic-wave.png",
  },
  {
    id: "candy-pop",
    name: "Candy",
    background:
      "bg-[radial-gradient(circle_at_60%_40%,_#ffb6b9_0%,_#fae3d9_40%,_#bbded6_100%)]",
    buttonStyle:
      "border border-red-300 bg-red-400/20 hover:bg-red-400/40 text-red-800 font-bold text-center flex justify-center items-center rounded-full",
    textColor: "text-red-800",
    accentColor: "text-red-600",
    preview: "/themes/candy-pop.png",
  },
  {
    id: "midnight-prism",
    name: "Midnight",
    background: "bg-gradient-to-tr from-zinc-900 via-purple-900 to-blue-900",
    buttonStyle:
      "bg-white/10 hover:bg-white/20 text-white font-medium text-center flex justify-center items-center rounded-xl",
    textColor: "text-white",
    accentColor: "text-blue-300",
    preview: "/themes/midnight-prism.png",
  },
  {
    id: "dotted-grid",
    name: "Dotted Grid",
    background:
      "bg-white bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-[size:20px_20px]",
    buttonStyle:
      "bg-zinc-50 hover:bg-zinc-100 text-black rounded-md shadow-sm border border-zinc-200/80",
    textColor: "text-zinc-800",
    accentColor: "text-zinc-600",
    preview: "/themes/dotted-grid.png",
  },
  {
    id: "zigzag",
    name: "Zigzag",
    background:
      "bg-amber-50 bg-[linear-gradient(135deg,#fcd34d_25%,transparent_0%),linear-gradient(225deg,#fcd34d_25%,transparent_100%),linear-gradient(45deg,#fcd34d_25%,transparent_80%),linear-gradient(315deg,#fcd34d_25%,transparent_25%)] bg-amber-200 bg-[position:10px_0,10px_0,0_0,0_0] bg-[size:20px_20px] bg-[background-size:20px_20px]",
    buttonStyle: "bg-amber-600/80 hover:bg-amber-700/80 text-white rounded-md",
    textColor: "text-amber-900",
    accentColor: "text-amber-700",
    preview: "/themes/zigzag.png",
  },


] as const;
