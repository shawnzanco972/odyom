# GAME SPECIFICATION: "לשרוד את היום" (Survive the Day)

## 1. Core Concept
"לשרוד את היום" is a viral, zero-friction, daily casual game tailored for the Israeli market, leveraging cynical, sharp, Twitter-style Hebrew humor. 
- Users play exactly ONCE a day based on local Israel Standard Time (IST).
- The game involves a single button press that triggers a Plinko/Pachinko-style physics simulation of balls bouncing down a pegboard into 32 bottom slots.
- The outcome is binary and high-stakes: "Survived" (increment streak, earn points) or "Died" (streak resets to 0, locked out until 08:00 AM the next day).

## 2. Mathematical Engine & Time Mechanics
The board consists of exactly 32 dynamic outcome slots at the bottom. The risk level scales automatically throughout the day based on elapsed time.

- **Active Timeframe:** 08:00 AM IST to 00:00 (Midnight) IST.
- **Time Intervals:** Every 30 minutes that pass, exactly one slot is locked/occupied by the system.
- **Mathematical Formula:**
  - `Total_Slots = 32`
  - `Elapsed_Intervals = Math.floor((Current_IST_Time - 08:00) / 30 minutes)`
  - `Active_Slots = Total_Slots - Elapsed_Intervals`
  - *Constraint:* `Active_Slots` cannot drop below 2. Between 23:00 and 00:00, the game remains at a strict 50/50 endgame state.

## 3. Visual & Simulation Rules
- **The Board State:** - The first `(32 - Active_Slots)` slots from left to right are rendered as "Closed/Filled" with static, low-opacity green spheres representing past safe intervals.
  - The remaining `Active_Slots` on the right are open and empty.
  - The system internally pre-determines exactly ONE of the open slots as the "Target Fate Slot".
- **The Balls:** Small, perfectly smooth, glossy 3D spheres with NO text or icons.
  - **Death Ball:** Exactly 1 Crimson Red ball (#DC2626).
  - **Survival Balls:** Exactly `(Active_Slots - 1)` Neon Green balls (#22C55E).
- **Resolution:** The physics simulation drops all balls from the top. Each open slot receives exactly one ball. The game checks the color of the ball that lands in the "Target Fate Slot".

## 4. Database Schema (Supabase)
```sql
create table users (
  id uuid references auth.users not null primary key,
  username text unique,
  total_score integer default 0,
  current_streak integer default 0,
  highest_streak integer default 0,
  madness_tag text default 'ישראלי ממוצע',
  seen_reasons text[] default '{}',
  last_played_date date
);

create table user_suggestions (
  id bigint generated always as identity primary key,
  text text not null,
  type text check (type in ('survive', 'death')),
  tier integer check (tier between 1 and 4),
  suggested_by text,
  is_approved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);