import Image from "next/image";
import Link from "next/link";
import { BIO_DATA } from "@/constants/bio-data";
import UrlAvatar from "../url-avatar";

export default function GridFeatureCard() {
  return (
    <section className="w-full">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {BIO_DATA.feature.map(({ title, image, href }) => (
          <Link
            key={`grid-${title}`}
            href={href}
            target="_blank"
            aria-label={`Watch: ${title}`}
            className="group relative block aspect-[3/2] overflow-hidden rounded-xl bg-zinc-900"
          >
            <Image
              src={image}
              alt={title}
              fill
              sizes="(max-width: 768px) 50vw, 300px"
              className="object-cover transition duration-300"
            />

            <div className="absolute inset-0 z-10 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

            <span className="absolute top-3 left-3 z-20 rounded-full shadow-sm">
              <UrlAvatar className="size-7 p-1.5" url={href} />
            </span>

            <p className="absolute inset-x-0 bottom-2 z-20 line-clamp-1 px-3 text-center text-sm leading-tight font-semibold text-white drop-shadow-sm sm:text-base">
              {title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
