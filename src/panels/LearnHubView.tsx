import { memo } from 'react';
import { BookOpen, Languages, LibraryBig, Sigma } from 'lucide-react';
import clsx from 'clsx';

interface LearnHubViewProps {
  onGoSynonyms: () => void;
  onGoGrammar: () => void;
  onGoVocabulary: () => void;
  onGoVerbs: () => void;
}

export const LearnHubView = memo(function LearnHubView({
  onGoSynonyms,
  onGoGrammar,
  onGoVocabulary,
  onGoVerbs,
}: LearnHubViewProps) {
  const learnCards = [
    {
      id: 'synonyms',
      title: 'Sinonimoak',
      body: 'Hitz pareak eta lotura semantikoak landu.',
      icon: BookOpen,
      onClick: onGoSynonyms,
      cardClass:
        'border-[rgba(90,197,182,0.24)] bg-[linear-gradient(135deg,rgba(244,255,251,0.98),rgba(224,249,241,0.96))] hover:border-[rgba(90,197,182,0.38)] hover:shadow-[0_24px_48px_rgba(90,197,182,0.16)]',
      iconClass: 'border-[rgba(90,197,182,0.2)] bg-[rgba(83,197,190,0.12)] text-[#279486]',
      bodyClass: 'text-[#6d857e]',
    },
    {
      id: 'grammar',
      title: 'Gramatika',
      body: 'Egiturak eta arauak modu ordenatuan berrikusi.',
      icon: Languages,
      onClick: onGoGrammar,
      cardClass:
        'border-[rgba(130,167,229,0.24)] bg-[linear-gradient(135deg,rgba(246,250,255,0.98),rgba(230,242,253,0.96))] hover:border-[rgba(130,167,229,0.38)] hover:shadow-[0_24px_48px_rgba(130,167,229,0.16)]',
      iconClass: 'border-[rgba(130,167,229,0.2)] bg-[rgba(124,183,232,0.12)] text-[#4c82be]',
      bodyClass: 'text-[#72859a]',
    },
    {
      id: 'vocabulary',
      title: 'Hiztegia',
      body: 'Gai bidez antolatutako hiztegi praktikoa.',
      icon: LibraryBig,
      onClick: onGoVocabulary,
      cardClass:
        'border-[rgba(223,183,79,0.24)] bg-[linear-gradient(135deg,rgba(255,252,243,0.98),rgba(252,245,220,0.96))] hover:border-[rgba(223,183,79,0.38)] hover:shadow-[0_24px_48px_rgba(223,183,79,0.16)]',
      iconClass: 'border-[rgba(223,183,79,0.2)] bg-[rgba(229,182,59,0.12)] text-[#b17d16]',
      bodyClass: 'text-[#8f8158]',
    },
    {
      id: 'verbs',
      title: 'Aditzak',
      body: 'Formak eta erabilera ereduen bidez praktikatu.',
      icon: Sigma,
      onClick: onGoVerbs,
      cardClass:
        'border-[rgba(229,140,122,0.24)] bg-[linear-gradient(135deg,rgba(255,247,244,0.98),rgba(253,233,226,0.96))] hover:border-[rgba(229,140,122,0.38)] hover:shadow-[0_24px_48px_rgba(229,140,122,0.16)]',
      iconClass: 'border-[rgba(229,140,122,0.2)] bg-[rgba(229,140,122,0.12)] text-[#c46f5f]',
      bodyClass: 'text-[#93746b]',
    },
  ] as const;

  return (
    <section className="grid gap-5 rounded-[34px] border border-[rgba(216,224,231,0.86)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,249,249,0.94))] p-6 shadow-[var(--shadow-card)]">
      <div className="grid gap-2">
        <p className="m-0 text-[0.74rem] font-extrabold uppercase tracking-[0.18em] text-[#53a7b5]">Ikasi</p>
        <h2 className="m-0 font-display text-[clamp(2rem,4vw,2.9rem)] leading-[0.92] tracking-[-0.06em] text-[#213043]">
          Aukeratu zer landu nahi duzun
        </h2>
        <p className="m-0 max-w-[38rem] text-[0.96rem] font-medium leading-relaxed text-[#748698]">
          Atal bakoitza helburu argi batekin antolatuta dago, edukiak modu zuzenean eta garbian lantzeko.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {learnCards.map(({ id, title, body, icon: Icon, onClick, cardClass, iconClass, bodyClass }) => (
          <button
            key={id}
            type="button"
            onClick={onClick}
            className={clsx(
              'group flex items-center gap-4 rounded-[28px] border px-5 py-5 text-left shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-[2px] hover:shadow-[var(--shadow-card)]',
              cardClass
            )}
          >
            <span className={clsx('inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]', iconClass)}>
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block font-display text-[1.35rem] font-extrabold leading-[0.96] tracking-[-0.05em] text-[#223246]">{title}</strong>
              <span className={clsx('mt-1 block text-[0.9rem] font-semibold leading-relaxed', bodyClass)}>{body}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
});
