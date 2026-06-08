import { db } from "@workspace/db";
import { habitsTable } from "@workspace/db";
import { count } from "drizzle-orm";
import { logger } from "./logger";

const HABITS_SEED = [
  { question: "Do you rehearse conversations in your head before they happen?", category: "Overthinking", meTooPctDefault: 72, traits: { Overthinker: 3, "Creative Thinker": 1 } },
  { question: "Do you replay embarrassing moments from years ago?", category: "Overthinking", meTooPctDefault: 68, traits: { Overthinker: 3, Sentimental: 2 } },
  { question: "Do you mentally argue with people who aren't there?", category: "Overthinking", meTooPctDefault: 61, traits: { Overthinker: 2, "Creative Thinker": 1 } },
  { question: "Do you plan what you'll say in a meeting but then forget it all?", category: "Overthinking", meTooPctDefault: 55, traits: { Overthinker: 2, "Pattern Seeker": 1 } },
  { question: "Do you catastrophize small mistakes into career-ending disasters?", category: "Overthinking", meTooPctDefault: 47, traits: { Overthinker: 3 } },
  { question: "Do you reread your own texts to see how they sound?", category: "Overthinking", meTooPctDefault: 74, traits: { Overthinker: 2, Observer: 1 } },
  { question: "Do you practice arguments before they happen and win every time?", category: "Overthinking", meTooPctDefault: 58, traits: { Overthinker: 2, "Creative Thinker": 2 } },
  { question: "Do you make songs for your pets?", category: "Pets", meTooPctDefault: 57, traits: { "Animal Lover": 3, "Creative Thinker": 2 } },
  { question: "Do you talk to your pets like they fully understand you?", category: "Pets", meTooPctDefault: 82, traits: { "Animal Lover": 3, Sentimental: 1 } },
  { question: "Do you feel guilty leaving the house because of your pet?", category: "Pets", meTooPctDefault: 65, traits: { "Animal Lover": 3, Sentimental: 2 } },
  { question: "Do you use a baby voice exclusively for your pet?", category: "Pets", meTooPctDefault: 71, traits: { "Animal Lover": 2, Sentimental: 1 } },
  { question: "Do you share your food with your pet and feel no shame?", category: "Pets", meTooPctDefault: 60, traits: { "Animal Lover": 2, "Comfort Seeker": 1 } },
  { question: "Do you open the fridge even when you're not hungry?", category: "Food", meTooPctDefault: 78, traits: { "Comfort Seeker": 3 } },
  { question: "Do you eat one food item at a time before touching the others?", category: "Food", meTooPctDefault: 34, traits: { "Pattern Seeker": 3 } },
  { question: "Do you narrate what you're eating while eating it?", category: "Food", meTooPctDefault: 29, traits: { "Creative Thinker": 2, Observer: 1 } },
  { question: "Do you save the best bite for last?", category: "Food", meTooPctDefault: 66, traits: { "Pattern Seeker": 2, Sentimental: 1 } },
  { question: "Do you eat the same breakfast almost every day?", category: "Food", meTooPctDefault: 52, traits: { "Comfort Seeker": 2, "Pattern Seeker": 2 } },
  { question: "Do you plan what you'll eat next while still eating?", category: "Food", meTooPctDefault: 61, traits: { "Comfort Seeker": 2, Overthinker: 1 } },
  { question: "Do you imagine elaborate scenarios before falling asleep?", category: "Sleep", meTooPctDefault: 63, traits: { "Creative Thinker": 3, Introvert: 1 } },
  { question: "Do you set multiple alarms just in case?", category: "Sleep", meTooPctDefault: 77, traits: { Overthinker: 2, "Pattern Seeker": 1 } },
  { question: "Do you feel more creative at night than during the day?", category: "Sleep", meTooPctDefault: 58, traits: { "Creative Thinker": 3, Introvert: 2 } },
  { question: "Do you check the time at night and calculate remaining sleep?", category: "Sleep", meTooPctDefault: 70, traits: { "Pattern Seeker": 2, Overthinker: 2 } },
  { question: "Do you stay in bed scrolling after your alarm goes off?", category: "Sleep", meTooPctDefault: 85, traits: { "Comfort Seeker": 3, Introvert: 1 } },
  { question: "Do you fall asleep to the same show playing in the background?", category: "Sleep", meTooPctDefault: 44, traits: { "Comfort Seeker": 2, "Pattern Seeker": 1 } },
  { question: "Do you check your phone even when it didn't vibrate?", category: "Technology", meTooPctDefault: 81, traits: { "Pattern Seeker": 1, Overthinker: 1 } },
  { question: "Do you have tabs open you know you'll never read?", category: "Technology", meTooPctDefault: 79, traits: { Observer: 2, "Comfort Seeker": 1 } },
  { question: "Do you mute notifications but still check constantly?", category: "Technology", meTooPctDefault: 67, traits: { Overthinker: 2, "Pattern Seeker": 1 } },
  { question: "Do you screenshot things you'll never look at again?", category: "Technology", meTooPctDefault: 53, traits: { Observer: 2, Sentimental: 1 } },
  { question: "Do you narrate your life in your head like a social media post?", category: "Technology", meTooPctDefault: 38, traits: { "Creative Thinker": 2, Observer: 2 } },
  { question: "Do you observe strangers and invent stories about their lives?", category: "Social", meTooPctDefault: 54, traits: { Observer: 3, "Creative Thinker": 2 } },
  { question: "Do you talk to yourself when you're alone?", category: "Social", meTooPctDefault: 63, traits: { Introvert: 2, "Creative Thinker": 1 } },
  { question: "Do you mentally rehearse how to say goodbye before a call ends?", category: "Social", meTooPctDefault: 42, traits: { Overthinker: 2, "Pattern Seeker": 1 } },
  { question: "Do you feel relieved when plans get cancelled?", category: "Social", meTooPctDefault: 71, traits: { Introvert: 3, "Comfort Seeker": 1 } },
  { question: "Do you wave back at someone who wasn't waving at you?", category: "Social", meTooPctDefault: 88, traits: { Sentimental: 1, Observer: 1 } },
  { question: "Do you lie awake wishing you'd said something differently?", category: "Social", meTooPctDefault: 65, traits: { Overthinker: 3, Sentimental: 2 } },
  { question: "Do you hold your breath without realizing it?", category: "Body", meTooPctDefault: 56, traits: { Observer: 2 } },
  { question: "Do you crack your knuckles, neck, or back for satisfaction?", category: "Body", meTooPctDefault: 62, traits: { "Comfort Seeker": 2, "Pattern Seeker": 1 } },
  { question: "Do you notice a song is stuck in your head mid-song?", category: "Body", meTooPctDefault: 74, traits: { Observer: 2, "Creative Thinker": 1 } },
  { question: "Do you smell things before putting them in the laundry to check?", category: "Habits", meTooPctDefault: 76, traits: { "Pattern Seeker": 2, Observer: 1 } },
  { question: "Do you make deals with yourself to procrastinate?", category: "Habits", meTooPctDefault: 69, traits: { Overthinker: 2, "Comfort Seeker": 1 } },
  { question: "Do you arrange things symmetrically without knowing why?", category: "Habits", meTooPctDefault: 43, traits: { "Pattern Seeker": 3, Observer: 1 } },
];

export async function seedHabits(): Promise<void> {
  const [{ value: existing }] = await db.select({ value: count() }).from(habitsTable);
  if (existing > 0) {
    logger.info({ existing }, "Habits already seeded, skipping");
    return;
  }
  await db.insert(habitsTable).values(HABITS_SEED.map((h) => ({ ...h, source: "curated", status: "active" })));
  logger.info({ count: HABITS_SEED.length }, "Seeded habits");
}
