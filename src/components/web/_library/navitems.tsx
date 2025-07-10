"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface NavItem {
  name: string;
  path: string;
}

const Navitems = ({ workspaceslug }: { workspaceslug: string }) => {
  const pathname = usePathname();
  const navdata: NavItem[] = [
    {
      name: "Tags",
      path: "/tags",
    },
    // {
    //   name: "UTM Templates",
    //   path: "/utm",
    // },
  ];

  const basePath = `/${workspaceslug}/settings/library`;

  return (
    <div className="container mx-auto mb-3 max-w-6xl space-y-8 py-3">
      <div className="mx-auto flex h-[45px] max-w-[80rem] items-center gap-x-8 border-b">
        {navdata.map((item) => {
          const href = `${basePath}${item.path}`;
          const isActive =
            pathname === href || (item.path === "" && pathname === basePath);

          return (
            <Link
              key={item.name}
              href={href}
              className={`hover:text-primary relative text-sm transition-colors duration-200 ease-in-out ${
                isActive ? "text-primary" : "text-gray-600 dark:text-gray-300"
              }`}
            >
              {item.name}
              <span
                className={`bg-primary absolute bottom-[-13px] left-0 h-[2.2px] w-full rounded transition-all duration-200 ease-in-out ${
                  isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Navitems;
