export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const wordsTable = import.meta.env.VITE_SUPABASE_WORDS_TABLE || 'words';
export const synonymsTable = import.meta.env.VITE_SUPABASE_SYNONYMS_TABLE || 'euskera_synonyms';
export const playerProgressTable = import.meta.env.VITE_SUPABASE_PLAYER_PROGRESS_TABLE || 'player_progress';
export const gameSessionsTable = import.meta.env.VITE_SUPABASE_GAME_SESSIONS_TABLE || 'game_sessions';
export const gamePlayerResultsTable =
  import.meta.env.VITE_SUPABASE_GAME_PLAYER_RESULTS_TABLE || 'game_player_results';
export const gameFailEventsTable = import.meta.env.VITE_SUPABASE_GAME_FAIL_EVENTS_TABLE || 'game_fail_events';
export const gameQuestionEventsTable =
  import.meta.env.VITE_SUPABASE_GAME_QUESTION_EVENTS_TABLE || 'game_question_events';
export const gameWordsTable = 'game_words';
export const dailyScoresTable = 'daily_scores';
export const dailyPillsTable = import.meta.env.VITE_SUPABASE_DAILY_PILLS_TABLE || 'eguneko_pildorak';
export const dailyHieroglyphsTable = import.meta.env.VITE_SUPABASE_EROGLIFIKOAK_TABLE || 'eroglifikoak';
export const orthographyExercisesTable = import.meta.env.VITE_SUPABASE_ORTHOGRAPHY_TABLE || 'ejercicios_orto';
export const grammarTopicsTable = import.meta.env.VITE_SUPABASE_GRAMMAR_TOPICS_TABLE || 'grammar_topics';
export const lessonsTable = import.meta.env.VITE_SUPABASE_LESSONS_TABLE || 'lessons';
export const lessonBlocksTable = import.meta.env.VITE_SUPABASE_LESSON_BLOCKS_TABLE || 'lesson_blocks';
export const lessonCardsTable = import.meta.env.VITE_SUPABASE_LESSON_CARDS_TABLE || 'lesson_cards';
export const lessonExamplesTable = import.meta.env.VITE_SUPABASE_LESSON_EXAMPLES_TABLE || 'examples';
export const lessonExercisesTable = import.meta.env.VITE_SUPABASE_LESSON_EXERCISES_TABLE || 'exercises';
export const lessonExerciseOptionsTable =
  import.meta.env.VITE_SUPABASE_LESSON_EXERCISE_OPTIONS_TABLE || 'exercise_options';
export const lessonFeedbackRulesTable =
  import.meta.env.VITE_SUPABASE_LESSON_FEEDBACK_RULES_TABLE || 'feedback_rules';
export const lessonExerciseFeedbackMapTable =
  import.meta.env.VITE_SUPABASE_LESSON_EXERCISE_FEEDBACK_MAP_TABLE || 'exercise_feedback_map';
export const lessonRelationsTable = import.meta.env.VITE_SUPABASE_LESSON_RELATIONS_TABLE || 'lesson_relations';
export const lessonUserProgressTable = import.meta.env.VITE_SUPABASE_LESSON_USER_PROGRESS_TABLE || 'user_progress';
export const lessonUserExerciseAttemptsTable =
  import.meta.env.VITE_SUPABASE_LESSON_USER_EXERCISE_ATTEMPTS_TABLE || 'user_exercise_attempts';
export const dictionaryTable = import.meta.env.VITE_SUPABASE_DICTIONARY_TABLE || 'diccionario';
export const dictionaryDefinitionsTable =
  import.meta.env.VITE_SUPABASE_DICTIONARY_DEFINITIONS_TABLE || 'diccionario_definiciones';
export const synonymGroupsSecondaryTable = import.meta.env.VITE_SUPABASE_SYNONYMS_2_TABLE || 'synonimoak_2';
export const dictionarySearchRpc = import.meta.env.VITE_SUPABASE_DICTIONARY_SEARCH_RPC || 'search_dictionary_entries';
export const dailyHieroglyphsBucket = import.meta.env.VITE_SUPABASE_EROGLIFIKOAK_BUCKET || 'eroglificos';
export const dailyHieroglyphsBaseUrl =
  import.meta.env.VITE_SUPABASE_EROGLIFIKOAK_BASE_URL ||
  (supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${dailyHieroglyphsBucket}` : '');
