import type { SynonymEntry, BankLoadSuccess, BankLoadFailure } from './types';
import { logError, logWarn } from './logger';
import { normalizeSynonymRow, redistributeEntriesByQuestionTargets } from './parsing';
import { isDevRuntime } from './runtime';
import { isSupabaseConfigured, synonymsTable } from './supabaseConfig';
import { selectSupabaseRows } from './supabaseRest';

const DEMO_SYNONYM_BANK: SynonymEntry[] = [
  { id: 'demo-1', word: 'maite', synonyms: ['laket', 'atsegin', 'gogoko'], difficulty: 1, theme: 'sentimenduak', translation: 'maitatua', example: 'Lagun maite bat dut.', tags: ['demo'], levelOrder: 1 },
  { id: 'demo-2', word: 'gomutatu', synonyms: ['gogoratu', 'oroitu'], difficulty: 1, theme: 'oroimena', translation: 'oroitu', example: 'Atzokoa gomutatu dut.', tags: ['demo'], levelOrder: 1 },
  { id: 'demo-3', word: 'iruditu', synonyms: ['begitandu', 'irudikatu'], difficulty: 2, theme: 'iritzia', translation: 'antza izan', example: 'Ondo iruditu zait.', tags: ['demo'], levelOrder: 2 },
  { id: 'demo-4', word: 'gehitu', synonyms: ['erantsi', 'txertatu'], difficulty: 1, theme: 'ekintzak', translation: 'erantsi', example: 'Esaldi bat gehitu du.', tags: ['demo'], levelOrder: 2 },
  { id: 'demo-5', word: 'usna', synonyms: ['suma', 'usain'], difficulty: 1, theme: 'zentzumenak', translation: 'usaimena', example: 'Usna fina du.', tags: ['demo'], levelOrder: 3 },
  { id: 'demo-6', word: 'adi', synonyms: ['erne', 'tentuz'], difficulty: 1, theme: 'arreta', translation: 'erne', example: 'Adi entzun irakasleari.', tags: ['demo'], levelOrder: 3 },
  { id: 'demo-7', word: 'landu', synonyms: ['jorratu', 'sakondu'], difficulty: 2, theme: 'ikasketa', translation: 'jorratu', example: 'Gai hau ondo landu dugu.', tags: ['demo'], levelOrder: 4 },
  { id: 'demo-8', word: 'zaildu', synonyms: ['gogortu', 'korapilatu'], difficulty: 2, theme: 'zailtasuna', translation: 'gogortu', example: 'Ariketa zaildu egin da.', tags: ['demo'], levelOrder: 4 },
  { id: 'demo-9', word: 'belztu', synonyms: ['ilundu', 'beltzarandu'], difficulty: 2, theme: 'koloreak', translation: 'ilundu', example: 'Zerua belztu da.', tags: ['demo'], levelOrder: 5 },
  { id: 'demo-10', word: 'sotil', synonyms: ['fin', 'lirain', 'dotore'], difficulty: 2, theme: 'deskribapenak', translation: 'findua', example: 'Keinu sotila egin du.', tags: ['demo'], levelOrder: 5 },
  { id: 'demo-11', word: 'kokote', synonyms: ['garondo', 'lepoondo'], difficulty: 2, theme: 'gorputza', translation: 'garondoa', example: 'Kokotean mina du.', tags: ['demo'], levelOrder: 6 },
  { id: 'demo-12', word: 'ahope', synonyms: ['xuxurlaz', 'isilpean'], difficulty: 1, theme: 'komunikazioa', translation: 'xuxurlaz', example: 'Ahope hitz egin dute.', tags: ['demo'], levelOrder: 6 },
  { id: 'demo-13', word: 'bitar', synonyms: ['artean', 'bien bitartean'], difficulty: 1, theme: 'denbora', translation: 'artean', example: 'Ni bitar laguna etorri da.', tags: ['demo'], levelOrder: 7 },
  { id: 'demo-14', word: 'lepo', synonyms: ['sama', 'zama', 'karga'], difficulty: 2, theme: 'gorputza', translation: 'sama', example: 'Lepoa tente dauka.', tags: ['demo'], levelOrder: 7 },
  { id: 'demo-15', word: 'azkar', synonyms: ['bizkor', 'arin'], difficulty: 1, theme: 'abiadura', translation: 'bizkor', example: 'Ikaslea oso azkarra da.', tags: ['demo'], levelOrder: 8 },
  { id: 'demo-16', word: 'eder', synonyms: ['polita', 'dotore', 'lirain'], difficulty: 1, theme: 'deskribapenak', translation: 'polita', example: 'Egun ederra egin du.', tags: ['demo'], levelOrder: 8 },
  { id: 'demo-17', word: 'sendotu', synonyms: ['indartu', 'finkatu'], difficulty: 3, theme: 'hazkundea', translation: 'indartu', example: 'Ohitura onak sendotu dira.', tags: ['demo'], levelOrder: 9 },
  { id: 'demo-18', word: 'nahasi', synonyms: ['korapilatu', 'katramilatu'], difficulty: 3, theme: 'egoerak', translation: 'nahastu', example: 'Kontua nahasi egin da.', tags: ['demo'], levelOrder: 9 },
  { id: 'demo-19', word: 'argitu', synonyms: ['xehaztu', 'garbitu'], difficulty: 3, theme: 'ulermena', translation: 'argi utzi', example: 'Irakasleak zalantza argitu du.', tags: ['demo'], levelOrder: 10 },
  { id: 'demo-20', word: 'mardul', synonyms: ['trinko', 'oparo'], difficulty: 3, theme: 'deskribapenak', translation: 'oparo', example: 'Testu mardula irakurri dugu.', tags: ['demo'], levelOrder: 10 },
];

export const loadSynonymBank = async (): Promise<BankLoadSuccess | BankLoadFailure> => {
  const allowDemoFallback = isDevRuntime();

  if (!isSupabaseConfigured) {
    if (!allowDemoFallback) {
      return {
        ok: false,
        entries: [],
        message: 'Supabase ez dago prest; sinonimo bankua ezin izan da kargatu.',
      };
    }

    logWarn('bank', 'Supabase not configured; using demo synonym bank.');
    return {
      ok: true,
      entries: redistributeEntriesByQuestionTargets(DEMO_SYNONYM_BANK),
      message: 'Supabase ez dago prest. Demoko hitzekin kargatu da jokoa.',
    };
  }

  const { data, error } = await selectSupabaseRows<Record<string, unknown>>(synonymsTable);

  if (error) {
    logError('bank', `Could not read synonym table "${synonymsTable}".`, error);
    if (!allowDemoFallback) {
      return {
        ok: false,
        entries: [],
        message: `Ezin izan da ${synonymsTable} taula irakurri: ${error.message}.`,
      };
    }

    return {
      ok: true,
      entries: redistributeEntriesByQuestionTargets(DEMO_SYNONYM_BANK),
      message: `Ezin izan da ${synonymsTable} taula irakurri: ${error.message}. Demoko hitzak erabili dira.`,
    };
  }

  const entries = redistributeEntriesByQuestionTargets(
    (data ?? [])
    .map((row, index) => normalizeSynonymRow(row as Record<string, unknown>, index))
    .filter((entry): entry is SynonymEntry => entry !== null)
  );

  if (entries.length === 0) {
    if (!allowDemoFallback) {
      return {
        ok: false,
        entries: [],
        message: `${synonymsTable} taulak ez du sinonimo baliozkorik eman.`,
      };
    }

    logWarn('bank', `Synonym table "${synonymsTable}" returned no valid entries; using demo bank.`);
    return {
      ok: true,
      entries: redistributeEntriesByQuestionTargets(DEMO_SYNONYM_BANK),
      message: `${synonymsTable} taulak ez du sinonimo baliozkorik eman. Demoko hitzak erabili dira.`,
    };
  }

  return {
    ok: true,
    entries,
    message: `${entries.length} sarrera sinkronizatu dira ${synonymsTable} taulatik.`,
  };
};
