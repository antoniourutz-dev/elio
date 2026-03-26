import { memo, useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { PlayerIdentity } from '../lib/types';
import { useLessonFlow } from '../hooks/useLessonFlow';
import { usePublishedLessons } from '../hooks/usePublishedLessons';
import { useLessonProgress } from '../hooks/useLessonProgress';
import type { ExerciseFeedbackMapping, LessonCard, LessonExercise, LessonExerciseOption } from '../lib/lessonFlow';
import { LessonExerciseCard } from '../components/lessons/LessonExerciseCard';
import { LessonFeedbackCard } from '../components/lessons/LessonFeedbackCard';
import { LessonIntroCard } from '../components/lessons/LessonIntroCard';
import { ProgressIndicator } from '../components/lessons/ProgressIndicator';
import { LessonSummaryCard } from '../components/lessons/LessonSummaryCard';

const GRAMMAR_STOP_TOWNS = [
  'Gasteiz',
  'Argomaniz',
  'Alegria-Dulantzi',
  'Agurain',
  'Zalduondo',
  'Araia',
  'Maeztu',
  'Antoñana',
  'Kanpezu',
  'Bernedo',
] as const;

interface GrammarLessonViewProps {
  lessonSlug: string | null;
  activePlayer: PlayerIdentity;
  completedStops: number;
  onCompleteStop: () => void;
  onOpenLesson: (slug?: string | null) => void;
}

type LessonStage = 'intro' | 'exercise' | 'feedback' | 'summary';

interface FeedbackState {
  title: string;
  isCorrect: boolean;
  message: string;
  helperText: string | null;
}

interface SessionStats {
  attempts: number;
  correctCount: number;
  wrongCount: number;
}

const EMPTY_STATS: SessionStats = {
  attempts: 0,
  correctCount: 0,
  wrongCount: 0,
};

function readNumericMetadata(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveHookCard(cards: LessonCard[]): LessonCard | null {
  return cards.find((card) => card.cardType === 'hook') ?? cards[0] ?? null;
}

function resolveSummaryCard(cards: LessonCard[]): LessonCard | null {
  return cards.find((card) => card.cardType === 'summary') ?? null;
}

function resolveHintCard(cards: LessonCard[]): LessonCard | null {
  return cards.find((card) => card.cardType === 'micro_hint') ?? null;
}

function resolveFeedbackRule(
  mappings: ExerciseFeedbackMapping[],
  option: LessonExerciseOption
): ExerciseFeedbackMapping | null {
  return (
    mappings.find((mapping) => mapping.wrongOptionValue?.toLowerCase() === option.optionValue.toLowerCase()) ??
    mappings[0] ??
    null
  );
}

function resolveImmediateFeedbackMessage(
  exercise: LessonExercise,
  option: LessonExerciseOption,
  isCorrect: boolean
): string {
  const normalize = (value: string | null | undefined) => (value ?? '').trim();
  const optionCorrect = normalize(option.feedbackCorrectEu);
  const optionIncorrect = normalize(option.feedbackIncorrectEu);
  const exerciseCorrect = normalize(exercise.feedbackCorrect);
  const exerciseIncorrect = normalize(exercise.feedbackIncorrect);

  if (isCorrect) {
    if (exerciseCorrect) return exerciseCorrect;
    if (optionCorrect && !/^zuzen!?$/i.test(optionCorrect)) return optionCorrect;
    return 'Ondo! Hor hemen forma egokia da.';
  }

  if (exerciseIncorrect) return exerciseIncorrect;
  if (optionIncorrect && !/^hemen/i.test(optionIncorrect)) return optionIncorrect;
  return optionIncorrect || 'Begiratu berriro.';
}

function resolveStreakFeedbackTitle(isCorrect: boolean, correctStreak: number): string {
  if (!isCorrect) {
    return correctStreak >= 2 ? 'Ia! Ez galdu erritmoa' : 'Ia! Saiatu berriro';
  }

  if (correctStreak >= 3) return 'Primeran! 🔥';
  if (correctStreak >= 2) return 'Ondo! ⚡';
  return 'Zuzena! 👏';
}

function resolveHelperThreshold(exercise: LessonExercise, lessonRetryThreshold: number): number {
  return (
    readNumericMetadata(exercise.metadata.retry_limit_before_hint) ??
    lessonRetryThreshold
  );
}

function resolveAdditionalHelper(
  exercise: LessonExercise,
  selectedOption: LessonExerciseOption,
  mapping: ExerciseFeedbackMapping | null,
  hintCard: LessonCard | null
): string | null {
  return (
    exercise.explanationOnFail ||
    mapping?.rule?.feedbackShortEu ||
    mapping?.rule?.feedbackLongEu ||
    selectedOption.feedbackIncorrectEu ||
    hintCard?.bodyEu ||
    null
  );
}

export const GrammarLessonView = memo(function GrammarLessonView({
  lessonSlug,
  activePlayer,
  completedStops,
  onCompleteStop,
  onOpenLesson,
}: GrammarLessonViewProps) {
  const { lesson, isLoading, message, refresh, prefetch } = useLessonFlow(lessonSlug, true);
  const { lessons } = usePublishedLessons(10, true);
  const {
    progress,
    isLoading: isProgressLoading,
    message: progressMessage,
    markInProgress,
    recordAttempt,
    completeLesson,
  } = useLessonProgress(activePlayer.userId, lesson?.id ?? null, Boolean(lesson));

  const [stage, setStage] = useState<LessonStage>('intro');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | string | null>(null);
  const [feedbackState, setFeedbackState] = useState<FeedbackState | null>(null);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [sessionStats, setSessionStats] = useState<SessionStats>(EMPTY_STATS);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isCompletionStored, setIsCompletionStored] = useState(false);
  const [hasStartedRemoteProgress, setHasStartedRemoteProgress] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);

  const lessonIndex = useMemo(
    () => (lesson ? lessons.findIndex((entry) => entry.slug === lesson.slug) : -1),
    [lesson, lessons]
  );
  const nextLesson = useMemo(
    () => (lessonIndex >= 0 ? lessons[lessonIndex + 1] ?? null : null),
    [lessonIndex, lessons]
  );
  const nextStopTown = useMemo(
    () => (lessonIndex >= 0 ? GRAMMAR_STOP_TOWNS[lessonIndex + 1] ?? null : null),
    [lessonIndex]
  );
  const isCurrentActiveLesson = useMemo(
    () => lessonIndex >= 0 && lessonIndex === completedStops,
    [lessonIndex, completedStops]
  );
  const isAlreadyCompleted = useMemo(
    () => lessonIndex >= 0 && lessonIndex < completedStops,
    [lessonIndex, completedStops]
  );
  const hookCard = useMemo(() => (lesson ? resolveHookCard(lesson.cards) : null), [lesson]);
  const summaryCard = useMemo(() => (lesson ? resolveSummaryCard(lesson.cards) : null), [lesson]);
  const hintCard = useMemo(() => (lesson ? resolveHintCard(lesson.cards) : null), [lesson]);
  const currentExercise = lesson?.exercises[currentExerciseIndex] ?? null;
  const lessonRetryThreshold = useMemo(
    () => readNumericMetadata(lesson?.metadata.retry_until_explanation) ?? 2,
    [lesson]
  );
  const displayStats = useMemo<SessionStats>(
    () => ({
      attempts: Math.max(progress?.attempts ?? 0, sessionStats.attempts),
      correctCount: Math.max(progress?.correctCount ?? 0, sessionStats.correctCount),
      wrongCount: Math.max(progress?.wrongCount ?? 0, sessionStats.wrongCount),
    }),
    [progress, sessionStats]
  );

  useEffect(() => {
    setStage('intro');
    setCurrentExerciseIndex(0);
    setSelectedOptionId(null);
    setFeedbackState(null);
    setAttemptCounts({});
    setSessionStats(EMPTY_STATS);
    setSaveMessage(null);
    setIsCompletionStored(false);
    setHasStartedRemoteProgress(false);
    setCorrectStreak(0);
  }, [lesson?.id]);

  useEffect(() => {
    if (!lesson) return;
    if (isProgressLoading) return;
    if (hasStartedRemoteProgress) return;
    if (progress?.status === 'completed') return;

    void markInProgress(progress).then((result) => {
      setHasStartedRemoteProgress(true);
      if (!result.ok) {
        setSaveMessage(result.message);
      }
    });
  }, [lesson, progress, markInProgress, isProgressLoading, hasStartedRemoteProgress]);

  useEffect(() => {
    if (!nextLesson?.slug) return;
    void prefetch(nextLesson.slug);
  }, [nextLesson?.slug, prefetch]);

  const handleStart = () => {
    if (!lesson) return;
    if (lesson.exercises.length === 0) {
      setStage('summary');
      return;
    }
    setStage('exercise');
  };

  const handleRestartLesson = () => {
    setStage('intro');
    setCurrentExerciseIndex(0);
    setSelectedOptionId(null);
    setFeedbackState(null);
    setAttemptCounts({});
    setSessionStats(EMPTY_STATS);
    setIsCompletionStored(false);
    setSaveMessage(null);
    setCorrectStreak(0);
  };

  const handleSelectOption = (optionId: number | string) => {
    setSelectedOptionId(optionId);
  };

  const handleExerciseAnswer = async () => {
    if (!lesson || !currentExercise || selectedOptionId === null) return;
    const selectedOption = currentExercise.options.find((option) => option.id === selectedOptionId);
    if (!selectedOption) return;

    const nextAttemptCount = (attemptCounts[String(currentExercise.id)] ?? 0) + 1;
    const isCorrect = selectedOption.isCorrect;
    const mapping = !isCorrect ? resolveFeedbackRule(currentExercise.feedbackMappings, selectedOption) : null;
    const threshold = resolveHelperThreshold(currentExercise, lessonRetryThreshold);
    const helperText = !isCorrect && nextAttemptCount >= threshold
      ? resolveAdditionalHelper(currentExercise, selectedOption, mapping, hintCard)
      : null;
    const nextStats: SessionStats = {
      attempts: sessionStats.attempts + 1,
      correctCount: sessionStats.correctCount + (isCorrect ? 1 : 0),
      wrongCount: sessionStats.wrongCount + (isCorrect ? 0 : 1),
    };
    const nextCorrectStreak = isCorrect ? correctStreak + 1 : 0;

    setAttemptCounts((previous) => ({
      ...previous,
      [String(currentExercise.id)]: nextAttemptCount,
    }));
    setSessionStats(nextStats);
    setCorrectStreak(nextCorrectStreak);

    const attemptResult = await recordAttempt({
      exerciseId: currentExercise.id,
      selectedOptionId: selectedOption.id,
      isCorrect,
      feedbackRuleId: mapping?.feedbackRuleId ?? null,
    });

    if (!attemptResult.ok) {
      setSaveMessage(attemptResult.message);
    }

    setFeedbackState({
      title: resolveStreakFeedbackTitle(isCorrect, nextCorrectStreak),
      isCorrect,
      message: resolveImmediateFeedbackMessage(currentExercise, selectedOption, isCorrect),
      helperText,
    });
    setStage('feedback');
  };

  const handleFeedbackContinue = async () => {
    if (!feedbackState) return;

    if (!feedbackState.isCorrect) {
      setSelectedOptionId(null);
      setStage('exercise');
      return;
    }

    const nextIndex = currentExerciseIndex + 1;
    if (!lesson || nextIndex < lesson.exercises.length) {
      setCurrentExerciseIndex(nextIndex);
      setSelectedOptionId(null);
      setStage('exercise');
      return;
    }

    if (!isCompletionStored) {
      const completionResult = await completeLesson({
        stats: sessionStats,
        previousProgress: progress,
      });
      if (!completionResult.ok) {
        setSaveMessage(completionResult.message);
      } else {
        setIsCompletionStored(true);
      }
    }

    setStage('summary');
  };

  const handleSummaryPrimaryAction = () => {
    if (isCurrentActiveLesson && !isAlreadyCompleted) {
      onCompleteStop();
    }

    if (nextLesson?.slug) {
      onOpenLesson(nextLesson.slug);
    }
  };

  return (
    <section className="flex min-h-full flex-col gap-4">
      {isLoading ? (
        <div className="grid gap-4 overflow-hidden rounded-[2rem] border border-[rgba(216,224,231,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,249,0.95))] px-5 py-5 shadow-[var(--shadow-card)] animate-pulse">
          <div className="h-3 w-20 rounded-full bg-slate-200/80" />
          <div className="h-10 w-44 rounded-[18px] bg-slate-100/90" />
          <div className="h-32 rounded-[22px] bg-slate-100/80" />
          <div className="h-12 rounded-full bg-slate-100/80" />
        </div>
      ) : lesson ? (
        <>
          <ProgressIndicator
            current={stage === 'summary' ? lesson.exercises.length : Math.min(currentExerciseIndex + (stage === 'feedback' && feedbackState?.isCorrect ? 1 : 0), lesson.exercises.length)}
            total={Math.max(lesson.exercises.length, 1)}
            label="Ikasgaiaren bidea"
          />

          {saveMessage || (!isProgressLoading && progressMessage && !progress) ? (
            <div className="flex items-start gap-3 rounded-[1.5rem] border border-[rgba(236,187,92,0.26)] bg-[linear-gradient(180deg,rgba(255,250,240,0.98),rgba(255,247,232,0.96))] px-4 py-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[rgba(236,187,92,0.26)] bg-white/84 text-[#b47b10]">
                <AlertCircle className="h-[1rem] w-[1rem]" />
              </span>
              <p className="m-0 text-[0.9rem] font-semibold leading-relaxed text-[var(--text)]">
                {saveMessage || progressMessage}
              </p>
            </div>
          ) : null}

          {stage === 'intro' ? (
            <LessonIntroCard
              lesson={lesson}
              hookCard={hookCard}
              onStart={handleStart}
            />
          ) : null}

          {(stage === 'exercise' || stage === 'feedback') && currentExercise ? (
            <LessonExerciseCard
              exercise={currentExercise}
              selectedOptionId={selectedOptionId}
              isLocked={stage === 'feedback'}
              revealFeedback={stage === 'feedback'}
              isAnswerCorrect={feedbackState?.isCorrect ?? false}
              onSelect={handleSelectOption}
              footer={
                stage === 'exercise' ? (
                  <>
                    {selectedOptionId === null ? (
                      <p className="m-0 text-center text-[0.78rem] font-semibold text-[var(--muted)]">
                        Aukera bat aukeratu
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={selectedOptionId === null}
                      onClick={() => void handleExerciseAnswer()}
                      className="inline-flex min-h-[3rem] w-full items-center justify-center rounded-full bg-[linear-gradient(180deg,#0b6f69,#0c847b)] px-6 text-[0.98rem] font-black text-white shadow-[0_14px_26px_rgba(12,132,123,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Saiatu!
                    </button>
                  </>
                ) : stage === 'feedback' && feedbackState ? (
                  <LessonFeedbackCard
                    compact
                    embedded
                    title={feedbackState.title}
                    isCorrect={feedbackState.isCorrect}
                    message={feedbackState.message}
                    helperText={feedbackState.helperText}
                    onContinue={() => void handleFeedbackContinue()}
                  />
                ) : null
              }
            />
          ) : null}

          {stage === 'summary' ? (
            <LessonSummaryCard
              lesson={lesson}
              summaryCard={summaryCard}
              stats={displayStats}
              isAlreadyCompleted={isAlreadyCompleted}
              nextStopLabel={nextStopTown}
              onPrimaryAction={nextLesson?.slug || (isCurrentActiveLesson && !isAlreadyCompleted) ? handleSummaryPrimaryAction : null}
              primaryLabel={nextLesson?.slug ? 'Hurrengo ikasgaia' : 'Ikasgaia ulertuta'}
              onSecondaryAction={handleRestartLesson}
              secondaryLabel="Berriro egin"
            />
          ) : null}

          {lesson.exercises.length === 0 && stage !== 'summary' ? (
            <div className="flex items-start gap-3 rounded-[1.5rem] border border-[rgba(236,187,92,0.26)] bg-[linear-gradient(180deg,rgba(255,250,240,0.98),rgba(255,247,232,0.96))] px-4 py-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[rgba(236,187,92,0.26)] bg-white/84 text-[#b47b10]">
                <AlertCircle className="h-[1rem] w-[1rem]" />
              </span>
              <div className="grid gap-2">
                <p className="m-0 text-[0.92rem] font-semibold leading-relaxed text-[var(--text)]">
                  Ikasgai honek oraindik ez dauka ariketarik. Sarrera bakarrik dago prestatuta.
                </p>
                <button
                  type="button"
                  onClick={() => setStage('summary')}
                  className="inline-flex min-h-[2.5rem] w-fit items-center justify-center rounded-full border border-[rgba(220,228,235,0.9)] bg-white px-4 text-[0.82rem] font-extrabold text-[var(--text)]"
                >
                  Ikusi laburpena
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex items-start gap-3 rounded-[1.5rem] border border-[rgba(236,187,92,0.26)] bg-[linear-gradient(180deg,rgba(255,250,240,0.98),rgba(255,247,232,0.96))] px-4 py-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[rgba(236,187,92,0.26)] bg-white/84 text-[#b47b10]">
            <AlertCircle className="h-[1rem] w-[1rem]" />
          </span>
          <div className="grid gap-2">
            <p className="m-0 text-[0.92rem] font-semibold leading-relaxed text-[var(--text)]">{message}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex min-h-[2.5rem] w-fit items-center justify-center rounded-full border border-[rgba(220,228,235,0.9)] bg-white px-4 text-[0.82rem] font-extrabold text-[var(--text)]"
            >
              Berriro saiatu
            </button>
          </div>
        </div>
      )}
    </section>
  );
});
