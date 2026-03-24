import { memo, startTransition, useDeferredValue, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Accessibility,
  Apple,
  ArrowLeft,
  CloudMoon,
  Compass,
  Drama,
  Factory,
  HeartHandshake,
  House,
  KeyRound,
  Laptop,
  LibraryBig,
  Newspaper,
  Plane,
  Scale,
  Search,
  ShieldAlert,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TramFront,
  Trophy,
  VenusAndMars,
  Waves,
} from 'lucide-react';
import clsx from 'clsx';
import { useVocabularyTopics } from '../hooks/useVocabularyTopics';
import type { VocabularyTopic } from '../lib/vocabulary';

interface VocabularyViewProps {
  isActive: boolean;
}

interface TopicVisual {
  icon: LucideIcon;
  glowClassName: string;
  shellClassName: string;
  badgeClassName: string;
}

const DEFAULT_TOPIC_VISUAL: TopicVisual = {
  icon: LibraryBig,
  glowClassName: 'from-[#eedb8b] via-[#e4bf57] to-[#d79a2c]',
  shellClassName: 'border-[rgba(215,173,72,0.26)] bg-[linear-gradient(135deg,rgba(255,251,239,0.98),rgba(255,245,210,0.96))]',
  badgeClassName: 'bg-[rgba(255,250,234,0.76)] text-[#b97810]',
};

const TOPIC_VISUALS: Record<string, TopicVisual> = {
  adoptzioa: {
    icon: HeartHandshake,
    glowClassName: 'from-[#f1af9c] via-[#e78d88] to-[#c96979]',
    shellClassName: 'border-[rgba(222,144,133,0.28)] bg-[linear-gradient(135deg,rgba(255,246,243,0.98),rgba(255,231,226,0.96))]',
    badgeClassName: 'bg-[rgba(255,241,237,0.8)] text-[#b85b55]',
  },
  'aniztasun funtzionala': {
    icon: Accessibility,
    glowClassName: 'from-[#75cdd0] via-[#59b8cc] to-[#4d94c8]',
    shellClassName: 'border-[rgba(103,190,205,0.28)] bg-[linear-gradient(135deg,rgba(243,253,254,0.98),rgba(226,246,252,0.96))]',
    badgeClassName: 'bg-[rgba(232,247,251,0.82)] text-[#2d7fa2]',
  },
  apustua: {
    icon: Trophy,
    glowClassName: 'from-[#f4d46b] via-[#eab847] to-[#d08f2b]',
    shellClassName: 'border-[rgba(222,181,79,0.28)] bg-[linear-gradient(135deg,rgba(255,251,236,0.98),rgba(253,243,211,0.96))]',
    badgeClassName: 'bg-[rgba(255,248,225,0.82)] text-[#ad7b12]',
  },
  arrazakeria: {
    icon: Scale,
    glowClassName: 'from-[#8f95d8] via-[#7f87cf] to-[#686cb6]',
    shellClassName: 'border-[rgba(136,141,210,0.28)] bg-[linear-gradient(135deg,rgba(245,246,255,0.98),rgba(232,235,252,0.96))]',
    badgeClassName: 'bg-[rgba(237,239,255,0.82)] text-[#5a60a8]',
  },
  bakardadea: {
    icon: CloudMoon,
    glowClassName: 'from-[#8fa7df] via-[#7e94d1] to-[#6678b4]',
    shellClassName: 'border-[rgba(136,155,215,0.28)] bg-[linear-gradient(135deg,rgba(246,248,255,0.98),rgba(231,238,252,0.96))]',
    badgeClassName: 'bg-[rgba(239,243,255,0.82)] text-[#5d6ea8]',
  },
  bullyinga: {
    icon: ShieldAlert,
    glowClassName: 'from-[#f39c87] via-[#ea7a75] to-[#d05863]',
    shellClassName: 'border-[rgba(228,127,116,0.28)] bg-[linear-gradient(135deg,rgba(255,245,243,0.98),rgba(255,232,229,0.96))]',
    badgeClassName: 'bg-[rgba(255,239,236,0.82)] text-[#ba4f54]',
  },
  'elikadura osasungarria': {
    icon: Apple,
    glowClassName: 'from-[#90d481] via-[#63c26d] to-[#3ea773]',
    shellClassName: 'border-[rgba(111,194,122,0.28)] bg-[linear-gradient(135deg,rgba(245,254,242,0.98),rgba(229,249,229,0.96))]',
    badgeClassName: 'bg-[rgba(237,251,236,0.82)] text-[#2f8d58]',
  },
  emantzipazioa: {
    icon: KeyRound,
    glowClassName: 'from-[#74d0bc] via-[#59bfab] to-[#469a98]',
    shellClassName: 'border-[rgba(99,195,177,0.28)] bg-[linear-gradient(135deg,rgba(242,254,251,0.98),rgba(223,248,244,0.96))]',
    badgeClassName: 'bg-[rgba(232,250,245,0.82)] text-[#2e8d83]',
  },
  'erosketa online': {
    icon: ShoppingCart,
    glowClassName: 'from-[#8fbef3] via-[#70a7ea] to-[#5d88d0]',
    shellClassName: 'border-[rgba(122,171,234,0.28)] bg-[linear-gradient(135deg,rgba(245,250,255,0.98),rgba(229,241,254,0.96))]',
    badgeClassName: 'bg-[rgba(236,244,255,0.82)] text-[#406fb7]',
  },
  etxebizitza: {
    icon: House,
    glowClassName: 'from-[#f3b774] via-[#e59b56] to-[#cb7a48]',
    shellClassName: 'border-[rgba(229,161,87,0.28)] bg-[linear-gradient(135deg,rgba(255,248,241,0.98),rgba(253,235,220,0.96))]',
    badgeClassName: 'bg-[rgba(255,241,230,0.82)] text-[#b56f2c]',
  },
  'garraio publikoa': {
    icon: TramFront,
    glowClassName: 'from-[#6bc8c9] via-[#57b0c9] to-[#5489c9]',
    shellClassName: 'border-[rgba(102,186,203,0.28)] bg-[linear-gradient(135deg,rgba(243,253,255,0.98),rgba(226,243,252,0.96))]',
    badgeClassName: 'bg-[rgba(233,248,251,0.82)] text-[#2d7ea0]',
  },
  'genero arauak': {
    icon: VenusAndMars,
    glowClassName: 'from-[#ec9bc5] via-[#da88b7] to-[#b16eb1]',
    shellClassName: 'border-[rgba(220,142,190,0.28)] bg-[linear-gradient(135deg,rgba(255,246,251,0.98),rgba(248,230,243,0.96))]',
    badgeClassName: 'bg-[rgba(251,237,246,0.82)] text-[#a04f8b]',
  },
  hedabideak: {
    icon: Newspaper,
    glowClassName: 'from-[#89d0df] via-[#62b9d4] to-[#537dc3]',
    shellClassName: 'border-[rgba(109,192,213,0.28)] bg-[linear-gradient(135deg,rgba(243,252,255,0.98),rgba(226,240,252,0.96))]',
    badgeClassName: 'bg-[rgba(234,246,255,0.82)] text-[#386d9e]',
  },
  'itxurakeria hutsa': {
    icon: Drama,
    glowClassName: 'from-[#bba1eb] via-[#a687db] to-[#7d72c6]',
    shellClassName: 'border-[rgba(168,139,220,0.28)] bg-[linear-gradient(135deg,rgba(248,245,255,0.98),rgba(237,233,252,0.96))]',
    badgeClassName: 'bg-[rgba(242,238,255,0.82)] text-[#6c5ca7]',
  },
  kutsadura: {
    icon: Factory,
    glowClassName: 'from-[#7fb2c0] via-[#6699b0] to-[#576c94]',
    shellClassName: 'border-[rgba(116,160,183,0.28)] bg-[linear-gradient(135deg,rgba(244,249,252,0.98),rgba(231,239,247,0.96))]',
    badgeClassName: 'bg-[rgba(235,243,249,0.82)] text-[#476789]',
  },
  nudismoa: {
    icon: Waves,
    glowClassName: 'from-[#74d5d0] via-[#56bfd0] to-[#4d95c0]',
    shellClassName: 'border-[rgba(93,193,206,0.28)] bg-[linear-gradient(135deg,rgba(243,254,255,0.98),rgba(226,244,251,0.96))]',
    badgeClassName: 'bg-[rgba(232,249,250,0.82)] text-[#2e7d96]',
  },
  'telefono adimendunak': {
    icon: Smartphone,
    glowClassName: 'from-[#74b6f3] via-[#6095e5] to-[#6572cc]',
    shellClassName: 'border-[rgba(103,156,232,0.28)] bg-[linear-gradient(135deg,rgba(244,249,255,0.98),rgba(231,238,253,0.96))]',
    badgeClassName: 'bg-[rgba(235,242,255,0.82)] text-[#4966b8]',
  },
  telelana: {
    icon: Laptop,
    glowClassName: 'from-[#74d8bd] via-[#63c2c0] to-[#5a95cc]',
    shellClassName: 'border-[rgba(100,198,192,0.28)] bg-[linear-gradient(135deg,rgba(243,255,252,0.98),rgba(228,245,253,0.96))]',
    badgeClassName: 'bg-[rgba(233,251,246,0.82)] text-[#2f7e93]',
  },
  turismoa: {
    icon: Plane,
    glowClassName: 'from-[#88d0f0] via-[#63b9e2] to-[#4b8fca]',
    shellClassName: 'border-[rgba(103,191,228,0.28)] bg-[linear-gradient(135deg,rgba(243,252,255,0.98),rgba(227,244,253,0.96))]',
    badgeClassName: 'bg-[rgba(233,248,255,0.82)] text-[#2e7ea8]',
  },
  'zaharkitze programatua': {
    icon: Compass,
    glowClassName: 'from-[#a3c970] via-[#88b86f] to-[#5d9580]',
    shellClassName: 'border-[rgba(140,188,116,0.28)] bg-[linear-gradient(135deg,rgba(248,253,241,0.98),rgba(232,245,227,0.96))]',
    badgeClassName: 'bg-[rgba(239,250,233,0.82)] text-[#4f7d49]',
  },
};

const normalizeTopicKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('eu');

const getTopicVisual = (topicTitleOrSlug: string): TopicVisual =>
  TOPIC_VISUALS[normalizeTopicKey(topicTitleOrSlug)] ?? DEFAULT_TOPIC_VISUAL;

const LOADING_TOPIC_PLACEHOLDERS = [
  'adoptzioa',
  'aniztasun funtzionala',
  'apustua',
  'arrazakeria',
  'bakardadea',
  'bullyinga',
];

const filterTopic = (topic: VocabularyTopic, query: string): boolean => {
  if (!query) return true;

  if (normalizeTopicKey(topic.title).includes(query) || normalizeTopicKey(topic.slug).includes(query)) {
    return true;
  }

  return topic.categories.some(
    (category) =>
      normalizeTopicKey(category.label).includes(query)
      || category.items.some(
        (item) =>
          normalizeTopicKey(item.text).includes(query) || normalizeTopicKey(item.normalizedText).includes(query)
      )
  );
};

export const VocabularyView = memo(function VocabularyView({ isActive }: VocabularyViewProps) {
  const { isLoading, topics, message, isReady, refresh } = useVocabularyTopics(isActive);
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const deferredSearch = useDeferredValue(searchText);
  const normalizedQuery = normalizeTopicKey(deferredSearch);

  useEffect(() => {
    if (!selectedTopicSlug) return;
    if (topics.some((topic) => topic.slug === selectedTopicSlug)) return;
    setSelectedTopicSlug(null);
  }, [selectedTopicSlug, topics]);

  const filteredTopics = topics.filter((topic) => filterTopic(topic, normalizedQuery));
  const selectedTopic = topics.find((topic) => topic.slug === selectedTopicSlug) ?? null;

  return (
    <section className="grid gap-4 rounded-[34px] border border-[rgba(216,224,231,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,249,0.95))] p-6 shadow-[var(--shadow-card)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(270px,0.92fr)] lg:items-start">
        <div className="grid gap-2">
          <p className="m-0 text-[0.74rem] font-extrabold uppercase tracking-[0.18em] text-[#d49a2d]">Hiztegia</p>
          <h2 className="m-0 max-w-[10ch] font-display text-[clamp(1.8rem,4vw,2.55rem)] leading-[0.92] tracking-[-0.06em] text-[var(--text)]">
            Gai bidezko hiztegia
          </h2>
          <p className="m-0 max-w-[28rem] text-[0.9rem] font-medium leading-relaxed text-[var(--muted)]">
            Bilatu gaiak eta ireki kategoriak modu bisual eta azkarrean.
          </p>
        </div>

        <div className="grid gap-3 rounded-[26px] border border-[rgba(223,183,79,0.24)] bg-[linear-gradient(135deg,rgba(255,252,243,0.98),rgba(252,245,220,0.96))] p-3.5 shadow-[0_14px_30px_rgba(118,137,154,0.07)]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-[#af7b15]">Bilaketa</span>
            <span className="rounded-full border border-[rgba(214,181,102,0.26)] bg-white/78 px-2.5 py-1 text-[0.72rem] font-extrabold text-[#a87011]">
              {topics.length} gai
            </span>
          </div>
          <label className="grid gap-2">
            <span className="flex items-center gap-3 rounded-[18px] border border-[rgba(214,181,102,0.24)] bg-white/88 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <Search className="h-4 w-4 text-[#c48b20]" />
              <input
                type="search"
                value={searchText}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value)}
                placeholder="Gaia, kategoria edo item bat..."
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[0.95rem] font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
            </span>
          </label>
        </div>
      </div>

      {isLoading && topics.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {LOADING_TOPIC_PLACEHOLDERS.map((topicKey) => {
            const visual = getTopicVisual(topicKey);
            const Icon = visual.icon;

            return (
              <div
                key={topicKey}
                className={clsx(
                  'relative aspect-[0.94] overflow-hidden rounded-[28px] border p-0 text-left shadow-[0_18px_40px_rgba(101,128,148,0.1)]',
                  visual.shellClassName
                )}
              >
                <div className={clsx('absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r opacity-95', visual.glowClassName)} />
                <div className={clsx('absolute -right-8 top-2 h-20 w-20 rounded-full bg-gradient-to-br opacity-45 blur-2xl', visual.glowClassName)} />
                <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-white/32 blur-2xl" />

                <div className="relative flex h-full flex-col justify-between p-4 animate-pulse">
                  <div className="flex items-start justify-between gap-3">
                    <span className="pointer-events-none absolute inset-[12px] rounded-[24px] border border-white/40 opacity-80" />
                    <span
                      className={clsx(
                        'relative inline-flex h-15 w-15 items-center justify-center rounded-[22px] border border-white/45 shadow-[0_12px_28px_rgba(255,255,255,0.32)] backdrop-blur-[6px]',
                        visual.badgeClassName
                      )}
                    >
                      <span className="absolute inset-[7px] rounded-[17px] bg-white/18" />
                      <Icon className="relative h-7 w-7 opacity-70" />
                    </span>
                  </div>

                  <div className="relative grid gap-2">
                    <div className="h-px w-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.96),rgba(255,255,255,0.18))]" />
                    <div className="h-4 w-[72%] rounded-full bg-white/55" />
                    <div className="h-4 w-[48%] rounded-full bg-white/38" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !isReady && topics.length === 0 && (
        <div className="grid gap-4 rounded-[28px] border border-[rgba(224,192,149,0.3)] bg-[linear-gradient(135deg,rgba(255,248,242,0.98),rgba(255,238,225,0.96))] p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#c78044]" />
            <div className="grid gap-2">
              <h3 className="m-0 font-display text-[1.45rem] tracking-[-0.04em] text-[#6f4624]">Hiztegia ezin izan da kargatu</h3>
              <p className="m-0 text-[0.95rem] font-semibold leading-relaxed text-[#8c6544]">{message}</p>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full bg-[#c98234] px-4 py-2 text-[0.88rem] font-extrabold text-white shadow-[0_14px_26px_rgba(201,130,52,0.26)] transition-transform duration-150 hover:-translate-y-[1px]"
            >
              Berriro saiatu
            </button>
          </div>
        </div>
      )}

      {!selectedTopic && topics.length > 0 && (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {filteredTopics.map((topic) => {
              const visual = getTopicVisual(topic.slug || topic.title);
              const Icon = visual.icon;

              return (
                <button
                  key={topic.slug}
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      setSelectedTopicSlug(topic.slug);
                    })
                  }
                  className={clsx(
                    'group relative aspect-[0.94] overflow-hidden rounded-[28px] border p-0 text-left shadow-[0_18px_40px_rgba(101,128,148,0.1)] transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_24px_52px_rgba(101,128,148,0.14)]',
                    visual.shellClassName
                  )}
                >
                  <div className={clsx('absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r opacity-95', visual.glowClassName)} />
                  <div className={clsx('absolute -right-8 top-2 h-20 w-20 rounded-full bg-gradient-to-br opacity-55 blur-2xl transition-transform duration-300 group-hover:scale-110', visual.glowClassName)} />
                  <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-white/36 blur-2xl" />

                  <div className="relative flex h-full flex-col justify-between p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="pointer-events-none absolute inset-[12px] rounded-[24px] border border-white/40 opacity-80" />
                      <span
                        className={clsx(
                          'relative inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/45 shadow-[0_12px_28px_rgba(255,255,255,0.32)] backdrop-blur-[6px]',
                          visual.badgeClassName
                        )}
                      >
                        <span className="absolute inset-[7px] rounded-[16px] bg-white/18" />
                        <Icon className="relative h-6.5 w-6.5" />
                      </span>
                    </div>

                    <div className="relative mt-auto grid gap-1">
                      <div className="h-px w-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.96),rgba(255,255,255,0.18))]" />
                      <h3 className="m-0 max-w-[10ch] font-display text-[clamp(1.02rem,3.2vw,1.45rem)] leading-[0.94] tracking-[-0.055em] text-[var(--text)] text-balance">
                        {topic.title}
                      </h3>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {!isLoading && filteredTopics.length === 0 && (
            <div className="rounded-[26px] border border-dashed border-[rgba(195,207,220,0.9)] bg-[rgba(247,250,253,0.92)] px-5 py-8 text-center">
              <p className="text-[1rem] font-semibold text-[var(--muted)]">Ez da emaitzarik aurkitu bilaketa honekin.</p>
            </div>
          )}
        </div>
      )}

      {selectedTopic && (
        <TopicDetail
          topic={selectedTopic}
          query={normalizedQuery}
          onBack={() =>
            startTransition(() => {
              setSelectedTopicSlug(null);
            })
          }
        />
      )}
    </section>
  );
});

interface TopicDetailProps {
  topic: VocabularyTopic;
  query: string;
  onBack: () => void;
}

const TopicDetail = memo(function TopicDetail({ topic, query, onBack }: TopicDetailProps) {
  const visual = getTopicVisual(topic.slug || topic.title);
  const Icon = visual.icon;
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<string[]>([]);

  useEffect(() => {
    setSelectedCategoryKeys([]);
  }, [topic.slug]);

  useEffect(() => {
    setSelectedCategoryKeys((current) =>
      current.filter((key) => topic.categories.some((category) => category.key === key))
    );
  }, [topic.categories]);

  const visibleCategories = topic.categories
    .map((category) => {
      const categoryMatches = query ? normalizeTopicKey(category.label).includes(query) : true;
      return {
        ...category,
        items:
          !query || categoryMatches
            ? category.items
            : category.items.filter(
                (item) =>
                  normalizeTopicKey(item.text).includes(query) || normalizeTopicKey(item.normalizedText).includes(query)
              ),
      };
    })
    .filter((category) => selectedCategoryKeys.length === 0 || selectedCategoryKeys.includes(category.key))
    .filter((category) => category.items.length > 0);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(196,208,220,0.88)] bg-white px-4 py-2 text-[0.84rem] font-extrabold text-[var(--text-2)] shadow-[0_10px_24px_rgba(118,137,154,0.08)] transition-transform duration-150 hover:-translate-y-[1px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Gaietara itzuli
        </button>
        <span className="rounded-full bg-[rgba(238,244,249,0.9)] px-3 py-1 text-[0.76rem] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">
          {topic.categories.length} kategoria
        </span>
      </div>

      <div className={clsx('relative overflow-hidden rounded-[30px] border p-4 md:p-5 shadow-[0_16px_34px_rgba(118,137,154,0.08)]', visual.shellClassName)}>
        <div className={clsx('absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r', visual.glowClassName)} />
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <span className={clsx('inline-flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center rounded-[20px] shadow-[0_16px_32px_rgba(255,255,255,0.36)] md:h-[4.25rem] md:w-[4.25rem]', visual.badgeClassName)}>
                <Icon className="h-7 w-7 md:h-8 md:w-8" />
              </span>

              <h3 className="m-0 font-display text-[clamp(1.5rem,4vw,2.3rem)] leading-[0.94] tracking-[-0.05em] text-[var(--text)]">
                {topic.title}
              </h3>
            </div>
            <span className="rounded-full border border-white/62 bg-white/68 px-3 py-1 text-[0.74rem] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">
              {visibleCategories.length} atal
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {topic.categories.map((category) => (
              <button
                key={`${topic.slug}-${category.key}`}
                type="button"
                onClick={() =>
                  setSelectedCategoryKeys((current) =>
                    current.includes(category.key)
                      ? current.filter((key) => key !== category.key)
                      : [...current, category.key]
                  )
                }
                aria-pressed={selectedCategoryKeys.includes(category.key)}
                className={clsx(
                  'rounded-full border px-3 py-1 text-[0.76rem] font-extrabold transition-[transform,background-color,border-color,color,box-shadow] duration-150 hover:-translate-y-[1px]',
                  selectedCategoryKeys.includes(category.key)
                    ? 'border-[rgba(206,144,47,0.34)] bg-[rgba(255,243,210,0.96)] text-[#a56b11] shadow-[0_12px_24px_rgba(221,184,92,0.18)]'
                    : 'border-white/70 bg-white/68 text-[var(--text-2)]'
                )}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleCategories.map((category) => (
          <article
            key={`${topic.slug}-${category.key}`}
            className="rounded-[28px] border border-[rgba(216,226,236,0.9)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,254,0.96))] p-5 shadow-[0_16px_34px_rgba(108,128,144,0.08)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <div className="text-[0.74rem] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">Kategoria</div>
                <h4 className="m-0 font-display text-[1.35rem] tracking-[-0.04em] text-[var(--text)]">{category.label}</h4>
              </div>
              <span className="rounded-full bg-[rgba(237,244,249,0.92)] px-3 py-1 text-[0.76rem] font-extrabold text-[var(--muted)]">
                {category.items.length} item
              </span>
            </div>

            <ul className="mt-4 grid gap-2 pl-0">
              {category.items.map((item) => (
                <li
                  key={`${category.key}-${item.id}`}
                  className="list-none rounded-[18px] border border-[rgba(229,235,241,0.94)] bg-white px-4 py-3 text-[0.95rem] font-semibold leading-relaxed text-[var(--text-2)]"
                >
                  {item.text}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {visibleCategories.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-[rgba(195,207,220,0.9)] bg-[rgba(247,250,253,0.92)] px-5 py-8 text-center">
          <p className="text-[1rem] font-semibold text-[var(--muted)]">Ez dago itemik bilaketa honekin gai honetan.</p>
        </div>
      )}
    </div>
  );
});
