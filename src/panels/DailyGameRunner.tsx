import { memo, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { CheckCircle2, CirclePlay, Eye, SendHorizontal, XCircle } from 'lucide-react';
import { SegmentBar } from '../components/SegmentBar';
import type { DailyGameSession, DailyAnswer } from '../appTypes';

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
const SPELLING_OPTIONS = ['ZUZEN', 'OKER'] as const;

interface DailyGameRunnerProps {
  session: DailyGameSession;
  elapsedSeconds: number;
  onAnswer: (answer: string) => void;
  onSolve: () => void;
  onAdvance: () => void;
}

export const DailyGameRunner = memo(function DailyGameRunner({
  session,
  elapsedSeconds: _elapsedSeconds,
  onAnswer,
  onSolve,
  onAdvance,
}: DailyGameRunnerProps) {
  const currentQuestion = session.questions[session.currentIndex];
  const currentAnswer: DailyAnswer | undefined = session.answers[session.currentIndex];
  const isAnswered = Boolean(currentAnswer);
  const isLastQuestion = session.currentIndex === session.questions.length - 1;
  const advanceLabel = isLastQuestion ? 'Amaitu' : 'Hurrengoa';
  const [typedAnswerState, setTypedAnswerState] = useState<{ questionId: string; value: string }>({ questionId: '', value: '' });

  const firstOptionRef = useRef<HTMLButtonElement | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const advanceRef = useRef<HTMLButtonElement | null>(null);
  const typedAnswer = currentQuestion.type === 'eroglifico' && typedAnswerState.questionId === currentQuestion.id ? typedAnswerState.value : '';

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (currentQuestion.type === 'eroglifico') {
        answerInputRef.current?.focus();
      } else {
        firstOptionRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [session.currentIndex, currentQuestion.type]);

  useEffect(() => {
    if (!isAnswered) return;
    const frame = requestAnimationFrame(() => {
      advanceRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isAnswered]);

  const submitTypedAnswer = () => {
    const next = typedAnswer.trim();
    if (!next || isAnswered || currentQuestion.type !== 'eroglifico') return;
    onAnswer(next);
  };

  const handleHieroglyphKeyDown = (event: { key: string; preventDefault: () => void }) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitTypedAnswer();
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="grid w-full h-full gap-3 px-[18px] pt-2 pb-[18px] rounded-[36px] max-w-[680px] mx-auto content-start auto-rows-min"
    >
      <div className="flex items-center justify-start pt-0.5">
        <SegmentBar
          total={session.questions.length}
          answers={session.answers.map((a) => ({
            questionId: a.questionId,
            word: '',
            selectedAnswer: a.selectedAnswer,
            correctAnswer: a.correctAnswer,
            isCorrect: a.isCorrect,
          }))}
          currentIndex={session.currentIndex}
        />
      </div>

      {currentQuestion.type === 'spelling' && (
        <>
          <div className="min-h-[108px] p-5 rounded-[28px] border border-[rgba(216,226,241,0.75)] bg-gradient-to-b from-white to-[rgba(248,251,253,0.96)] grid place-items-center shadow-[0_8px_24px_rgba(107,148,165,0.09),inset_0_1px_0_white]">
            <div className="text-center font-display text-[clamp(2rem,8vw,2.9rem)] font-bold tracking-[-0.05em] text-[#223748]" aria-live="polite" aria-atomic="true">
              {currentQuestion.displayText}
            </div>
            <p className="text-[0.8rem] text-[#76889a] mt-2 mb-0 text-center font-semibold">Zuzena ala okerra?</p>
          </div>

          <div
            className="grid grid-cols-2 mt-2 gap-2.5 min-h-[16.875rem] content-start"
            role="group"
            aria-label="Erantzun aukerak"
          >
            {SPELLING_OPTIONS.map((option, index) => {
              const isSelected = currentAnswer?.selectedAnswer === option;
              const isCorrectAtThisOption = currentQuestion.correctAnswer === option;
              const isCorrectAnswered = isAnswered && isCorrectAtThisOption;
              const isWrongAnswered = isAnswered && isSelected && !isCorrectAtThisOption;

              return (
                <button
                  key={option}
                  ref={index === 0 ? firstOptionRef : undefined}
                  type="button"
                  className={clsx(
                    'flex flex-row items-center justify-center gap-[0.9rem] min-h-[10.8rem] p-[1.4rem_1.5rem] rounded-[26px] border-[1.5px] font-extrabold text-[1.08rem] transition-all duration-150 cursor-pointer outline-none shadow-[0_8px_22px_rgba(107,148,165,0.06)]',
                    option === 'ZUZEN'
                      ? 'border-[#81d8b6] bg-[rgba(235,250,244,0.6)] text-[#2ba074] hover:-translate-y-[1px] hover:bg-[rgba(215,248,232,0.9)] hover:border-[#5dc09f] hover:shadow-[0_10px_18px_rgba(95,200,160,0.12)] active:translate-y-0'
                      : 'border-[#f4bac0] bg-[rgba(255,244,242,0.6)] text-[#d05060] hover:-translate-y-[1px] hover:bg-[rgba(253,235,230,0.9)] hover:border-[#cc7a70] hover:shadow-[0_10px_18px_rgba(183,89,77,0.1)] active:translate-y-0',
                    isCorrectAnswered &&
                      'bg-[linear-gradient(180deg,#dffaf0,#bff0d7)] border-[#37b788] border-2 scale-100 text-[#173a33] shadow-[0_16px_30px_rgba(55,183,136,0.24)] ring-1 ring-[rgba(55,183,136,0.22)]',
                    isWrongAnswered && 'bg-[linear-gradient(180deg,#fff0ec,#f9d8d0)] border-[#db7768] border-2 text-[#5b241d] shadow-[0_12px_24px_rgba(183,89,77,0.16)]',
                    isAnswered && !isSelected && !isCorrectAtThisOption && 'opacity-60 grayscale-[0.35]',
                    isAnswered && 'cursor-default'
                  )}
                  disabled={isAnswered}
                  onClick={() => onAnswer(option)}
                >
                  <span className={clsx('transition-opacity duration-200', isAnswered ? 'opacity-100' : 'opacity-45')}>
                    {option === 'ZUZEN' ? <CheckCircle2 className="w-[1.8rem] h-[1.8rem]" /> : <XCircle className="w-[1.8rem] h-[1.8rem]" />}
                  </span>
                  <span className="text-[1.42rem] font-black leading-none tracking-[-0.03em]">{option}</span>
                </button>
              );
            })}
            {Array.from({ length: 2 }, (_, index) => (
              <div
                key={`spell-spacer-${index}`}
                aria-hidden="true"
                className="min-h-[5.45rem] rounded-[26px] opacity-0 pointer-events-none select-none"
              />
            ))}
          </div>
        </>
      )}

      {currentQuestion.type === 'synonym' && (
        <>
          <div className="min-h-[108px] p-5 rounded-[28px] border border-[rgba(216,226,241,0.75)] bg-gradient-to-b from-white to-[rgba(248,251,253,0.96)] grid place-items-center shadow-[0_8px_24px_rgba(107,148,165,0.09),inset_0_1px_0_white]">
            <div className="text-center font-display text-[clamp(2rem,8vw,2.9rem)] font-bold tracking-[-0.05em] text-[#223748]" aria-live="polite" aria-atomic="true">
              {currentQuestion.word}
            </div>
          </div>

          <div className="grid gap-2.5 mt-2" role="group" aria-label="Erantzun aukerak">
            {currentQuestion.options.map((option, index) => {
              const isSelected = currentAnswer?.selectedAnswer === option;
              const isCorrectAtThisOption = currentQuestion.correctAnswer === option;
              const isCorrectAnswered = isAnswered && isCorrectAtThisOption;
              const isWrongAnswered = isAnswered && isSelected && !isCorrectAtThisOption;

              return (
                <button
                  key={option}
                  ref={index === 0 ? firstOptionRef : undefined}
                  type="button"
                  className={clsx(
                    'flex items-center gap-3 w-full min-h-[60px] px-4 rounded-[20px] border-[1.5px] border-[#e1e5ee] bg-white text-[#223748] text-left transition-all duration-150 cursor-pointer outline-none font-extrabold shadow-[0_4px_14px_rgba(107,148,165,0.04)]',
                    !isAnswered && 'hover:-translate-y-[1px] hover:border-[rgba(107,184,217,0.4)] hover:bg-[#f2f8fd] hover:shadow-[0_10px_20px_rgba(107,184,217,0.1)] active:translate-y-0',
                    isCorrectAnswered &&
                      'border-[#37b788] border-2 bg-[linear-gradient(180deg,#dffaf0,#bff0d7)] text-[#173a33] shadow-[0_16px_30px_rgba(55,183,136,0.24)] ring-1 ring-[rgba(55,183,136,0.22)] animate-[answer-celebrate_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]',
                    isWrongAnswered && 'border-[#db7768] border-2 bg-[linear-gradient(180deg,#fff0ec,#f9d8d0)] text-[#5b241d] shadow-[0_12px_24px_rgba(217,134,122,0.16)]',
                    isAnswered && !isSelected && !isCorrectAtThisOption && 'opacity-55 grayscale-[0.15]',
                    isAnswered && 'cursor-default'
                  )}
                  disabled={isAnswered}
                  onClick={() => onAnswer(option)}
                >
                  <span
                    className={clsx(
                      'shrink-0 w-[30px] h-[30px] rounded-full grid place-items-center text-[0.82rem] font-black',
                      !isAnswered && 'bg-[#edf2f4] text-[#95a1ae]',
                      isCorrectAnswered && 'bg-[#2fb483] text-white',
                      isWrongAnswered && 'bg-[#dd7f70] text-white'
                    )}
                  >
                    {OPTION_LABELS[index] ?? index + 1}
                  </span>
                  <span className="flex-1 text-[1.05rem] font-black tracking-[-0.02em] leading-[1.25]">{option}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {currentQuestion.type === 'eroglifico' && (
        <>
          <div className="grid gap-4 rounded-[28px] border border-[rgba(216,226,241,0.75)] bg-gradient-to-b from-white to-[rgba(248,251,253,0.96)] p-4 shadow-[0_8px_24px_rgba(107,148,165,0.09),inset_0_1px_0_white]">
            <div className="overflow-hidden rounded-[22px] border border-[rgba(216,226,241,0.8)] bg-[rgba(244,248,252,0.8)]">
              <img src={currentQuestion.imageUrl} alt={currentQuestion.clue} className="block w-full h-auto object-cover" />
            </div>

            <p className="text-center font-display text-[clamp(1.2rem,5vw,1.75rem)] italic font-bold tracking-[-0.04em] text-[#223748]">
              &quot;{currentQuestion.clue}&quot;
            </p>

            <div className="grid gap-3">
              <div className="flex items-center gap-2 rounded-[18px] border border-[rgba(206,217,229,0.92)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,252,0.96))] px-4 py-[0.82rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_18px_rgba(107,148,165,0.05)] transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-[rgba(107,184,217,0.42)] focus-within:bg-white focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_0_0_3px_rgba(107,184,217,0.08),0_12px_24px_rgba(107,148,165,0.08)]">
                <input
                  ref={answerInputRef}
                  type="text"
                  value={typedAnswer}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setTypedAnswerState({ questionId: currentQuestion.id, value: event.target.value })
                  }
                  onKeyDown={handleHieroglyphKeyDown}
                  placeholder="Idatzi erantzuna"
                  className="w-full min-w-0 appearance-none border-0! bg-transparent shadow-none! ring-0! outline-none! focus:border-0! focus:ring-0! focus:outline-none! text-[1rem] font-bold tracking-[-0.02em] text-[#223748] placeholder:font-semibold placeholder:text-[#95a4b5]"
                  disabled={isAnswered}
                />
              </div>

              {!isAnswered && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-[18px] bg-[linear-gradient(135deg,#4db6a5,#89cf95)] text-white font-extrabold shadow-[0_12px_24px_rgba(84,177,156,0.18)] transition-transform duration-150 hover:-translate-y-[1px] active:translate-y-0"
                    onClick={submitTypedAnswer}
                    disabled={typedAnswer.trim().length === 0}
                  >
                    <SendHorizontal className="w-4 h-4" />
                    <span>Erantzun</span>
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-[18px] border border-[rgba(216,226,241,0.92)] bg-white text-[#4b677d] font-extrabold shadow-[0_8px_18px_rgba(107,148,165,0.06)] transition-transform duration-150 hover:-translate-y-[1px] active:translate-y-0"
                    onClick={onSolve}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ebatzi</span>
                  </button>
                </div>
              )}

              {isAnswered && (
                <div
                  className={clsx(
                    'rounded-[20px] border px-4 py-3',
                    currentAnswer?.isCorrect
                      ? 'border-[#81d8b6] bg-[rgba(233,249,243,0.96)]'
                      : 'border-[#efb0a7] bg-[rgba(255,240,238,0.96)]'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {currentAnswer?.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-[#2f9a74]" />
                    ) : (
                      <Eye className="w-5 h-5 text-[#b7594d]" />
                    )}
                    <span className={clsx('text-[0.76rem] font-extrabold uppercase tracking-[0.12em]', currentAnswer?.isCorrect ? 'text-[#2f9a74]' : 'text-[#b7594d]')}>
                      {currentAnswer?.isCorrect ? 'Asmatu duzu' : currentAnswer?.wasSolved ? 'Ebazpena' : 'Erantzun zuzena'}
                    </span>
                  </div>
                  <p className={clsx('mt-2 font-display text-[1.4rem] font-bold tracking-[-0.04em]', currentAnswer?.isCorrect ? 'text-[#1f6f58]' : 'text-[#a6453b]')}>
                    {currentQuestion.correctAnswer}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="grid pt-2 sm:pt-4">
        <button
          ref={advanceRef}
          className={clsx(
            'inline-flex items-center justify-center gap-2.5 w-full min-h-[54px] px-[18px] rounded-full font-black text-white transition-all duration-150 cursor-pointer shadow-[0_14px_30px_rgba(100,200,174,0.26)]',
            !isAnswered ? 'opacity-50 cursor-not-allowed bg-[#a0bfc4] shadow-none' : 'bg-gradient-to-r from-[#52bec2] via-[#7ed4ae] to-[#cfe07e] hover:-translate-y-px hover:shadow-[0_16px_34px_rgba(100,200,174,0.32)] active:scale-[0.985]'
          )}
          type="button"
          disabled={!isAnswered}
          onClick={onAdvance}
        >
          <CirclePlay className="w-5 h-5" />
          <span className="text-[1.1rem]">{advanceLabel}</span>
        </button>
      </div>
    </motion.section>
  );
});
