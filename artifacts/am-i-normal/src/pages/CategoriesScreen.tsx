import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useGetCategories } from "@workspace/api-client-react";
import { CATEGORY_EMOJI } from "../engine/personality";
import type { Category } from "../types";

const CATEGORY_COLORS: Record<string, { from: string; to: string; text: string }> = {
  Overthinking: { from: "#7C3AED", to: "#5B21B6", text: "#DDD6FE" },
  Pets:         { from: "#D97706", to: "#B45309", text: "#FDE68A" },
  Food:         { from: "#EA580C", to: "#C2410C", text: "#FED7AA" },
  Sleep:        { from: "#4338CA", to: "#3730A3", text: "#C7D2FE" },
  Technology:   { from: "#0891B2", to: "#0E7490", text: "#A5F3FC" },
  Social:       { from: "#DB2777", to: "#BE185D", text: "#FBCFE8" },
  Body:         { from: "#059669", to: "#047857", text: "#A7F3D0" },
  Habits:       { from: "#9333EA", to: "#7E22CE", text: "#E9D5FF" },
  Community:    { from: "#6366F1", to: "#4F46E5", text: "#C7D2FE" },
};

const DEFAULT_COLOR = { from: "#6B7280", to: "#4B5563", text: "#F3F4F6" };

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, bounce: 0.3 } },
};

export default function CategoriesScreen() {
  const [, navigate] = useLocation();
  const { data: categories, isLoading } = useGetCategories();

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 px-5 pt-safe-top pt-6 pb-4">
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-white/70 font-semibold text-sm hover:text-white transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h1 className="text-3xl font-black text-white tracking-tight">Categories</h1>
          <p className="text-white/60 text-sm mt-1">Explore habits by theme</p>
        </motion.div>
      </div>

      {/* Grid */}
      <div className="flex-1 px-4 pb-10">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/10 animate-pulse" />
            ))}
          </div>
        ) : (categories ?? []).length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 rounded-2xl p-10 text-center mt-2"
          >
            <p className="text-4xl mb-3">🗂️</p>
            <p className="text-white font-bold text-lg">No categories yet</p>
            <p className="text-white/55 text-sm mt-1">
              Categories will appear here once habits are approved.
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-3 mt-2"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {(categories ?? []).map((cat) => {
              const color = CATEGORY_COLORS[cat.category] ?? DEFAULT_COLOR;
              const emoji = CATEGORY_EMOJI[cat.category as Category] ?? "💬";
              return (
                <motion.button
                  key={cat.category}
                  variants={itemVariants}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(`/categories/${encodeURIComponent(cat.category)}`)}
                  className="relative overflow-hidden rounded-2xl p-4 text-left shadow-lg shadow-black/20 flex flex-col justify-between min-h-[112px]"
                  style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
                >
                  <span className="text-4xl leading-none">{emoji}</span>
                  <div>
                    <p className="font-black text-white text-base leading-tight">{cat.category}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: color.text }}>
                      {cat.count} habit{cat.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight
                    className="absolute top-3 right-3 w-4 h-4 opacity-50"
                    style={{ color: color.text }}
                  />
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
