import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AiVerificationResult,
  QuestCategory,
  QuestDifficulty,
  QuestType,
  SubmissionStatus,
} from '../src/shared/types.ts';
import {
  calculateLevelFromXp,
  computeNextStreak,
  getUtcDateString,
} from './gamification.ts';

export const DATA_DIR = path.resolve(process.cwd(), 'data');
export const EVIDENCE_DIR = path.resolve(DATA_DIR, 'evidence');
const DB_PATH = path.resolve(DATA_DIR, 'ecoquest.db');

fs.mkdirSync(DATA_DIR, {recursive: true});
fs.mkdirSync(EVIDENCE_DIR, {recursive: true});

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    eco_points INTEGER NOT NULL DEFAULT 0 CHECK (eco_points >= 0),
    current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
    last_quest_date TEXT,
    theme_preference TEXT NOT NULL DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quests (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT NOT NULL,
    environmental_impact TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic')),
    quest_type TEXT NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'one_time', 'special')),
    estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0),
    xp_reward INTEGER NOT NULL CHECK (xp_reward > 0),
    eco_points_reward INTEGER NOT NULL CHECK (eco_points_reward >= 0),
    verification_type TEXT NOT NULL DEFAULT 'photo' CHECK (verification_type IN ('photo')),
    verification_criteria TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    starts_at TEXT,
    expires_at TEXT,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_quests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    quest_id TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    period_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    UNIQUE(user_id, quest_id, period_key)
  );

  CREATE TABLE IF NOT EXISTS quest_submissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    quest_id TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    user_quest_id TEXT REFERENCES user_quests(id) ON DELETE SET NULL,
    period_key TEXT NOT NULL,
    evidence_path TEXT,
    evidence_mime TEXT,
    evidence_deleted_at TEXT,
    user_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_review')),
    ai_confidence REAL,
    ai_result TEXT,
    reviewed_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    review_note TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_submissions_status_created
    ON quest_submissions(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_submissions_user_created
    ON quest_submissions(user_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS reward_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    submission_id TEXT REFERENCES quest_submissions(id) ON DELETE SET NULL,
    tx_type TEXT NOT NULL CHECK (tx_type IN ('quest_reward', 'achievement_bonus', 'admin_adjustment')),
    xp_delta INTEGER NOT NULL,
    points_delta INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_quest_reward_per_submission
    ON reward_transactions(submission_id, tx_type)
    WHERE submission_id IS NOT NULL AND tx_type = 'quest_reward';

  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('quests_completed', 'streak_days', 'total_xp', 'category_count')),
    rule_threshold INTEGER NOT NULL,
    xp_bonus INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS user_achievements (
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, achievement_id)
  );

  CREATE TABLE IF NOT EXISTS verification_rate_limits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_rate_limits_user_time
    ON verification_rate_limits(user_id, created_at);
`);

interface SeedQuest {
  slug: string;
  title: string;
  description: string;
  instructions: string;
  environmental_impact: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  quest_type: QuestType;
  estimated_minutes: number;
  xp_reward: number;
  eco_points_reward: number;
  verification_criteria: string;
  image_url: string | null;
}

const STARTER_QUESTS: SeedQuest[] = [
  {
    slug: 'digital-learner',
    title: 'Digitális tanuló',
    description: 'Írj legalább két oldalnyi tanulási jegyzetet digitálisan eldobható papír helyett.',
    instructions:
      '1. Nyisd meg a kedvenc digitális jegyzetelő alkalmazásodat laptopon vagy tableten.\n2. Készítsd el a tanulási jegyzeteidet digitális formátumban.\n3. Készíts egy tiszta fotót, amelyen látszanak a képernyőn lévő digitális jegyzetek (kerüld az érzékeny személyes adatokat).',
    environmental_impact:
      'A papírfüzetek digitális jegyzetelésre cserélése csökkenti a cellulózigényt, a fehérítő vegyszerek használatát és az erdőgazdálkodási vízfogyasztást.',
    category: 'Digital Sustainability',
    difficulty: 'easy',
    quest_type: 'daily',
    estimated_minutes: 20,
    xp_reward: 30,
    eco_points_reward: 15,
    verification_criteria:
      'A képnek egyértelműen mutatnia kell egy tablet, laptop vagy asztali monitor képernyőjét digitális tanulási jegyzetekkel. Megjegyzés: Egyetlen fotó nem bizonyítja a pontos oldalszámot vagy azt, hogy máshol nem használtak papírt.',
    image_url: '/src/assets/images/quest_digital_notes_1795617620749.jpg',
  },
  {
    slug: 'refill-hero',
    title: 'Kulacshős',
    description: 'Használj újratölthető kulacsot egyszer használatos műanyag palack vásárlása helyett.',
    instructions:
      '1. Hozd magaddal az újratölthető rozsdamentes acél, üveg vagy tartós kulacsodat.\n2. Töltsd meg csapnál, vízadagolónál vagy iskolai/egyetemi töltőállomáson.\n3. Készíts egy fotót a kulacsodról töltés közben vagy a csap mellett.',
    environmental_impact:
      'Ha egy ember újratölthető kulacsra vált, évente átlagosan több mint 150 egyszer használatos műanyag palackot előz meg a hulladéklerakókban és a vizekben.',
    category: 'Water Conservation',
    difficulty: 'easy',
    quest_type: 'daily',
    estimated_minutes: 5,
    xp_reward: 25,
    eco_points_reward: 10,
    verification_criteria:
      'A képen újratölthető kulacsnak (fém, üveg vagy kemény falú kulacs) kell szerepelnie csap, mosogató vagy töltőállomás közelében. Az eldobható vékony PET palackokat el kell utasítani.',
    image_url: null,
  },
  {
    slug: 'energy-saver',
    title: 'Energiatakarékos',
    description: 'Kapcsold le a felesleges szobai lámpákat, és szüntesd meg az üresjárati áramfogyasztást.',
    instructions:
      '1. Ellenőrizd az üres helyiségeket vagy az asztali lámpákat, amikor elég a természetes fény.\n2. Kapcsold le a mennyezeti világítást és a használaton kívüli eszközöket.\n3. Készíts egy fotót a kikapcsolt villanykapcsolóról vagy a természetes fénnyel megvilágított szobáról.',
    environmental_impact:
      'A felesleges világítás lekapcsolása csökkenti a hálózati csúcsterhelést és a fosszilis alapú áramtermelést.',
    category: 'Energy Saving',
    difficulty: 'easy',
    quest_type: 'daily',
    estimated_minutes: 5,
    xp_reward: 25,
    eco_points_reward: 10,
    verification_criteria:
      'A képen láthatónak kell lennie egy lekapcsolt világítótestnek, kikapcsolt állású villanykapcsolónak vagy természetes nappali fénnyel megvilágított munkaasztalnak lekapcsolt lámpákkal.',
    image_url: null,
  },
  {
    slug: 'recycling-master',
    title: 'Szelektáló mester',
    description: 'Válogasd szét tisztán a háztartási újrahasznosítható hulladékot papír, műanyag, fém vagy üveg szerint.',
    instructions:
      '1. Válogatás előtt öblítsd ki az ételmaradékot a csomagolásokból.\n2. Válaszd külön a tiszta papírt/kartont a műanyagoktól, alumíniumdobozoktól vagy üvegektől.\n3. Készíts egy tiszta fotót a külön gyűjtőkbe vagy zsákokba válogatott hulladékról.',
    environmental_impact:
      'A tiszta forrásoldali szelektálás megakadályozza, hogy a szennyezett tételek a szemétlerakóba kerüljenek, és megőrzi az alumínium- és papírrostok újrahasznosíthatóságát.',
    category: 'Recycling',
    difficulty: 'medium',
    quest_type: 'daily',
    estimated_minutes: 15,
    xp_reward: 45,
    eco_points_reward: 20,
    verification_criteria:
      'A képen egyértelműen szétválogatott újrahasznosítható anyagoknak (pl. papír, műanyag palackok, alumíniumdobozok vagy üveg) kell látszaniuk szelektív kukákban vagy külön kupacokban.',
    image_url: null,
  },
  {
    slug: 'sustainable-commute',
    title: 'Fenntartható ingázás',
    description: 'Gyalogolj, biciklizz vagy használj tömegközlekedést személyautó helyett egy megfelelő úton.',
    instructions:
      '1. Tervezz meg egy helyi iskolai, egyetemi vagy bevásárlóutat gyalog, kerékpárral vagy busszal/vonattal.\n2. Készíts biztonságos fotót megállva (leparkolt kerékpár, megálló vagy gyalogút — soha ne forgalomban haladás közben).',
    environmental_impact:
      'Egyetlen 10 km-es egyéni autóút kerékpárra vagy tömegközlekedésre cserélése nagyjából 1,5–2 kg kipufogógáz-eredetű CO2-kibocsátást takarít meg.',
    category: 'Sustainable Transport',
    difficulty: 'medium',
    quest_type: 'daily',
    estimated_minutes: 30,
    xp_reward: 50,
    eco_points_reward: 25,
    verification_criteria:
      'A képen kerékpárúton/tárolónál leparkolt kerékpárnak, tömegközlekedési járműnek/állomásnak vagy szabadtéri gyalogútnak kell szerepelnie.',
    image_url: '/src/assets/images/quest_sustainable_commute_1795617621118.jpg',
  },
  {
    slug: 'daylight-desk',
    title: 'Nappali fényű asztal',
    description: 'Tanulj egy teljes órán át természetes ablakfénynél, mesterséges lámpák nélkül.',
    instructions:
      '1. Helyezd a tanulóasztalodat egy ablak mellé.\n2. Kapcsold ki az asztali lámpát és a mennyezeti világítást.\n3. Készíts egy fotót a természetes fénnyel megvilágított asztalodról.',
    environmental_impact:
      'A nappali természetes fény használata csökkenti a nappali lakossági áramfogyasztást, és kíméli a szemet extra teljesítmény nélkül.',
    category: 'Energy Saving',
    difficulty: 'easy',
    quest_type: 'weekly',
    estimated_minutes: 60,
    xp_reward: 60,
    eco_points_reward: 30,
    verification_criteria:
      'A képen ablakból érkező természetes fénnyel megvilágított íróasztalnak kell látszania, láthatóan kikapcsolt lámpákkal.',
    image_url: null,
  },
  {
    slug: 'five-minute-flow',
    title: 'Ötperces zuhany',
    description: 'Korlátozd a zuhanyzást vagy vízfolyatást legfeljebb 5 percre fizikai vagy telefonos időzítővel.',
    instructions:
      '1. Állíts be egy 5 perces visszaszámlálót a víz megnyitása előtt.\n2. Zuhanyozz röviden, és zárd el a vizet szappanozás közben.\n3. Fotózd le az 5:00-át vagy lejárt időzítőt mutató órát egy száraz mosdópult mellett.',
    environmental_impact:
      'A zuhanyzás idejének 10 percről 5 percre csökkentése alkalmanként akár 45 liter felmelegített vizet is megtakarít.',
    category: 'Water Conservation',
    difficulty: 'medium',
    quest_type: 'daily',
    estimated_minutes: 5,
    xp_reward: 40,
    eco_points_reward: 20,
    verification_criteria:
      'A képen 5 perces visszaszámláló időzítőnek kell látszania telefonon vagy konyhai órán fürdőszobai mosdó vagy csempézett pult mellett (személyek nélkül a képen).',
    image_url: null,
  },
  {
    slug: 'cloud-declutter',
    title: 'Felhő nagytakarítás',
    description: 'Törölj legalább 50 régi promóciós e-mailt, és ürítsd ki a Spam és Kuka mappákat.',
    instructions:
      '1. Keress rá a régi hírlevelekre vagy lejárt promóciókra a postafiókodban.\n2. Töröld ki a felesleges leveleket, és ürítsd ki a Kuka mappát.\n3. Tölts fel egy megvágott képernyőképet, amelyen a Kuka/Spam 0 üzenetet mutat (takard ki a privát e-mail-címeket).',
    environmental_impact:
      'A felesleges felhőtárhely csökkentése hosszú távon mérsékli az adatközpontok folyamatos tárhely- és hűtési energiaigényét.',
    category: 'Digital Sustainability',
    difficulty: 'medium',
    quest_type: 'weekly',
    estimated_minutes: 15,
    xp_reward: 55,
    eco_points_reward: 25,
    verification_criteria:
      'A képernyőképnek egy e-mail kliens Kuka vagy Spam nézetét kell mutatnia, amely jelzi az üres vagy 0 darabos állapotot.',
    image_url: null,
  },
  {
    slug: 'zero-waste-lunch',
    title: 'Hulladékmentes ebéd',
    description: 'Csomagolj otthoni ételt újrafelhasználható dobozba, mosható evőeszközökkel.',
    instructions:
      '1. Készítsd el az ebédet üveg, fém vagy tartós műanyag ételtároló dobozba.\n2. Csomagolj fém vagy bambusz evőeszközt egyszer használatos műanyag helyett.\n3. Fotózd le az összekészített ebédet evés előtt.',
    environmental_impact:
      'Az eldobható elviteles dobozok és műanyag evőeszközök mellőzése megelőzi a nem újrahasznosítható, ételmaradékkal szennyezett csomagolási hulladékot.',
    category: 'Responsible Consumption',
    difficulty: 'medium',
    quest_type: 'daily',
    estimated_minutes: 15,
    xp_reward: 50,
    eco_points_reward: 25,
    verification_criteria:
      'A képen újrafelhasználható ételdobozban lévő ételnek és mosható evőeszköznek kell látszania (eldobható habszivacs vagy egyszer használatos elviteles doboz nélkül).',
    image_url: null,
  },
  {
    slug: 'borrow-dont-buy',
    title: 'Kölcsönözz, ne vásárolj',
    description: 'Kölcsönözz könyvet, eszközt vagy tananyagot könyvtárból vagy cserepolcról új vásárlása helyett.',
    instructions:
      '1. Látogass el az iskolai/városi könyvtárba vagy egy közösségi cserepolchoz.\n2. Vedd ki vagy kölcsönözd ki a szükséges könyvet vagy eszközt.\n3. Készíts egy fotót a kikölcsönzött tárgyról a könyvtári pultnál vagy a könyvtári vonalkóddal.',
    environmental_impact:
      'Az eszközök és könyvek megosztása meghosszabbítja az életciklust, és csökkenti a felesleges gyártási kibocsátást.',
    category: 'Responsible Consumption',
    difficulty: 'hard',
    quest_type: 'one_time',
    estimated_minutes: 30,
    xp_reward: 100,
    eco_points_reward: 50,
    verification_criteria:
      'A képen könyvtári vonalkóddal/gerinccímkével ellátott könyvnek, könyvtári polcnak/pultnak vagy közösségi csereasztalnak kell szerepelnie.',
    image_url: null,
  },
  {
    slug: 'phantom-load-hunt',
    title: 'Fantomfogyasztás-vadászat',
    description: 'Keresd meg és kapcsold le a készenléti (standby) elektronikát egy kapcsolós elosztón.',
    instructions:
      '1. Keresd meg a készenléti áramot fogyasztó töltőket, monitorokat vagy konzolokat.\n2. Kapcsold OFF állásba az elosztó főkapcsolóját, amikor nem használod őket.\n3. Készíts egy fotót a kikapcsolt elosztóról.',
    environmental_impact:
      'A készenléti „vámpír” terhelések a háztartási áramfogyasztás 5–10%-át teszik ki; a főkapcsoló megszünteti az üresjárati veszteséget.',
    category: 'Energy Saving',
    difficulty: 'hard',
    quest_type: 'weekly',
    estimated_minutes: 20,
    xp_reward: 80,
    eco_points_reward: 40,
    verification_criteria:
      'A képen többaljzatú elosztónak kell látszania, amelynek kapcsolója egyértelműen kikapcsolt (OFF) állásban van (a jelzőfény nem világít).',
    image_url: null,
  },
  {
    slug: 'micro-litter-sweep',
    title: 'Mikroszemét-söprés',
    description: 'Szedd össze biztonságosan a látható szemetet egy parkban, járdán vagy iskolaudvaron kesztyűvel vagy csipesszel.',
    instructions:
      '1. Viselj védőkesztyűt vagy használj szemétszedő csipeszt — soha ne nyúlj törött üveghez vagy veszélyes tárgyhoz.\n2. Gyűjtsd össze a biztonságos, száraz hulladékot (csomagolások, palackok, dobozok) egy zsákba.\n3. Fotózd le az összegyűjtött zsákot egy köztéri szemetes vagy szelektív gyűjtő mellett.',
    environmental_impact:
      'A városi hulladék összegyűjtése megakadályozza, hogy a mikroműanyagok és az alumínium a csapadékvíz-elvezetőkbe és a folyókba jussanak.',
    category: 'General Eco Habits',
    difficulty: 'epic',
    quest_type: 'special',
    estimated_minutes: 45,
    xp_reward: 150,
    eco_points_reward: 75,
    verification_criteria:
      'A képen zsákba gyűjtött szemétnek vagy kesztyűnek/csipesznek kell látszania egy köztéri szemetes vagy szelektív gyűjtő mellett.',
    image_url: null,
  },
  {
    slug: 'tote-over-plastic',
    title: 'Vászontáska nejlon helyett',
    description: 'Vidd a bevásárlást vagy a könyveidet újrafelhasználható vászontáskában eldobható műanyag zacskó helyett.',
    instructions:
      '1. Tarts egy összehajtható szövettáskát a hátizsákodban.\n2. Használd bevásárláshoz vagy könyvek szállításához.\n3. Készíts egy fotót a megpakolt vászontáskádról.',
    environmental_impact:
      'Az újrafelhasználható vászontáskák több száz vékony polietilén zacskót váltanak ki, amelyek eltömítik a válogatógépeket és szennyezik a talajt.',
    category: 'General Eco Habits',
    difficulty: 'easy',
    quest_type: 'one_time',
    estimated_minutes: 10,
    xp_reward: 35,
    eco_points_reward: 15,
    verification_criteria:
      'A képen könyveket, élelmiszert vagy személyes tárgyakat tartó újrafelhasználható szövet- vagy vászontáskának kell szerepelnie.',
    image_url: null,
  },
];

const STARTER_ACHIEVEMENTS = [
  {
    code: 'first_quest',
    title: 'Első hajtás',
    description: 'Teljesítsd az első igazolt fenntarthatósági küldetésedet.',
    rule_type: 'quests_completed',
    rule_threshold: 1,
    xp_bonus: 25,
  },
  {
    code: 'five_quests',
    title: 'Szokásépítő',
    description: 'Teljesíts 5 igazolt fenntarthatósági küldetést.',
    rule_type: 'quests_completed',
    rule_threshold: 5,
    xp_bonus: 50,
  },
  {
    code: 'ten_quests',
    title: 'Lombkorona-őr',
    description: 'Teljesíts 10 igazolt fenntarthatósági küldetést.',
    rule_type: 'quests_completed',
    rule_threshold: 10,
    xp_bonus: 100,
  },
  {
    code: 'streak_3',
    title: 'Háromnapos lendület',
    description: 'Tarts fenn aktív napi küldetéssorozatot 3 napon át.',
    rule_type: 'streak_days',
    rule_threshold: 3,
    xp_bonus: 40,
  },
  {
    code: 'streak_7',
    title: 'Heti gondnok',
    description: 'Tarts fenn aktív napi küldetéssorozatot 7 napon át.',
    rule_type: 'streak_days',
    rule_threshold: 7,
    xp_bonus: 100,
  },
  {
    code: 'xp_250',
    title: 'Feltörekvő öko-aktivista',
    description: 'Érj el összesen 250 XP-t a fenntarthatósági küldetésekkel.',
    rule_type: 'total_xp',
    rule_threshold: 250,
    xp_bonus: 30,
  },
  {
    code: 'xp_500',
    title: 'Napfény-úttörő',
    description: 'Érj el összesen 500 XP-t a fenntarthatósági küldetésekkel.',
    rule_type: 'total_xp',
    rule_threshold: 500,
    xp_bonus: 75,
  },
  {
    code: 'categories_3',
    title: 'Sokoldalú hős',
    description: 'Teljesíts igazolt küldetéseket legalább 3 különböző öko-kategóriában.',
    rule_type: 'category_count',
    rule_threshold: 3,
    xp_bonus: 60,
  },
] as const;

function seedDatabase(): void {
  const insertQuest = db.prepare(`
    INSERT INTO quests (
      id, slug, title, description, instructions, environmental_impact,
      category, difficulty, quest_type, estimated_minutes,
      xp_reward, eco_points_reward, verification_type, verification_criteria,
      is_active, image_url
    ) VALUES (
      @id, @slug, @title, @description, @instructions, @environmental_impact,
      @category, @difficulty, @quest_type, @estimated_minutes,
      @xp_reward, @eco_points_reward, 'photo', @verification_criteria,
      1, @image_url
    )
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      instructions = excluded.instructions,
      environmental_impact = excluded.environmental_impact,
      verification_criteria = excluded.verification_criteria
  `);

  const insertAchievement = db.prepare(`
    INSERT INTO achievements (
      id, code, title, description, rule_type, rule_threshold, xp_bonus
    ) VALUES (@id, @code, @title, @description, @rule_type, @rule_threshold, @xp_bonus)
    ON CONFLICT(code) DO UPDATE SET
      title = excluded.title,
      description = excluded.description
  `);

  const tx = db.transaction(() => {
    for (const q of STARTER_QUESTS) {
      insertQuest.run({
        id: crypto.randomUUID(),
        ...q,
      });
    }
    for (const a of STARTER_ACHIEVEMENTS) {
      insertAchievement.run({
        id: crypto.randomUUID(),
        ...a,
      });
    }
  });
  tx();
}

seedDatabase();

export interface FinalizeResult {
  submissionStatus: SubmissionStatus;
  xpAwarded: number;
  pointsAwarded: number;
  newAchievements: string[];
}

/**
 * Atomically saves verification/review results and awards XP, EcoPoints,
 * immutable reward transactions, UTC streak, level, and achievements ONLY on approval.
 */
export const finalizeSubmissionTx = db.transaction(
  (params: {
    submissionId: string;
    status: SubmissionStatus;
    aiResult?: AiVerificationResult | null;
    reviewedBy?: string | null;
    reviewNote?: string | null;
  }): FinalizeResult => {
    const submission = db
      .prepare('SELECT * FROM quest_submissions WHERE id = ?')
      .get(params.submissionId) as
      | {
          id: string;
          user_id: string;
          quest_id: string;
          user_quest_id: string | null;
          period_key: string;
          status: SubmissionStatus;
        }
      | undefined;

    if (!submission) {
      throw new Error('Submission not found');
    }

    const quest = db
      .prepare('SELECT * FROM quests WHERE id = ?')
      .get(submission.quest_id) as
      | {id: string; title: string; xp_reward: number; eco_points_reward: number}
      | undefined;

    if (!quest) {
      throw new Error('Quest not found');
    }

    const nowIso = new Date().toISOString();

    if (params.aiResult) {
      db.prepare(
        `UPDATE quest_submissions
         SET status = ?, ai_confidence = ?, ai_result = ?
         WHERE id = ?`,
      ).run(
        params.status,
        params.aiResult.confidence,
        JSON.stringify(params.aiResult),
        submission.id,
      );
    } else {
      db.prepare(
        `UPDATE quest_submissions
         SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = ?
         WHERE id = ?`,
      ).run(
        params.status,
        params.reviewedBy || null,
        params.reviewNote || null,
        nowIso,
        submission.id,
      );
    }

    if (params.status !== 'approved') {
      return {
        submissionStatus: params.status,
        xpAwarded: 0,
        pointsAwarded: 0,
        newAchievements: [],
      };
    }

    // Prevent duplicate reward transactions for the same submission
    const existingReward = db
      .prepare(
        `SELECT id FROM reward_transactions
         WHERE submission_id = ? AND tx_type = 'quest_reward'`,
      )
      .get(submission.id);

    if (existingReward) {
      return {
        submissionStatus: 'approved',
        xpAwarded: 0,
        pointsAwarded: 0,
        newAchievements: [],
      };
    }

    if (submission.user_quest_id) {
      db.prepare(
        `UPDATE user_quests SET status = 'completed', completed_at = ? WHERE id = ?`,
      ).run(nowIso, submission.user_quest_id);
    } else {
      db.prepare(
        `INSERT INTO user_quests (id, user_id, quest_id, period_key, status, started_at, completed_at)
         VALUES (?, ?, ?, ?, 'completed', ?, ?)
         ON CONFLICT(user_id, quest_id, period_key)
         DO UPDATE SET status = 'completed', completed_at = excluded.completed_at`,
      ).run(
        crypto.randomUUID(),
        submission.user_id,
        submission.quest_id,
        submission.period_key,
        nowIso,
        nowIso,
      );
    }

    db.prepare(
      `INSERT INTO reward_transactions (id, user_id, submission_id, tx_type, xp_delta, points_delta, description)
       VALUES (?, ?, ?, 'quest_reward', ?, ?, ?)`,
    ).run(
      crypto.randomUUID(),
      submission.user_id,
      submission.id,
      quest.xp_reward,
      quest.eco_points_reward,
      `Teljesített küldetés: ${quest.title}`,
    );

    const profile = db
      .prepare('SELECT xp, eco_points, current_streak, longest_streak, last_quest_date FROM profiles WHERE id = ?')
      .get(submission.user_id) as {
      xp: number;
      eco_points: number;
      current_streak: number;
      longest_streak: number;
      last_quest_date: string | null;
    };

    const todayUtc = getUtcDateString();
    const nextStreak = computeNextStreak(
      profile.last_quest_date,
      profile.current_streak,
      profile.longest_streak,
      todayUtc,
    );

    let totalXp = profile.xp + quest.xp_reward;
    const totalPoints = profile.eco_points + quest.eco_points_reward;

    // Evaluate achievements
    const stats = db
      .prepare(
        `SELECT COUNT(DISTINCT id) as completed_count
         FROM quest_submissions
         WHERE user_id = ? AND status = 'approved'`,
      )
      .get(submission.user_id) as {completed_count: number};

    const categoriesCompleted = db
      .prepare(
        `SELECT COUNT(DISTINCT q.category) as cat_count
         FROM quest_submissions s
         JOIN quests q ON q.id = s.quest_id
         WHERE s.user_id = ? AND s.status = 'approved'`,
      )
      .get(submission.user_id) as {cat_count: number};

    const lockedAchievements = db
      .prepare(
        `SELECT a.* FROM achievements a
         WHERE NOT EXISTS (
           SELECT 1 FROM user_achievements ua
           WHERE ua.user_id = ? AND ua.achievement_id = a.id
         )`,
      )
      .all(submission.user_id) as Array<{
      id: string;
      code: string;
      title: string;
      rule_type: 'quests_completed' | 'streak_days' | 'total_xp' | 'category_count';
      rule_threshold: number;
      xp_bonus: number;
    }>;

    const unlockedTitles: string[] = [];
    let bonusXp = 0;

    for (const ach of lockedAchievements) {
      let qualifies = false;
      if (ach.rule_type === 'quests_completed') {
        qualifies = stats.completed_count >= ach.rule_threshold;
      } else if (ach.rule_type === 'streak_days') {
        qualifies = nextStreak.current_streak >= ach.rule_threshold;
      } else if (ach.rule_type === 'total_xp') {
        qualifies = totalXp >= ach.rule_threshold;
      } else if (ach.rule_type === 'category_count') {
        qualifies = categoriesCompleted.cat_count >= ach.rule_threshold;
      }

      if (qualifies) {
        db.prepare(
          `INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at)
           VALUES (?, ?, ?)`,
        ).run(submission.user_id, ach.id, nowIso);

        if (ach.xp_bonus > 0) {
          bonusXp += ach.xp_bonus;
          db.prepare(
            `INSERT INTO reward_transactions (id, user_id, submission_id, tx_type, xp_delta, points_delta, description)
             VALUES (?, ?, NULL, 'achievement_bonus', ?, 0, ?)`,
          ).run(
            crypto.randomUUID(),
            submission.user_id,
            ach.xp_bonus,
            `Elért eredmény: ${ach.title}`,
          );
        }
        unlockedTitles.push(ach.title);
      }
    }

    totalXp += bonusXp;
    const nextLevel = calculateLevelFromXp(totalXp);

    db.prepare(
      `UPDATE profiles
       SET xp = ?, level = ?, eco_points = ?, current_streak = ?, longest_streak = ?,
           last_quest_date = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      totalXp,
      nextLevel,
      totalPoints,
      nextStreak.current_streak,
      nextStreak.longest_streak,
      nextStreak.last_quest_date,
      nowIso,
      submission.user_id,
    );

    return {
      submissionStatus: 'approved',
      xpAwarded: quest.xp_reward + bonusXp,
      pointsAwarded: quest.eco_points_reward,
      newAchievements: unlockedTitles,
    };
  },
);
