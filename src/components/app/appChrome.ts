import type { LucideIcon } from 'lucide-react';
import { BarChart3, BookOpen, CheckCircle2, CircleUserRound, Flame, House, Mountain, RefreshCw, Shield } from 'lucide-react';
import type { ActiveQuiz, LevelSummary } from '../../appTypes';

export type MainScreen = 'daily' | 'synonyms' | 'stats' | 'profile' | 'admin';

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
  tone?: 'neutral' | 'primary';
  wide?: boolean;
}

export type DockAction = 'home' | 'synonyms' | 'stats' | 'admin' | 'profile' | 'retry-level';

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
          : mainScreen === 'synonyms'
            ? 'Esploratu Gailurrak'
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
}: ResolveDockItemsArgs): DockItemConfig[] {
  if (dailySession || quiz) {
    return [];
  }

  if (summary) {
    return [
      { id: 'retry-level', label: 'Berriz', icon: RefreshCw, action: 'retry-level' },
      { id: 'back-to-study', label: 'Ikasi', icon: BookOpen, action: 'synonyms', tone: 'primary', wide: true },
    ];
  }

  if (isTeacher) {
    return [
      { id: 'home', label: 'Hasiera', icon: House, action: 'home', active: mainScreen === 'daily' },
      { id: 'admin', label: 'Kudeaketa', icon: Shield, action: 'admin', active: mainScreen === 'admin' },
      { id: 'profile', label: 'Profila', icon: CircleUserRound, action: 'profile', active: mainScreen === 'profile' },
    ];
  }

  return [
    { id: 'home', label: 'Hasiera', icon: House, action: 'home', active: mainScreen === 'daily' },
    { id: 'synonyms', label: 'Ikasi', icon: BookOpen, action: 'synonyms', active: mainScreen === 'synonyms' },
    { id: 'stats', label: 'Estatistikak', icon: BarChart3, action: 'stats', active: mainScreen === 'stats' },
    { id: 'profile', label: 'Profila', icon: CircleUserRound, action: 'profile', active: mainScreen === 'profile' },
  ];
}
