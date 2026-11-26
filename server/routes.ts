import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {NextFunction, Request, Response, Router} from 'express';
import express from 'express';
import {z} from 'zod';
import {
  AdminReviewSchema,
  AuthLoginSchema,
  AuthSignupSchema,
  CreateQuestSchema,
  UpdateProfileSchema,
  UpdateQuestSchema,
  type QuestType,
  type UserProfile,
} from '../src/shared/types.ts';
import {
  clearSessionCookie,
  extractTokenFromRequest,
  hashPassword,
  requireCsrfHeader,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from './auth.ts';
import {db, EVIDENCE_DIR, finalizeSubmissionTx} from './db.ts';
import {getLevelProgress, getUtcDateString, getUtcPeriodKey} from './gamification.ts';
import {DEFAULT_CLOUDFLARE_MODEL, verifyEvidenceWithCloudflare} from './cloudflare-ai.ts';

interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

function mapProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: String(row.email),
    username: String(row.username),
    role: row.role === 'admin' ? 'admin' : 'user',
    xp: Number(row.xp),
    level: Number(row.level),
    eco_points: Number(row.eco_points),
    current_streak: Number(row.current_streak),
    longest_streak: Number(row.longest_streak),
    last_quest_date: row.last_quest_date ? String(row.last_quest_date) : null,
    theme_preference: row.theme_preference === 'light' ? 'light' : 'dark',
    created_at: String(row.created_at),
  };
}

function attachOptionalUser(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = extractTokenFromRequest(req);
  const payload = verifySessionToken(token);
  if (payload) {
    const row = db
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(payload.uid) as Record<string, unknown> | undefined;
    if (row) {
      req.user = mapProfile(row);
    }
  }
  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({error: 'Authentication required'});
    return;
  }
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({error: 'Authentication required'});
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({error: 'Admin access required'});
    return;
  }
  next();
}

function resolveConfinedEvidencePath(relativeEvidencePath: string): string | null {
  const resolved = path.resolve(EVIDENCE_DIR, relativeEvidencePath);
  if (!resolved.startsWith(EVIDENCE_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

function formatSubmission(row: Record<string, unknown>) {
  let parsedAi = null;
  if (row.ai_result && typeof row.ai_result === 'string') {
    try {
      parsedAi = JSON.parse(row.ai_result);
    } catch {
      parsedAi = null;
    }
  }
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    quest_id: String(row.quest_id),
    quest_title: row.quest_title ? String(row.quest_title) : undefined,
    quest_slug: row.quest_slug ? String(row.quest_slug) : undefined,
    quest_category: row.quest_category ? String(row.quest_category) : undefined,
    username: row.username ? String(row.username) : undefined,
    period_key: String(row.period_key),
    has_evidence: Boolean(row.evidence_path),
    evidence_deleted_at: row.evidence_deleted_at ? String(row.evidence_deleted_at) : null,
    user_note: row.user_note ? String(row.user_note) : null,
    status: String(row.status),
    ai_confidence: row.ai_confidence !== null && row.ai_confidence !== undefined ? Number(row.ai_confidence) : null,
    ai_result: parsedAi,
    reviewed_by: row.reviewed_by ? String(row.reviewed_by) : null,
    review_note: row.review_note ? String(row.review_note) : null,
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
    created_at: String(row.created_at),
  };
}

const VerificationPayloadSchema = z.object({
  questId: z.string().min(1),
  imageDataUrl: z.string().min(20),
  userNote: z.string().max(400).optional(),
});

const AdminClaimSchema = z.object({
  passcode: z.string().min(4).max(128),
});

const authAttempts = new Map<string, number[]>();

function isRateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (authAttempts.get(key) || []).filter((ts) => now - ts < windowMs);
  if (recent.length >= maxAttempts) {
    authAttempts.set(key, recent);
    return true;
  }
  recent.push(now);
  authAttempts.set(key, recent);
  return false;
}

export function createApiRouter(): Router {
  const router = express.Router();

  router.use(requireCsrfHeader);
  router.use(attachOptionalUser);

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      aiProvider: 'cloudflare',
      aiConfigured: Boolean(
        process.env.CLOUDFLARE_ACCOUNT_ID?.trim() && process.env.CLOUDFLARE_API_TOKEN?.trim(),
      ),
      model: process.env.CLOUDFLARE_AI_MODEL?.trim() || DEFAULT_CLOUDFLARE_MODEL,
    });
  });

  // --- AUTH ROUTES ---
  router.get('/auth/me', (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      res.json({user: null, levelProgress: null});
      return;
    }
    res.json({
      user: req.user,
      levelProgress: getLevelProgress(req.user.xp),
    });
  });

  router.get('/auth/admin-status', (_req, res) => {
    const adminCountRow = db
      .prepare(`SELECT COUNT(*) as count FROM profiles WHERE role = 'admin'`)
      .get() as {count: number};
    const passcodeConfigured = Boolean(process.env.ADMIN_PASSCODE?.trim());
    res.json({
      hasAdmin: adminCountRow.count > 0,
      passcodeConfigured,
      canClaimInitialAdmin: false,
    });
  });

  router.post('/auth/signup', (req, res) => {
    const parsed = AuthSignupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: parsed.error.issues[0]?.message || 'Invalid signup fields'});
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    const username = parsed.data.username.trim();
    const existing = db
      .prepare('SELECT id FROM profiles WHERE email = ? OR lower(username) = lower(?)')
      .get(email, username);
    if (existing) {
      res.status(409).json({error: 'An account with that email or username already exists'});
      return;
    }

    const id = crypto.randomUUID();
    const passwordHash = hashPassword(parsed.data.password);
    db.prepare(
      `INSERT INTO profiles (id, email, username, password_hash, role)
       VALUES (?, ?, ?, ?, 'user')`,
    ).run(id, email, username, passwordHash);

    const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as Record<string, unknown>;
    const token = signSessionToken(id);
    setSessionCookie(req, res, token);
    const user = mapProfile(row);
    res.status(201).json({user, levelProgress: getLevelProgress(user.xp)});
  });

  router.post('/auth/login', (req, res) => {
    if (isRateLimited(`login:${req.ip || 'unknown'}`, 20, 15 * 60 * 1000)) {
      res.status(429).json({error: 'Too many login attempts. Please try again later.'});
      return;
    }
    const parsed = AuthLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'Please enter a valid email and password'});
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    const row = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email) as
      | (Record<string, unknown> & {password_hash: string})
      | undefined;

    if (!row || !verifyPassword(parsed.data.password, row.password_hash)) {
      res.status(401).json({error: 'Invalid email or password'});
      return;
    }

    const token = signSessionToken(String(row.id));
    setSessionCookie(req, res, token);
    const user = mapProfile(row);
    res.json({user, levelProgress: getLevelProgress(user.xp)});
  });

  router.post('/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ok: true});
  });

  router.post('/auth/claim-admin', requireAuth, (req: AuthenticatedRequest, res) => {
    if (isRateLimited(`claim-admin:${req.user!.id}`, 10, 15 * 60 * 1000)) {
      res.status(429).json({error: 'Too many admin claim attempts. Please try again later.'});
      return;
    }

    const configuredPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (!configuredPasscode) {
      res.status(403).json({
        error: 'ADMIN_PASSCODE is not configured on the server. Admin promotion is disabled.',
      });
      return;
    }

    const parsed = AdminClaimSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({error: 'Invalid passcode format'});
      return;
    }

    const provided = parsed.data.passcode.trim();
    const a = Buffer.from(provided, 'utf8');
    const b = Buffer.from(configuredPasscode, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(403).json({error: 'Invalid server admin passcode'});
      return;
    }

    db.prepare(`UPDATE profiles SET role = 'admin', updated_at = datetime('now') WHERE id = ?`).run(
      req.user!.id,
    );
    const updated = db
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(req.user!.id) as Record<string, unknown>;
    res.json({user: mapProfile(updated)});
  });

  // --- QUEST ROUTES ---
  router.get('/quests', (req: AuthenticatedRequest, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const questType = typeof req.query.type === 'string' ? req.query.type : '';
    const difficulty = typeof req.query.difficulty === 'string' ? req.query.difficulty : '';
    const search = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

    const conditions = ['is_active = 1'];
    const params: unknown[] = [];

    if (category && category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }
    if (questType && questType !== 'all') {
      conditions.push('quest_type = ?');
      params.push(questType);
    }
    if (difficulty && difficulty !== 'all') {
      conditions.push('difficulty = ?');
      params.push(difficulty);
    }
    if (search) {
      conditions.push('(lower(title) LIKE ? OR lower(description) LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const rows = db
      .prepare(`SELECT * FROM quests WHERE ${conditions.join(' AND ')} ORDER BY quest_type, xp_reward ASC`)
      .all(...params) as Array<Record<string, unknown>>;

    const userId = req.user?.id;
    const enriched = rows.map((q) => {
      const periodKey = getUtcPeriodKey(q.quest_type as QuestType);
      let userStatus: string = 'available';
      let latestSubmission = null;

      if (userId) {
        const uq = db
          .prepare(
            `SELECT status FROM user_quests WHERE user_id = ? AND quest_id = ? AND period_key = ?`,
          )
          .get(userId, q.id, periodKey) as {status: string} | undefined;

        const sub = db
          .prepare(
            `SELECT * FROM quest_submissions
             WHERE user_id = ? AND quest_id = ? AND period_key = ?
             ORDER BY created_at DESC LIMIT 1`,
          )
          .get(userId, q.id, periodKey) as Record<string, unknown> | undefined;

        if (sub) {
          latestSubmission = formatSubmission(sub);
          if (sub.status === 'approved') userStatus = 'completed';
          else if (sub.status === 'needs_review') userStatus = 'needs_review';
          else if (sub.status === 'pending') userStatus = 'pending';
          else if (sub.status === 'rejected') userStatus = 'rejected';
        } else if (uq) {
          userStatus = uq.status === 'completed' ? 'completed' : 'in_progress';
        }
      }

      return {
        ...q,
        is_active: Boolean(q.is_active),
        period_key: periodKey,
        user_status: userStatus,
        latest_submission: latestSubmission,
      };
    });

    res.json({quests: enriched});
  });

  router.get('/quests/:slug', (req: AuthenticatedRequest, res) => {
    const q = db.prepare('SELECT * FROM quests WHERE slug = ? AND is_active = 1').get(req.params.slug) as
      | Record<string, unknown>
      | undefined;

    if (!q) {
      res.status(404).json({error: 'Quest not found'});
      return;
    }

    const periodKey = getUtcPeriodKey(q.quest_type as QuestType);
    let userStatus = 'available';
    let latestSubmission = null;
    let periodSubmissions: unknown[] = [];

    if (req.user) {
      const uq = db
        .prepare(
          `SELECT status FROM user_quests WHERE user_id = ? AND quest_id = ? AND period_key = ?`,
        )
        .get(req.user.id, q.id, periodKey) as {status: string} | undefined;

      const subs = db
        .prepare(
          `SELECT * FROM quest_submissions
           WHERE user_id = ? AND quest_id = ? AND period_key = ?
           ORDER BY created_at DESC`,
        )
        .all(req.user.id, q.id, periodKey) as Array<Record<string, unknown>>;

      periodSubmissions = subs.map(formatSubmission);
      if (subs[0]) {
        latestSubmission = periodSubmissions[0];
        const st = String(subs[0].status);
        if (st === 'approved') userStatus = 'completed';
        else if (st === 'needs_review') userStatus = 'needs_review';
        else if (st === 'pending') userStatus = 'pending';
        else if (st === 'rejected') userStatus = 'rejected';
      } else if (uq) {
        userStatus = uq.status === 'completed' ? 'completed' : 'in_progress';
      }
    }

    res.json({
      quest: {
        ...q,
        is_active: Boolean(q.is_active),
        period_key: periodKey,
        user_status: userStatus,
        latest_submission: latestSubmission,
      },
      submissions: periodSubmissions,
    });
  });

  router.post('/quests/:slug/start', requireAuth, (req: AuthenticatedRequest, res) => {
    const q = db.prepare('SELECT * FROM quests WHERE slug = ? AND is_active = 1').get(req.params.slug) as
      | {id: string; quest_type: QuestType}
      | undefined;

    if (!q) {
      res.status(404).json({error: 'Quest not found'});
      return;
    }

    const periodKey = getUtcPeriodKey(q.quest_type);
    const existing = db
      .prepare(
        `SELECT * FROM user_quests WHERE user_id = ? AND quest_id = ? AND period_key = ?`,
      )
      .get(req.user!.id, q.id, periodKey) as {id: string; status: string} | undefined;

    if (existing) {
      res.json({
        userQuest: existing,
        alreadyStarted: true,
        period_key: periodKey,
      });
      return;
    }

    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO user_quests (id, user_id, quest_id, period_key, status)
       VALUES (?, ?, ?, ?, 'in_progress')`,
    ).run(id, req.user!.id, q.id, periodKey);

    res.status(201).json({
      userQuest: {id, user_id: req.user!.id, quest_id: q.id, period_key: periodKey, status: 'in_progress'},
      alreadyStarted: false,
      period_key: periodKey,
    });
  });

  // --- DASHBOARD & PROFILE ---
  router.get('/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const todayUtc = getUtcDateString();

    const dailyQuests = db
      .prepare(`SELECT * FROM quests WHERE is_active = 1 AND quest_type = 'daily' ORDER BY xp_reward ASC`)
      .all() as Array<Record<string, unknown>>;

    const enrichedDaily = dailyQuests.map((q) => {
      const sub = db
        .prepare(
          `SELECT status FROM quest_submissions
           WHERE user_id = ? AND quest_id = ? AND period_key = ?
           ORDER BY created_at DESC LIMIT 1`,
        )
        .get(userId, q.id, todayUtc) as {status: string} | undefined;
      const uq = db
        .prepare(
          `SELECT status FROM user_quests WHERE user_id = ? AND quest_id = ? AND period_key = ?`,
        )
        .get(userId, q.id, todayUtc) as {status: string} | undefined;

      let user_status = 'available';
      if (sub?.status === 'approved') user_status = 'completed';
      else if (sub?.status === 'needs_review') user_status = 'needs_review';
      else if (sub?.status === 'pending') user_status = 'pending';
      else if (sub?.status === 'rejected') user_status = 'rejected';
      else if (uq) user_status = 'in_progress';

      return {...q, is_active: true, period_key: todayUtc, user_status};
    });

    // Build last 7 UTC days completion summary
    const last7Days: Array<{date: string; label: string; completed: number}> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = getUtcDateString(d);
      const row = db
        .prepare(
          `SELECT COUNT(*) as c FROM quest_submissions
           WHERE user_id = ? AND status = 'approved' AND substr(created_at, 1, 10) = ?`,
        )
        .get(userId, dateStr) as {c: number};
      last7Days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', {weekday: 'short', timeZone: 'UTC'}),
        completed: row.c,
      });
    }

    const achievements = db
      .prepare(
        `SELECT a.*, ua.unlocked_at
         FROM achievements a
         LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
         ORDER BY ua.unlocked_at IS NULL ASC, a.rule_threshold ASC`,
      )
      .all(userId) as Array<Record<string, unknown>>;

    const recentSubmissions = db
      .prepare(
        `SELECT s.*, q.title as quest_title, q.slug as quest_slug, q.category as quest_category
         FROM quest_submissions s
         JOIN quests q ON q.id = s.quest_id
         WHERE s.user_id = ?
         ORDER BY s.created_at DESC LIMIT 5`,
      )
      .all(userId) as Array<Record<string, unknown>>;

    const completedCount = (
      db
        .prepare(`SELECT COUNT(*) as c FROM quest_submissions WHERE user_id = ? AND status = 'approved'`)
        .get(userId) as {c: number}
    ).c;

    res.json({
      user: req.user,
      levelProgress: getLevelProgress(req.user!.xp),
      todayUtc,
      dailyQuests: enrichedDaily,
      weeklyActivity: last7Days,
      completedCount,
      achievements: achievements.map((a) => ({
        ...a,
        unlocked: Boolean(a.unlocked_at),
      })),
      recentSubmissions: recentSubmissions.map(formatSubmission),
    });
  });

  router.get('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const submissions = db
      .prepare(
        `SELECT s.*, q.title as quest_title, q.slug as quest_slug, q.category as quest_category
         FROM quest_submissions s
         JOIN quests q ON q.id = s.quest_id
         WHERE s.user_id = ?
         ORDER BY s.created_at DESC LIMIT 50`,
      )
      .all(userId) as Array<Record<string, unknown>>;

    const transactions = db
      .prepare(
        `SELECT * FROM reward_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      )
      .all(userId);

    const achievements = db
      .prepare(
        `SELECT a.*, ua.unlocked_at
         FROM achievements a
         LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
         ORDER BY ua.unlocked_at IS NULL ASC, a.rule_threshold ASC`,
      )
      .all(userId) as Array<Record<string, unknown>>;

    const completedCount = (
      db
        .prepare(`SELECT COUNT(*) as c FROM quest_submissions WHERE user_id = ? AND status = 'approved'`)
        .get(userId) as {c: number}
    ).c;

    res.json({
      user: req.user,
      levelProgress: getLevelProgress(req.user!.xp),
      completedCount,
      submissions: submissions.map(formatSubmission),
      transactions,
      achievements: achievements.map((a) => ({
        ...a,
        unlocked: Boolean(a.unlocked_at),
      })),
    });
  });

  router.patch('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const parsed = UpdateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: parsed.error.issues[0]?.message || 'Invalid profile update'});
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (parsed.data.username !== undefined) {
      const conflict = db
        .prepare('SELECT id FROM profiles WHERE lower(username) = lower(?) AND id != ?')
        .get(parsed.data.username, req.user!.id);
      if (conflict) {
        res.status(409).json({error: 'Username is already taken'});
        return;
      }
      updates.push('username = ?');
      values.push(parsed.data.username.trim());
    }
    if (parsed.data.theme_preference !== undefined) {
      updates.push('theme_preference = ?');
      values.push(parsed.data.theme_preference);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(req.user!.id);
      db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = db
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(req.user!.id) as Record<string, unknown>;
    res.json({user: mapProfile(row)});
  });

  // --- EVIDENCE & VERIFICATION ---
  router.post('/verification', requireAuth, async (req: AuthenticatedRequest, res) => {
    const parsed = VerificationPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'Invalid verification submission payload'});
      return;
    }

    const userId = req.user!.id;

    // Rate limit: max 10 verification attempts per user per hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const rateRow = db
      .prepare(
        `SELECT COUNT(*) as c FROM verification_rate_limits WHERE user_id = ? AND created_at > ?`,
      )
      .get(userId, oneHourAgo) as {c: number};

    if (rateRow.c >= 10) {
      res.status(429).json({
        error: 'Hourly AI verification limit reached (10/hour). Please try again later.',
      });
      return;
    }

    const quest = db
      .prepare('SELECT * FROM quests WHERE id = ? AND is_active = 1')
      .get(parsed.data.questId) as
      | {
          id: string;
          title: string;
          description: string;
          quest_type: QuestType;
          verification_criteria: string;
        }
      | undefined;

    if (!quest) {
      res.status(404).json({error: 'Quest not found or inactive'});
      return;
    }

    const periodKey = getUtcPeriodKey(quest.quest_type);

    // Block duplicate completion or concurrent review in the same period
    const blockingSubmission = db
      .prepare(
        `SELECT id, status FROM quest_submissions
         WHERE user_id = ? AND quest_id = ? AND period_key = ? AND status IN ('approved', 'pending', 'needs_review')`,
      )
      .get(userId, quest.id, periodKey) as {id: string; status: string} | undefined;

    if (blockingSubmission) {
      res.status(409).json({
        error:
          blockingSubmission.status === 'approved'
            ? 'You have already completed this quest for the current period.'
            : 'A submission for this quest period is already pending review.',
      });
      return;
    }

    // Validate base64 data URI
    const match = parsed.data.imageDataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({error: 'Only JPEG, PNG, or WebP images are supported'});
      return;
    }
    const mimeType = match[1];
    const base64Body = match[2];
    const buffer = Buffer.from(base64Body, 'base64');

    if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) {
      res.status(400).json({error: 'Image must be smaller than 5 MB'});
      return;
    }

    // Ensure user_quests record exists
    let userQuest = db
      .prepare(`SELECT id FROM user_quests WHERE user_id = ? AND quest_id = ? AND period_key = ?`)
      .get(userId, quest.id, periodKey) as {id: string} | undefined;

    if (!userQuest) {
      const uqId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO user_quests (id, user_id, quest_id, period_key, status)
         VALUES (?, ?, ?, ?, 'in_progress')`,
      ).run(uqId, userId, quest.id, periodKey);
      userQuest = {id: uqId};
    }

    const submissionId = crypto.randomUUID();
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const relativePath = `${userId}/${submissionId}.${ext}`;
    const fullPath = resolveConfinedEvidencePath(relativePath);

    if (!fullPath) {
      res.status(400).json({error: 'Invalid storage path'});
      return;
    }

    fs.mkdirSync(path.dirname(fullPath), {recursive: true});
    fs.writeFileSync(fullPath, buffer);

    db.prepare(
      `INSERT INTO quest_submissions (
         id, user_id, quest_id, user_quest_id, period_key,
         evidence_path, evidence_mime, user_note, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    ).run(
      submissionId,
      userId,
      quest.id,
      userQuest.id,
      periodKey,
      relativePath,
      mimeType,
      parsed.data.userNote?.trim() || null,
    );

    db.prepare(`INSERT INTO verification_rate_limits (id, user_id, created_at) VALUES (?, ?, ?)`).run(
      crypto.randomUUID(),
      userId,
      Date.now(),
    );

    const aiResult = await verifyEvidenceWithCloudflare({
      questTitle: quest.title,
      questDescription: quest.description,
      verificationCriteria: quest.verification_criteria,
      imageMimeType: mimeType,
      imageBase64: base64Body,
      userNote: parsed.data.userNote,
    });

    const finalized = finalizeSubmissionTx({
      submissionId,
      status: aiResult.status,
      aiResult,
    });

    const updatedSubmission = db
      .prepare('SELECT * FROM quest_submissions WHERE id = ?')
      .get(submissionId) as Record<string, unknown>;
    const updatedProfile = db
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(userId) as Record<string, unknown>;
    const profileObj = mapProfile(updatedProfile);

    res.json({
      submission: formatSubmission(updatedSubmission),
      reward: finalized,
      user: profileObj,
      levelProgress: getLevelProgress(profileObj.xp),
    });
  });

  router.get('/submissions/:id/evidence', requireAuth, (req: AuthenticatedRequest, res) => {
    const sub = db
      .prepare('SELECT user_id, evidence_path, evidence_mime FROM quest_submissions WHERE id = ?')
      .get(req.params.id) as
      | {user_id: string; evidence_path: string | null; evidence_mime: string | null}
      | undefined;

    if (!sub) {
      res.status(404).json({error: 'Submission not found'});
      return;
    }

    if (sub.user_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({error: 'Forbidden: You may only view your own private evidence'});
      return;
    }

    if (!sub.evidence_path) {
      res.status(404).json({error: 'Evidence photo has been deleted'});
      return;
    }

    const fullPath = resolveConfinedEvidencePath(sub.evidence_path);
    if (!fullPath || !fs.existsSync(fullPath)) {
      res.status(404).json({error: 'Evidence file not found'});
      return;
    }

    res.setHeader('Content-Type', sub.evidence_mime || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.sendFile(fullPath);
  });

  router.delete('/submissions/:id/evidence', requireAuth, (req: AuthenticatedRequest, res) => {
    const sub = db
      .prepare('SELECT id, user_id, evidence_path FROM quest_submissions WHERE id = ?')
      .get(req.params.id) as {id: string; user_id: string; evidence_path: string | null} | undefined;

    if (!sub) {
      res.status(404).json({error: 'Submission not found'});
      return;
    }
    if (sub.user_id !== req.user!.id) {
      res.status(403).json({error: 'Forbidden: Only the owner can delete their evidence'});
      return;
    }

    if (sub.evidence_path) {
      const fullPath = resolveConfinedEvidencePath(sub.evidence_path);
      if (fullPath && fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    db.prepare(
      `UPDATE quest_submissions
       SET evidence_path = NULL, evidence_mime = NULL, evidence_deleted_at = datetime('now')
       WHERE id = ?`,
    ).run(sub.id);

    res.json({ok: true});
  });

  router.delete('/evidence/bulk', requireAuth, (req: AuthenticatedRequest, res) => {
    const rows = db
      .prepare(`SELECT id, evidence_path FROM quest_submissions WHERE user_id = ? AND evidence_path IS NOT NULL`)
      .all(req.user!.id) as Array<{id: string; evidence_path: string}>;

    let deletedCount = 0;
    for (const row of rows) {
      const fullPath = resolveConfinedEvidencePath(row.evidence_path);
      if (fullPath && fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      deletedCount += 1;
    }

    db.prepare(
      `UPDATE quest_submissions
       SET evidence_path = NULL, evidence_mime = NULL, evidence_deleted_at = datetime('now')
       WHERE user_id = ? AND evidence_path IS NOT NULL`,
    ).run(req.user!.id);

    res.json({ok: true, deletedCount});
  });

  // --- ADMIN ROUTES ---
  router.get('/admin/submissions', requireAdmin, (req, res) => {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : 'needs_review';
    const whereClause = statusFilter === 'all' ? '' : 'WHERE s.status = ?';
    const params = statusFilter === 'all' ? [] : [statusFilter];

    const rows = db
      .prepare(
        `SELECT s.*, q.title as quest_title, q.slug as quest_slug, q.category as quest_category,
                p.username as username
         FROM quest_submissions s
         JOIN quests q ON q.id = s.quest_id
         JOIN profiles p ON p.id = s.user_id
         ${whereClause}
         ORDER BY s.created_at DESC LIMIT 100`,
      )
      .all(...params) as Array<Record<string, unknown>>;

    res.json({submissions: rows.map(formatSubmission)});
  });

  router.post('/admin/submissions/:id/review', requireAdmin, (req: AuthenticatedRequest, res) => {
    const parsed = AdminReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: parsed.error.issues[0]?.message || 'Invalid review payload'});
      return;
    }

    const sub = db
      .prepare('SELECT id, status FROM quest_submissions WHERE id = ?')
      .get(req.params.id) as {id: string; status: string} | undefined;

    if (!sub) {
      res.status(404).json({error: 'Submission not found'});
      return;
    }

    if (sub.status === 'approved') {
      res.status(409).json({
        error: 'Approved submissions are terminal and cannot be modified.',
      });
      return;
    }

    const result = finalizeSubmissionTx({
      submissionId: sub.id,
      status: parsed.data.decision,
      reviewedBy: req.user!.id,
      reviewNote: parsed.data.reason.trim(),
    });

    const updated = db
      .prepare(
        `SELECT s.*, q.title as quest_title, q.slug as quest_slug, p.username as username
         FROM quest_submissions s
         JOIN quests q ON q.id = s.quest_id
         JOIN profiles p ON p.id = s.user_id
         WHERE s.id = ?`,
      )
      .get(sub.id) as Record<string, unknown>;

    res.json({
      submission: formatSubmission(updated),
      reward: result,
    });
  });

  router.get('/admin/quests', requireAdmin, (_req, res) => {
    const rows = db.prepare('SELECT * FROM quests ORDER BY created_at DESC').all() as Array<
      Record<string, unknown>
    >;
    res.json({
      quests: rows.map((q) => ({...q, is_active: Boolean(q.is_active)})),
    });
  });

  router.post('/admin/quests', requireAdmin, (req, res) => {
    const parsed = CreateQuestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: parsed.error.issues[0]?.message || 'Invalid quest payload'});
      return;
    }

    const existing = db.prepare('SELECT id FROM quests WHERE slug = ?').get(parsed.data.slug);
    if (existing) {
      res.status(409).json({error: 'A quest with that slug already exists'});
      return;
    }

    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO quests (
         id, slug, title, description, instructions, environmental_impact,
         category, difficulty, quest_type, estimated_minutes,
         xp_reward, eco_points_reward, verification_type, verification_criteria,
         is_active, starts_at, expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'photo', ?, ?, ?, ?)`,
    ).run(
      id,
      parsed.data.slug,
      parsed.data.title,
      parsed.data.description,
      parsed.data.instructions,
      parsed.data.environmental_impact,
      parsed.data.category,
      parsed.data.difficulty,
      parsed.data.quest_type,
      parsed.data.estimated_minutes,
      parsed.data.xp_reward,
      parsed.data.eco_points_reward,
      parsed.data.verification_criteria,
      parsed.data.is_active ? 1 : 0,
      parsed.data.starts_at || null,
      parsed.data.expires_at || null,
    );

    const created = db.prepare('SELECT * FROM quests WHERE id = ?').get(id) as Record<
      string,
      unknown
    >;
    res.status(201).json({quest: {...created, is_active: Boolean(created.is_active)}});
  });

  router.patch('/admin/quests/:id', requireAdmin, (req, res) => {
    const parsed = UpdateQuestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: parsed.error.issues[0]?.message || 'Invalid quest update'});
      return;
    }

    const existing = db.prepare('SELECT id FROM quests WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({error: 'Quest not found'});
      return;
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    const data = parsed.data;
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.instructions !== undefined) { fields.push('instructions = ?'); values.push(data.instructions); }
    if (data.environmental_impact !== undefined) { fields.push('environmental_impact = ?'); values.push(data.environmental_impact); }
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
    if (data.difficulty !== undefined) { fields.push('difficulty = ?'); values.push(data.difficulty); }
    if (data.quest_type !== undefined) { fields.push('quest_type = ?'); values.push(data.quest_type); }
    if (data.estimated_minutes !== undefined) { fields.push('estimated_minutes = ?'); values.push(data.estimated_minutes); }
    if (data.xp_reward !== undefined) { fields.push('xp_reward = ?'); values.push(data.xp_reward); }
    if (data.eco_points_reward !== undefined) { fields.push('eco_points_reward = ?'); values.push(data.eco_points_reward); }
    if (data.verification_criteria !== undefined) { fields.push('verification_criteria = ?'); values.push(data.verification_criteria); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

    if (fields.length > 0) {
      values.push(req.params.id);
      db.prepare(`UPDATE quests SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM quests WHERE id = ?').get(req.params.id) as Record<
      string,
      unknown
    >;
    res.json({quest: {...updated, is_active: Boolean(updated.is_active)}});
  });

  return router;
}
