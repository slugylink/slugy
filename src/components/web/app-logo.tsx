import Image from "next/image";

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
    </div>
  );
};

export default AppLogo;
