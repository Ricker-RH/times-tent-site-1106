"use client";

import Image from "next/image";
import Link from "next/link";

import { t } from "@/data";
import { sanitizeImageSrc } from "@/utils/image";

type LocalizedRecord = Record<string, string | undefined>;
type MaybeLocalized = string | LocalizedRecord | undefined;

type InventoryPosterConfig = {
  image?: string;
  title?: MaybeLocalized;
};

type InventorySectionConfig = {
  id?: string;
  title?: MaybeLocalized;
  summary?: MaybeLocalized;
  contact?: MaybeLocalized;
  mainPoster?: InventoryPosterConfig;
  gallery?: ReadonlyArray<InventoryPosterConfig>;
};

type InventoryHero = {
  backgroundImage?: string;
  eyebrow?: MaybeLocalized;
  title?: MaybeLocalized;
  description?: MaybeLocalized;
  badges?: ReadonlyArray<MaybeLocalized>;
};

export interface InventoryClientProps {
  hero?: InventoryHero | null;
  sections?: ReadonlyArray<InventorySectionConfig>;
  hiddenSections?: {
    hero?: boolean;
    sections?: boolean;
  };
}

export default function InventoryClient({ hero, sections, hiddenSections }: InventoryClientProps) {
  const hideHero = hiddenSections?.hero === true;
  const hideSections = hiddenSections?.sections === true;
  const sectionList = sections ?? [];

  return (
    <div className="bg-white pb-0">
      {!hideHero && hero ? <HeroSection hero={hero} /> : null}

      {hideSections ? null : (
        <div className="pt-0">
          {sectionList.map((section, index) => (
            <ShowcaseSection key={section.id ?? `section-${index}`} section={section} index={index} />
          ))}
        </div>
      )}
     </div>
   );
 }

 function HeroSection({ hero }: { hero: InventoryHero }) {
   const backgroundImage = sanitizeImageSrc(hero.backgroundImage ?? "");
   const eyebrow = resolveText(hero.eyebrow);
   const title = resolveText(hero.title);
   const description = resolveText(hero.description);
   const badges = (hero.badges ?? []).map((badge) => resolveText(badge)).filter(Boolean);
   
   return (
     <section className="relative overflow-hidden">
       <div className="absolute inset-0">
         {backgroundImage ? (
           <Image src={backgroundImage} alt={title || "Inventory hero"} fill priority className="object-cover" />
         ) : (
           <div className="flex h-full items-center justify-center bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-tertiary)]">
             背景图待补充
           </div>
         )}
         <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-black/25" />
       </div>
       <div className="relative z-10 mx-auto flex min-h-[420px] w-full max-w-[1200px] flex-col justify-center gap-6 px-4 py-16 text-white sm:px-6 md:py-20 lg:px-8">
         {eyebrow ? (
           <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
             {eyebrow}
           </span>
         ) : null}
         {title ? <h1 className="max-w-3xl text-3xl font-semibold md:text-4xl">{title}</h1> : null}
         {description ? <p className="max-w-2xl text-sm text-white/80 md:text-base">{description}</p> : null}
         {badges.length ? (
           <div className="flex flex-wrap gap-2 text-xs text-white/80">
             {badges.map((badge, index) => (
               <span key={`${badge}-${index}`} className="inline-flex items-center rounded-full bg-white/15 px-3 py-1">
                 {badge}
               </span>
             ))}
           </div>
         ) : null}
       </div>
     </section>
   );
 }

 function ShowcaseSection({ section, index }: { section: InventorySectionConfig; index: number }) {
   const id = section.id ?? `section-${index}`;
   const title = resolveText(section.title);
   const summary = resolveText(section.summary);
   const contact = resolveText(section.contact);
   const posters = buildPosterList(section);
   const sectionPadding = index === 0 ? "pt-8 pb-12" : "py-12";
   
   return (
     <section id={id} className={`${index % 2 === 1 ? "bg-[var(--color-surface-muted)]" : "bg-white"} scroll-mt-24 ${sectionPadding} last:pb-0`}>
       <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 sm:px-6 lg:px-8">
         <div className="space-y-2">
           <h2 className="text-2xl font-semibold text-[var(--color-brand-secondary)] md:text-3xl">{title}</h2>
           {summary ? <p className="text-sm text-[var(--color-text-secondary)] md:text-base">{summary}</p> : null}
           {contact ? <p className="text-xs text-[var(--color-text-tertiary)] md:text-sm">{contact}</p> : null}
         </div>
         <div className="space-y-6">
           {posters.map((poster, posterIndex) => (
             <figure key={`${poster.image}-${posterIndex}`} className="overflow-hidden rounded-lg">
               <div className="relative aspect-[3/2] md:aspect-[16/9]">
                 {poster.image ? (
                   <Image
                     src={poster.image}
                     alt={poster.title || title}
                     fill
                     priority={posterIndex === 0}
                     sizes="(min-width: 1600px) 75vw, (min-width: 1024px) 90vw, 100vw"
                     className="object-cover"
                   />
                 ) : (
                   <div className="flex h-full items-center justify-center border border-dashed border-[var(--color-border)] bg-white/70 text-xs text-[var(--color-text-tertiary)]">
                     暂无图片
                   </div>
                 )}
               </div>
             </figure>
           ))}
         </div>
       </div>
     </section>
   );
 }

 interface Poster {
   title: string;
   image: string;
 }

 function buildPosterList(section: InventorySectionConfig): Poster[] {
   const posters: Poster[] = [];
   const mainPoster = section.mainPoster;
   if (mainPoster?.image) {
     const image = sanitizeImageSrc(mainPoster.image);
     if (image) {
       posters.push({
         title: resolveText(mainPoster.title),
         image,
       });
     }
   }
   for (const item of section.gallery ?? []) {
     if (!item?.image) continue;
     const image = sanitizeImageSrc(item.image);
     if (!image) continue;
     posters.push({
       title: resolveText(item.title),
       image,
     });
   }
   return posters;
 }

 function resolveText(value: MaybeLocalized, fallback = ""): string {
   if (!value) return fallback;
   if (typeof value === "string") return value;
   const result = t(value);
   return result || fallback;
 }