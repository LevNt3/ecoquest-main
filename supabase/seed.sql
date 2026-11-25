-- EcoQuest Supabase Seed Data & Auth Signup Profile Trigger
-- Run after supabase/migrations/001_initial_schema.sql

-- 1. Auto-create public.profiles row when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_username text;
begin
  desired_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    'eco_' || substr(replace(new.id::text, '-', ''), 1, 10)
  );

  insert into public.profiles (id, username)
  values (new.id, desired_username)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Seed the 13 starter quests across all 7 sustainability categories
insert into public.quests (
  slug, title, description, instructions, environmental_impact,
  category, difficulty, quest_type, estimated_minutes,
  xp_reward, eco_points_reward, verification_type, verification_criteria, is_active
) values
  (
    'digital-learner',
    'Digital Learner',
    'Write at least two pages of study notes digitally instead of on disposable paper.',
    E'1. Open your preferred digital note-taking app on a laptop or tablet.\n2. Complete your study session notes cleanly in digital format.\n3. Capture a clear photo showing your digital notes on screen (avoid sensitive personal data).',
    'Replacing paper notebooks with digital study workflows reduces pulp demand, bleaching chemicals, and forestry water consumption.',
    'Digital Sustainability',
    'easy',
    'daily',
    20,
    30,
    15,
    'photo',
    'Image must clearly show a tablet, laptop, or desktop screen displaying digital study notes. Note: A single photo cannot prove exact page count or zero paper usage elsewhere.',
    true
  ),
  (
    'refill-hero',
    'Refill Hero',
    'Use a reusable water bottle instead of purchasing a single-use plastic bottle.',
    E'1. Bring your reusable stainless steel, glass, or durable bottle.\n2. Fill it at a tap, water dispenser, or campus refill station.\n3. Snap a photo of your reusable bottle being refilled or next to the tap.',
    'One person switching to a refillable bottle prevents an average of 150+ single-use plastic bottles from entering landfills or waterways each year.',
    'Water Conservation',
    'easy',
    'daily',
    5,
    25,
    10,
    'photo',
    'Image must show a reusable water bottle (metal, glass, or hard reusable flask) near a tap, kitchen sink, or refill station. Reject disposable thin PET bottles.',
    true
  ),
  (
    'energy-saver',
    'Energy Saver',
    'Turn off unnecessary room lights and eliminate idle electrical draw.',
    E'1. Check unoccupied rooms or desk lamps when daylight is sufficient.\n2. Switch off overhead lighting and idle appliances.\n3. Take a photo showing the switched-off light switch or darkened room powered by daylight.',
    'Cutting unnecessary lighting reduces peak grid demand and lowers fossil-fuel electricity generation.',
    'Energy Saving',
    'easy',
    'daily',
    5,
    25,
    10,
    'photo',
    'Image must visibly depict a switched-off light fixture, light switch in off position, or a workspace lit by natural daylight with lamps off.',
    true
  ),
  (
    'recycling-master',
    'Recycling Master',
    'Sort recyclable household waste cleanly into paper, plastic, metal, or glass streams.',
    E'1. Rinse food residue from containers before sorting.\n2. Separate clean paper/cardboard from plastics, cans, or glass.\n3. Take a clear photo showing your sorted recyclables placed in distinct bins or bags.',
    'Clean source separation prevents contamination batches from being sent to landfill and keeps recycled aluminum and paper fibers viable.',
    'Recycling',
    'medium',
    'daily',
    15,
    45,
    20,
    'photo',
    'Image must show clearly separated recyclable materials (e.g., paper, plastic bottles, aluminum cans, or glass) in recycling bins or sorted piles.',
    true
  ),
  (
    'sustainable-commute',
    'Sustainable Commute',
    'Walk, cycle, or ride public transit instead of taking a private car for a suitable trip.',
    E'1. Plan a local campus, school, or grocery journey on foot, by bike, or via bus/train.\n2. Capture a safe photo while stopped (parked bicycle, transit platform, or pedestrian trail—never while riding in traffic).',
    'Replacing a single 10 km solo car trip with cycling or public transit avoids roughly 1.5–2 kg of tailpipe CO2 emissions.',
    'Sustainable Transport',
    'medium',
    'daily',
    30,
    50,
    25,
    'photo',
    'Image must show a parked bicycle on a bike path/rack, a public transit bus/train/station, or an outdoor walking footpath.',
    true
  ),
  (
    'daylight-desk',
    'Daylight Desk',
    'Complete a full 1-hour study block using natural window light with artificial lamps off.',
    E'1. Position your study workspace beside a window.\n2. Keep desk lamps and overhead lights turned off.\n3. Take a photo of your naturally lit desk setup.',
    'Daylighting reduces daytime residential electricity draw and improves visual comfort without extra wattage.',
    'Energy Saving',
    'easy',
    'weekly',
    60,
    60,
    30,
    'photo',
    'Image must show a desk or study table illuminated by natural window light with visible lamps switched off.',
    true
  ),
  (
    'five-minute-flow',
    'Five-Minute Flow',
    'Cap your shower or tap flow at 5 minutes using a physical or phone timer.',
    E'1. Set a 5-minute countdown timer before turning on the water.\n2. Keep the shower concise and turn off water while lathering.\n3. Photograph your timer showing 5:00 or completed countdown beside a dry sink counter.',
    'Cutting shower length from 10 minutes to 5 minutes saves up to 45 liters of heated water per session.',
    'Water Conservation',
    'medium',
    'daily',
    5,
    40,
    20,
    'photo',
    'Image must show a 5-minute countdown timer on a phone or kitchen timer near a bathroom sink or tile counter (no people in frame).',
    true
  ),
  (
    'cloud-declutter',
    'Cloud Declutter',
    'Delete at least 50 old promotional emails and empty your spam/trash folders.',
    E'1. Search your inbox for old newsletters or expired promotions.\n2. Batch-delete unnecessary threads and empty the Trash folder.\n3. Upload a cropped screenshot showing your cleared Trash/Spam count of 0 (hide private email addresses).',
    'Trimming redundant cloud storage reduces continuous data center server storage and cooling energy over time.',
    'Digital Sustainability',
    'medium',
    'weekly',
    15,
    55,
    25,
    'photo',
    'Screenshot must show an email client Trash or Spam view indicating deleted or zero messages remaining.',
    true
  ),
  (
    'zero-waste-lunch',
    'Zero-Waste Lunch',
    'Pack a homemade meal using reusable containers, cloth napkins, and washable cutlery.',
    E'1. Prepare lunch in reusable glass, steel, or durable containers.\n2. Pack metal/bamboo utensils instead of single-use plastic.\n3. Photograph your packed meal setup before eating.',
    'Avoiding single-use takeout clamshells and plastic cutlery prevents unrecyclable food-soiled packaging waste.',
    'Responsible Consumption',
    'medium',
    'daily',
    15,
    50,
    25,
    'photo',
    'Image must show food packed in reusable containers with washable utensils (no disposable foam or single-use plastic takeout boxes).',
    true
  ),
  (
    'borrow-dont-buy',
    'Borrow, Don''t Buy',
    'Borrow a book, tool, or study resource from a library or peer swap instead of buying new.',
    E'1. Visit your school/public library or campus sharing shelf.\n2. Check out or borrow an item you need.\n3. Take a photo of the borrowed item at the library desk or with its library label.',
    'Sharing resources extends product lifecycles and prevents manufacturing emissions from redundant personal purchases.',
    'Responsible Consumption',
    'hard',
    'one_time',
    30,
    100,
    50,
    'photo',
    'Image must show a library book with a library barcode/spine label, a library shelf/kiosk, or a shared item swap table.',
    true
  ),
  (
    'phantom-load-hunt',
    'Phantom Load Hunt',
    'Identify and power down standby electronics on a switched multi-outlet power strip.',
    E'1. Locate chargers, monitors, or consoles drawing standby power.\n2. Flip the main power strip rocker switch OFF when not in use.\n3. Capture a photo of the switched-off power strip.',
    'Standby "vampire" loads account for 5–10% of typical household electricity use; master switches eliminate idle draw.',
    'Energy Saving',
    'hard',
    'weekly',
    20,
    80,
    40,
    'photo',
    'Image must show a multi-outlet power strip with its power switch clearly in the OFF position (indicator light off).',
    true
  ),
  (
    'micro-litter-sweep',
    'Micro-Litter Sweep',
    'Safely collect visible litter from a park, sidewalk, or campus courtyard using gloves or a grabber.',
    E'1. Wear protective gloves or use a litter grabber—never pick up sharp glass or hazardous items.\n2. Collect safe dry litter (wrappers, bottles, cans) into a bag.\n3. Photograph the collected bag placed beside a public trash or recycling bin.',
    'Intercepting urban litter prevents microplastics and aluminum from washing into storm drains and local rivers.',
    'General Eco Habits',
    'epic',
    'special',
    45,
    150,
    75,
    'photo',
    'Image must show collected litter in a bag or glove/grabber next to a public waste or recycling receptacle.',
    true
  ),
  (
    'tote-over-plastic',
    'Tote Over Plastic',
    'Carry groceries or books in a reusable cloth tote bag instead of accepting disposable plastic bags.',
    E'1. Keep a foldable fabric tote in your backpack.\n2. Use it to carry your errands or books home.\n3. Take a photo of your packed reusable tote bag.',
    'Reusable cloth totes displace hundreds of thin polyethylene bags that jam sorting machinery and persist in soil.',
    'General Eco Habits',
    'easy',
    'one_time',
    10,
    35,
    15,
    'photo',
    'Image must show a reusable cloth or canvas tote bag holding books, groceries, or personal items.',
    true
  )
on conflict (slug) do nothing;

-- 3. Seed the 8 starter achievements
insert into public.achievements (
  code, title, description, rule_type, rule_threshold, xp_bonus
) values
  ('first_quest', 'First Sprout', 'Complete your first verified sustainability quest.', 'quests_completed', 1, 25),
  ('five_quests', 'Habit Builder', 'Complete 5 verified sustainability quests.', 'quests_completed', 5, 50),
  ('ten_quests', 'Canopy Guardian', 'Complete 10 verified sustainability quests.', 'quests_completed', 10, 100),
  ('streak_3', 'Three-Day Momentum', 'Maintain an active daily quest streak for 3 days.', 'streak_days', 3, 40),
  ('streak_7', 'Weekly Steward', 'Maintain an active daily quest streak for 7 days.', 'streak_days', 7, 100),
  ('xp_250', 'Rising Eco-Advocate', 'Reach 250 total XP across all sustainability quests.', 'total_xp', 250, 30),
  ('xp_500', 'Solar Trailblazer', 'Reach 500 total XP across all sustainability quests.', 'total_xp', 500, 75),
  ('categories_3', 'All-Rounder', 'Complete verified quests across 3 different eco categories.', 'category_count', 3, 60)
on conflict (code) do nothing;
