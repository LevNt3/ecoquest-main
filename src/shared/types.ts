import {z} from 'zod';

export const QUEST_CATEGORIES = [
  'Energy Saving',
  'Water Conservation',
  'Recycling',
  'Sustainable Transport',
  'Digital Sustainability',
  'Responsible Consumption',
  'General Eco Habits',
] as const;

export type QuestCategory = (typeof QUEST_CATEGORIES)[number];

export const QUEST_TYPES = ['daily', 'weekly', 'one_time', 'special'] as const;
export type QuestType = (typeof QUEST_TYPES)[number];

export const QUEST_DIFFICULTIES = ['easy', 'medium', 'hard', 'epic'] as const;
export type QuestDifficulty = (typeof QUEST_DIFFICULTIES)[number];

export const SUBMISSION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'needs_review',
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const VerificationCriterionResultSchema = z.object({
  criterion: z.string().min(1),
  met: z.enum(['yes', 'no', 'uncertain']),
  note: z.string().min(1),
});

export const AiVerificationResultSchema = z.object({
  status: z.enum(['approved', 'rejected', 'needs_review']),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  evidence_found: z.array(z.string()),
  criteria_results: z.array(VerificationCriterionResultSchema),
  limitations: z.array(z.string()),
  provider_note: z.string().optional(),
});

export type AiVerificationResult = z.infer<typeof AiVerificationResultSchema>;

export const CreateQuestSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(600),
  instructions: z.string().min(10).max(1200),
  environmental_impact: z.string().min(10).max(600),
  category: z.enum(QUEST_CATEGORIES),
  difficulty: z.enum(QUEST_DIFFICULTIES),
  quest_type: z.enum(QUEST_TYPES),
  estimated_minutes: z.coerce.number().int().min(1).max(480),
  xp_reward: z.coerce.number().int().min(5).max(1000),
  eco_points_reward: z.coerce.number().int().min(0).max(1000),
  verification_type: z.literal('photo').default('photo'),
  verification_criteria: z.string().min(10).max(800),
  is_active: z.boolean().default(true),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
});

export type CreateQuestInput = z.infer<typeof CreateQuestSchema>;

export const UpdateQuestSchema = CreateQuestSchema.partial().omit({slug: true});

export const AuthSignupSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may contain letters, numbers, _ and -'),
  password: z.string().min(8).max(128),
});

export const AuthLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may contain letters, numbers, _ and -')
    .optional(),
  avatar_url: z.string().max(300).nullable().optional(),
  theme_preference: z.enum(['dark', 'light']).optional(),
});

export const AdminReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().min(3).max(400),
});

export interface LevelProgress {
  level: number;
  currentXp: number;
  currentLevelFloorXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  role: UserRole;
  xp: number;
  level: number;
  eco_points: number;
  current_streak: number;
  longest_streak: number;
  last_quest_date: string | null;
  theme_preference: 'dark' | 'light';
  created_at: string;
}

export interface QuestItem {
  id: string;
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
  verification_type: 'photo';
  verification_criteria: string;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  image_url: string | null;
  period_key?: string;
  user_status?: 'available' | 'in_progress' | 'pending' | 'needs_review' | 'completed' | 'rejected';
  latest_submission?: QuestSubmission | null;
}

export interface QuestSubmission {
  id: string;
  user_id: string;
  quest_id: string;
  quest_title?: string;
  quest_slug?: string;
  quest_category?: QuestCategory;
  username?: string;
  period_key: string;
  has_evidence: boolean;
  evidence_deleted_at: string | null;
  user_note: string | null;
  status: SubmissionStatus;
  ai_confidence: number | null;
  ai_result: AiVerificationResult | null;
  reviewed_by: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface RewardTransaction {
  id: string;
  user_id: string;
  submission_id: string | null;
  tx_type: 'quest_reward' | 'achievement_bonus' | 'admin_adjustment';
  xp_delta: number;
  points_delta: number;
  description: string;
  created_at: string;
}

export interface AchievementItem {
  id: string;
  code: string;
  title: string;
  description: string;
  rule_type: 'quests_completed' | 'streak_days' | 'total_xp' | 'category_count';
  rule_threshold: number;
  xp_bonus: number;
  unlocked: boolean;
  unlocked_at: string | null;
}
