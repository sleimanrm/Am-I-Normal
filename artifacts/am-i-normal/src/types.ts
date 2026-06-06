export type Category =
  | "Overthinking"
  | "Pets"
  | "Food"
  | "Sleep"
  | "Technology"
  | "Social"
  | "Body"
  | "Habits";

export type Trait =
  | "Overthinker"
  | "Animal Lover"
  | "Pattern Seeker"
  | "Sentimental"
  | "Introvert"
  | "Observer"
  | "Creative Thinker"
  | "Comfort Seeker";

export type Answer = "me-too" | "not-me";

export interface Habit {
  id: number;
  question: string;
  category: Category;
  meTooPct: number;
  traits: Partial<Record<Trait, number>>;
}

export type TraitScores = Record<Trait, number>;

export interface ProfileTrait {
  trait: Trait;
  pct: number;
}
