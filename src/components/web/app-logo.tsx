import Image from "next/image";
import React from "react";

const AppLogo = () => {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-[7px] bg-black shadow-sm">
      {/* <Link size={16} /> */}
      <Image
        src="/temp.svg"
        alt="Slugy"
        fill
        className="object-contain p-[2px]"
        priority
      />
    </div>
  );
};

export default AppLogo;
