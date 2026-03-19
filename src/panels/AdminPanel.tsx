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
      <div className="home-note" role="status" aria-live="polite" aria-atomic="true">
        {teacherMessage ?? ''}
      </div>

      <section className="admin-panel">
        <div className="panel-head">
          <div>
            <p className="section-label">Kudeaketa</p>
            <h2>Irakaslearen panela</h2>
          </div>

          <div className="admin-switch">
            <button
              type="button"
              className={clsx('admin-switch-button', { 'admin-switch-button-active': adminSection === 'words' })}
              onClick={() => setAdminSection('words')}
            >
              <BookOpen className="admin-switch-icon" />
              <span>Hitzak</span>
            </button>
            <button
              type="button"
              className={clsx('admin-switch-button', { 'admin-switch-button-active': adminSection === 'players' })}
              onClick={() => setAdminSection('players')}
            >
              <Users className="admin-switch-icon" />
              <span>Jokalariak</span>
            </button>
          </div>
        </div>

        {adminSection === 'players' && (
          <section className="admin-card admin-card-wide">
            <div className="admin-card-head">
              <div>
                <p className="section-label">
                  {adminPlayersView === 'list' ? 'Aurrerapena' : adminPlayersView === 'detail' ? 'Jokalaria' : 'Jokalari berria'}
                </p>
                <h3>
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
                  className="admin-secondary-button admin-panel-action"
                  onClick={() => {
                    setAdminPlayersView('list');
                    setSelectedTeacherPlayerId(null);
                    setTeacherPlayerDraft(emptyTeacherPlayerDraft);
                    setNewPlayerCode('');
                    setNewPlayerPassword('');
                  }}
                >
                  <ChevronLeft className="admin-button-icon" />
                  <span>Jokalariak</span>
                </button>
              )}
            </div>

            {adminPlayersView === 'list' && (
              <>
                <span className="admin-muted-pill">
                  {isTeacherPlayersLoading ? 'Kargatzen...' : `${teacherPlayers.length} jokalari`}
                </span>

                {isTeacherPlayersLoading && <div className="admin-empty-state">Jokalariak kargatzen ari dira.</div>}

                {!isTeacherPlayersLoading && teacherPlayers.length === 0 && (
                  <div className="admin-empty-state">Ez dago jokalaririk oraindik.</div>
                )}

                {!isTeacherPlayersLoading && teacherPlayers.length > 0 && (
                  <div className="admin-player-list">
                    {teacherPlayers.map((player) => (
                      <button
                        key={player.ownerId}
                        type="button"
                        className="admin-player-list-button admin-player-list-button-plain"
                        onClick={() => selectTeacherPlayer(player)}
                      >
                        <strong>{player.playerCode}</strong>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="admin-primary-button admin-panel-action"
                  onClick={() => setAdminPlayersView('create')}
                >
                  <PlusCircle className="admin-button-icon" />
                  <span>Jokalari berria</span>
                </button>
              </>
            )}

            {adminPlayersView === 'detail' && selectedTeacherPlayer && (
              <article className="admin-player-card admin-player-detail-card">
                <div className="admin-player-top">
                  <div>
                    <strong>{selectedTeacherPlayer.playerCode}</strong>
                    <span>{selectedTeacherPlayer.currentLevelName} unean</span>
                  </div>
                  <span className="admin-player-date">Eguneratua {formatAdminDate(selectedTeacherPlayer.updatedAt)}</span>
                </div>

                <div className="admin-player-stats">
                  <span>{selectedTeacherPlayer.totalGamesPlayed} partida</span>
                  <span>{selectedTeacherPlayer.consecutivePlayDays} egun jarraian</span>
                  <span>{selectedTeacherPlayerLearnedWords} hitz ikasita</span>
                  <span>{selectedTeacherPlayerUnitStatus}</span>
                  <span>{selectedTeacherPlayerAccuracy}% asmatuta</span>
                </div>

                <div className="admin-player-detail-grid">
                  <label className="admin-field">
                    <span>Erabiltzailea</span>
                    <div className="admin-input-shell">
                      <CircleUserRound className="admin-input-icon" />
                      <input
                        className="admin-input"
                        type="text"
                        value={teacherPlayerDraft.playerCode}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setTeacherPlayerDraft((current) => ({ ...current, playerCode: event.target.value.toLowerCase() }))
                        }
                        placeholder="joka12"
                      />
                    </div>
                  </label>

                  <label className="admin-field admin-field-span-2">
                    <span>Pasahitz berria</span>
                    <div className="admin-input-shell">
                      <KeyRound className="admin-input-icon" />
                      <input
                        className="admin-input"
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

                <div className="admin-player-actions admin-player-actions-detail">
                  <div className="admin-inline-field admin-inline-field-wide">
                    <span>Mendiak eskuz zabaldu</span>
                    <div className="admin-level-toggle-grid">
                      {GAME_LEVELS.map((level) => {
                        const forcedLevels = unlockDrafts[selectedTeacherPlayer.ownerId] ?? selectedTeacherPlayer.forcedUnlockLevels;
                        const isAlwaysUnlocked = level.index === 1;
                        const isActive = isAlwaysUnlocked || forcedLevels.includes(level.index);
                        const isSavingUnlocks = isSavingPlayerUnlocks === selectedTeacherPlayer.ownerId;

                        return (
                          <button
                            key={`unlock-${selectedTeacherPlayer.ownerId}-${level.id}`}
                            type="button"
                            className={clsx('admin-level-toggle', {
                              'admin-level-toggle-active': isActive,
                              'admin-level-toggle-static': isAlwaysUnlocked,
                            })}
                            disabled={isAlwaysUnlocked || isSavingUnlocks}
                            aria-pressed={isAlwaysUnlocked ? undefined : isActive}
                            onClick={() => void toggleForcedUnlockForPlayer(selectedTeacherPlayer, level.index)}
                          >
                            <span className="admin-level-toggle-label">{level.name}</span>
                            <span className="admin-level-toggle-indicator" aria-hidden="true">
                              {isAlwaysUnlocked ? (
                                <Mountain className="admin-level-toggle-icon" />
                              ) : isActive ? (
                                <CheckCircle2 className="admin-level-toggle-icon" />
                              ) : (
                                <Lock className="admin-level-toggle-icon" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={() => void saveTeacherPlayerAccessChanges(selectedTeacherPlayer)}
                    disabled={isSavingTeacherPlayer}
                  >
                    <Save className="admin-button-icon" />
                    <span>{isSavingTeacherPlayer ? 'Gordetzen...' : 'Datuak gorde'}</span>
                  </button>

                  <button
                    type="button"
                    className="admin-secondary-button admin-secondary-button-danger"
                    onClick={() => void resetTeacherPlayer(selectedTeacherPlayer)}
                  >
                    <RotateCcw className="admin-button-icon" />
                    <span>Datuak garbitu</span>
                  </button>

                  {selectedTeacherPlayer.playerCode !== ADMIN_PLAYER_CODE && (
                    <button
                      type="button"
                      className="admin-secondary-button admin-secondary-button-danger"
                      onClick={() => void deleteTeacherPlayer(selectedTeacherPlayer)}
                      disabled={isDeletingTeacherPlayer}
                    >
                      <Trash2 className="admin-button-icon" />
                      <span>{isDeletingTeacherPlayer ? 'Ezabatzen...' : 'Jokalaria ezabatu'}</span>
                    </button>
                  )}
                </div>
              </article>
            )}

            {adminPlayersView === 'create' && (
              <form className="admin-player-create-form" onSubmit={(e: FormEvent<HTMLFormElement>) => void submitTeacherPlayer(e)}>
                <label className="admin-field">
                  <span>Erabiltzailea</span>
                  <div className="admin-input-shell">
                    <CircleUserRound className="admin-input-icon" />
                    <input
                      className="admin-input"
                      type="text"
                      value={newPlayerCode}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setNewPlayerCode(event.target.value.toLowerCase())}
                      placeholder="Adibidez: joka12"
                    />
                  </div>
                </label>

                <label className="admin-field">
                  <span>Pasahitza</span>
                  <div className="admin-input-shell">
                    <KeyRound className="admin-input-icon" />
                    <input
                      className="admin-input"
                      type="text"
                      value={newPlayerPassword}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setNewPlayerPassword(event.target.value)}
                      placeholder="Hasierako giltza"
                    />
                  </div>
                </label>

                <button className="admin-primary-button" type="submit" disabled={isCreatingPlayer}>
                  <Save className="admin-button-icon" />
                  <span>{isCreatingPlayer ? 'Sortzen...' : 'Gorde jokalaria'}</span>
                </button>
              </form>
            )}
          </section>
        )}

        {adminSection === 'words' && (
          <section className="admin-card admin-card-wide admin-card-search-only">
            <div className="admin-card-head">
              <div>
                <p className="section-label">Sinonimoak</p>
                <h3>Bilatu, editatu edo gehitu</h3>
              </div>
            </div>

            <div className="admin-word-section">
              <div className="admin-search-shell">
                <input
                  className="admin-input"
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
                <div className="admin-empty-state">
                  Demoko hitzak bakarrik daude ikusgai. Taula erreala erabilgarri dagoenean hemen agertuko dira benetako sarrerak.
                </div>
              )}

              {!isDemoMode && teacherWordQuery.length === 0 && (
                <div className="admin-empty-state">
                  Idatzi hitz bat edo sinonimo bat. Aurkitzen bada editatu ahal izango duzu; bestela, sarrera berria sortuko da.
                </div>
              )}

              {!isDemoMode && teacherWordQuery.length > 0 && teacherWordResults.length > 0 && !teacherDirectMatch && (
                <div className="admin-word-list">
                  {teacherWordResults.map((entry) => (
                    <article key={entry.id} className="admin-word-card">
                      <div className="admin-word-top">
                        <div>
                          <strong>{entry.word}</strong>
                          <span>{GAME_LEVELS[(entry.levelOrder ?? 1) - 1]?.name ?? 'Mailarik gabe'}</span>
                        </div>

                        <button type="button" className="admin-inline-button" onClick={() => startEditingWord(entry)}>
                          <PencilLine className="admin-button-icon" />
                          <span>Editatu</span>
                        </button>
                      </div>

                      <p className="admin-word-synonyms">{entry.synonyms.join(', ')}</p>
                    </article>
                  ))}
                </div>
              )}

              {!isDemoMode && teacherWordQuery.length > 0 && teacherWordResults.length === 0 && (
                <div className="admin-empty-state">Ez da hitz hori aurkitu. Azpiko formularioan zuzenean sor dezakezu.</div>
              )}

              {!isDemoMode && teacherWordQuery.length > 0 && (
                <form className="admin-word-editor" onSubmit={(e: FormEvent<HTMLFormElement>) => void submitTeacherWord(e)}>
                  <div className="admin-card-head admin-word-editor-head">
                    <div>
                      <p className="section-label">{editingWordId ? 'Editatzen' : 'Sarrera berria'}</p>
                      <h3>{editingWordId ? 'Hitza eguneratu' : 'Hitza gehitu'}</h3>
                    </div>
                    <span className="admin-muted-pill">{editingWordId ? 'Badago' : 'Berria'}</span>
                  </div>

                  <label className="admin-field">
                    <span>Hitza</span>
                    <div className="admin-input-shell">
                      <BookOpen className="admin-input-icon" />
                      <input
                        className="admin-input"
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

                  <label className="admin-field">
                    <span>Sinonimoak</span>
                    <div className="admin-textarea-shell">
                      <textarea
                        className="admin-textarea"
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

                  <label className="admin-field">
                    <span>Maila</span>
                    <div className="admin-select-shell">
                      <Mountain className="admin-input-icon" />
                      <select
                        className="admin-select"
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

                  <div className="admin-form-actions">
                    <button className="admin-primary-button" type="submit" disabled={isSavingWord}>
                      {editingWordId ? <Save className="admin-button-icon" /> : <PlusCircle className="admin-button-icon" />}
                      <span>{isSavingWord ? 'Gordetzen...' : editingWordId ? 'Aldaketak gorde' : 'Hitza sortu'}</span>
                    </button>

                    <button className="admin-secondary-button" type="button" onClick={resetTeacherWordForm}>
                      <RotateCcw className="admin-button-icon" />
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
