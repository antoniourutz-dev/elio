import { dailyPillsTable, isSupabaseConfigured, supabase } from '../supabaseClient';

function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

export type PillTone = 'gramatika' | 'ortografia' | 'hiztegia' | 'puntuazioa' | 'historia';
export type PillCategory = string;

export interface DailyPill {
  id: string;
  category: PillCategory;
  tone: PillTone;
  title: string;
  body: string;
  example?: string;
}

interface DailyPillSeed {
  id: string;
  category: PillCategory;
  title: string;
  body: string;
  example?: string;
}

type DailyPillRow = Record<string, unknown>;

const FALLBACK_PILLS: DailyPillSeed[] = [
  {
    id: 'p01',
    category: 'gramatika',
    title: 'Kasu ergatiboa: NORK',
    body: 'Ekintza bat egiten duenak NORK kasua hartzen du. Singularrean "-ek" atzizkia erabiltzen da, eta pluralean ere bai.',
    example: '"Amak ogia erosi du." — Ama + -k = egilea.',
  },
  {
    id: 'p02',
    category: 'gramatika',
    title: 'Kasu absolutiboa: NOR',
    body: 'Ekintza jasotzen duenak edo izaera adierazten duenak NOR kasua hartzen du. Marka berezirik gabe doa.',
    example: '"Ogia freskoa da." — Ogia NOR kasuan dago.',
  },
  {
    id: 'p03',
    category: 'gramatika',
    title: 'Kasu datiboa: NORI',
    body: 'Zerbait nori ematen zaion adierazteko NORI kasua erabiltzen da. Singularrean "-i" edo "-ri" atzizkia hartzen du.',
    example: '"Amari oparia eman diot." — Ama + -ri = hartzailea.',
  },
  {
    id: 'p04',
    category: 'gramatika',
    title: 'Aditz laguntzaileak: IZAN eta UKAN',
    body: 'Euskaraz bi aditz laguntzaile nagusi daude. IZAN iragangaitzetan erabiltzen da (etorri naiz), eta UKAN iragankorrak dituzteetan (ikusi dut).',
    example: '"Ni etorri naiz." / "Nik liburua ikusi dut."',
  },
  {
    id: 'p05',
    category: 'gramatika',
    title: 'Hitz ordena: SOV',
    body: 'Euskara SOV hizkuntza da: Subjektua – Objektua – Aditza. Aditza normalean perpausaren bukaeran doa, ez erdian.',
    example: '"Neskak (S) ogia (O) erosi du (V)."',
  },
  {
    id: 'p06',
    category: 'gramatika',
    title: 'Plurala: -ak / -ek',
    body: 'Izenak pluralean jartzeko "-ak" gehitzen zaio (NOR kasuan). NORK kasuan "-ek" erabiltzen da pluralean.',
    example: 'Gizon → gizonak (NOR) / gizonek (NORK).',
  },
  {
    id: 'p07',
    category: 'gramatika',
    title: 'Determinatzaile mugagabea: BAT',
    body: '"Bat" artikulu mugagabea da, gaztelaniazko "un/una" bezala. Izenaren ondoren jartzen da, ez aurretik.',
    example: '"Etxe bat ikusi dut." (eta ez "bat etxe").',
  },
  {
    id: 'p08',
    category: 'gramatika',
    title: 'Artikulu mugatu singularra: -A',
    body: '"-a" atzizkia izen mugatua egiteko erabiltzen da. Izenak bokalez bukatzen badira, "-a" gehitzen zaio zuzenean.',
    example: 'Etxe → etxea. Gizon → gizona.',
  },
  {
    id: 'p09',
    category: 'gramatika',
    title: 'Aditz gerundioa: -TZEN',
    body: '"-tzen" atzizkia jarduera bat oraindik gertatzen ari dela adierazteko erabiltzen da (aspektu inperfektua).',
    example: '"Liburua irakurtzen ari naiz." — irakurri + -tzen.',
  },
  {
    id: 'p10',
    category: 'gramatika',
    title: 'Aditzaren aspektu burutua: -TU / -I',
    body: 'Aspektu burutuak ekintza amaitua adierazten du. "-tu" edo "-i" atzizkiekin eratzen da.',
    example: 'Irakurri → "Liburua irakurri dut."',
  },
  {
    id: 'p11',
    category: 'ortografia',
    title: 'H letra euskaraz',
    body: '"H" letra euskaraz isila da batuan, baina idazkeran mantentzen da. "H"-dun hitzak ikasi behar dira banaka.',
    example: 'Hitz, haur, herri, hemen, hori...',
  },
  {
    id: 'p12',
    category: 'ortografia',
    title: 'TT eta DD letrak',
    body: '"tt" eta "dd" palatalizazioa adierazten dute. Afektibitatearekin lotuta daude eta txikitasuna ere adieraz dezakete.',
    example: 'Atta (aita, affektiboki), muttil (mutila txikia).',
  },
  {
    id: 'p13',
    category: 'ortografia',
    title: 'TX, TZ eta TS soinuak',
    body: 'Euskaraz hiru txistukari afrikatu daude: "tx" (txakur), "tz" (bitza), "ts" (hatsa). Bakoitza soinu desberdina da.',
    example: 'Txakur / itzuli / hatsa.',
  },
  {
    id: 'p14',
    category: 'ortografia',
    title: 'RR letra bikoitza',
    body: '"rr" beti hitz barruan doa, inoiz ez hitz hasieran. Hitz hasieran "r" bakarra nahikoa da.',
    example: 'Herre, barre, gorri — baina: ren, ondo (ez "rren").',
  },
  {
    id: 'p15',
    category: 'ortografia',
    title: 'Letra larria izen propioetan',
    body: 'Pertsona izenek, leku izenek eta erakunde izenek letra larria hartzen dute lehen letran.',
    example: 'Bilbo, Ane, Euskal Herria, Euskaltzaindia.',
  },
  {
    id: 'p16',
    category: 'puntuazioa',
    title: 'Koma eta "eta" juntagailua',
    body: 'Normalean ez da koma jartzen "eta" juntagailuaren aurretik, bi perpaus luzeak batzen dituenean salbu.',
    example: '"Janaria erosi dut eta sukaldean utzi dut."',
  },
  {
    id: 'p17',
    category: 'puntuazioa',
    title: 'Galdera marka euskaraz',
    body: 'Euskaraz galdera marka bakarra jartzen da perpausaren amaieran (?). Ez dago galdera marka irekitzailerik (¿) gaztelaniaz ez bezala.',
    example: '"Nola zaude?" — eta ez "¿Nola zaude?"',
  },
  {
    id: 'p18',
    category: 'puntuazioa',
    title: 'Puntua eta letra larria',
    body: 'Puntu baten ondoren datorren hitzak letra larria hartu behar du beti, esaldiaren hasiera delako.',
    example: '"Etxera joan naiz. Bihar itzuliko naiz."',
  },
  {
    id: 'p19',
    category: 'puntuazioa',
    title: 'Koma zerrenda batean',
    body: 'Zerrenda bateko elementuak komaz bereizten dira. Azken elementua "eta" edo "edo"-rekin lotzen da, eta ez da koma jartzen aurretik.',
    example: '"Sagarrak, udareak, madariak eta gerezioak."',
  },
  {
    id: 'p20',
    category: 'hiztegia',
    title: 'Sinonimoak eta esanahia',
    body: 'Sinonimoak antzeko esanahia duten hitzak dira. Baina ez dira inoiz berdinak erabat: erregistroa, testuingurua eta tonua aldatzen dute.',
    example: 'Hil = zendu = itzali (baina ez dira berdinak erregistroz).',
  },
  {
    id: 'p21',
    category: 'hiztegia',
    title: 'Maileguak euskaraz',
    body: 'Euskaraz hitz asko hartu dira beste hizkuntzetatik, batez ere latina eta gaztelaniatik. Batzuk asko aldatu dira, beste batzuk gutxi.',
    example: 'Denda (tienda), liburu (libro), eliza (ecclesia).',
  },
  {
    id: 'p22',
    category: 'hiztegia',
    title: 'Hitz elkartuak',
    body: 'Euskaraz hitz berriak sortzeko bi hitz elkartzen dira. Osagaiak izenak, adjektiboak edo aditzak izan daitezke.',
    example: 'Sagar + ondo = sagarrondo (manzano). Buru + handi = buruhandi.',
  },
  {
    id: 'p23',
    category: 'hiztegia',
    title: 'Txikigarriak: -txo eta -ño',
    body: '"-txo" edo "-ño" atzizkiak gehitzean, hitzari txikitasun edo afektibitate kutsua ematen zaio.',
    example: 'Etxe → etxetxo. Neskato → neskatotxo.',
  },
  {
    id: 'p24',
    category: 'historia',
    title: 'Euskara hizkuntza isolatua da',
    body: 'Euskarak ez du ahaidetasunik mundu osoko beste ezein hizkuntzarekin. Hizkuntza isolatua deitzen zaio, familia linguistiko bakar-bakarrean baitago.',
    example: 'Ez da indoeuropar familia, ez semitiko, ez turkiko...',
  },
  {
    id: 'p25',
    category: 'historia',
    title: 'Euskalkiak',
    body: 'Euskararen sei euskalki nagusi daude: bizkaiera, gipuzkera, lapurtera, nafar-lapurtera, zuberera eta nafarrera. Batua 1968an sortu zen.',
    example: 'Gizona (batua) = Gizona (gip.) = Gizona (biz.) = Gizona (lap.)',
  },
  {
    id: 'p26',
    category: 'historia',
    title: 'Lehen idatzizko testua',
    body: 'Euskarazko lehen idatzizko testua "Reja de San Millán" dokumentuan dago (1025. urtea inguruan), leku izen zerrendetan.',
    example: '"Hauzo" eta beste leku izen batzuk agertzen dira.',
  },
  {
    id: 'p27',
    category: 'gramatika',
    title: 'Ezezkoa: EZ partikula',
    body: '"Ez" partikulak aditzaren aurrean joanez ezezko esaldiak osatzen dira. Normalean aditzari itsatsita idazten da.',
    example: '"Ez dut ulertzen." / "Ez naiz etorri."',
  },
  {
    id: 'p28',
    category: 'gramatika',
    title: 'Posposizioeak',
    body: 'Euskaraz preposizioak ez daude; haien ordez posposizioak erabiltzen dira, izen ondoren jarrita.',
    example: 'Etxean (etxe+an), mendira (mendi+ra), eskolatik (eskola+tik).',
  },
  {
    id: 'p29',
    category: 'gramatika',
    title: 'Aditz potentziala: -DEZAKE',
    body: 'Aditz potentziala ahalmena edo aukera adierazteko erabiltzen da. "-dezake" / "-daiteke" atzizkiekin eratzen da.',
    example: '"Egin dezaket" = Egin ahal dut. "Etor daiteke" = Etor ahal da.',
  },
  {
    id: 'p30',
    category: 'ortografia',
    title: 'Z eta S bereizpena',
    body: '"Z" eta "S" soinuak desberdintzen dira euskaran, gaztelaniaz ez bezala. "Z" hobikaria da, "S" apikoalbeolaria.',
    example: 'Haize (viento) ≠ haise (ez da hitz hori). Zuri / suri ez dira gauza bera.',
  },
];

const normalizeCategoryLabel = (value: unknown): string => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return 'Gramatika';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

const resolvePillTone = (category: string): PillTone => {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes('puntu')) return 'puntuazioa';
  if (normalized.includes('ortogra')) return 'ortografia';
  if (normalized.includes('hizte')) return 'hiztegia';
  if (normalized.includes('histori')) return 'historia';
  return 'gramatika';
};

const toDailyPill = (pill: DailyPillSeed): DailyPill => ({
  ...pill,
  tone: resolvePillTone(pill.category),
});

const buildExample = (firstExample: unknown, secondExample: unknown): string | undefined => {
  const first = String(firstExample ?? '').trim();
  const second = String(secondExample ?? '').trim();

  if (first && second) return `${first} — ${second}`;
  return first || second || undefined;
};

const normalizePillRow = (row: DailyPillRow): DailyPill | null => {
  const title = String(row.titulo ?? '').trim();
  const body = String(row.explicacion ?? '').trim();

  if (!title || !body) return null;

  return {
    id: String(row.id ?? title).trim() || title,
    category: normalizeCategoryLabel(row.categoria),
    tone: resolvePillTone(String(row.categoria ?? '')),
    title,
    body,
    example: buildExample(row.ejemplo_1, row.ejemplo_2),
  };
};

let cachedRemotePills: DailyPill[] | null = null;

const loadRemotePills = async (): Promise<DailyPill[] | null> => {
  if (cachedRemotePills) return cachedRemotePills;
  if (!supabase || !isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from(dailyPillsTable)
    .select('*')
    .eq('activo', true)
    .eq('idioma', 'eu')
    .order('id', { ascending: true });

  if (error) return null;

  const pills = (data ?? [])
    .map((row) => normalizePillRow(row as DailyPillRow))
    .filter((pill): pill is DailyPill => pill !== null);

  if (pills.length === 0) return null;

  cachedRemotePills = pills;
  return pills;
};

const selectDailyPill = (dayKey: string, pills: DailyPill[]): DailyPill => {
  const hash = fnv1a(dayKey + '-pill');
  return pills[hash % pills.length];
};

export function getFallbackDailyPill(dayKey: string): DailyPill {
  return selectDailyPill(dayKey, FALLBACK_PILLS.map(toDailyPill));
}

export async function loadDailyPill(dayKey: string): Promise<DailyPill> {
  const remotePills = await loadRemotePills();
  return selectDailyPill(dayKey, remotePills ?? FALLBACK_PILLS.map(toDailyPill));
}

export const PILL_CATEGORY_LABELS: Record<PillTone, string> = {
  gramatika: 'Gramatika',
  ortografia: 'Ortografia',
  hiztegia: 'Hiztegia',
  puntuazioa: 'Puntuazioa',
  historia: 'Historia',
};
