import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";

// --- DATA ---
const habits = [
  { question: "Do you rehearse conversations in your head before they happen?", meTooPct: 72 },
  { question: "Do you talk to yourself when alone?", meTooPct: 63 },
  { question: "Do you make songs for your pets?", meTooPct: 57 },
  { question: "Do you check your phone even when it didn't vibrate?", meTooPct: 81 },
  { question: "Do you open the fridge even when you're not hungry?", meTooPct: 78 },
];

// --- COMPONENTS ---

// Helper for Animated Counter
function AnimatedCounter({ targetValue }: { targetValue: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutExpo
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      setValue(Math.floor(easeProgress * targetValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue]);

  return <span>{value}</span>;
}

export default function App() {
  const [view, setView] = useState<"landing" | "question" | "result" | "done">("landing");
  const [currentHabitIndex, setCurrentHabitIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<"me-too" | "not-me" | null>(null);

  const currentHabit = habits[currentHabitIndex];
  const isMajority = currentHabit?.meTooPct > 50;

  const handleStart = () => {
    setView("question");
  };

  const handleAnswer = (answer: "me-too" | "not-me") => {
    setUserAnswer(answer);
    setView("result");
  };

  const handleNext = () => {
    if (currentHabitIndex < habits.length - 1) {
      setCurrentHabitIndex((prev) => prev + 1);
      setUserAnswer(null);
      setView("question");
    } else {
      setView("done");
    }
  };

  const handleRestart = () => {
    setCurrentHabitIndex(0);
    setUserAnswer(null);
    setView("landing");
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] overflow-hidden p-4">
      
      <div className="w-full max-w-[390px] h-[750px] max-h-[90dvh] relative flex items-center justify-center">
        <AnimatePresence mode="wait">
          
          {/* VIEW 1: LANDING */}
          {view === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20"
                >
                  <Sparkles className="w-12 h-12 text-white" />
                </motion.div>
                <h1 className="text-5xl font-extrabold text-white tracking-tight">
                  Am I<br />Normal?
                </h1>
                <p className="text-lg text-purple-200 font-medium px-8">
                  You're probably not as weird as you think.
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleStart}
                data-testid="button-start"
                className="w-full max-w-[280px] bg-white text-purple-900 font-bold text-lg py-4 px-8 rounded-full shadow-lg shadow-black/20 hover:shadow-xl transition-shadow"
              >
                Start Discovering
              </motion.button>
            </motion.div>
          )}

          {/* VIEW 2: QUESTION */}
          {view === "question" && (
            <motion.div
              key={`question-${currentHabitIndex}`}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="w-full h-full flex flex-col items-center justify-center"
            >
              <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl flex flex-col h-[60%] justify-between">
                
                <div className="flex justify-between items-center w-full mb-4">
                  <span className="text-purple-400 font-semibold text-sm tracking-wider uppercase">Habit</span>
                  <span className="text-purple-400 font-bold text-sm bg-purple-100/50 px-3 py-1 rounded-full" data-testid="text-progress">
                    {currentHabitIndex + 1} / {habits.length}
                  </span>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <h2 
                    className="text-3xl font-bold text-card-foreground text-center leading-tight"
                    data-testid="text-habit-question"
                  >
                    "{currentHabit.question}"
                  </h2>
                </div>
                
                <div className="space-y-3 mt-8">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer("me-too")}
                    data-testid="button-me-too"
                    className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-full shadow-md flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Me Too
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer("not-me")}
                    data-testid="button-not-me"
                    className="w-full bg-transparent border-2 border-primary/20 text-primary font-bold text-lg py-4 rounded-full flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                    Not Me
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW 3: RESULT */}
          {view === "result" && (
            <motion.div
              key={`result-${currentHabitIndex}`}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="w-full h-full flex flex-col items-center justify-center"
            >
              <div className="w-full bg-card rounded-[2rem] p-8 shadow-2xl flex flex-col h-[60%] justify-between text-center relative overflow-hidden">
                
                {/* Decorative background element */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col items-center justify-center flex-1 z-10 space-y-6">
                  <div className="space-y-2">
                    <p className="text-purple-400 font-semibold uppercase tracking-widest text-sm">
                      {userAnswer === "me-too" ? "You said: Me Too" : "You said: Not Me"}
                    </p>
                    <div className="flex items-baseline justify-center gap-1 text-primary">
                      <span className="text-7xl font-extrabold tracking-tighter" data-testid="text-result-percentage">
                        <AnimatedCounter targetValue={currentHabit.meTooPct} />
                      </span>
                      <span className="text-4xl font-bold">%</span>
                    </div>
                    <p className="text-card-foreground/70 font-medium text-lg">
                      also do this.
                    </p>
                  </div>
                  
                  <div className="bg-white px-6 py-3 rounded-full border border-purple-100 shadow-sm inline-block">
                    <p className="text-xl font-bold text-card-foreground">
                      {isMajority ? "You're in the majority." : "You're in the minority."}
                    </p>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleNext}
                  data-testid="button-next"
                  className="w-full bg-card-foreground text-white font-bold text-lg py-4 rounded-full shadow-lg flex items-center justify-center gap-2 mt-8 z-10"
                >
                  {currentHabitIndex < habits.length - 1 ? "Next Question" : "See Results"}
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* VIEW 4: DONE */}
          {view === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.6, delay: 0.2 }}
                  className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                  <Sparkles className="w-12 h-12 text-primary" />
                </motion.div>
                <h2 className="text-4xl font-extrabold text-white tracking-tight">
                  You're perfectly<br />normal.
                </h2>
                <p className="text-lg text-purple-200 font-medium px-8">
                  (Or at least, you're not alone in your weirdness.)
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleRestart}
                className="w-full max-w-[280px] bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-lg py-4 px-8 rounded-full hover:bg-white/30 transition-colors"
              >
                Play Again
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
