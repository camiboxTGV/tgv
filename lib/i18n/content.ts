import type { PortfolioCategory, PortfolioItem } from "@/lib/content/portfolio"
import type { Service } from "@/lib/content/services"
import type { Technique } from "@/lib/content/techniques"
import type { Locale } from "@/lib/i18n/config"

type ServiceCopy = Pick<Service, "title" | "summary" | "lead" | "useCases">
type TechniqueCopy = Pick<Technique, "title" | "bestFor" | "whatItIs" | "applications">
type PortfolioCopy = Pick<PortfolioItem, "title" | "summary" | "imageAlt">

const SERVICE_RO: Record<string, ServiceCopy> = {
  "technical-consultancy-product-design": {
    title: "Consultanță tehnică și design de produs",
    summary:
      "Transformăm concepte îndrăznețe în produse fizice pregătite pentru producție, folosind două decenii de experiență tehnică.",
    lead:
      "Analizăm fezabilitatea, alegem materialele potrivite și optimizăm fluxurile pentru o execuție impecabilă și eficientă.",
    useCases: [
      "Selecția materialelor, proiectare corectă și structură rezistentă",
      "Dezvoltare la comandă pentru obiecte 3D, ambalaje și display-uri POSM",
      "Optimizarea fluxului de producție pentru volume medii și mari",
      "Planificare tehnică la cheie pentru proiecte atipice",
    ],
  },
  "graphic-design-prepress": {
    title: "Design grafic și prepress (DTP)",
    summary:
      "Facem legătura dintre grafica digitală și suportul fizic, cu precizie până la ultimul detaliu.",
    lead:
      "Designul, verificarea prepress, optimizarea vectorială și calibrarea culorilor păstrează identitatea vizuală consecventă pe orice material.",
    useCases: [
      "Optimizare vectorială pentru gravură laser și debitare CNC curate",
      "Verificare prepress, validarea fișierelor și pregătirea machetelor",
      "Management de culoare și calibrare cromatică pe materiale diferite",
      "Adaptarea identității vizuale pentru producție complexă și ambalaje",
    ],
  },
  "custom-production-integrated-branding": {
    title: "Producție custom și branding integrat",
    summary:
      "Nouă tehnici principale de producție se combină pentru a crea ceea ce nu există în cataloagele standard.",
    lead:
      "Construim de la zero în lemn, acril, metal și materiale compozite, cu personalizare premium pentru cadouri, trofee și semnalistică.",
    useCases: [
      "Display-uri de retail, semnalistică și elemente POSM create în forma brandului",
      "Structuri de ambalaj în forme și formate nestandard",
      "Activări de eveniment, recuzită și instalații speciale de brand",
      "Cadouri corporate premium, premii aniversare și trofee în ediție limitată",
      "Prototipuri funcționale și serii mici sau medii",
    ],
  },
  "production-printing-fine-bookbinding": {
    title: "Tipar de producție și legătorie fină",
    summary:
      "Combinăm tiparul de nivel industrial cu finisaje artizanale pentru materiale editoriale și corporate cu impact.",
    lead:
      "Tipar digital de înaltă rezoluție pentru tiraje mici și medii, completat de finisaje premium realizate integral în atelier.",
    useCases: [
      "Cărți de vizită, papetărie, broșuri și cataloage",
      "Timbru sec, emboss și aplicare tradițională de folie la cald",
      "Mape cu folio, monograme metalice și seturi premium de prezentare",
      "Fălțuire, capsare, broșare și realizarea cutiilor de lux la comandă",
    ],
  },
}

const TECHNIQUE_RO: Record<string, TechniqueCopy> = {
  "co2-laser-engraving-cutting": {
    title: "Gravură și debitare laser CO2",
    bestFor: "Lemn, acril, piele, sticlă, plută și textile",
    whatItIs: "Tehnologie de personalizare și debitare de mare precizie cu fascicul laser termic.",
    applications: "Ideală pentru materiale nemetalice, cu detalii foarte fine și muchii curate.",
  },
  "fiber-laser-engraving": {
    title: "Gravură laser cu fibră",
    bestFor: "Metale, plastic tehnic, instrumente și bijuterii",
    whatItIs: "Tehnologie laser de ultimă generație, specializată pentru suprafețe dure.",
    applications: "Marcare permanentă și rapidă pe oțel, aluminiu, alamă, argint și plastic tehnic.",
  },
  "uv-printing-direct-to-object": {
    title: "Print UV direct pe obiect",
    bestFor: "Print full-color, de înaltă rezoluție, pe aproape orice suprafață",
    whatItIs: "Tehnologie digitală full-color cu uscare instantanee sub lumină ultravioletă.",
    applications: "Personalizare foto direct pe plastic, metal, lemn, sticlă și piele, cu rezistență excelentă la zgâriere.",
  },
  "debossing-hot-foil-stamping": {
    title: "Timbru sec și folio la cald",
    bestFor: "Piele, cartoane premium, ambalaje și piese de prezentare",
    whatItIs: "Tehnici premium tradiționale care folosesc căldură și presiune printr-o matriță metalică.",
    applications: "Timbrul sec creează un relief discret, iar folio adaugă finisaje metalice aurii, argintii sau cupru.",
  },
  "3d-printing": {
    title: "Printare 3D",
    bestFor: "Prototipuri rapide, piese custom, machete și obiecte complexe",
    whatItIs: "Tehnologie de fabricație aditivă care construiește obiectul strat cu strat dintr-un model digital.",
    applications: "Prototipare, piese tehnice și obiecte decorative complexe, imposibil de realizat prin metode tradiționale.",
  },
  "tangential-knife-cutting": {
    title: "Debitare cu cuțit tangențial pe masă digitală",
    bestFor: "Carton, mucava, spumă, folie magnetică și materiale pentru garnituri",
    whatItIs: "Debitare digitală cu unealtă pe masă CNC, realizată fără aport de căldură.",
    applications: "Alternativă curată la laser pentru materialele care se pot arde sau topi, fără fum sau reziduuri.",
  },
  "production-digital-printing": {
    title: "Tipar digital de producție",
    bestFor: "Papetărie premium, cataloage, materiale promoționale și ambalaje în tiraj scurt",
    whatItIs: "Tipar industrial rapid, pe coli, cu tehnologie electrofotografică de înaltă rezoluție.",
    applications: "Tiraje mici și medii de cărți de vizită, broșuri, flyere, cataloage și ambalaje, cu culoare calibrată.",
  },
  "bookbinding-print-finishing": {
    title: "Legătorie și finisare tipografică",
    bestFor: "Publicații legate, materiale tipărite finisate și cutii de prezentare",
    whatItIs: "Procesul mecanic și manual prin care materialele tipărite sunt transformate în produse finite.",
    applications: "Fălțuire, capsare, broșare, legătorie decorativă și cutii custom rezistente.",
  },
  "mixed-manual-techniques": {
    title: "Tehnici manuale mixte și know-how — 20 de ani de experiență",
    bestFor: "Lucrări complexe și neconvenționale care combină mai multe metode",
    whatItIs: "Semnătura atelierului nostru: combinarea creativă a tehnologiilor și tehnicilor manuale.",
    applications: "Asamblări fine, finisaje artizanale și soluții tehnice ingenioase pentru proiecte care nu se încadrează într-o singură categorie.",
  },
}

export const PORTFOLIO_LABELS_RO: Record<PortfolioCategory, string> = {
  "signage-display": "Semnalistică și display",
  "luxury-packaging-out-of-box": "Ambalaje premium și experiențe unboxing",
  "brand-assets-premium-print": "Materiale de brand și print premium",
  "corporate-identity-gifts": "Identitate corporate și cadouri",
  "special-projects-prototyping": "Proiecte speciale și prototipare",
}

export const PORTFOLIO_DESCRIPTIONS_RO: Record<PortfolioCategory, string> = {
  "signage-display": "Branding de birou, interioare retail, litere volumetrice, logo-uri decupate CNC sau laser, sisteme de orientare și elemente arhitecturale de brand.",
  "luxury-packaging-out-of-box": "Cutii rigide cu închidere magnetică, tăvi de prezentare, manșoane custom și structuri premium finisate cu timbru sec sau folio.",
  "brand-assets-premium-print": "Manuale de brand, cataloage, materiale legate manual, meniuri de lux și tipar pe hârtii creative fine.",
  "corporate-identity-gifts": "Kituri de onboarding, cadouri executive și obiecte promoționale premium cu gravură pe metal sau timbru sec pe piele.",
  "special-projects-prototyping": "Instalații unicat, machete, piese printate 3D cu finisaje manuale și proiecte structurale construite pe două decenii de experiență.",
}

const PORTFOLIO_RO: Record<string, PortfolioCopy> = {
  "bespoke-retail-event-displays": { title: "Display-uri custom pentru retail și evenimente", summary: "Litere volumetrice și elemente din acril proiectate, debitate și asamblate pentru spații de brand.", imageAlt: "Litere volumetrice custom din acril tăiat cu laser" },
  "high-end-gift-recognition-kits": { title: "Kituri premium de cadou și recunoaștere", summary: "Premiu realizat cu precizie din acril transparent și colorat, cu gravură directă.", imageAlt: "Premiu corporate custom din acril roșu și transparent" },
  "artcraft-project": { title: "Proiect Artcraft", summary: "Obiect de birou ludic, construit prin debitare digitală, print și asamblare manuală atentă.", imageAlt: "Pix și suport în formă de floare, realizate la comandă" },
  "bespoke-snow-globe": { title: "Glob de zăpadă arhitectural custom", summary: "Un mediu de brand în miniatură, dezvoltat ca un cadou corporate sezonier memorabil.", imageAlt: "Glob de zăpadă custom cu o clădire de brand în miniatură" },
  "premium-passport-cover": { title: "Set premium pentru pașaport", summary: "Copertă tactilă cu tipografie precisă, detalii aurii și insert coordonat.", imageAlt: "Copertă verde premium de pașaport cu litere aurii" },
  "cinema-gift-kit": { title: "Kit de prezentare cu tematică de cinema", summary: "Obiecte cinematografice debitate la comandă și asamblate într-un concept experiențial de cadou.", imageAlt: "Obiecte pentru cadou corporate cu tematică de cinema" },
  "camera-prototype": { title: "Prototip interactiv de cameră", summary: "Structură funcțională unicat, produsă din panouri debitate digital și mecanisme asamblate manual.", imageAlt: "Prototip custom de cameră, de culoare neagră" },
  "luxury-game-packaging": { title: "Ambalaj structural interactiv", summary: "Cutie custom cu separatoare, componente interactive și o experiență de unboxing complet personalizată.", imageAlt: "Ambalaj custom din carton, cu inserții potrivite" },
  "premium-brand-book": { title: "Sistem premium de brand book", summary: "Materiale tipărite cu control cromatic strict, realizate ca un set de prezentare coordonat.", imageAlt: "Brand book-uri premium tipărite cu degradeuri de culoare" },
  "3d-printed-prototype": { title: "Prototip funcțional printat 3D", summary: "Obiect complex prototipat rapid, rafinat și finisat pentru prezentare.", imageAlt: "Prototip portocaliu printat 3D" },
  "gold-dimensional-lettering": { title: "Litere identitare volumetrice aurii", summary: "Litere debitate cu precizie și finisaj auriu lucios pentru un interior premium.", imageAlt: "Logo și litere volumetrice aurii" },
  "premium-packaging-detail": { title: "Ambalaj de prezentare debitat cu precizie", summary: "Materiale premium stratificate și o fereastră realizată la comandă pentru un moment distinct de unboxing.", imageAlt: "Ambalaj custom mov cu fereastră decupată precis" },
  "film-slate-detail": { title: "Detalii de producție pentru identitate cinematografică", summary: "Un studiu de print rezistent, linii fine și detalii de producție atent aliniate.", imageAlt: "Clachetă de film tipărită cu detalii precise" },
}

export function localizeService(service: Service, locale: Locale): Service {
  return locale === "ro" && SERVICE_RO[service.slug]
    ? { ...service, ...SERVICE_RO[service.slug] }
    : service
}

export function localizeTechnique(technique: Technique, locale: Locale): Technique {
  return locale === "ro" && TECHNIQUE_RO[technique.slug]
    ? { ...technique, ...TECHNIQUE_RO[technique.slug] }
    : technique
}

export function localizePortfolioItem(item: PortfolioItem, locale: Locale): PortfolioItem {
  return locale === "ro" && PORTFOLIO_RO[item.slug]
    ? { ...item, ...PORTFOLIO_RO[item.slug] }
    : item
}
