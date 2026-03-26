import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { GameLevel, PlayerIdentity } from '../../lib/types';
import { AccessScreen } from '../../panels/AccessScreen';
import { LoadingPanel, SessionLoadingView } from '../shared/AppLoaders';
import { PerformanceBoundary } from '../../lib/performanceMetrics';
import type {
  AccessViewModel,
  DailyGameViewModel,
  DailyHomeViewModel,
  MainViewModel,
  ProfileViewModel,
  StatsViewModel,
  SynonymGameViewModel,
} from './appScreenModelTypes';

type MainScreen = 'daily' | 'learn' | 'synonyms' | 'grammar' | 'grammar-lesson' | 'vocabulary' | 'topics' | 'verbs' | 'stats' | 'profile' | 'admin';

const AdminPanel = lazy(() => import('../../panels/AdminPanel'));

const lazyNamed = <TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  key: keyof TModule
) => lazy(async () => ({ default: (await loader())[key] as never }));

const DailyHomeView = lazyNamed(() => import('../../panels/DailyHomeView'), 'DailyHomeView');
const DictionaryView = lazyNamed(() => import('../../panels/DictionaryView'), 'DictionaryView');
const DailyGameRunner = lazyNamed(() => import('../../panels/DailyGameRunner'), 'DailyGameRunner');
const GrammarLessonView = lazyNamed(() => import('../../panels/GrammarLessonView'), 'GrammarLessonView');
const GrammarMapView = lazyNamed(() => import('../../panels/GrammarMapView'), 'GrammarMapView');
const LearnHubView = lazyNamed(() => import('../../panels/LearnHubView'), 'LearnHubView');
const LevelsView = lazyNamed(() => import('../../panels/LevelsView'), 'LevelsView');
const ProfileView = lazyNamed(() => import('../../panels/ProfileView'), 'ProfileView');
const QuizView = lazyNamed(() => import('../../panels/QuizView'), 'QuizView');
const StatsView = lazyNamed(() => import('../../panels/StatsView'), 'StatsView');
const SummaryView = lazyNamed(() => import('../../panels/SummaryView'), 'SummaryView');
const StudyFlashcardsView = lazyNamed(() => import('../../panels/StudyFlashcardsView'), 'StudyFlashcardsView');
const VerbsView = lazyNamed(() => import('../../panels/VerbsView'), 'VerbsView');

const Page = ({ children, pageKey }: { children: ReactNode; pageKey: string }) => (
  <section key={pageKey} className="grid w-full h-full min-h-full animate-[fade-up_220ms_ease-out]">
    {children}
  </section>
);

interface AppRouterViewProps {
  isSessionLoading: boolean;
  activePlayer: PlayerIdentity | null;
  access: AccessViewModel;
  mainScreen: MainScreen;
  dailyHome: DailyHomeViewModel;
  stats: StatsViewModel;
  profile: ProfileViewModel;
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
  dailyHome,
  stats,
  profile,
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
    <>
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
          <section
            className={clsx(
              'grid gap-[22px]',
              mainScreen === 'grammar' || mainScreen === 'grammar-lesson' ? 'min-h-full grid-rows-[minmax(0,1fr)]' : 'content-start',
              mainScreen === 'daily' && 'min-h-full'
            )}
          >
            {mainScreen === 'daily' && (
              <Suspense fallback={<LoadingPanel />}>
                <PerformanceBoundary id="DailyHomeView">
                  <DailyHomeView
                    dayKey={dailyHome.dayKey}
                    dailyResult={dailyHome.dailyResult}
                    weekHistory={dailyHome.weekHistory}
                    ranking={dailyHome.ranking}
                    weeklyRanking={dailyHome.weeklyRanking}
                    myRankEntry={dailyHome.myRankEntry}
                    myWeekRankEntry={dailyHome.myWeekRankEntry}
                    isLoadingData={dailyHome.isLoadingData}
                    canStartGame={dailyHome.canStartGame}
                    onStartGame={dailyHome.onStartGame}
                    onGoLearn={dailyHome.onGoLearn}
                    onGoSynonyms={dailyHome.onGoSynonyms}
                    onGoGrammar={dailyHome.onGoGrammar}
                    onGoVocabulary={dailyHome.onGoVocabulary}
                    onGoVerbs={dailyHome.onGoVerbs}
                  />
                </PerformanceBoundary>
              </Suspense>
            )}

            {mainScreen === 'learn' && (
              <Suspense fallback={<LoadingPanel />}>
                <LearnHubView
                  onGoSynonyms={main.onGoSynonyms}
                  onGoGrammar={main.onGoGrammar}
                  onGoVocabulary={main.onGoVocabulary}
                  onGoTopics={main.onGoTopics}
                  onGoVerbs={main.onGoVerbs}
                  onStartOrthographyPractice={main.onStartOrthographyPractice}
                />
              </Suspense>
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

            {mainScreen === 'grammar' && (
              <Suspense fallback={<LoadingPanel />}>
                <PerformanceBoundary id="GrammarMapView">
                  <GrammarMapView
                    completedStops={main.grammarCompletedStops}
                    onOpenLesson={main.onOpenGrammarLesson}
                  />
                </PerformanceBoundary>
              </Suspense>
            )}

            {mainScreen === 'grammar-lesson' && (
              <Suspense fallback={<LoadingPanel />}>
                <PerformanceBoundary id="GrammarLessonView">
                  <GrammarLessonView
                    lessonSlug={main.activeGrammarLessonSlug}
                    activePlayer={activePlayer}
                    completedStops={main.grammarCompletedStops}
                    onCompleteStop={main.onCompleteGrammarStop}
                    onOpenLesson={main.onOpenGrammarLesson}
                  />
                </PerformanceBoundary>
              </Suspense>
            )}

            {mainScreen === 'vocabulary' && (
              <Suspense fallback={<LoadingPanel />}>
                <DictionaryView isActive playerId={activePlayer.userId} />
              </Suspense>
            )}

            {mainScreen === 'topics' && (
              <Suspense fallback={<LoadingPanel />}>
                <VocabularyView isActive />
              </Suspense>
            )}

            {mainScreen === 'verbs' && (
              <Suspense fallback={<LoadingPanel />}>
                <VerbsView isActive />
              </Suspense>
            )}

            {mainScreen === 'stats' && (
              <Suspense fallback={<LoadingPanel />}>
                <PerformanceBoundary id="StatsView">
                  <StatsView
                    progress={stats.progress}
                    entries={stats.entries}
                    currentTargetLevel={stats.currentTargetLevel}
                    homeNotice={stats.homeNotice}
                    isDemoMode={stats.isDemoMode}
                    uiMessage={stats.uiMessage}
                  />
                </PerformanceBoundary>
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
                <PerformanceBoundary id="ProfileView">
                  <ProfileView
                    activePlayer={activePlayer}
                    weekHistory={profile.weekHistory}
                    isLoadingData={profile.isLoadingData}
                    progress={profile.progress}
                    entries={profile.entries}
                    onStudyLevel={onStudyLevel}
                    onLogout={profile.onLogout}
                  />
                </PerformanceBoundary>
              </Suspense>
            )}

            {mainScreen === 'profile' && studyLevel && (
              <Suspense fallback={<LoadingPanel />}>
                <StudyFlashcardsView
                  playerId={activePlayer.userId}
                  level={studyLevel}
                  entries={profile.entries}
                  onClose={onCloseStudy}
                />
              </Suspense>
            )}
          </section>
        </Page>
      )}

      {!isSessionLoading && activePlayer && dailySession && (
        <Page pageKey="daily-game">
          <Suspense fallback={<LoadingPanel minHeightClass="min-h-[28rem]" />}>
            <PerformanceBoundary id="DailyGameRunner">
              <DailyGameRunner
                session={dailySession}
                elapsedSeconds={elapsedSeconds}
                onAnswer={onAnswerDailyQuestion}
                onSolve={onSolveDailyQuestion}
                onAdvance={onAdvanceDailyQuestion}
              />
            </PerformanceBoundary>
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
    </>
  );
}
