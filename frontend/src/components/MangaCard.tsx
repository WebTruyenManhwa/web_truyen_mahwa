import Image from "next/image";
import Link from "next/link";
import React from "react";

interface MangaCardProps {
  id: number;
  title: string;
  coverImage: string;
  status: string;
  latestChapter?: number;
}

const MangaCard = ({ id, title, coverImage, status, latestChapter }: MangaCardProps) => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <Link href={`/manga/${id}`}>
        <div className="relative h-64 w-full">
          <Image
            src={coverImage || "/placeholder-manga.jpg"}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-2 py-1 m-2 rounded">
            {status}
          </div>
          {latestChapter && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-sm p-2">
              Chapter {latestChapter}
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-white text-lg font-medium line-clamp-2 h-14">{title}</h3>
        </div>
      </Link>
    </div>
  );
};

export default MangaCard; 