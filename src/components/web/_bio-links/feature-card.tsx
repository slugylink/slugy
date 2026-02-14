import Image from "next/image";
import { BIO_DATA } from "@/constants/bio-data";
import UrlAvatar from "../url-avatar";
import Link from "next/link";

export default function FeatureCard() {
  return (
    <section className="w-full">
      <div className="space-y-3 sm:space-y-4">
        {BIO_DATA.feature.map(({ title, image, href }) => (
          <Link
            key={title}
            target="_blank"
            href={href}
            aria-label={`Watch: ${title}`}
            className="group relative block aspect-video overflow-hidden rounded-xl bg-zinc-900"
          >
            <Image
              src={image}
              alt={title}
              fill
              sizes="100vw"
              className="object-cover transition duration-300"
            />

            <div className="absolute inset-0 z-10 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

            <span className="absolute top-3 left-3 rounded-full shadow-sm">
              <UrlAvatar className="size-8 p-1.5" url={href} />
            </span>

            <p className="text-md absolute inset-x-0 bottom-2.5 z-10 line-clamp-1 px-4 text-center leading-tight font-semibold text-white drop-shadow-sm md:text-lg">
              {title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
