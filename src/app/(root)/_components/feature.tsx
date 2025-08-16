"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { data } from "@/constants/data/feature";
import Image from "next/image";
import { cn } from "@/lib/utils";

const Features = () => {
  return (
    <div className="dark:bg-background mx-auto mt-10 max-w-[80rem] px-2 py-12 text-center sm:mt-0 sm:py-16 md:py-20 lg:py-24">
      {/* Heading */}
      <div className="mb-6 space-y-4 text-2xl font-medium sm:text-4xl">
        <h2 className="text-balance">Elevate your brand</h2>
      </div>

      {/* Description */}
      <p className="mx-auto mb-12 max-w-xl text-sm text-zinc-600 sm:text-base dark:text-zinc-300">
        Create standout short links with our powerful link management{" "}
        <br className="hidden sm:block" /> platform that includes robust.
        analytics.
      </p>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {data.map((item, index) => (
          <div
            key={item.title}
            className={cn(
              "w-full  sm:p-4",
              index % 2 === 0 ? "sm:border-r dark:border-zinc-100/20" : "",
              index > 1 ? "rounf border-t dark:border-zinc-100/20" : "",
              index === 1 ? "border-t sm:border-t-0" : "",
            )}
          >
            <Card className="rounded-none border-none bg-transparent p-3 pt-10 shadow-none sm:p-10">
              <div>
                <div className="relative">
                  <div className="absolute inset-x-32 top-6 m-auto aspect-video bg-gradient-to-tr from-yellow-500 via-orange-200 to-violet-300 blur-3xl md:inset-x-20" />
                  <div className="absolute inset-0 z-20 rounded-xl [background:radial-gradient(100%_100%_at_28%_-0%,transparent_60%,#ffffff_100%)] dark:[background:radial-gradient(100%_100%_at_0%_0%,transparent_0%,#121212_100%)]" />
                  {/* Feature image */}
                  <div className="relative w-full max-w-6xl rounded-2xl border border-zinc-200 p-1 dark:border-zinc-200/20">
                    <div className="relative aspect-[16/11] overflow-hidden rounded-2xl border dark:border-zinc-200/40">
                      <Image
                        src={item.image}
                        fill
                        alt=""
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
                <CardContent className="mt-3 p-0 pl-2">
                  <h3 className="mb-2 text-start text-lg font-medium">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-start leading-relaxed font-normal">
                    {item.description}
                  </p>
                </CardContent>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Features;
