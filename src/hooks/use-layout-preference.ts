import { useEffect, useState } from "react";

export const useLayoutPreference = () => {
  const [layout, setLayout] = useState("grid-cols-1");

  useEffect(() => {
    const cookieLayout =
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("layout="))
        ?.split("=")[1] ?? "grid-cols-1";
    setLayout(cookieLayout);
  }, []);

  return { layout, setLayout };
};
