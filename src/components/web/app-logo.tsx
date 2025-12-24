import Image from "next/image";
import React from "react";

const AppLogo = () => {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center overflow- rounded-lg bg-black shadow-sm">
      {/* <Link size={16} /> */}
      <Image
        src="/icon.svg"
        alt="Slugy"
        fill
        className="object-contain p-[2px] overflow-hidden rounded-2xl"
        priority
      />

      <Image
        src="/icons/cap.png"
        alt="Slugy"
        width={35}
        height={35}
        className="absolute -top-3.5 -left-3.5 z-10 object-contain p-[2px]"
        priority
      />
    </div>
  );
};

export default AppLogo;
