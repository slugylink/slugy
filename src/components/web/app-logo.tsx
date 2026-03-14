import { cn } from "@/lib/utils";
import Image from "next/image";

const AppLogo = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "relative flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-lg bg-black shadow-sm",
        className,
      )}
    >
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
