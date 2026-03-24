import { memo } from 'react';
import { BookOpen, Languages, LibraryBig, Sigma, SpellCheck } from 'lucide-react';
import clsx from 'clsx';

interface LearnHubViewProps {
  onGoSynonyms: () => void;
  onGoGrammar: () => void;
  onGoVocabulary: () => void;
  onGoVerbs: () => void;
  onStartOrthographyPractice: () => void;
}

interface LearnCardDefinition {
  id: string;
  title: string;
  eyebrow: string;
  icon: typeof BookOpen;
  onClick: () => void;
  shellClassName: string;
  iconClassName: string;
  accentClassName: string;
}

export const LearnHubView = memo(function LearnHubView({
  onGoSynonyms,
  onGoGrammar,
  onGoVocabulary,
  onGoVerbs,
  onStartOrthographyPractice,
}: LearnHubViewProps) {
  const learnCards: LearnCardDefinition[] = [
    {
      id: 'synonyms',
      title: 'Sinonimoak',
      eyebrow: 'Lotu hitzak',
      icon: BookOpen,
      onClick: onGoSynonyms,
      shellClassName: 'border-[rgba(108,206,186,0.26)] bg-[linear-gradient(135deg,rgba(243,255,251,0.98),rgba(228,248,239,0.96))]',
      iconClassName: 'border-[rgba(108,206,186,0.3)] bg-[linear-gradient(180deg,rgba(250,255,252,0.98),rgba(234,250,243,0.98))] text-[#1b9c8a]',
      accentClassName: 'from-[#77d7c5] via-[#5cc9b5] to-[#9be0c0]',
    },
    {
      id: 'grammar',
      title: 'Gramatika',
      eyebrow: 'Eraiki arauak',
      icon: Languages,
      onClick: onGoGrammar,
      shellClassName: 'border-[rgba(125,168,223,0.24)] bg-[linear-gradient(135deg,rgba(245,250,255,0.98),rgba(233,242,254,0.96))]',
      iconClassName: 'border-[rgba(125,168,223,0.28)] bg-[linear-gradient(180deg,rgba(251,253,255,0.98),rgba(236,243,254,0.98))] text-[#4f85c7]',
      accentClassName: 'from-[#8ac2f2] via-[#6ea7e8] to-[#87b8f1]',
    },
    {
      id: 'spelling',
      title: 'Ortografia',
      eyebrow: 'Aurkitu akatsa',
      icon: SpellCheck,
      onClick: onStartOrthographyPractice,
      shellClassName: 'border-[rgba(107,206,189,0.25)] bg-[linear-gradient(135deg,rgba(239,255,249,0.98),rgba(224,249,239,0.96))] sm:col-span-2',
      iconClassName: 'border-[rgba(107,206,189,0.3)] bg-[linear-gradient(180deg,rgba(247,255,251,0.98),rgba(229,250,241,0.98))] text-[#169b88]',
      accentClassName: 'from-[#71d5c3] via-[#52c7ad] to-[#9ddeaa]',
    },
    {
      id: 'vocabulary',
      title: 'Hiztegia',
      eyebrow: 'Zabaldu hiztegia',
      icon: LibraryBig,
      onClick: onGoVocabulary,
      shellClassName: 'border-[rgba(228,191,89,0.24)] bg-[linear-gradient(135deg,rgba(255,252,241,0.98),rgba(255,245,214,0.96))]',
      iconClassName: 'border-[rgba(228,191,89,0.28)] bg-[linear-gradient(180deg,rgba(255,254,247,0.98),rgba(255,247,223,0.98))] text-[#b78618]',
      accentClassName: 'from-[#f1d97f] via-[#eab94b] to-[#f0c96a]',
    },
    {
      id: 'verbs',
      title: 'Aditzak',
      eyebrow: 'Mugitu esaldiak',
      icon: Sigma,
      onClick: onGoVerbs,
      shellClassName: 'border-[rgba(232,145,117,0.24)] bg-[linear-gradient(135deg,rgba(255,247,244,0.98),rgba(255,236,228,0.96))]',
      iconClassName: 'border-[rgba(232,145,117,0.28)] bg-[linear-gradient(180deg,rgba(255,251,249,0.98),rgba(255,239,232,0.98))] text-[#cf6d56]',
      accentClassName: 'from-[#f1b19e] via-[#e98f7b] to-[#efb39a]',
    },
  ];

  return (
    <section className="grid gap-5 rounded-[34px] border border-[rgba(216,224,231,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,249,0.95))] p-6 shadow-[var(--shadow-card)]">
      <div className="grid gap-2">
        <div className="grid gap-2">
          <p className="m-0 text-[0.74rem] font-extrabold uppercase tracking-[0.18em] text-[var(--primary-deep)]">Ikasi</p>
          <h2 className="m-0 font-display text-[clamp(2rem,4vw,2.9rem)] leading-[0.92] tracking-[-0.06em] text-[var(--text)]">
            Aukeratu gaur zer landu nahi duzun
          </h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {learnCards.map(({ id, title, eyebrow, icon: Icon, onClick, shellClassName, iconClassName, accentClassName }) => (
          <button
            key={id}
            type="button"
            onClick={onClick}
            className={clsx(
              'group relative overflow-hidden rounded-[24px] border px-4 py-3.5 text-left shadow-[0_12px_24px_rgba(118,137,154,0.08)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-[2px] hover:shadow-[0_16px_28px_rgba(118,137,154,0.1)]',
              shellClassName
            )}
          >
            <div className={clsx('absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-95', accentClassName)} aria-hidden="true" />
            <div className={clsx('absolute -right-10 top-0 h-16 w-16 rounded-full bg-gradient-to-br opacity-38 blur-2xl transition-transform duration-200 group-hover:scale-110', accentClassName)} aria-hidden="true" />

            <div className="relative flex items-center gap-3">
              <span className={clsx('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.66)]', iconClassName)}>
                <Icon className="h-[1.1rem] w-[1.1rem]" />
              </span>

              <div className="min-w-0 flex-1">
                <strong className="block truncate py-[0.08em] font-display text-[1.18rem] font-extrabold leading-[1.08] tracking-[-0.05em] text-[var(--text)]">
                  {title}
                </strong>
              </div>

              <span className="rounded-full bg-white/62 px-2.5 py-[0.42rem] text-[0.58rem] font-extrabold uppercase tracking-[0.11em] text-[var(--muted)]">
                {eyebrow}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
});
