import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import type { DictionaryEntry, SQLiteDictionaryInfo } from '../types';

type SqlValue = number | string | Uint8Array | null;
type QueryResult = { columns: string[]; values: SqlValue[][] };
type SqlDatabase = {
  close(): void;
  exec(sql: string, params?: SqlValue[]): QueryResult[];
};

type SqlJsModule = {
  Database: new (data?: ArrayLike<number> | null) => SqlDatabase;
};

type StoredSQLiteDictionary = SQLiteDictionaryInfo & {
  bytes: Uint8Array;
};

type SenseRow = {
  word_sense: number;
  word: string;
  equiv_word: string;
  word_type: number | null;
  sense_no: number;
  definition_id: number;
  usage: number;
  part_of_speech: string | null;
  definition: SqlValue;
};

const STORAGE_DB_NAME = 'lexicon-sqlite-dictionary';
const STORAGE_DB_VERSION = 1;
const STORAGE_STORE = 'dictionary';
const STORAGE_KEY = 'active';
const textDecoder = new TextDecoder('utf-8');
const WORDWEB_XOR_KEY = new Uint8Array([50, 108, 107, 74, 51, 35]);
const WORDWEB_ESCAPE_BYTE = 47;

const WORDWEB_TOKEN_ENTRIES: Array<[number, string]> = [
  [0, ''],
  [1, 'ed '],
  [2, 'es '],
  [3, 'al '],
  [4, 'er '],
  [5, 'ter'],
  [6, 'on '],
  [7, 'con'],
  [8, 'per'],
  [9, 'ing'],
  [11, 'le '],
  [12, 'ers'],
  [13, 'ver'],
  [14, 'eri'],
  [15, 'ine'],
  [16, 'ant'],
  [17, 're '],
  [18, 'en '],
  [19, 'all'],
  [20, 'se '],
  [21, 'pro'],
  [22, 'ess'],
  [23, 'str'],
  [24, 'com'],
  [25, 'ent'],
  [26, 'is '],
  [27, 'tra'],
  [28, 'est'],
  [29, 'ste'],
  [30, 'der'],
  [31, 'low'],
  [36, 'ex'],
  [37, 'sp'],
  [38, 'ag'],
  [60, 'um'],
  [61, 'ff'],
  [62, 'gr'],
  [63, 'fi'],
  [64, 'bo'],
  [74, 'ir'],
  [75, 'res'],
  [90, 'pr'],
  [91, 'in'],
  [92, 're'],
  [93, 'k '],
  [95, 'n '],
  [96, 'qu'],
  [123, 'ation '],
  [124, 'tion '],
  [125, 'ical '],
  [126, 'having '],
  [127, 'relating '],
  [128, 'ing '],
  [129, 'ate '],
  [130, 'ment '],
  [131, 'manner '],
  [132, 'ness '],
  [133, 'able '],
  [134, 'some'],
  [135, 'form'],
  [136, 'one '],
  [137, 'ive '],
  [138, 'ted '],
  [139, 'ther'],
  [140, 'ous '],
  [141, 'ter '],
  [142, 'ent '],
  [143, 'all '],
  [144, 'tion'],
  [145, 'nce '],
  [146, 'tic '],
  [147, 'ight '],
  [148, ';the '],
  [149, 'of '],
  [150, 'the '],
  [151, 'for '],
  [152, 'and '],
  [153, ';a '],
  [154, 'a '],
  [155, 'in '],
  [156, 'to '],
  [157, 'with '],
  [158, 'that '],
  [159, 'or '],
  [160, 'by '],
  [161, 'from '],
  [162, 'especially '],
  [163, 'as '],
  [164, 'used '],
  [165, 'an '],
  [166, 'genus '],
  [167, 'ally '],
  [168, 'ar'],
  [169, 'e '],
  [170, 'l '],
  [171, 'm '],
  [172, 't '],
  [173, 'an'],
  [174, 'or'],
  [175, 's '],
  [176, 'at'],
  [177, 'it'],
  [178, 'la'],
  [179, 'ic'],
  [180, 'ea'],
  [181, 'el'],
  [182, 'en'],
  [183, 'li'],
  [184, 'ac'],
  [185, 'ri'],
  [186, 'is'],
  [187, 'ra'],
  [188, 'th'],
  [189, 'ou'],
  [190, 'ro'],
  [191, 'le'],
  [192, 'st'],
  [193, 'ch'],
  [194, 'on'],
  [195, 'al'],
  [196, 'us'],
  [197, 'ma'],
  [198, 'er'],
  [199, 'ti'],
  [200, 'ha'],
  [201, 'nd'],
  [202, 'un'],
  [203, 'il'],
  [204, 'ta'],
  [205, 'de'],
  [206, 'di'],
  [207, 'si'],
  [208, 'ur'],
  [209, 'ce'],
  [210, 'as'],
  [211, 'ho'],
  [212, 'ol'],
  [213, 'ca'],
  [214, 'se'],
  [215, 'd '],
  [216, 'ge'],
  [217, 'sh'],
  [218, 'te'],
  [219, 'ec'],
  [220, 'lo'],
  [221, 'h '],
  [222, 'et'],
  [223, 'ni'],
  [224, 'he'],
  [225, 'po'],
  [226, 'co'],
  [227, 'id'],
  [228, 'be'],
  [229, 'hi'],
  [230, 'pa'],
  [231, 'ct'],
  [232, 'rt'],
  [233, 'ne'],
  [234, 'me'],
  [235, 'mi'],
  [236, 'mo'],
  [237, 'es'],
  [238, 'su'],
  [239, 'no'],
  [240, 'ut'],
  [241, 'pe'],
  [242, 'to'],
  [243, 'am'],
  [244, 'ad'],
  [245, 'ul'],
  [246, 'op'],
  [247, 'ci'],
  [248, 'ot'],
  [249, 'ed'],
  [250, 'pl'],
  [251, 'ns'],
  [252, 'll'],
  [253, 'ee'],
  [254, 'tr'],
  [255, 'os'],
];

function asciiBytes(value: string) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index++) {
    bytes[index] = value.charCodeAt(index);
  }
  return bytes;
}

const WORDWEB_TOKEN_BYTES = (() => {
  const tokens: Array<Uint8Array | undefined> = new Array(256);
  for (const [index, value] of WORDWEB_TOKEN_ENTRIES) {
    tokens[index] = asciiBytes(value);
  }
  return tokens;
})();

let sqlModulePromise: Promise<SqlJsModule> | null = null;

function getSqlModule() {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({
      locateFile: () => sqlWasmUrl,
    }) as Promise<SqlJsModule>;
  }
  return sqlModulePromise;
}

function openStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_DB_NAME, STORAGE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORAGE_STORE)) {
        db.createObjectStore(STORAGE_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open dictionary storage'));
  });
}

function withStorage<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openStorage().then(db => new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORAGE_STORE, mode);
    const store = transaction.objectStore(STORAGE_STORE);
    const request = run(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Dictionary storage request failed'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Dictionary storage transaction failed'));
    };
  }));
}

export function loadPersistedSQLiteDictionary(): Promise<StoredSQLiteDictionary | null> {
  return withStorage<StoredSQLiteDictionary | undefined>('readonly', store => store.get(STORAGE_KEY))
    .then(value => value ?? null);
}

export function savePersistedSQLiteDictionary(dictionary: StoredSQLiteDictionary): Promise<IDBValidKey> {
  return withStorage<IDBValidKey>('readwrite', store => store.put(dictionary, STORAGE_KEY));
}

export function removePersistedSQLiteDictionary(): Promise<void> {
  return withStorage<undefined>('readwrite', store => store.delete(STORAGE_KEY)).then(() => undefined);
}

function normalizeText(value: string) {
  return value
    .replace(/\u0000/g, '')
    .replace(/\{\{(.*?)\|(.*?)\}\}/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeWordWebBlob(value: Uint8Array): string {
  const output: number[] = [];

  for (let inputIndex = 0; inputIndex < value.length;) {
    const decodedByte = value[inputIndex] ^ WORDWEB_XOR_KEY[inputIndex % WORDWEB_XOR_KEY.length];

    if (decodedByte === WORDWEB_ESCAPE_BYTE) {
      const escapedIndex = inputIndex + 1;
      if (escapedIndex >= value.length) break;
      output.push(value[escapedIndex] ^ WORDWEB_XOR_KEY[escapedIndex % WORDWEB_XOR_KEY.length]);
      inputIndex += 2;
      continue;
    }

    const token = WORDWEB_TOKEN_BYTES[decodedByte];
    if (token) {
      output.push(...token);
    } else {
      output.push(decodedByte);
    }
    inputIndex += 1;
  }

  return normalizeText(textDecoder.decode(Uint8Array.from(output)));
}

function decodeDbText(value: SqlValue | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return normalizeText(value);
  if (typeof value === 'number') return String(value);
  return decodeWordWebBlob(value);
}

function normalizePartOfSpeech(name: string | null, wordType: number | null) {
  const lower = (name ?? '').toLowerCase();
  if (lower.startsWith('noun') || wordType === 0) return 'noun';
  if (lower.startsWith('verb') || wordType === 1) return 'verb';
  if (lower.startsWith('adj') || wordType === 2) return 'adjective';
  if (lower.startsWith('adv') || wordType === 3) return 'adverb';
  return lower || 'other';
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, match => `\\${match}`);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wildcardToRegex(query: string) {
  let pattern = '';
  for (const char of query.toLowerCase()) {
    if (char === '?') pattern += '[a-z]';
    else if (char === '*') pattern += '[a-z]*';
    else if (char === '@') pattern += '[aeiou]';
    else if (char === '#') pattern += '[bcdfghjklmnpqrstvwxyz]';
    else pattern += escapeRegex(char);
  }
  return new RegExp(`^${pattern}$`, 'i');
}

function literalPrefix(query: string) {
  const wildcardIndex = query.search(/[?*@#]/);
  return wildcardIndex === -1 ? query : query.slice(0, wildcardIndex);
}

function uniqueWords(words: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const word of words) {
    const normalized = word.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export class SQLiteDictionaryDatabase {
  private hasDerivedTable = false;

  private constructor(private readonly db: SqlDatabase) {}

  static async open(bytes: Uint8Array) {
    const SQL = await getSqlModule();
    const database = new SQLiteDictionaryDatabase(new SQL.Database(bytes));
    database.assertSchema();
    return database;
  }

  close() {
    this.db.close();
  }

  getEntryCount() {
    const rows = this.rows<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM unique_words
      WHERE word IS NOT NULL AND word != ''
    `);
    return Number(rows[0]?.count ?? 0);
  }

  lookupWord(word: string): DictionaryEntry | null {
    const normalized = word.trim().toLowerCase();
    if (!normalized) return null;

    let senses = this.sensesForLookup(normalized);
    if (senses.length === 0) {
      const rootWords = this.rootWordsForDerivedWord(normalized);
      for (const rootWord of rootWords) {
        senses = this.sensesForLookup(rootWord);
        if (senses.length > 0) break;
      }
    }

    if (senses.length === 0) return null;

    const entryWord = senses[0].word || word;
    const meanings = new Map<string, DictionaryEntry['meanings'][number]>();

    for (const sense of senses) {
      const definition = decodeDbText(sense.definition);
      if (!definition) continue;

      const partOfSpeech = normalizePartOfSpeech(sense.part_of_speech, sense.word_type);
      const examples = this.examplesForSense(sense.word_sense);
      const synonyms = this.synonymsForSense(sense);
      const broader = this.typeOfWordsForSense(sense, 'broader');
      const narrower = this.typeOfWordsForSense(sense, 'narrower');
      const antonyms = this.relatedWords('antonym', 'word_sense1', 'word_sense2', sense.word_sense);

      if (!meanings.has(partOfSpeech)) {
        meanings.set(partOfSpeech, {
          partOfSpeech,
          definitions: [],
          synonyms: [],
          antonyms: [],
        });
      }

      const meaning = meanings.get(partOfSpeech)!;
      meaning.definitions.push({
        definition,
        example: examples[0],
        examples,
        synonyms,
        broader,
        narrower,
        antonyms,
      });
      meaning.synonyms = uniqueWords([...(meaning.synonyms ?? []), ...synonyms]);
      meaning.antonyms = uniqueWords([...(meaning.antonyms ?? []), ...antonyms]);
    }

    const groupedMeanings = Array.from(meanings.values()).filter(meaning => meaning.definitions.length > 0);
    if (groupedMeanings.length === 0) return null;

    return {
      word: entryWord,
      meanings: groupedMeanings,
    };
  }

  private sensesForLookup(normalized: string) {
    return this.rows<SenseRow>(`
      SELECT
        ws.word_sense,
        ws.word,
        ws.equiv_word,
        ws.word_type,
        ws.sense_no,
        ws.ID AS definition_id,
        ws.usage,
        wt.name AS part_of_speech,
        d.definition
      FROM word_senses ws
      LEFT JOIN word_types wt ON wt.word_type = ws.word_type
      LEFT JOIN definitions d ON d.id = ws.ID
      WHERE lower(ws.word) = ?
         OR lower(ws.equiv_word) = ?
      ORDER BY ws.word_type, ws.sense_no
      LIMIT 120
    `, [normalized, normalized]);
  }

  private rootWordsForDerivedWord(normalized: string) {
    if (!this.hasDerivedTable) return [];

    const rows = this.rows<{ word: string }>(`
      SELECT DISTINCT root.word
      FROM derived d
      JOIN unique_words root ON root.word_id = d.root_id
      WHERE d.word = ? COLLATE NOCASE
      ORDER BY d.irreg DESC, root.word COLLATE NOCASE
      LIMIT 12
    `, [normalized]);
    return uniqueWords(rows.map(row => row.word));
  }

  searchWords(query: string, limit = 50) {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const hasWildcards = /[?*@#]/.test(trimmed);
    if (!hasWildcards) {
      const rows = this.rows<{ word: string }>(`
        SELECT DISTINCT word
        FROM unique_words
        WHERE word IS NOT NULL
          AND lower(word) LIKE ? ESCAPE '\\'
        ORDER BY word COLLATE NOCASE
        LIMIT ?
      `, [`${escapeLike(trimmed)}%`, limit]);
      return uniqueWords(rows.map(row => row.word));
    }

    const prefix = literalPrefix(trimmed);
    const regex = wildcardToRegex(trimmed);
    const rows = this.rows<{ word: string }>(`
      SELECT DISTINCT word
      FROM unique_words
      WHERE word IS NOT NULL
        AND lower(word) LIKE ? ESCAPE '\\'
      ORDER BY word COLLATE NOCASE
      LIMIT 3000
    `, [`${escapeLike(prefix)}%`]);

    return uniqueWords(rows.map(row => row.word).filter(word => regex.test(word))).slice(0, limit);
  }

  private assertSchema() {
    const required = ['unique_words', 'word_senses', 'definitions', 'word_types'];
    const placeholders = required.map(() => '?').join(', ');
    const rows = this.rows<{ name: string }>(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name IN (${placeholders})
    `, required);

    const found = new Set(rows.map(row => row.name));
    const missing = required.filter(table => !found.has(table));
    if (missing.length > 0) {
      throw new Error(`SQLite dictionary is missing required table(s): ${missing.join(', ')}`);
    }
    this.hasDerivedTable = found.has('derived') || this.tableExists('derived');
  }

  private tableExists(name: string) {
    const rows = this.rows<{ name: string }>(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
      LIMIT 1
    `, [name]);
    return rows.length > 0;
  }

  private examplesForSense(wordSense: number) {
    const rows = this.rows<{ example: SqlValue }>(`
      SELECT example
      FROM examples
      WHERE word_sense = ?
    `, [wordSense]);
    return rows.map(row => decodeDbText(row.example)).filter(Boolean);
  }

  private relatedWords(table: 'similar' | 'antonym', leftColumn: string, rightColumn: string, wordSense: number) {
    const rows = this.rows<{ word: string }>(`
      SELECT DISTINCT related.word
      FROM ${table} relation
      JOIN word_senses related
        ON related.word_sense = CASE
          WHEN relation.${leftColumn} = ? THEN relation.${rightColumn}
          ELSE relation.${leftColumn}
        END
      WHERE relation.${leftColumn} = ? OR relation.${rightColumn} = ?
      ORDER BY related.word COLLATE NOCASE
      LIMIT 24
    `, [wordSense, wordSense, wordSense]);
    return uniqueWords(rows.map(row => row.word));
  }

  private synonymsForSense(sense: SenseRow) {
    const rows = this.rows<{ word: string }>(`
      SELECT word
      FROM (
        SELECT DISTINCT related.word
        FROM word_senses related
        WHERE related.ID = ?
          AND related.word_sense != ?
          AND lower(related.word) != lower(?)
          AND (related.usage = ? OR related.usage = 65536)
        UNION
        SELECT DISTINCT related.word
        FROM similar relation
        JOIN word_senses related
          ON related.ID = CASE
            WHEN relation.id1 = ? THEN relation.id2
            ELSE relation.id1
          END
        WHERE (relation.id1 = ? OR relation.id2 = ?)
          AND (related.usage = ? OR related.usage = 65536)
      )
      ORDER BY word COLLATE NOCASE
      LIMIT 24
    `, [
      sense.definition_id,
      sense.word_sense,
      sense.word,
      sense.usage,
      sense.definition_id,
      sense.definition_id,
      sense.definition_id,
      sense.usage,
    ]);
    return uniqueWords(rows.map(row => row.word).filter(word => word.toLowerCase() !== sense.word.toLowerCase()));
  }

  private typeOfWordsForSense(sense: SenseRow, direction: 'broader' | 'narrower') {
    const sourceColumn = direction === 'broader' ? 'word_sense1' : 'word_sense2';
    const targetColumn = direction === 'broader' ? 'word_sense2' : 'word_sense1';
    const rows = this.rows<{ word: string }>(`
      SELECT DISTINCT related.word
      FROM type_of relation
      JOIN word_senses related ON related.ID = relation.${targetColumn}
      WHERE relation.${sourceColumn} = ?
        AND (related.usage = ? OR related.usage = 65536)
        AND lower(related.word) != lower(?)
      ORDER BY related.word COLLATE NOCASE
      LIMIT 24
    `, [sense.definition_id, sense.usage, sense.word]);
    return uniqueWords(rows.map(row => row.word));
  }

  private rows<T extends Record<string, unknown>>(sql: string, params: SqlValue[] = []): T[] {
    const result = this.db.exec(sql, params)[0];
    if (!result) return [];

    return result.values.map(row => {
      const item: Record<string, unknown> = {};
      result.columns.forEach((column, index) => {
        item[column] = row[index];
      });
      return item as T;
    });
  }
}

export async function openSQLiteDictionaryFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const database = await SQLiteDictionaryDatabase.open(bytes);
  const info: SQLiteDictionaryInfo = {
    name: file.name,
    size: file.size,
    importedAt: Date.now(),
    entryCount: database.getEntryCount(),
  };

  return { database, info, bytes };
}
