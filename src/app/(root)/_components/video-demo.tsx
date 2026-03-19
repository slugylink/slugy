"use client";

import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useCallback, useRef, useState } from "react";

export default function VideoDemoSection() {
  const containerRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.5], [10, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.95, 1]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play().then(() => setIsPlaying(true));
      return;
    }

    video.pause();
    setIsPlaying(false);
  }, []);

  return (
    <section
      id="demo"
      ref={containerRef}
      className="relative mx-auto mt-8 max-w-6xl overflow-hidden px-3"
    >
      <div className="mb-6 text-center sm:mb-10">
        <h2 className="text-2xl font-medium tracking-tight sm:text-4xl">
          See it in action
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm sm:text-base">
          Experience the speed of the workflow. No fluff, just the tool.
        </p>
      </div>

      <motion.div
        style={{ rotateX, scale }}
        className="relative mx-auto w-full"
      >
        <div className="relative mx-auto max-w-5xl">
          <div
            className="group relative cursor-pointer overflow-hidden rounded-2xl shadow-[0_20px_70px_-28px_rgba(255,170,64,0.55)]"
            onClick={togglePlay}
            onMouseEnter={() => setShowButton(true)}
            onMouseLeave={() => setShowButton(false)}
          >
            <video
              ref={videoRef}
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full"
              poster="https://res.cloudinary.com/dcsouj6ix/video/upload/v1773909926/0319_1_qbgiuy.jpg"
            >
              <source
                src="https://res.cloudinary.com/dcsouj6ix/video/upload/v1773909926/0319_1_qbgiuy.mp4"
                type="video/mp4"
              />
            </video>

            <AnimatePresence>
              {(showButton || !isPlaying) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-sm transition-transform group-hover:scale-105 sm:h-16 sm:w-16">
                    {isPlaying ? (
                      <Pause className="h-5 w-5 sm:h-6 sm:w-6" />
                    ) : (
                      <Play className="ml-0.5 h-5 w-5 sm:h-6 sm:w-6" />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" /> */}
          </div>

          <div className="absolute -bottom-px left-1/2 h-px w-[90%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#ffaa40]/70 to-transparent" />
        </div>
      </motion.div>
    </section>
  );
}
