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
    avatar_url TEXT,
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
    title: 'Digital Learner',
    description: 'Write at least two pages of study notes digitally instead of on disposable paper.',
    instructions:
      '1. Open your preferred digital note-taking app on a laptop or tablet.\n2. Complete your study session notes cleanly in digital format.\n3. Capture a clear photo showing your digital notes on screen (avoid sensitive personal data).',
    environmental_impact:
      'Replacing paper notebooks with digital study workflows reduces pulp demand, bleaching chemicals, and forestry water consumption.',
    category: 'Digital Sustainability',
    difficulty: 'easy',
    quest_type: 'daily',
    estimated_minutes: 20,
    xp_reward: 30,
    eco_points_reward: 15,
    verification_criteria:
      'Image must clearly show a tablet, laptop, or desktop screen displaying digital study notes. Note: A single photo cannot prove exact page count or zero paper usage elsewhere.',
    image_url: '/src/assets/images/quest_digital_notes_1795617620749.jpg',
  },
  {
    slug: 'refill-hero',
    title: 'Refill Hero',
    description: 'Use a reusable water bottle instead of purchasing a single-use plastic bottle.',
    instructions:
      '1. Bring your reusable stainless steel, glass, or durable bottle.\n2. Fill it at a tap, water dispenser, or campus refill station.\n3. Snap a photo of your reusable bottle being refilled or next to the tap.',
    environmental_impact:
      'One person switching to a refillable bottle prevents an average of 150+ single-use plastic bottles from entering landfills or waterways each year.',
    category: 'Water Conservation',
    difficulty: 'easy',
    quest_type: 'daily',
    estimated_minutes: 5,
    xp_reward: 25,
    eco_points_reward: 10,
    verification_criteria:
      'Image must show a reusable water bottle (metal, glass, or hard reusable flask) near a tap, kitchen sink, or refill station. Reject disposable thin PET bottles.',
    image_url: null,
  },
  {
    slug: 'energy-saver',
    title: 'Energy Saver',
    description: 'Turn off unnecessary room lights and eliminate idle electrical draw.',
    instructions:
      '1. Check unoccupied rooms or desk lamps when daylight is sufficient.\n2. Switch off overhead lighting and idle appliances.\n3. Take a photo showing the switched-off light switch or darkened room powered by daylight.',
    environmental_impact:
      'Cutting unnecessary lighting reduces peak grid demand and lowers fossil-fuel electricity generation.',
    category: 'Energy Saving',
    difficulty: 'easy',
    quest_type: 'daily',
    estimated_minutes: 5,
    xp_reward: 25,
    eco_points_reward: 10,
    verification_criteria:
      'Image must visibly depict a switched-off light fixture, light switch in off position, or a workspace lit by natural daylight with lamps off.',
    image_url: null,
  },
  {
    slug: 'recycling-master',
    title: 'Recycling Master',
    description: 'Sort recyclable household waste cleanly into paper, plastic, metal, or glass streams.',
    instructions:
      '1. Rinse food residue from containers before sorting.\n2. Separate clean paper/cardboard from plastics, cans, or glass.\n3. Take a clear photo showing your sorted recyclables placed in distinct bins or bags.',
    environmental_impact:
      'Clean source separation prevents contamination batches from being sent to landfill and keeps recycled aluminum and paper fibers viable.',
    category: 'Recycling',
    difficulty: 'medium',
    quest_type: 'daily',
    estimated_minutes: 15,
    xp_reward: 45,
    eco_points_reward: 20,
    verification_criteria:
      'Image must show clearly separated recyclable materials (e.g., paper, plastic bottles, aluminum cans, or glass) in recycling bins or sorted piles.',
    image_url: null,
  },
  {
    slug: 'sustainable-commute',
    title: 'Sustainable Commute',
    description: 'Walk, cycle, or ride public transit instead of taking a private car for a suitable trip.',
    instructions:
      '1. Plan a local campus, school, or grocery journey on foot, by bike, or via bus/train.\n2. Capture a safe photo while stopped (parked bicycle, transit platform, or pedestrian trail—never while riding in traffic).',
    environmental_impact:
      'Replacing a single 10 km solo car trip with cycling or public transit avoids roughly 1.5–2 kg of tailpipe CO2 emissions.',
    category: 'Sustainable Transport',
    difficulty: 'medium',
    quest_type: 'daily',
    estimated_minutes: 30,
    xp_reward: 50,
    eco_points_reward: 25,
    verification_criteria:
      'Image must show a parked bicycle on a bike path/rack, a public transit bus/train/station, or an outdoor walking footpath.',
    image_url: '/src/assets/images/quest_sustainable_commute_1795617621118.jpg',
  },
  {
    slug: 'daylight-desk',
    title: 'Daylight Desk',
    description: 'Complete a full 1-hour study block using natural window light with artificial lamps off.',
    instructions:
      '1. Position your study workspace beside a window.\n2. Keep desk lamps and overhead lights turned off.\n3. Take a photo of your naturally lit desk setup.',
    environmental_impact:
      'Daylighting reduces daytime residential electricity draw and improves visual comfort without extra wattage.',
    category: 'Energy Saving',
    difficulty: 'easy',
    quest_type: 'weekly',
    estimated_minutes: 60,
    xp_reward: 60,
    eco_points_reward: 30,
    verification_criteria:
      'Image must show a desk or study table illuminated by natural window light with visible lamps switched off.',
    image_url: null,
  },
  {
    slug: 'five-minute-flow',
    title: 'Five-Minute Flow',
    description: 'Cap your shower or tap flow at 5 minutes using a physical or phone timer.',
    instructions:
      '1. Set a 5-minute countdown timer before turning on the water.\n2. Keep the shower concise and turn off water while lathering.\n3. Photograph your timer showing 5:00 or completed countdown beside a dry sink counter.',
    environmental_impact:
      'Cutting shower length from 10 minutes to 5 minutes saves up to 45 liters of heated water per session.',
    category: 'Water Conservation',
    difficulty: 'medium',
    quest_type: 'daily',
    estimated_minutes: 5,
    xp_reward: 40,
    eco_points_reward: 20,
    verification_criteria:
      'Image must show a 5-minute countdown timer on a phone or kitchen timer near a bathroom sink or tile counter (no people in frame).',
    image_url: null,
  },
  {
    slug: 'cloud-declutter',
    title: 'Cloud Declutter',
    description: 'Delete at least 50 old promotional emails and empty your spam/trash folders.',
    instructions:
      '1. Search your inbox for old newsletters or expired promotions.\n2. Batch-delete unnecessary threads and empty the Trash folder.\n3. Upload a cropped screenshot showing your cleared Trash/Spam count of 0 (hide private email addresses).',
    environmental_impact:
      'Trimming redundant cloud storage reduces continuous data center server storage and cooling energy over time.',
    category: 'Digital Sustainability',
    difficulty: 'medium',
    quest_type: 'weekly',
    estimated_minutes: 15,
    xp_reward: 55,
    eco_points_reward: 25,
    verification_criteria:
      'Screenshot must show an email client Trash or Spam view indicating deleted or zero messages remaining.',
    image_url: null,
  },
  {
    slug: 'zero-waste-lunch',
    title: 'Zero-Waste Lunch',
    description: 'Pack a homemade meal using reusable containers, cloth napkins, and washable cutlery.',
    instructions:
      '1. Prepare lunch in reusable glass, steel, or durable containers.\n2. Pack metal/bamboo utensils instead of single-use plastic.\n3. Photograph your packed meal setup before eating.',
    environmental_impact:
      'Avoiding single-use takeout clamshells and plastic cutlery prevents unrecyclable food-soiled packaging waste.',
    category: 'Responsible Consumption',
    difficulty: 'medium',
    quest_type: 'daily',
    estimated_minutes: 15,
    xp_reward: 50,
    eco_points_reward: 25,
    verification_criteria:
      'Image must show food packed in reusable containers with washable utensils (no disposable foam or single-use plastic takeout boxes).',
    image_url: null,
  },
  {
    slug: 'borrow-dont-buy',
    title: "Borrow, Don't Buy",
    description: 'Borrow a book, tool, or study resource from a library or peer swap instead of buying new.',
    instructions:
      '1. Visit your school/public library or campus sharing shelf.\n2. Check out or borrow an item you need.\n3. Take a photo of the borrowed item at the library desk or with its library label.',
    environmental_impact:
      'Sharing resources extends product lifecycles and prevents manufacturing emissions from redundant personal purchases.',
    category: 'Responsible Consumption',
    difficulty: 'hard',
    quest_type: 'one_time',
    estimated_minutes: 30,
    xp_reward: 100,
    eco_points_reward: 50,
    verification_criteria:
      'Image must show a library book with a library barcode/spine label, a library shelf/kiosk, or a shared item swap table.',
    image_url: null,
  },
  {
    slug: 'phantom-load-hunt',
    title: 'Phantom Load Hunt',
    description: 'Identify and power down standby electronics on a switched multi-outlet power strip.',
    instructions:
      '1. Locate chargers, monitors, or consoles drawing standby power.\n2. Flip the main power strip rocker switch OFF when not in use.\n3. Capture a photo of the switched-off power strip.',
    environmental_impact:
      'Standby "vampire" loads account for 5–10% of typical household electricity use; master switches eliminate idle draw.',
    category: 'Energy Saving',
    difficulty: 'hard',
    quest_type: 'weekly',
    estimated_minutes: 20,
    xp_reward: 80,
    eco_points_reward: 40,
    verification_criteria:
      'Image must show a multi-outlet power strip with its power switch clearly in the OFF position (indicator light off).',
    image_url: null,
  },
  {
    slug: 'micro-litter-sweep',
    title: 'Micro-Litter Sweep',
    description: 'Safely collect visible litter from a park, sidewalk, or campus courtyard using gloves or a grabber.',
    instructions:
      '1. Wear protective gloves or use a litter grabber—never pick up sharp glass or hazardous items.\n2. Collect safe dry litter (wrappers, bottles, cans) into a bag.\n3. Photograph the collected bag placed beside a public trash or recycling bin.',
    environmental_impact:
      'Intercepting urban litter prevents microplastics and aluminum from washing into storm drains and local rivers.',
    category: 'General Eco Habits',
    difficulty: 'epic',
    quest_type: 'special',
    estimated_minutes: 45,
    xp_reward: 150,
    eco_points_reward: 75,
    verification_criteria:
      'Image must show collected litter in a bag or glove/grabber next to a public waste or recycling receptacle.',
    image_url: null,
  },
  {
    slug: 'tote-over-plastic',
    title: 'Tote Over Plastic',
    description: 'Carry groceries or books in a reusable cloth tote bag instead of accepting disposable plastic bags.',
    instructions:
      '1. Keep a foldable fabric tote in your backpack.\n2. Use it to carry your errands or books home.\n3. Take a photo of your packed reusable tote bag.',
    environmental_impact:
      'Reusable cloth totes displace hundreds of thin polyethylene bags that jam sorting machinery and persist in soil.',
    category: 'General Eco Habits',
    difficulty: 'easy',
    quest_type: 'one_time',
    estimated_minutes: 10,
    xp_reward: 35,
    eco_points_reward: 15,
    verification_criteria:
      'Image must show a reusable cloth or canvas tote bag holding books, groceries, or personal items.',
    image_url: null,
  },
];

const STARTER_ACHIEVEMENTS = [
  {
    code: 'first_quest',
    title: 'First Sprout',
    description: 'Complete your first verified sustainability quest.',
    rule_type: 'quests_completed',
    rule_threshold: 1,
    xp_bonus: 25,
  },
  {
    code: 'five_quests',
    title: 'Habit Builder',
    description: 'Complete 5 verified sustainability quests.',
    rule_type: 'quests_completed',
    rule_threshold: 5,
    xp_bonus: 50,
  },
  {
    code: 'ten_quests',
    title: 'Canopy Guardian',
    description: 'Complete 10 verified sustainability quests.',
    rule_type: 'quests_completed',
    rule_threshold: 10,
    xp_bonus: 100,
  },
  {
    code: 'streak_3',
    title: 'Three-Day Momentum',
    description: 'Maintain an active daily quest streak for 3 days.',
    rule_type: 'streak_days',
    rule_threshold: 3,
    xp_bonus: 40,
  },
  {
    code: 'streak_7',
    title: 'Weekly Steward',
    description: 'Maintain an active daily quest streak for 7 days.',
    rule_type: 'streak_days',
    rule_threshold: 7,
    xp_bonus: 100,
  },
  {
    code: 'xp_250',
    title: 'Rising Eco-Advocate',
    description: 'Reach 250 total XP across all sustainability quests.',
    rule_type: 'total_xp',
    rule_threshold: 250,
    xp_bonus: 30,
  },
  {
    code: 'xp_500',
    title: 'Solar Trailblazer',
    description: 'Reach 500 total XP across all sustainability quests.',
    rule_type: 'total_xp',
    rule_threshold: 500,
    xp_bonus: 75,
  },
  {
    code: 'categories_3',
    title: 'All-Rounder',
    description: 'Complete verified quests across 3 different eco categories.',
    rule_type: 'category_count',
    rule_threshold: 3,
    xp_bonus: 60,
  },
] as const;

function seedDatabase(): void {
  const insertQuest = db.prepare(`
    INSERT OR IGNORE INTO quests (
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
  `);

  const insertAchievement = db.prepare(`
    INSERT OR IGNORE INTO achievements (
      id, code, title, description, rule_type, rule_threshold, xp_bonus
    ) VALUES (@id, @code, @title, @description, @rule_type, @rule_threshold, @xp_bonus)
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
      `Completed quest: ${quest.title}`,
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
            `Achievement unlocked: ${ach.title}`,
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
