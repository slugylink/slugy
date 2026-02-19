import Image from "next/image";

const AppLogo = () => {
  return (
    <div className="overflow- relative flex h-8 w-8 items-center justify-center rounded-lg bg-black shadow-sm">
      {/* <Link size={16} /> */}
      <Image
        src="/icon.svg"
        alt="Slugy"
        fill
        className="overflow-hidden rounded-2xl object-contain p-[2px]"
        priority
        sizes={"(max-width: 768px) 100vw, 50vw"}
      />
    </div>
  );
};

export default AppLogo;
