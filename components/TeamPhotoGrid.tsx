import Image from "next/image"

const TEAM_PHOTOS = [
  {
    src: "/images/team/team-01.jpg",
    alt: "TGV-Media team member reaching toward an illuminated bulb",
    objectPosition: "50% 0%",
  },
  {
    src: "/images/team/team-02.jpg",
    alt: "TGV-Media team member riding a bicycle with orange accents",
    objectPosition: "50% 70%",
  },
  {
    src: "/images/team/team-03.jpg",
    alt: "TGV-Media team member holding an orange paper plane",
    objectPosition: "58% 50%",
  },
  {
    src: "/images/team/team-04.jpg",
    alt: "TGV-Media team member with an illuminated production tool",
    objectPosition: "50% 48%",
  },
  {
    src: "/images/team/team-05.jpg",
    alt: "TGV-Media team member using an airbrush with orange paint",
    objectPosition: "50% 18%",
  },
]

export default function TeamPhotoGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
      {TEAM_PHOTOS.map((photo, index) => (
        <div
          key={photo.src}
          className={`relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#171717] sm:rounded-3xl ${
            index === TEAM_PHOTOS.length - 1
              ? "col-span-2 md:col-span-1"
              : ""
          }`}
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes={
              index === TEAM_PHOTOS.length - 1
                ? "(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 100vw"
                : "(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
            }
            className="object-cover"
            style={{ objectPosition: photo.objectPosition }}
          />
        </div>
      ))}
    </div>
  )
}
