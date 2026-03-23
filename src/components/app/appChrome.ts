import type { LucideIcon } from 'lucide-react';
import { BarChart3, BookOpen, CheckCircle2, CircleUserRound, Flame, GraduationCap, House, Mountain, RefreshCw, Shield } from 'lucide-react';
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
  dailySession: boolean;
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
  dailySession,
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
  const subtitle = dailySession
    ? 'Eguneko jokoa'
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

  if (dailySession) {
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
        { id: 'back-to-study', label: 'Ikasi', icon: GraduationCap, action: 'learn', variant: 'primary' },
      ],
    };
  }

  if (isTeacher) {
    return {
      tabs: [
        { id: 'home', label: 'Hasiera', icon: House, action: 'home', active: mainScreen === 'daily' },
        { id: 'admin', label: 'Kudeaketa', icon: Shield, action: 'admin', active: mainScreen === 'admin' },
        { id: 'profile', label: 'Profila', icon: CircleUserRound, action: 'profile', active: mainScreen === 'profile' },
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
        icon: GraduationCap,
        action: 'learn',
        active:
          mainScreen === 'learn'
          || mainScreen === 'synonyms'
          || mainScreen === 'grammar'
          || mainScreen === 'vocabulary'
          || mainScreen === 'verbs',
      },
      { id: 'stats', label: 'Estatistikak', icon: BarChart3, action: 'stats', active: mainScreen === 'stats' },
      { id: 'profile', label: 'Profila', icon: CircleUserRound, action: 'profile', active: mainScreen === 'profile' },
    ],
    actions: [],
  };
}
