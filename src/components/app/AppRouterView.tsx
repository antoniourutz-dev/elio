import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import type { GameLevel, PlayerIdentity } from '../../euskeraLearning';
import { AccessScreen } from '../../panels/AccessScreen';
import { DailyHomeView } from '../../panels/DailyHomeView';
import { GrammarMapView } from '../../panels/GrammarMapView';
import { LearnHubView } from '../../panels/LearnHubView';
import { VerbsView } from '../../panels/VerbsView';
import { VocabularyView } from '../../panels/VocabularyView';
import { LoadingPanel, SessionLoadingView } from '../shared/AppLoaders';
import type { AccessViewModel, DailyGameViewModel, MainViewModel, SynonymGameViewModel } from './appScreenModelTypes';

type MainScreen = 'daily' | 'learn' | 'synonyms' | 'grammar' | 'vocabulary' | 'verbs' | 'stats' | 'profile' | 'admin';

const AdminPanel = lazy(() => import('../../panels/AdminPanel'));

const lazyNamed = <TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  key: keyof TModule
) => lazy(async () => ({ default: (await loader())[key] as never }));

const DailyGameRunner = lazyNamed(() => import('../../panels/DailyGameRunner'), 'DailyGameRunner');
const LevelsView = lazyNamed(() => import('../../panels/LevelsView'), 'LevelsView');
const ProfileView = lazyNamed(() => import('../../panels/ProfileView'), 'ProfileView');
const QuizView = lazyNamed(() => import('../../panels/QuizView'), 'QuizView');
const StatsView = lazyNamed(() => import('../../panels/StatsView'), 'StatsView');
const SummaryView = lazyNamed(() => import('../../panels/SummaryView'), 'SummaryView');
const StudyFlashcardsView = lazyNamed(() => import('../../panels/StudyFlashcardsView'), 'StudyFlashcardsView');

const Page = ({ children, pageKey }: { children: ReactNode; pageKey: string }) => (
  <motion.section
    key={pageKey}
    initial={{ opacity: 0, y: 16, scale: 0.985 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -16, scale: 0.985 }}
    transition={{ duration: 0.24, ease: 'easeOut' }}
    className="grid w-full h-full min-h-full"
  >
    {children}
  </motion.section>
);

interface AppRouterViewProps {
  isSessionLoading: boolean;
  activePlayer: PlayerIdentity | null;
  access: AccessViewModel;
  mainScreen: MainScreen;
  main: MainViewModel;
  dailyGame: DailyGameViewModel;
  synonymGame: SynonymGameViewModel;
  studyLevel: GameLevel | null;
  onStudyLevel: (level: GameLevel) => void;
  onCloseStudy: () => void;
}

export function AppRouterView({
  isSessionLoading,
  activePlayer,
  access,
  mainScreen,
  main,
  dailyGame,
  synonymGame,
  studyLevel,
  onStudyLevel,
  onCloseStudy,
}: AppRouterViewProps) {
  const { session: dailySession, elapsedSeconds, onAnswer: onAnswerDailyQuestion, onSolve: onSolveDailyQuestion, onAdvance: onAdvanceDailyQuestion } = dailyGame;
  const { quiz, currentQuestion, currentAnswer, quizAdvanceLabel, summary, summaryErrors, onAnswer: onAnswerCurrentQuestion, onAdvance: onAdvanceQuiz } =
    synonymGame;

  return (
    <AnimatePresence mode="wait">
      {isSessionLoading && (
        <Page pageKey="session-loading">
          <SessionLoadingView />
        </Page>
      )}

      {!isSessionLoading && !activePlayer && (
        <Page pageKey="access">
          <AccessScreen
            accessCode={access.code}
            accessPassword={access.password}
            accessMessage={access.message}
            isPasswordVisible={access.isPasswordVisible}
            isSubmittingAccess={access.isSubmitting}
            onCodeChange={access.onCodeChange}
            onPasswordChange={access.onPasswordChange}
            onPasswordVisibilityToggle={access.onPasswordVisibilityToggle}
            onSubmit={(event) => void access.onSubmit(event)}
          />
        </Page>
      )}

      {!isSessionLoading && activePlayer && !dailySession && !quiz && !summary && (
        <Page pageKey={`main-${mainScreen}`}>
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className={clsx(
              'grid gap-[22px]',
              mainScreen === 'grammar' ? 'min-h-full grid-rows-[minmax(0,1fr)]' : 'content-start',
              mainScreen === 'daily' && 'min-h-full'
            )}
          >
            {mainScreen === 'daily' && (
              <DailyHomeView
                dayKey={main.dayKey}
                playerName={activePlayer?.code}
                dailyResult={main.dailyResult}
                weekHistory={main.weekHistory}
                ranking={main.ranking}
                weeklyRanking={main.weeklyRanking}
                myRankEntry={main.myRankEntry}
                myWeekRankEntry={main.myWeekRankEntry}
                isLoadingData={main.isLoadingData}
                canStartGame={main.canStartDailyGame}
                onStartGame={main.onStartDailyGame}
                onGoLearn={main.onGoLearn}
                onGoSynonyms={main.onGoSynonyms}
                onGoGrammar={main.onGoGrammar}
                onGoVocabulary={main.onGoVocabulary}
                onGoVerbs={main.onGoVerbs}
              />
            )}

            {mainScreen === 'learn' && (
              <LearnHubView
                onGoSynonyms={main.onGoSynonyms}
                onGoGrammar={main.onGoGrammar}
                onGoVocabulary={main.onGoVocabulary}
                onGoVerbs={main.onGoVerbs}
                onStartOrthographyPractice={main.onStartOrthographyPractice}
              />
            )}

            {mainScreen === 'synonyms' && (
              <Suspense fallback={<LoadingPanel />}>
                <LevelsView
                  progress={main.progress}
                  entries={main.bankState.entries}
                  isLoading={main.bankState.isLoading}
                  isError={!main.bankState.isLoading && !main.bankState.isReady && main.bankState.entries.length === 0}
                  currentTargetLevel={main.currentTargetLevel}
                  onStartLevel={main.onStartLevel}
                  onRetry={main.onRefreshBank}
                />
              </Suspense>
            )}

            {mainScreen === 'grammar' && main.isSuperUser && (
              <GrammarMapView />
            )}

            {mainScreen === 'vocabulary' && (
              <VocabularyView isActive />
            )}

            {mainScreen === 'verbs' && (
              <VerbsView isActive />
            )}

            {mainScreen === 'stats' && (
              <Suspense fallback={<LoadingPanel />}>
                <StatsView
                  progress={main.progress}
                  entries={main.bankState.entries}
                  currentTargetLevel={main.currentTargetLevel}
                  homeNotice={main.homeNotice}
                  isDemoMode={main.isDemoMode}
                  uiMessage={main.uiMessage}
                />
              </Suspense>
            )}

            {mainScreen === 'admin' && main.isTeacher && (
              <Suspense fallback={<LoadingPanel minHeightClass="min-h-[200px]" roundedClass="rounded-[30px]" tone="muted" />}>
                <AdminPanel
                  bankState={main.bankState}
                  activePlayer={activePlayer}
                  onScrollTop={main.onScrollTop}
                  onRefreshBank={main.onRefreshBank}
                />
              </Suspense>
            )}

            {mainScreen === 'profile' && !studyLevel && (
              <Suspense fallback={<LoadingPanel />}>
                <ProfileView
                  activePlayer={activePlayer}
                  weekHistory={main.weekHistory}
                  isLoadingData={main.isLoadingData}
                  progress={main.progress}
                  entries={main.bankState.entries}
                  onStudyLevel={onStudyLevel}
                  onLogout={main.onLogout}
                />
              </Suspense>
            )}

            {mainScreen === 'profile' && studyLevel && (
              <Suspense fallback={<LoadingPanel />}>
                <StudyFlashcardsView
                  playerId={activePlayer.userId}
                  level={studyLevel}
                  entries={main.bankState.entries}
                  onClose={onCloseStudy}
                />
              </Suspense>
            )}
          </motion.section>
        </Page>
      )}

      {!isSessionLoading && activePlayer && dailySession && (
        <Page pageKey="daily-game">
          <Suspense fallback={<LoadingPanel minHeightClass="min-h-[28rem]" />}>
            <DailyGameRunner
              session={dailySession}
              elapsedSeconds={elapsedSeconds}
              onAnswer={onAnswerDailyQuestion}
              onSolve={onSolveDailyQuestion}
              onAdvance={onAdvanceDailyQuestion}
            />
          </Suspense>
        </Page>
      )}

      {!isSessionLoading && activePlayer && !dailySession && quiz && currentQuestion && (
        <Page pageKey={`quiz-${quiz.level.id}`}>
          <Suspense fallback={<LoadingPanel minHeightClass="min-h-[28rem]" />}>
            <QuizView
              quiz={quiz}
              currentQuestion={currentQuestion}
              currentAnswer={currentAnswer}
              quizAdvanceLabel={quizAdvanceLabel}
              onAnswer={onAnswerCurrentQuestion}
              onAdvance={onAdvanceQuiz}
            />
          </Suspense>
        </Page>
      )}

      {!isSessionLoading && activePlayer && !dailySession && summary && !quiz && (
        <Page pageKey={`summary-${summary.level.id}`}>
          <Suspense fallback={<LoadingPanel minHeightClass="min-h-[28rem]" />}>
            <SummaryView summary={summary} summaryErrors={summaryErrors} />
          </Suspense>
        </Page>
      )}
    </AnimatePresence>
  );
}
