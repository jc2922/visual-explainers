import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, 
  Grid3X3, 
  Cpu
} from 'lucide-react';

export const PersonalWebpage: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-400 font-sans selection:bg-white/5 overflow-x-hidden p-8 md:p-24 flex flex-col justify-center items-center">
      <div className="max-w-xl w-full">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1 }}
        >
          <h1 className="text-4xl md:text-6xl font-extralight text-white tracking-tighter mb-4 lowercase">
            visual explainers
          </h1>
          <p className="text-sm text-zinc-600 mb-16 leading-relaxed font-light">
            index of interactive computing artifacts.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 w-full"
        >
          <Link 
            to="/summa"
            className="block group relative border border-zinc-900 bg-zinc-950 p-8 rounded-3xl hover:border-zinc-700 transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="w-10 h-10 bg-zinc-900 flex items-center justify-center rounded-xl border border-zinc-900">
                <Cpu size={20} className="text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-700 font-mono">artifact.01</div>
            </div>
            
            <h2 className="text-xl text-zinc-200 mb-1 font-light tracking-tight">SUMMA Matrix Multiplication</h2>
            <p className="text-xs text-zinc-600 mb-8 font-light">parallel algorithm simulation.</p>

            <div className="flex items-center gap-2 text-[9px] text-zinc-500 uppercase tracking-[0.2em] group-hover:text-zinc-300 transition-all">
              <span>Enter visualization</span>
              <ChevronRight size={12} className="text-zinc-800 group-hover:translate-x-1" />
            </div>
          </Link>

          <div className="border border-zinc-900/40 bg-zinc-950/20 p-8 rounded-3xl select-none">
            <div className="flex items-center justify-between mb-8 opacity-20">
              <div className="w-10 h-10 bg-zinc-900 flex items-center justify-center rounded-xl border border-zinc-900">
                <Grid3X3 size={20} className="text-zinc-800" />
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-800 font-mono">artifact.02</div>
            </div>
            <h2 className="text-xl text-zinc-900 mb-1 font-light tracking-tight">Future Work</h2>
            <p className="text-xs text-zinc-900 font-light">under development.</p>
          </div>
        </motion.div>
      </div>

      <footer className="mt-24 text-[9px] uppercase tracking-[0.5em] text-zinc-800">
        © 2026 • visual logic
      </footer>
    </div>
  );
};
