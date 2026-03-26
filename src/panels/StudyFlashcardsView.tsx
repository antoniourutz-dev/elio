import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import type { GameLevel, SynonymEntry } from '../euskeraLearning';
import {
  buildStudyCardSeeds,
  countAvailableStudyCards,
  DEFAULT_STUDY_DAILY_NEW_LIMIT,
  DEFAULT_STUDY_SESSION_REVIEW_LIMIT,
  getNextStudyDueAt,
  getStudyQueueSummary,
  loadStudyDailyProgress,
  loadStudyDeck,
  recordStudyDailyProgress,
  reviewStudyCard,
  saveStudyDailyProgress,
  saveStudyDeck,
  selectNextStudyCard,
  type StudyCard,
  type StudyDailyProgress,
  type StudyRating,
} from '../lib/study';

interface SwipeCardProps {
  card: StudyCard;
  onRate: (cardId: string, rating: StudyRating) => void;
}

function SwipeCard({ card, onRate }: SwipeCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isThrowing, setIsThrowing] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pointerStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    moved: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const throwTimerRef = useRef<number | null>(null);

  const rotate = useMemo(() => dragOffset.x / 12 - dragOffset.y / 28, [dragOffset.x, dragOffset.y]);
  const goodOpacity = useMemo(() => Math.max(0, Math.min(1, (dragOffset.x - 40) / 70)), [dragOffset.x]);
  const againOpacity = useMemo(() => Math.max(0, Math.min(1, (-dragOffset.x - 40) / 70)), [dragOffset.x]);
  const easyOpacity = useMemo(() => Math.max(0, Math.min(1, (-dragOffset.y - 45) / 75)), [dragOffset.y]);
  const hardOpacity = useMemo(() => Math.max(0, Math.min(1, (dragOffset.y - 45) / 75)), [dragOffset.y]);

  useEffect(() => {
    setIsFlipped(false);
    setDragOffset({ x: 0, y: 0 });
    setIsThrowing(false);

    return () => {
      if (throwTimerRef.current !== null) {
        window.clearTimeout(throwTimerRef.current);
      }
    };
  }, [card.id]);

  const throwCard = useCallback(
    (rating: StudyRating) => {
      const xTarget = rating === 'good' ? 520 : rating === 'again' ? -520 : 0;
      const yTarget = rating === 'easy' ? -420 : rating === 'hard' ? 420 : 0;

      setIsThrowing(true);
      setDragOffset({ x: xTarget, y: yTarget });

      if (throwTimerRef.current !== null) {
        window.clearTimeout(throwTimerRef.current);
      }

      throwTimerRef.current = window.setTimeout(() => {
        onRate(card.id, rating);
      }, 280);
    },
    [card.id, onRate]
  );

  const snapBack = useCallback(() => {
    setIsThrowing(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const resolveGesture = useCallback(
    (offsetX: number, offsetY: number, moved: boolean) => {
      const absX = Math.abs(offsetX);
      const absY = Math.abs(offsetY);

      if (absY > absX && offsetY < -90) {
        throwCard('easy');
        return;
      }

      if (absY > absX && offsetY > 90) {
        throwCard('hard');
        return;
      }

      if (offsetX > 100) {
        throwCard('good');
        return;
      }

      if (offsetX < -100) {
        throwCard('again');
        return;
      }

      if (!moved) {
        setIsFlipped((current) => !current);
      }

      snapBack();
    },
    [snapBack, throwCard]
  );

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (isThrowing) {
      return;
    }

    pointerStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsThrowing(false);
  }, [isThrowing]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const pointerState = pointerStateRef.current;
    if (pointerState.pointerId !== event.pointerId) {
      return;
    }

    const nextX = event.clientX - pointerState.startX;
    const nextY = event.clientY - pointerState.startY;

    if (Math.abs(nextX) > 6 || Math.abs(nextY) > 6) {
      pointerState.moved = true;
    }

    setDragOffset({ x: nextX, y: nextY });
  }, []);

  const finishPointerInteraction = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const pointerState = pointerStateRef.current;
    if (pointerState.pointerId !== event.pointerId) {
      return;
    }

    const nextX = event.clientX - pointerState.startX;
    const nextY = event.clientY - pointerState.startY;

    if (cardRef.current?.hasPointerCapture(event.pointerId)) {
      cardRef.current.releasePointerCapture(event.pointerId);
    }

    pointerStateRef.current.pointerId = null;
    resolveGesture(nextX, nextY, pointerState.moved);
  }, [resolveGesture]);

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerInteraction}
      onPointerCancel={finishPointerInteraction}
      style={{
        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotate}deg)`,
        opacity: isThrowing ? 0 : 1,
        transition: isThrowing
          ? 'transform 280ms ease-in, opacity 220ms ease-in'
          : pointerStateRef.current.pointerId === null
            ? 'transform 200ms ease-out, opacity 200ms ease-out'
            : 'none',
      }}
      className="relative w-full touch-none select-none cursor-grab active:cursor-grabbing animate-[fade-up_220ms_ease-out] will-change-transform"
    >
      <div style={{ opacity: goodOpacity }} className="pointer-events-none absolute left-5 top-5 z-20 transition-opacity duration-100">
        <span className="-rotate-12 inline-block rounded-xl border-[3px] border-[#1d8b7f] bg-[rgba(255,255,255,0.92)] px-3 py-1.5 text-[0.88rem] font-black uppercase tracking-[0.12em] text-[#1d8b7f]">
          Eskuina / Badakit
        </span>
      </div>

      <div style={{ opacity: againOpacity }} className="pointer-events-none absolute right-5 top-5 z-20 transition-opacity duration-100">
        <span className="rotate-12 inline-block rounded-xl border-[3px] border-[#d05060] bg-[rgba(255,255,255,0.92)] px-3 py-1.5 text-[0.88rem] font-black uppercase tracking-[0.12em] text-[#d05060]">
          Ezkerra / Berriz
        </span>
      </div>

      <div style={{ opacity: easyOpacity }} className="pointer-events-none absolute inset-x-0 top-5 z-20 flex justify-center transition-opacity duration-100">
        <span className="inline-block rounded-xl border-[3px] border-[#1d8b7f] bg-[rgba(255,255,255,0.94)] px-3 py-1.5 text-[0.82rem] font-black uppercase tracking-[0.12em] text-[#1d8b7f]">
          Gora / Erraza
        </span>
      </div>

      <div style={{ opacity: hardOpacity }} className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center transition-opacity duration-100">
        <span className="inline-block rounded-xl border-[3px] border-[#c27a1d] bg-[rgba(255,255,255,0.94)] px-3 py-1.5 text-[0.82rem] font-black uppercase tracking-[0.12em] text-[#a76410]">
          Behera / Zaila
        </span>
      </div>

      <div style={{ perspective: '1200px' }}>
        <div
          style={{ transform: `rotateY(${isFlipped ? 180 : 0}deg)` }}
          className="flip-preserve-3d relative w-full"
        >
          <div className="face-hidden flex min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-[28px] border border-[rgba(216,226,241,0.76)] bg-white p-8 shadow-[0_14px_40px_rgba(100,140,160,0.13)]">
            {card.theme && (
              <p className="m-0 text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[var(--muted)]">
                {card.theme}
              </p>
            )}
            <strong className="m-0 text-center font-display text-[2.6rem] font-extrabold leading-none tracking-[-0.04em] text-[var(--text)]">
              {card.promptWord}
            </strong>
            {card.translation && (
              <p className="m-0 italic text-[0.9rem] text-[var(--muted)]">{card.translation}</p>
            )}
            <p className="m-0 mt-3 text-[0.74rem] font-semibold text-[var(--muted)]">Sakatu ikusteko</p>
          </div>

          <div className="face-back absolute inset-0 flex min-h-[280px] w-full flex-col justify-center gap-4 rounded-[28px] border border-[rgba(77,182,165,0.3)] bg-white p-6 shadow-[0_14px_40px_rgba(100,140,160,0.13)]">
            <p className="m-0 text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[var(--muted)]">
              Sinonimo zuzena
            </p>
            <div className="grid gap-2 rounded-[22px] border border-[rgba(77,182,165,0.2)] bg-[linear-gradient(180deg,rgba(235,250,244,0.84),rgba(226,246,238,0.92))] px-4 py-5 text-center">
              <span className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                {card.promptWord}
              </span>
              <strong className="font-display text-[2.15rem] leading-none tracking-[-0.04em] text-[#1d8b7f]">
                {card.answerWord}
              </strong>
            </div>
            {card.example && (
              <p className="m-0 border-l-2 border-[rgba(77,182,165,0.4)] pl-3 text-[0.85rem] italic leading-relaxed text-[var(--text-2)]">
                {card.example}
              </p>
            )}
            <p className="m-0 mt-1 text-center text-[0.7rem] font-semibold text-[var(--muted)]">
              Ezkerra / Berriz - Behera / Zaila - Eskuina / Badakit - Gora / Erraza
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StudyFlashcardsViewProps {
  playerId: string;
  level: GameLevel;
  entries: SynonymEntry[];
  onClose: () => void;
}

function formatNextDue(nextDueAt: string): string {
  const nextDate = new Date(nextDueAt);
  return nextDate.toLocaleString('eu-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const StudyFlashcardsView = memo(function StudyFlashcardsView({
  playerId,
  level,
  entries,
  onClose,
}: StudyFlashcardsViewProps) {
  const seeds = useMemo(() => buildStudyCardSeeds(entries, level.index), [entries, level.index]);
  const [cards, setCards] = useState<StudyCard[]>(() => loadStudyDeck(playerId, level.id, seeds));
  const [dailyProgress, setDailyProgress] = useState<StudyDailyProgress>(() => loadStudyDailyProgress(playerId, level.id));
  const [sessionReviewCount, setSessionReviewCount] = useState(0);
  const [sessionNewCount, setSessionNewCount] = useState(0);
  const [lastSemanticGroup, setLastSemanticGroup] = useState<string | null>(null);

  useEffect(() => {
    setCards(loadStudyDeck(playerId, level.id, seeds));
    setDailyProgress(loadStudyDailyProgress(playerId, level.id));
    setSessionReviewCount(0);
    setSessionNewCount(0);
    setLastSemanticGroup(null);
  }, [playerId, level.id, seeds]);

  const now = useMemo(() => new Date(), [cards, dailyProgress, sessionReviewCount]);
  const queueSummary = useMemo(
    () =>
      getStudyQueueSummary(cards, now, {
        dailyNewLimit: DEFAULT_STUDY_DAILY_NEW_LIMIT,
        newCardsStudiedToday: dailyProgress.newCardsStudied,
        sessionReviewLimit: DEFAULT_STUDY_SESSION_REVIEW_LIMIT,
        sessionReviewsCompleted: sessionReviewCount,
      }),
    [cards, dailyProgress.newCardsStudied, now, sessionReviewCount]
  );
  const current = useMemo(
    () =>
      selectNextStudyCard(cards, now, {
        lastSemanticGroup,
        dailyNewLimit: DEFAULT_STUDY_DAILY_NEW_LIMIT,
        newCardsStudiedToday: dailyProgress.newCardsStudied,
        sessionReviewLimit: DEFAULT_STUDY_SESSION_REVIEW_LIMIT,
        sessionReviewsCompleted: sessionReviewCount,
      }),
    [cards, dailyProgress.newCardsStudied, lastSemanticGroup, now, sessionReviewCount]
  );
  const availableCount = useMemo(
    () =>
      countAvailableStudyCards(cards, now, {
        dailyNewLimit: DEFAULT_STUDY_DAILY_NEW_LIMIT,
        newCardsStudiedToday: dailyProgress.newCardsStudied,
        sessionReviewLimit: DEFAULT_STUDY_SESSION_REVIEW_LIMIT,
        sessionReviewsCompleted: sessionReviewCount,
      }),
    [cards, dailyProgress.newCardsStudied, now, sessionReviewCount]
  );
  const sessionAnsweredCount = sessionReviewCount + sessionNewCount;
  const sessionTargetCount = sessionAnsweredCount + queueSummary.totalCount;
  const progressPct = sessionTargetCount > 0 ? (sessionAnsweredCount / sessionTargetCount) * 100 : 0;
  const nextDueAt = useMemo(() => getNextStudyDueAt(cards), [cards]);
  const isFinishedForNow = !current;
  const hiddenDueCount = Math.max(0, queueSummary.dueRemainingTotal - queueSummary.dueCount);
  const hiddenNewCount = Math.max(0, queueSummary.newRemainingTotal - queueSummary.newCount);
  const hasReachedSessionReviewLimit = hiddenDueCount > 0 && queueSummary.dueCount === 0;
  const hasReachedDailyNewLimit = hiddenNewCount > 0 && queueSummary.newCount === 0;
  const todayNewRemaining = Math.max(0, DEFAULT_STUDY_DAILY_NEW_LIMIT - dailyProgress.newCardsStudied);

  const persistCards = useCallback(
    (nextCards: StudyCard[]) => {
      setCards(nextCards);
      saveStudyDeck(playerId, level.id, nextCards);
    },
    [level.id, playerId]
  );

  const handleRate = useCallback(
    (cardId: string, rating: StudyRating) => {
      const reviewedAt = new Date();
      const ratedCard = cards.find((card) => card.id === cardId) ?? null;

      setCards((previousCards) => {
        const nextCards = previousCards.map((card) => (card.id === cardId ? reviewStudyCard(card, rating, reviewedAt) : card));
        saveStudyDeck(playerId, level.id, nextCards);
        return nextCards;
      });

      if (ratedCard) {
        setDailyProgress((previous) => {
          const nextProgress = recordStudyDailyProgress(previous, ratedCard.status, reviewedAt);
          saveStudyDailyProgress(playerId, level.id, nextProgress);
          return nextProgress;
        });

        if (ratedCard.status === 'new') {
          setSessionNewCount((previous) => previous + 1);
        } else {
          setSessionReviewCount((previous) => previous + 1);
        }
      }

      setLastSemanticGroup(ratedCard?.semanticGroup ?? null);
    },
    [cards, level.id, playerId]
  );

  const handleRestart = useCallback(() => {
    const resetAt = new Date().toISOString();
    const resetCards: StudyCard[] = seeds.map((seed) => ({
      ...seed,
      status: 'new',
      stepIndex: 0,
      intervalDays: 0,
      ease: 2.3,
      dueAt: resetAt,
      lastReviewedAt: null,
      lastRating: null,
      lapses: 0,
      reps: 0,
      leech: false,
    }));

    persistCards(resetCards);
    setSessionReviewCount(0);
    setSessionNewCount(0);
    setLastSemanticGroup(null);
  }, [persistCards, seeds]);

  return (
    <section className="grid gap-5 rounded-[32px] bg-gradient-to-b from-[rgba(255,255,255,0.98)] to-[rgba(248,252,255,0.97)] p-[20px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Itzuli"
          onClick={onClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(220,229,239,0.7)] text-[var(--text-2)] transition-colors hover:bg-[rgba(200,215,230,0.9)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate font-display text-[1.1rem] font-extrabold tracking-[-0.03em] text-[var(--text)]">
            {level.name}
          </h2>
          <p className="m-0 text-[0.78rem] font-bold text-[var(--muted)]">
            Gaur: {queueSummary.newCount} berri eta {queueSummary.dueCount} errepaso
          </p>
        </div>
        <span className="shrink-0 text-[0.85rem] font-extrabold text-[#1d8b7f]">
          {sessionAnsweredCount}/{sessionTargetCount || cards.length}
        </span>
      </div>

      <div
        className="h-[6px] overflow-hidden rounded-full bg-[rgba(180,205,215,0.35)]"
        style={{ '--study-w': `${progressPct}%` } as CSSProperties}
      >
        <div className="h-full w-[var(--study-w)] rounded-full bg-[linear-gradient(90deg,#1d8b7f,#4db6a5)] transition-[width] duration-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-[rgba(77,182,165,0.16)] bg-[rgba(237,249,246,0.95)] px-4 py-3">
          <p className="m-0 text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">Gaurko berriak</p>
          <p className="m-0 mt-1 text-[1.1rem] font-extrabold text-[#1d8b7f]">
            {dailyProgress.newCardsStudied}/{DEFAULT_STUDY_DAILY_NEW_LIMIT}
          </p>
        </div>
        <div className="rounded-[22px] border border-[rgba(180,205,215,0.24)] bg-[rgba(246,250,252,0.96)] px-4 py-3">
          <p className="m-0 text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">Saio honetako errepasoak</p>
          <p className="m-0 mt-1 text-[1.1rem] font-extrabold text-[var(--text-2)]">
            {sessionReviewCount}/{DEFAULT_STUDY_SESSION_REVIEW_LIMIT}
          </p>
        </div>
      </div>

      {isFinishedForNow ? (
        <div className="flex flex-col items-center gap-5 py-10 text-center">
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(145deg,#4db6a5,#1d8b7f)] shadow-[0_12px_32px_rgba(29,139,127,0.3)]">
            <CheckCircle2 className="h-9 w-9 text-white" />
          </span>
          <div className="grid gap-1">
            <h3 className="m-0 font-display text-[1.4rem] font-extrabold tracking-[-0.03em] text-[var(--text)]">
              {hasReachedSessionReviewLimit
                ? 'Saio honetako muga beteta'
                : hasReachedDailyNewLimit
                  ? 'Gaurko berri kupoa eginda'
                  : 'Oraingoz kitto'}
            </h3>
            <p className="m-0 text-[0.9rem] text-[var(--muted)]">
              {hasReachedSessionReviewLimit
                ? `Saio bakoitzean gehienez ${DEFAULT_STUDY_SESSION_REVIEW_LIMIT} errepaso egiten dira.`
                : hasReachedDailyNewLimit
                  ? `Gaurko ${DEFAULT_STUDY_DAILY_NEW_LIMIT} txartel berriak eginda daude.`
                  : 'Une honetan ez dago txartel berririk edo epez kanpoko txartelik.'}
            </p>
            <p className="m-0 text-[0.82rem] font-semibold text-[var(--muted)]">
              Gaur oraindik {todayNewRemaining} berri geratzen dira.
            </p>
            {nextDueAt && (
              <p className="m-0 text-[0.82rem] font-semibold text-[#1d8b7f]">
                Hurrengo txartela: {formatNextDue(nextDueAt)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#1d8b7f,#4db6a5)] px-6 py-2.5 text-[0.9rem] font-extrabold text-white shadow-[0_6px_18px_rgba(29,139,127,0.35)] transition-shadow hover:shadow-[0_8px_22px_rgba(29,139,127,0.45)]"
          >
            <RotateCcw className="h-4 w-4" />
            Berriro hasi
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="relative">
            {availableCount > 2 && (
              <div className="absolute inset-x-6 top-4 -z-20 h-full rounded-[28px] border border-[rgba(216,226,241,0.4)] bg-[rgba(240,245,248,0.65)]" />
            )}
            {availableCount > 1 && (
              <div className="absolute inset-x-3 top-2 -z-10 h-full rounded-[28px] border border-[rgba(216,226,241,0.55)] bg-[rgba(240,245,248,0.85)]" />
            )}

            {current && (
              <div key={current.id}>
                <SwipeCard card={current} onRate={handleRate} />
              </div>
            )}
          </div>

          <div className="grid gap-1 px-1">
            <div className="flex items-center justify-between text-[0.76rem] font-bold text-[var(--muted)]">
              <span>Ezkerra / Berriz</span>
              <span>{availableCount} prest</span>
              <span>Eskuina / Badakit</span>
            </div>
            <div className="flex items-center justify-between text-[0.76rem] font-bold text-[#c8d6e0]">
              <span>Behera / Zaila</span>
              <span>Gora / Erraza</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});
