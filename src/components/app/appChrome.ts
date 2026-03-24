import type { LucideIcon } from 'lucide-react';
import { BookOpenText, ChartColumnBig, CheckCircle2, Flame, House, Mountain, RefreshCw, ShieldUser, UserRound } from 'lucide-react';
import type { ActiveQuiz, LevelSummary } from '../../appTypes';

export type MainScreen = 'daily' | 'learn' | 'synonyms' | 'grammar' | 'vocabulary' | 'verbs' | 'stats' | 'profile' | 'admin';

type TopBarMetricVariant = 'default' | 'success' | 'streak';

export interface TopBarMetric {
  icon?: LucideIcon;
  label: string;
  variant: TopBarMetricVariant;
  streakTone?: string;
}

export interface TopBarState {
  subtitle: string | null;
  showBackButton: boolean;
  metric: TopBarMetric | null;
  secondaryMetric?: TopBarMetric | null;
}

export interface DockItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  action: DockAction;
  active?: boolean;
}

export interface DockActionItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  action: DockAction;
  variant?: 'secondary' | 'primary';
}

export type DockAction = 'home' | 'learn' | 'stats' | 'admin' | 'profile' | 'retry-level';

interface ResolveTopBarStateArgs {
  mainScreen: MainScreen;
  dailySessionMode?: 'daily' | 'orthography_practice' | null;
  quiz: ActiveQuiz | null;
  quizProgress?: string | null;
  summary: LevelSummary | null;
  completedLevels: number;
  totalLevels: number;
  consecutivePlayDays: number;
  streakTone: string;
  currentSessionMeters: string;
  summaryPercentage: string | null;
}

export function resolveTopBarState({
  mainScreen,
  dailySessionMode,
  quiz,
  quizProgress,
  summary,
  completedLevels,
  totalLevels,
  consecutivePlayDays,
  streakTone,
  currentSessionMeters,
  summaryPercentage,
}: ResolveTopBarStateArgs): TopBarState {
  const subtitle = dailySessionMode
    ? dailySessionMode === 'orthography_practice'
      ? 'Ortografia'
      : 'Eguneko jokoa'
    : quiz
      ? quiz.level.name
      : summary
        ? `${summary.level.name} emaitza`
        : mainScreen === 'admin'
          ? 'Kudeaketa'
          : mainScreen === 'learn'
            ? 'Ikasi'
            : mainScreen === 'synonyms'
              ? 'Sinonimoak'
              : mainScreen === 'grammar'
                ? 'Gramatika'
                : mainScreen === 'vocabulary'
                  ? 'Hiztegia'
                  : mainScreen === 'verbs'
                    ? 'Aditzak'
          : null;

  if (dailySessionMode) {
    return {
      subtitle,
      showBackButton: true,
      metric: null,
      secondaryMetric: null,
    };
  }

  if (quiz) {
    return {
      subtitle,
      showBackButton: true,
      metric: { label: quizProgress ?? currentSessionMeters, variant: 'success' },
      secondaryMetric: null,
    };
  }

  if (summary && summaryPercentage) {
    return {
      subtitle,
      showBackButton: true,
      metric: { icon: CheckCircle2, label: summaryPercentage, variant: 'success' },
      secondaryMetric: null,
    };
  }

  return {
    subtitle,
    showBackButton: false,
    metric: consecutivePlayDays >= 0
      ? { icon: Flame, label: `${consecutivePlayDays} egun`, variant: 'streak', streakTone }
      : { icon: Mountain, label: `${completedLevels}/${totalLevels}`, variant: 'default' },
    secondaryMetric: null,
  };
}

interface ResolveDockItemsArgs {
  isTeacher: boolean;
  mainScreen: MainScreen;
  dailySession: boolean;
  quiz: ActiveQuiz | null;
  summary: LevelSummary | null;
}

export function resolveDockItems({
  isTeacher,
  mainScreen,
  dailySession,
  quiz,
  summary,
}: ResolveDockItemsArgs): { tabs: DockItemConfig[]; actions: DockActionItemConfig[] } {
  if (dailySession || quiz) {
    return { tabs: [], actions: [] };
  }

  if (summary) {
    return {
      tabs: [],
      actions: [
        { id: 'retry-level', label: 'Berriz', icon: RefreshCw, action: 'retry-level', variant: 'secondary' },
        { id: 'back-to-study', label: 'Ikasi', icon: BookOpenText, action: 'learn', variant: 'primary' },
      ],
    };
  }

  if (isTeacher) {
    return {
      tabs: [
        { id: 'home', label: 'Hasiera', icon: House, action: 'home', active: mainScreen === 'daily' },
        {
          id: 'learn',
          label: 'Ikasi',
          icon: BookOpenText,
          action: 'learn',
          active:
            mainScreen === 'learn'
            || mainScreen === 'synonyms'
            || mainScreen === 'grammar'
            || mainScreen === 'vocabulary'
            || mainScreen === 'verbs',
        },
        { id: 'admin', label: 'Kudeaketa', icon: ShieldUser, action: 'admin', active: mainScreen === 'admin' },
        { id: 'profile', label: 'Profila', icon: UserRound, action: 'profile', active: mainScreen === 'profile' },
      ],
      actions: [],
    };
  }

  return {
    tabs: [
      { id: 'home', label: 'Hasiera', icon: House, action: 'home', active: mainScreen === 'daily' },
      {
        id: 'learn',
        label: 'Ikasi',
        icon: BookOpenText,
        action: 'learn',
        active:
          mainScreen === 'learn'
          || mainScreen === 'synonyms'
          || mainScreen === 'grammar'
          || mainScreen === 'vocabulary'
          || mainScreen === 'verbs',
      },
      { id: 'stats', label: 'Estatistikak', icon: ChartColumnBig, action: 'stats', active: mainScreen === 'stats' },
      { id: 'profile', label: 'Profila', icon: UserRound, action: 'profile', active: mainScreen === 'profile' },
    ],
    actions: [],
  };
}
