import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import clsx from 'clsx';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  CircleUserRound,
  KeyRound,
  Lock,
  Mountain,
  PencilLine,
  PlusCircle,
  RotateCcw,
  Save,
  Trash2,
  Users,
} from 'lucide-react';
import {
  ADMIN_PLAYER_CODE,
  GAME_LEVELS,
  createPlayerByTeacher,
  createTeacherWord,
  deletePlayerByTeacher,
  getResolvedLevelRecord,
  loadTeacherPlayers,
  resetPlayerProgressByTeacher,
  setPlayerForcedUnlockLevels,
  updateTeacherPlayerAccess,
  updateTeacherWord,
} from '../euskeraLearning';
import type { PlayerIdentity, SynonymEntry, TeacherPlayerOverview } from '../euskeraLearning';
import type { BankState } from '../appTypes';
import { formatAdminDate } from '../formatters';

type AdminSection = 'players' | 'words';
type AdminPlayersView = 'list' | 'detail' | 'create';

interface TeacherWordFormState {
  word: string;
  synonyms: string;
  levelOrder: number;
}

interface TeacherPlayerDraftState {
  playerCode: string;
  password: string;
}

const emptyTeacherWordForm: TeacherWordFormState = { word: '', synonyms: '', levelOrder: 1 };
const emptyTeacherPlayerDraft: TeacherPlayerDraftState = { playerCode: '', password: '' };

const adminFieldShellClass =
  'flex items-center gap-2.5 min-h-[56px] px-3.5 rounded-[20px] border border-[rgba(216,226,241,0.92)] bg-[rgba(249,251,255,0.94)] transition-all duration-150 focus-within:border-[rgba(107,184,217,0.38)] focus-within:bg-[rgba(252,254,255,0.98)] focus-within:shadow-[0_0_0_3px_rgba(107,184,217,0.08)]';

const adminStretchFieldShellClass =
  'flex items-stretch gap-2.5 p-3 rounded-[20px] border border-[rgba(216,226,241,0.92)] bg-[rgba(249,251,255,0.94)] transition-all duration-150 focus-within:border-[rgba(107,184,217,0.38)] focus-within:bg-[rgba(252,254,255,0.98)] focus-within:shadow-[0_0_0_3px_rgba(107,184,217,0.08)]';

const adminFieldInputClass =
  'w-full min-w-0 appearance-none rounded-none border-0! bg-transparent outline-none! shadow-none! ring-0! text-[#203143] text-[0.98rem] font-extrabold caret-[#6bb8d9] focus:border-0! focus:outline-none! focus:shadow-none! focus:ring-0!';

const normalizeSearchTerm = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

interface AdminPanelProps {
  bankState: BankState;
  activePlayer: PlayerIdentity;
  onScrollTop: () => void;
  onRefreshBank: () => Promise<void>;
}

export const AdminPanel = ({ bankState, activePlayer, onScrollTop, onRefreshBank }: AdminPanelProps) => {
  const isDemoMode = bankState.message.toLowerCase().includes('demo');

  const [adminSection, setAdminSection] = useState<AdminSection>('words');
  const [teacherPlayers, setTeacherPlayers] = useState<TeacherPlayerOverview[]>([]);
  const [isTeacherPlayersLoading, setIsTeacherPlayersLoading] = useState(false);
  const [teacherMessage, setTeacherMessage] = useState<string | null>(null);
  const [newPlayerCode, setNewPlayerCode] = useState('');
  const [newPlayerPassword, setNewPlayerPassword] = useState('');
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [adminPlayersView, setAdminPlayersView] = useState<AdminPlayersView>('list');
  const [selectedTeacherPlayerId, setSelectedTeacherPlayerId] = useState<string | null>(null);
  const [teacherPlayerDraft, setTeacherPlayerDraft] = useState<TeacherPlayerDraftState>(emptyTeacherPlayerDraft);
  const [isSavingTeacherPlayer, setIsSavingTeacherPlayer] = useState(false);
  const [isDeletingTeacherPlayer, setIsDeletingTeacherPlayer] = useState(false);
  const [isSavingPlayerUnlocks, setIsSavingPlayerUnlocks] = useState<string | null>(null);
  const [unlockDrafts, setUnlockDrafts] = useState<Record<string, number[]>>({});
  const [teacherWordForm, setTeacherWordForm] = useState<TeacherWordFormState>(emptyTeacherWordForm);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [teacherWordSearch, setTeacherWordSearch] = useState('');
  const [isTeacherWordDirty, setIsTeacherWordDirty] = useState(false);
  const [isSavingWord, setIsSavingWord] = useState(false);
  const [pendingDeletePlayer, setPendingDeletePlayer] = useState<TeacherPlayerOverview | null>(null);

  const refreshTeacherPlayers = async (entries: SynonymEntry[]) => {
    setIsTeacherPlayersLoading(true);
    const result = await loadTeacherPlayers(entries);
    setIsTeacherPlayersLoading(false);

    if (!result.ok) {
      setTeacherPlayers([]);
      setTeacherMessage(result.message);
      return;
    }

    setTeacherPlayers(result.players);
    setUnlockDrafts(
      result.players.reduce<Record<string, number[]>>((accumulator, player) => {
        accumulator[player.ownerId] = [...player.forcedUnlockLevels];
        return accumulator;
      }, {})
    );
  };

  // Data-fetching: setState is called asynchronously inside the async function, not synchronously
  useEffect(() => {
    void refreshTeacherPlayers(bankState.entries); // eslint-disable-line react-hooks/set-state-in-effect
  }, [activePlayer.userId, bankState.entries]);

  useEffect(() => {
    if (adminSection !== 'players') return;
    void refreshTeacherPlayers(bankState.entries); // eslint-disable-line react-hooks/set-state-in-effect
  }, [adminSection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (adminSection !== 'players') return;
    const handleFocus = () => void refreshTeacherPlayers(bankState.entries);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [adminSection, bankState.entries]);

  // Reset navigation state when the player list becomes empty
  useEffect(() => {
    if (teacherPlayers.length > 0) return;
    setAdminPlayersView('list'); // eslint-disable-line react-hooks/set-state-in-effect
  }, [teacherPlayers.length]);

  const teacherWordQuery = useMemo(() => normalizeSearchTerm(teacherWordSearch), [teacherWordSearch]);

  const teacherWordResults = useMemo(() => {
    if (!teacherWordQuery || isDemoMode) return [];
    return [...bankState.entries]
      .filter((entry) => {
        const normalizedWord = normalizeSearchTerm(entry.word);
        const normalizedSynonyms = entry.synonyms.map((s) => normalizeSearchTerm(s));
        return normalizedWord.includes(teacherWordQuery) || normalizedSynonyms.some((s) => s.includes(teacherWordQuery));
      })
      .sort((left, right) => {
        const leftWord = normalizeSearchTerm(left.word);
        const rightWord = normalizeSearchTerm(right.word);
        const leftSynonyms = left.synonyms.map((s) => normalizeSearchTerm(s));
        const rightSynonyms = right.synonyms.map((s) => normalizeSearchTerm(s));
        const leftRank =
          leftWord === teacherWordQuery
            ? 0
            : leftWord.startsWith(teacherWordQuery)
              ? 1
              : leftSynonyms.some((s) => s === teacherWordQuery)
                ? 2
                : leftSynonyms.some((s) => s.startsWith(teacherWordQuery))
                  ? 3
                  : 4;
        const rightRank =
          rightWord === teacherWordQuery
            ? 0
            : rightWord.startsWith(teacherWordQuery)
              ? 1
              : rightSynonyms.some((s) => s === teacherWordQuery)
                ? 2
                : rightSynonyms.some((s) => s.startsWith(teacherWordQuery))
                  ? 3
                  : 4;

        if (leftRank !== rightRank) return leftRank - rightRank;
        const levelCompare = (left.levelOrder ?? 99) - (right.levelOrder ?? 99);
        if (levelCompare !== 0) return levelCompare;
        return left.word.localeCompare(right.word, 'eu');
      })
      .slice(0, 8);
  }, [teacherWordQuery, isDemoMode, bankState.entries]);

  const teacherDirectMatch = useMemo(() => {
    if (!teacherWordQuery || isDemoMode) return null;
    return (
      teacherWordResults.find(
        (entry) =>
          normalizeSearchTerm(entry.word) === teacherWordQuery ||
          entry.synonyms.some((s) => normalizeSearchTerm(s) === teacherWordQuery)
      ) ?? null
    );
  }, [teacherWordQuery, isDemoMode, teacherWordResults]);

  /* eslint-disable react-hooks/set-state-in-effect */
  // This effect syncs the word form with the search result — all setState is conditional/guarded
  useEffect(() => {
    if (adminSection !== 'words' || isDemoMode) return;

    const trimmedSearch = teacherWordSearch.trim();

    if (!trimmedSearch) {
      if (editingWordId || teacherWordForm.word || teacherWordForm.synonyms || teacherWordForm.levelOrder !== 1) {
        setEditingWordId(null);
        setTeacherWordForm(emptyTeacherWordForm);
        setIsTeacherWordDirty(false);
      }
      return;
    }

    if (isTeacherWordDirty) return;

    if (teacherDirectMatch) {
      const nextForm = {
        word: teacherDirectMatch.word,
        synonyms: teacherDirectMatch.synonyms.join(', '),
        levelOrder: teacherDirectMatch.levelOrder ?? 1,
      };
      const isSameForm =
        editingWordId === teacherDirectMatch.id &&
        teacherWordForm.word === nextForm.word &&
        teacherWordForm.synonyms === nextForm.synonyms &&
        teacherWordForm.levelOrder === nextForm.levelOrder;

      if (!isSameForm) {
        setEditingWordId(teacherDirectMatch.id);
        setTeacherWordForm(nextForm);
      }
      return;
    }

    if (editingWordId !== null || teacherWordForm.word !== trimmedSearch) {
      setEditingWordId(null);
      setIsTeacherWordDirty(false);
      setTeacherWordForm((current) => ({
        word: trimmedSearch,
        synonyms: current.word === trimmedSearch && editingWordId === null ? current.synonyms : '',
        levelOrder: current.levelOrder || 1,
      }));
    }
  }, [
    adminSection,
    editingWordId,
    isDemoMode,
    teacherDirectMatch,
    teacherWordForm.levelOrder,
    teacherWordForm.synonyms,
    teacherWordForm.word,
    teacherWordSearch,
    isTeacherWordDirty,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const startEditingWord = (entry: SynonymEntry) => {
    setEditingWordId(entry.id);
    setTeacherWordSearch(entry.word);
    setIsTeacherWordDirty(false);
    setTeacherWordForm({
      word: entry.word,
      synonyms: entry.synonyms.join(', '),
      levelOrder: entry.levelOrder ?? 1,
    });
    setAdminSection('words');
    onScrollTop();
  };

  const resetTeacherWordForm = () => {
    setEditingWordId(null);
    setTeacherWordSearch('');
    setIsTeacherWordDirty(false);
    setTeacherWordForm(emptyTeacherWordForm);
  };

  const submitTeacherWord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingWord(true);

    const result = editingWordId
      ? await updateTeacherWord(editingWordId, {
          word: teacherWordForm.word,
          synonyms: teacherWordForm.synonyms.split(','),
          levelOrder: teacherWordForm.levelOrder,
        })
      : await createTeacherWord({
          word: teacherWordForm.word,
          synonyms: teacherWordForm.synonyms.split(','),
          levelOrder: teacherWordForm.levelOrder,
        });

    setIsSavingWord(false);
    setTeacherMessage(result.message);

    if (!result.ok) return;

    await onRefreshBank();
    setIsTeacherWordDirty(false);
    setTeacherWordSearch(teacherWordForm.word.trim());
  };

  const submitTeacherPlayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingPlayer(true);
    const result = await createPlayerByTeacher(newPlayerCode, newPlayerPassword);
    setIsCreatingPlayer(false);
    setTeacherMessage(result.message);

    if (!result.ok) return;

    setNewPlayerCode('');
    setNewPlayerPassword('');
    setAdminPlayersView('list');
    await refreshTeacherPlayers(bankState.entries);
  };

  const selectTeacherPlayer = (player: TeacherPlayerOverview) => {
    setSelectedTeacherPlayerId(player.ownerId);
    setTeacherPlayerDraft({ playerCode: player.playerCode, password: '' });
    setAdminPlayersView('detail');
  };

  const saveTeacherPlayerAccessChanges = async (player: TeacherPlayerOverview) => {
    setIsSavingTeacherPlayer(true);
    const result = await updateTeacherPlayerAccess(player.ownerId, {
      playerCode: teacherPlayerDraft.playerCode,
      learnerName: teacherPlayerDraft.playerCode,
      password: teacherPlayerDraft.password,
    });
    setIsSavingTeacherPlayer(false);
    setTeacherMessage(result.message);

    if (result.ok) {
      await refreshTeacherPlayers(bankState.entries);
    }
  };

  const toggleForcedUnlockForPlayer = async (player: TeacherPlayerOverview, levelIndex: number) => {
    const currentLevels = unlockDrafts[player.ownerId] ?? player.forcedUnlockLevels;
    const nextLevels = currentLevels.includes(levelIndex)
      ? currentLevels.filter((value) => value !== levelIndex)
      : [...currentLevels, levelIndex].sort((left, right) => left - right);

    setUnlockDrafts((current) => ({ ...current, [player.ownerId]: nextLevels }));
    setIsSavingPlayerUnlocks(player.ownerId);
    const result = await setPlayerForcedUnlockLevels(player.ownerId, nextLevels);
    setIsSavingPlayerUnlocks(null);
    setTeacherMessage(result.message);

    if (result.ok) {
      await refreshTeacherPlayers(bankState.entries);
      return;
    }

    setUnlockDrafts((current) => ({ ...current, [player.ownerId]: player.forcedUnlockLevels }));
  };

  const resetTeacherPlayer = async (player: TeacherPlayerOverview) => {
    const result = await resetPlayerProgressByTeacher(player);
    setTeacherMessage(result.message);
    if (result.ok) {
      await refreshTeacherPlayers(bankState.entries);
    }
  };

  const deleteTeacherPlayer = (player: TeacherPlayerOverview) => {
    if (player.playerCode === ADMIN_PLAYER_CODE) {
      setTeacherMessage('Administratzailea ezin da ezabatu.');
      return;
    }
    setPendingDeletePlayer(player);
  };

  const confirmDeletePlayer = async () => {
    if (!pendingDeletePlayer) return;
    const player = pendingDeletePlayer;
    setPendingDeletePlayer(null);

    setIsDeletingTeacherPlayer(true);
    const result = await deletePlayerByTeacher(player);
    setIsDeletingTeacherPlayer(false);
    setTeacherMessage(result.message);

    if (result.ok) {
      setSelectedTeacherPlayerId(null);
      setTeacherPlayerDraft(emptyTeacherPlayerDraft);
      setAdminPlayersView('list');
      await refreshTeacherPlayers(bankState.entries);
    }
  };

  const selectedTeacherPlayer =
    teacherPlayers.find((player) => player.ownerId === selectedTeacherPlayerId) ?? teacherPlayers[0] ?? null;

  const selectedTeacherPlayerResolvedLevels = useMemo(
    () =>
      selectedTeacherPlayer
        ? GAME_LEVELS.map((level) => ({
            level,
            record: getResolvedLevelRecord(selectedTeacherPlayer.progress, bankState.entries, level),
          }))
        : [],
    [selectedTeacherPlayer, bankState.entries]
  );

  const selectedTeacherPlayerLearnedWords = useMemo(
    () => selectedTeacherPlayerResolvedLevels.reduce((total, item) => total + (item.record?.bestCorrectCount ?? 0), 0),
    [selectedTeacherPlayerResolvedLevels]
  );
  const selectedTeacherPlayerAttemptedQuestions = useMemo(
    () =>
      selectedTeacherPlayerResolvedLevels.reduce(
        (total, item) => total + ((item.record?.attempts ?? 0) > 0 ? (item.record?.totalQuestions ?? 0) : 0),
        0
      ),
    [selectedTeacherPlayerResolvedLevels]
  );
  const selectedTeacherPlayerAccuracy =
    selectedTeacherPlayerAttemptedQuestions > 0
      ? Math.round((selectedTeacherPlayerLearnedWords / selectedTeacherPlayerAttemptedQuestions) * 100)
      : 0;
  const selectedTeacherPlayerUnitStatus = selectedTeacherPlayer
    ? selectedTeacherPlayer.completedLevels > 0
      ? `${selectedTeacherPlayer.completedLevels} maila gaindituta`
      : `${selectedTeacherPlayer.currentLevelName} unean`
    : '';

  return (
    <>
      <div
        className={clsx(
          'p-4 rounded-[1.2rem] border text-[#4b677d] text-[0.95rem] font-bold shadow-[0_14px_34px_rgba(120,146,168,0.1)] leading-snug transition-opacity duration-150',
          teacherMessage ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 p-0 border-0 shadow-none',
          teacherMessage?.includes('Errorea') || teacherMessage?.includes('ezin da')
            ? 'bg-gradient-to-br from-[#fff9e9]/98 to-[#fff5d6]/98 border-[#e0bc66]/40 text-[#8d6b20]'
            : 'bg-gradient-to-br from-[#f7fbfe]/98 to-[#edf5fa]/98 border-[#c1d9e9]/70'
        )}
        role="status"
        aria-live="polite" 
        aria-atomic="true"
      >
        {teacherMessage ?? ''}
      </div>

      <section className="grid gap-[18px] p-6 rounded-[32px] border border-[rgba(209,223,229,0.92)] bg-gradient-to-b from-[rgba(255,255,255,0.98)] to-[rgba(248,252,255,0.97)] shadow-[0_20px_60px_rgba(100,140,160,0.13),0_4px_16px_rgba(100,140,160,0.07)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[#6bb8d9] mb-2 text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">Kudeaketa</p>
            <h2 className="font-display text-[clamp(2rem,4vw,2.8rem)] leading-[0.96] tracking-[-0.05em] text-[#203143]">Irakaslearen panela</h2>
          </div>

          <div className="inline-flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              className={clsx(
                'inline-flex items-center justify-center gap-2.5 min-h-[46px] px-4 rounded-[18px] font-extrabold cursor-pointer transition-all duration-150',
                adminSection === 'words' 
                  ? 'border-[rgba(95,200,189,0.28)] bg-[rgba(232,248,244,0.96)] text-[#203143] shadow-[0_8px_28px_rgba(107,148,165,0.1)]' 
                  : 'border-[rgba(216,226,241,0.92)] bg-[rgba(247,249,255,0.88)] text-[#7a8d9d]'
              )}
              onClick={() => setAdminSection('words')}
            >
              <BookOpen className="w-[18px] h-[18px]" />
              <span>Hitzak</span>
            </button>
            <button
              type="button"
              className={clsx(
                'inline-flex items-center justify-center gap-2.5 min-h-[46px] px-4 rounded-[18px] font-extrabold cursor-pointer transition-all duration-150',
                adminSection === 'players'
                  ? 'border-[rgba(95,200,189,0.28)] bg-[rgba(232,248,244,0.96)] text-[#203143] shadow-[0_8px_28px_rgba(107,148,165,0.1)]'
                  : 'border-[rgba(216,226,241,0.92)] bg-[rgba(247,249,255,0.88)] text-[#7a8d9d]'
              )}
              onClick={() => setAdminSection('players')}
            >
              <Users className="w-[18px] h-[18px]" />
              <span>Jokalariak</span>
            </button>
          </div>
        </div>

        {adminSection === 'players' && (
          <section className="grid gap-[18px] p-5 rounded-[28px] border border-[rgba(216,226,241,0.92)] bg-[rgba(255,255,255,0.96)] shadow-[0_8px_28px_rgba(107,148,165,0.1)] w-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[#6bb8d9] mb-2 text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">
                  {adminPlayersView === 'list' ? 'Aurrerapena' : adminPlayersView === 'detail' ? 'Jokalaria' : 'Jokalari berria'}
                </p>
                <h3 className="font-display text-[clamp(1.3rem,3vw,1.8rem)] leading-[1.04] tracking-[-0.04em] text-[#203143]">
                  {adminPlayersView === 'list'
                    ? 'Jokalari guztiak'
                    : adminPlayersView === 'detail'
                      ? (selectedTeacherPlayer?.playerCode ?? 'Jokalaria')
                      : 'Sortu sarbide berria'}
                </h3>
              </div>

              {adminPlayersView !== 'list' && (
                <button
                  type="button"
                  className="flex-shrink-0 inline-flex items-center justify-center gap-2.5 min-h-[46px] px-4 rounded-[18px] font-extrabold border border-[rgba(216,226,241,0.92)] bg-white/96 text-[#203143] cursor-pointer transition-transform hover:-translate-y-0.5"
                  onClick={() => {
                    setAdminPlayersView('list');
                    setSelectedTeacherPlayerId(null);
                    setTeacherPlayerDraft(emptyTeacherPlayerDraft);
                    setNewPlayerCode('');
                    setNewPlayerPassword('');
                  }}
                >
                  <ChevronLeft className="w-[18px] h-[18px]" />
                  <span>Jokalariak</span>
                </button>
              )}
            </div>

            {adminPlayersView === 'list' && (
              <>
                <span className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-full bg-[rgba(247,249,255,0.92)] text-[#7a8d9d] text-[0.82rem] font-bold">
                  {isTeacherPlayersLoading ? 'Kargatzen...' : `${teacherPlayers.length} jokalari`}
                </span>

                {isTeacherPlayersLoading && <div className="grid gap-3 p-[18px] rounded-[22px] bg-[rgba(247,249,255,0.92)] text-[#7a8d9d] font-bold leading-relaxed">Jokalariak kargatzen ari dira.</div>}

                {!isTeacherPlayersLoading && teacherPlayers.length === 0 && (
                  <div className="grid gap-3 p-[18px] rounded-[22px] bg-[rgba(247,249,255,0.92)] text-[#7a8d9d] font-bold leading-relaxed">Ez dago jokalaririk oraindik.</div>
                )}

                {!isTeacherPlayersLoading && teacherPlayers.length > 0 && (
                  <div className="grid gap-3.5">
                    {teacherPlayers.map((player) => (
                      <button
                        key={player.ownerId}
                        type="button"
                        className="grid w-full p-[16px_18px] rounded-[22px] border border-[rgba(216,226,241,0.92)] bg-[rgba(249,251,255,0.94)] text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[rgba(102,131,255,0.28)] focus:border-[rgba(63,105,210,0.22)]"
                        onClick={() => selectTeacherPlayer(player)}
                      >
                        <strong className="block font-display text-[1.14rem] leading-[1.04] tracking-[-0.04em] text-[#203143]">{player.playerCode}</strong>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="flex-shrink-0 inline-flex items-center justify-center gap-2.5 min-h-[52px] px-[18px] rounded-full font-black text-white bg-gradient-to-br from-[#69b7da] via-[#62cdbf] to-[#dce97f] shadow-[0_18px_36px_rgba(103,201,190,0.18)] cursor-pointer transition-transform hover:-translate-y-0.5"
                  onClick={() => setAdminPlayersView('create')}
                >
                  <PlusCircle className="w-[18px] h-[18px]" />
                  <span>Jokalari berria</span>
                </button>
              </>
            )}

            {adminPlayersView === 'detail' && selectedTeacherPlayer && (
              <article className="grid gap-3.5 p-5 rounded-[24px] border border-[rgba(216,226,241,0.92)] bg-[rgba(255,255,255,0.98)] shadow-[0_6px_20px_rgba(107,148,165,0.09)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="block font-display text-[1.3rem] leading-[1.04] tracking-[-0.04em] text-[#203143]">{selectedTeacherPlayer.playerCode}</strong>
                    <span className="text-[#7a8d9d] text-[0.92rem] font-bold">{selectedTeacherPlayer.currentLevelName} unean</span>
                  </div>
                  <span className="text-[0.78rem] font-bold text-[#7a8d9d] opacity-80 uppercase">Eguneratua {formatAdminDate(selectedTeacherPlayer.updatedAt)}</span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center min-h-[34px] px-3 rounded-full bg-[rgba(247,249,255,0.94)] text-[#7a8d9d] text-[0.82rem] font-bold">{selectedTeacherPlayer.totalGamesPlayed} partida</span>
                  <span className="inline-flex items-center min-h-[34px] px-3 rounded-full bg-[rgba(247,249,255,0.94)] text-[#7a8d9d] text-[0.82rem] font-bold">{selectedTeacherPlayer.consecutivePlayDays} egun jarraian</span>
                  <span className="inline-flex items-center min-h-[34px] px-3 rounded-full bg-[rgba(247,249,255,0.94)] text-[#7a8d9d] text-[0.82rem] font-bold">{selectedTeacherPlayerLearnedWords} hitz ikasita</span>
                  <span className="inline-flex items-center min-h-[34px] px-3 rounded-full bg-[rgba(247,249,255,0.94)] text-[#7a8d9d] text-[0.82rem] font-bold">{selectedTeacherPlayerUnitStatus}</span>
                  <span className="inline-flex items-center min-h-[34px] px-3 rounded-full bg-[rgba(247,249,255,0.94)] text-[#7a8d9d] text-[0.82rem] font-bold">{selectedTeacherPlayerAccuracy}% asmatuta</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <label className="grid gap-2.5">
                    <span className="text-[#7a8d9d] text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">Erabiltzailea</span>
                    <div className={adminFieldShellClass}>
                      <CircleUserRound className="w-4.5 h-4.5 text-[#6bb8d9] shrink-0" />
                      <input
                        className={adminFieldInputClass}
                        type="text"
                        value={teacherPlayerDraft.playerCode}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setTeacherPlayerDraft((current) => ({ ...current, playerCode: event.target.value.toLowerCase() }))
                        }
                        placeholder="joka12"
                      />
                    </div>
                  </label>

                  <label className="grid gap-2.5 md:col-span-2">
                    <span className="text-[#7a8d9d] text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">Pasahitz berria</span>
                    <div className={adminFieldShellClass}>
                      <KeyRound className="w-4.5 h-4.5 text-[#6bb8d9] shrink-0" />
                      <input
                        className={adminFieldInputClass}
                        type="text"
                        value={teacherPlayerDraft.password}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setTeacherPlayerDraft((current) => ({ ...current, password: event.target.value }))
                        }
                        placeholder="Utzi hutsik aldatu nahi ez baduzu"
                      />
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3.5 mt-2">
                  <div className="grid gap-2.5">
                    <span className="text-[#7a8d9d] text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">Mendiak eskuz zabaldu</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {GAME_LEVELS.map((level) => {
                        const forcedLevels = unlockDrafts[selectedTeacherPlayer.ownerId] ?? selectedTeacherPlayer.forcedUnlockLevels;
                        const isAlwaysUnlocked = level.index === 1;
                        const isActive = isAlwaysUnlocked || forcedLevels.includes(level.index);
                        const isSavingUnlocks = isSavingPlayerUnlocks === selectedTeacherPlayer.ownerId;

                        return (
                          <button
                            key={`unlock-${selectedTeacherPlayer.ownerId}-${level.id}`}
                            type="button"
                            className={clsx(
                              'flex items-center justify-between min-h-[42px] px-2.5 rounded-[16px] border text-[0.78rem] font-extrabold transition-all duration-150',
                              isActive 
                                ? 'border-[rgba(95,200,189,0.4)] bg-gradient-to-br from-[#66c9c1] to-[#9ad3a9] text-white shadow-[0_14px_28px_rgba(112,205,182,0.16)]' 
                                : 'border-[rgba(216,226,241,0.92)] bg-[rgba(249,251,255,0.94)] text-[#7a8d9d] hover:border-[rgba(95,200,189,0.38)]'
                            )}
                            disabled={isAlwaysUnlocked || isSavingUnlocks}
                            aria-pressed={isAlwaysUnlocked ? undefined : isActive}
                            onClick={() => void toggleForcedUnlockForPlayer(selectedTeacherPlayer, level.index)}
                          >
                            <span className="truncate">{level.name}</span>
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 shrink-0">
                              {isAlwaysUnlocked ? (
                                <Mountain className="w-3.5 h-3.5" />
                              ) : isActive ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center gap-2.5 min-h-[52px] px-[18px] rounded-full font-black text-white bg-gradient-to-br from-[#69b7da] via-[#62cdbf] to-[#dce97f] shadow-[0_18px_36px_rgba(103,201,190,0.18)] cursor-pointer transition-transform hover:-translate-y-0.5"
                    onClick={() => void saveTeacherPlayerAccessChanges(selectedTeacherPlayer)}
                    disabled={isSavingTeacherPlayer}
                  >
                    <Save className="w-[18px] h-[18px]" />
                    <span>{isSavingTeacherPlayer ? 'Gordetzen...' : 'Datuak gorde'}</span>
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2.5 min-h-[46px] px-4 rounded-full font-extrabold border border-[#efc2bb] bg-[#fff0ee] text-[#b7594d] cursor-pointer transition-transform hover:-translate-y-0.5"
                    onClick={() => void resetTeacherPlayer(selectedTeacherPlayer)}
                  >
                    <RotateCcw className="w-[18px] h-[18px]" />
                    <span>Datuak garbitu</span>
                  </button>

                  {selectedTeacherPlayer.playerCode !== ADMIN_PLAYER_CODE && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2.5 min-h-[46px] px-4 rounded-full font-extrabold border border-[#efc2bb] bg-[#fff0ee] text-[#b7594d] cursor-pointer transition-transform hover:-translate-y-0.5"
                      onClick={() => void deleteTeacherPlayer(selectedTeacherPlayer)}
                      disabled={isDeletingTeacherPlayer}
                    >
                      <Trash2 className="w-[18px] h-[18px]" />
                      <span>{isDeletingTeacherPlayer ? 'Ezabatzen...' : 'Jokalaria ezabatu'}</span>
                    </button>
                  )}
                </div>
              </article>
            )}

            {adminPlayersView === 'create' && (
              <form className="grid gap-[18px]" onSubmit={(e: FormEvent<HTMLFormElement>) => void submitTeacherPlayer(e)}>
                <label className="grid gap-2.5">
                  <span className="text-[#7a8d9d] text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">Erabiltzailea</span>
                  <div className={adminFieldShellClass}>
                    <CircleUserRound className="w-4.5 h-4.5 text-[#6bb8d9] shrink-0" />
                    <input
                      className={adminFieldInputClass}
                      type="text"
                      value={newPlayerCode}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setNewPlayerCode(event.target.value.toLowerCase())}
                      placeholder="Adibidez: joka12"
                    />
                  </div>
                </label>

                <label className="grid gap-2.5">
                  <span className="text-[#7a8d9d] text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">Pasahitza</span>
                  <div className={adminFieldShellClass}>
                    <KeyRound className="w-4.5 h-4.5 text-[#6bb8d9] shrink-0" />
                    <input
                      className={adminFieldInputClass}
                      type="text"
                      value={newPlayerPassword}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setNewPlayerPassword(event.target.value)}
                      placeholder="Hasierako giltza"
                    />
                  </div>
                </label>

                <button 
                  className="flex-shrink-0 inline-flex items-center justify-center gap-2.5 min-h-[52px] px-[18px] rounded-full font-black text-white bg-gradient-to-br from-[#69b7da] via-[#62cdbf] to-[#dce97f] shadow-[0_18px_36px_rgba(103,201,190,0.18)] cursor-pointer transition-transform hover:-translate-y-0.5 disabled:opacity-70" 
                  type="submit" 
                  disabled={isCreatingPlayer}
                >
                  <Save className="w-[18px] h-[18px]" />
                  <span>{isCreatingPlayer ? 'Sortzen...' : 'Gorde jokalaria'}</span>
                </button>
              </form>
            )}
          </section>
        )}

        {adminSection === 'words' && (
          <section className="grid gap-[18px] p-5 rounded-[28px] border border-[rgba(216,226,241,0.92)] bg-[rgba(255,255,255,0.96)] shadow-[0_8px_28px_rgba(107,148,165,0.1)] w-full max-w-[min(860px,100%)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[#6bb8d9] mb-2 text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">Sinonimoak</p>
                <h3 className="font-display text-[clamp(1.3rem,3vw,1.8rem)] leading-[1.04] tracking-[-0.04em] text-[#203143]">Bilatu, editatu edo gehitu</h3>
              </div>
            </div>

            <div className="grid gap-[18px]">
              <div className={adminFieldShellClass}>
                <input
                  className={adminFieldInputClass}
                  type="search"
                  value={teacherWordSearch}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setIsTeacherWordDirty(false);
                    setTeacherWordSearch(event.target.value);
                  }}
                  placeholder="Bilatu hitza edo sinonimoa"
                />
              </div>

              {isDemoMode && (
                <div className="grid gap-3 p-[18px] rounded-[22px] bg-[rgba(247,249,255,0.92)] text-[#7a8d9d] font-bold leading-relaxed">
                  Demoko hitzak bakarrik daude ikusgai. Taula erreala erabilgarri dagoenean hemen agertuko dira benetako sarrerak.
                </div>
              )}

              {!isDemoMode && teacherWordQuery.length === 0 && (
                <div className="grid gap-3 p-[18px] rounded-[22px] bg-[rgba(247,249,255,0.92)] text-[#7a8d9d] font-bold leading-relaxed">
                  Idatzi hitz bat edo sinonimo bat. Aurkitzen bada editatu ahal izango duzu; bestela, sarrera berria sortuko da.
                </div>
              )}

              {!isDemoMode && teacherWordQuery.length > 0 && teacherWordResults.length > 0 && !teacherDirectMatch && (
                <div className="grid gap-3.5">
                  {teacherWordResults.map((entry) => (
                    <article key={entry.id} className="grid gap-3.5 p-[18px] rounded-[24px] border border-[rgba(216,226,241,0.92)] bg-[rgba(249,251,255,0.94)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong className="block font-display text-[1.28rem] leading-[1.05] tracking-[-0.04em] text-[#203143]">{entry.word}</strong>
                          <span className="text-[#7a8d9d] text-[0.92rem] font-bold">{GAME_LEVELS[(entry.levelOrder ?? 1) - 1]?.name ?? 'Mailarik gabe'}</span>
                        </div>

                        <button 
                          type="button" 
                          className="inline-flex items-center justify-center gap-2.5 min-h-[46px] px-4 rounded-[18px] border border-[rgba(216,226,241,0.92)] bg-white/96 text-[#203143] font-extrabold cursor-pointer transition-transform hover:-translate-y-0.5" 
                          onClick={() => startEditingWord(entry)}
                        >
                          <PencilLine className="w-[18px] h-[18px]" />
                          <span>Editatu</span>
                        </button>
                      </div>

                      <p className="text-[#7a8d9d] text-[0.92rem] font-bold leading-relaxed">{entry.synonyms.join(', ')}</p>
                    </article>
                  ))}
                </div>
              )}

              {!isDemoMode && teacherWordQuery.length > 0 && teacherWordResults.length === 0 && (
                <div className="grid gap-3 p-[18px] rounded-[22px] bg-[rgba(247,249,255,0.92)] text-[#7a8d9d] font-bold leading-relaxed">Ez da hitz hori aurkitu. Azpiko formularioan zuzenean sor dezakezu.</div>
              )}

              {!isDemoMode && teacherWordQuery.length > 0 && (
                <form className="grid gap-[18px] pt-4.5 border-t border-[rgba(216,226,241,0.92)]" onSubmit={(e: FormEvent<HTMLFormElement>) => void submitTeacherWord(e)}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[#6bb8d9] mb-2 text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">{editingWordId ? 'Editatzen' : 'Sarrera berria'}</p>
                      <h3 className="font-display text-[clamp(1.3rem,3vw,1.8rem)] leading-[1.04] tracking-[-0.04em] text-[#203143]">{editingWordId ? 'Hitza eguneratu' : 'Hitza gehitu'}</h3>
                    </div>
                    <span className="inline-flex items-center justify-center min-h-[38px] px-3.5 rounded-full bg-[rgba(247,249,255,0.92)] text-[#7a8d9d] text-[0.82rem] font-bold">{editingWordId ? 'Badago' : 'Berria'}</span>
                  </div>

                  <label className="grid gap-2.5">
                    <span className="text-[#7a8d9d] text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">Hitza</span>
                    <div className={adminFieldShellClass}>
                      <BookOpen className="w-4.5 h-4.5 text-[#6bb8d9] shrink-0" />
                      <input
                        className={adminFieldInputClass}
                        type="text"
                        value={teacherWordForm.word}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          setIsTeacherWordDirty(true);
                          setTeacherWordForm((current) => ({ ...current, word: event.target.value }));
                        }}
                        placeholder="Adibidez: maite"
                      />
                    </div>
                  </label>

                  <label className="grid gap-2.5">
                    <span className="text-[#7a8d9d] text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">Sinonimoak</span>
                    <div className={adminStretchFieldShellClass}>
                      <textarea
                        className="w-full border-0 bg-transparent outline-none text-[#203143] text-[0.98rem] font-extrabold resize-vertical leading-relaxed caret-[#6bb8d9]"
                        value={teacherWordForm.synonyms}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                          setIsTeacherWordDirty(true);
                          setTeacherWordForm((current) => ({ ...current, synonyms: event.target.value }));
                        }}
                        placeholder="laket, atsegin, gustuko, gogoko"
                        rows={5}
                      />
                    </div>
                  </label>

                  <label className="grid gap-2.5">
                    <span className="text-[#7a8d9d] text-[0.8rem] font-extrabold tracking-[0.08em] uppercase">Maila</span>
                    <div className={adminFieldShellClass}>
                      <Mountain className="w-4.5 h-4.5 text-[#6bb8d9] shrink-0" />
                      <select
                        className="w-full border-0 bg-transparent outline-none text-[#203143] text-[0.98rem] font-extrabold appearance-none cursor-pointer"
                        value={teacherWordForm.levelOrder}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                          setIsTeacherWordDirty(true);
                          setTeacherWordForm((current) => ({ ...current, levelOrder: Number(event.target.value) }));
                        }}
                      >
                        {GAME_LEVELS.map((level) => (
                          <option key={`word-form-${level.id}`} value={level.index}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <div className="flex flex-wrap gap-3 mt-4">
                    <button 
                      className="flex-1 inline-flex items-center justify-center gap-2.5 min-h-[52px] px-[18px] rounded-full font-black text-white bg-gradient-to-br from-[#69b7da] via-[#62cdbf] to-[#dce97f] shadow-[0_18px_36px_rgba(103,201,190,0.18)] cursor-pointer transition-transform hover:-translate-y-0.5 disabled:opacity-70" 
                      type="submit" 
                      disabled={isSavingWord}
                    >
                      {editingWordId ? <Save className="w-[18px] h-[18px]" /> : <PlusCircle className="w-[18px] h-[18px]" />}
                      <span>{isSavingWord ? 'Gordetzen...' : editingWordId ? 'Aldaketak gorde' : 'Hitza sortu'}</span>
                    </button>

                    <button 
                      className="inline-flex items-center justify-center gap-2.5 min-h-[46px] px-4 rounded-full font-extrabold border border-[rgba(216,226,241,0.92)] bg-white/96 text-[#203143] cursor-pointer transition-transform hover:-translate-y-0.5" 
                      type="button" 
                      onClick={resetTeacherWordForm}
                    >
                      <RotateCcw className="w-[18px] h-[18px]" />
                      <span>Garbitu</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}
      </section>

      <ConfirmModal
        isOpen={pendingDeletePlayer !== null}
        title="Jokalaria ezabatu"
        message={`${pendingDeletePlayer?.playerCode ?? ''} jokalaria betirako ezabatu nahi duzu?`}
        confirmLabel="Ezabatu"
        cancelLabel="Utzi"
        onConfirm={() => void confirmDeletePlayer()}
        onCancel={() => setPendingDeletePlayer(null)}
      />
    </>
  );
};

export default AdminPanel;
