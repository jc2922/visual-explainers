/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Grid3X3, 
  Cpu, 
  Info,
  Layers,
  ArrowRightLeft,
  ArrowDownUp
} from 'lucide-react';

// --- Types ---

type Matrix = number[][];

interface ProcessorState {
  id: string;
  row: number;
  col: number;
  localA: number[][] | number | null;
  localB: number[][] | number | null;
  localC: number[][] | number;
}

enum AlgorithmStep {
  DISTRIBUTION = 'DISTRIBUTION',
  BROADCAST_A = 'BROADCAST_A',
  BROADCAST_B = 'BROADCAST_B',
  COMPUTE = 'COMPUTE',
  FINISHED = 'FINISHED'
}

type MappingMode = 'element' | 'block';

// --- Helper Functions ---

const createRandomMatrix = (size: number) => 
  Array.from({ length: size }, () => 
    Array.from({ length: size }, () => Math.floor(Math.random() * 9 + 1))
  );

const createZeroMatrix = (size: number) => 
  Array.from({ length: size }, () => Array.from({ length: size }, () => 0));

// --- Helper Components ---

interface MatrixCellProps {
  value: number | string;
  highlighted?: boolean;
  color?: 'blue' | 'amber' | 'emerald' | 'slate';
  gridSize?: number;
  isOwned?: boolean;
  isBlockEdgeX?: boolean;
  isBlockEdgeY?: boolean;
}

const MatrixCell: React.FC<MatrixCellProps> = ({ value, highlighted, color = 'blue', gridSize = 4, isOwned, isBlockEdgeX, isBlockEdgeY }) => {
  const colorMap = {
    blue: 'bg-blue-950/30 border-blue-800/40 text-blue-400',
    amber: 'bg-amber-950/30 border-amber-800/40 text-amber-400',
    emerald: 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400',
    slate: 'bg-zinc-900 border-zinc-800 text-zinc-500',
  };

  // Determine dynamic size and font based on grid size
  const cellSize = gridSize <= 4 ? 'w-9 h-9' : gridSize <= 8 ? 'w-7 h-7' : 'w-5 h-5';
  const fontSize = gridSize <= 4 ? 'text-[10px]' : gridSize <= 8 ? 'text-[8px]' : 'text-[7px]';

  return (
    <div className={`
      ${cellSize} flex items-center justify-center border font-mono ${fontSize} transition-all duration-300
      ${highlighted ? 'border-zinc-300 bg-zinc-800 text-white scale-110 z-10 shadow-[0_0_10px_rgba(255,255,255,0.1)]' : colorMap[color]}
      ${isOwned ? 'ring-2 ring-emerald-500/70 ring-offset-2 ring-offset-zinc-950 z-20' : ''}
      ${isBlockEdgeX ? 'mr-1 border-r-zinc-600' : ''}
      ${isBlockEdgeY ? 'mb-1 border-b-zinc-600' : ''}
    `}>
      {typeof value === 'number' ? (gridSize > 8 ? value.toFixed(0) : value.toFixed(1)) : value}
    </div>
  );
};

interface ProcessorUnitProps {
  state: ProcessorState;
  isActive: boolean;
  isSource?: boolean;
  step: AlgorithmStep;
  P_GRID: number;
  onHover: (pos: {row: number, col: number} | null) => void;
}

const BlockMiniGrid = ({ data, color, P_GRID }: { data: number[][], color: 'blue' | 'amber' | 'emerald', P_GRID: number }) => {
  const colorMap = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };
  
  const size = data.length;
  // Scale mini cells based on processor grid density
  const miniCellSize = P_GRID <= 2 ? 'w-5 h-5' : 'w-3 h-3';
  const miniFontSize = P_GRID <= 2 ? 'text-[8px]' : 'text-[6px]';
  
  return (
    <div 
      className={`grid ${P_GRID > 1 ? 'gap-0.5' : 'gap-1'} p-1 bg-zinc-900 border border-zinc-800 rounded`}
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {data.map((row, i) => 
        row.map((val, j) => (
          <div key={`${i}-${j}`} className={`${miniCellSize} ${miniFontSize} flex items-center justify-center border font-mono rounded-xs ${colorMap[color]}`}>
            {val.toFixed(0)}
          </div>
        ))
      )}
    </div>
  );
};

const ProcessorUnit: React.FC<ProcessorUnitProps> = ({ state, isActive, isSource, step, P_GRID, onHover }) => {
  return (
    <div 
      onMouseEnter={() => onHover({row: state.row, col: state.col})}
      onMouseLeave={() => onHover(null)}
      className={`
      relative p-3 border rounded-xl transition-all duration-500 bg-zinc-950/40 backdrop-blur-sm group
      ${isActive ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-zinc-800 opacity-60'}
      ${isSource ? 'ring-2 ring-blue-500/50 border-blue-500/50' : ''}
      hover:border-emerald-400 hover:opacity-100 hover:scale-[1.02] cursor-default
    `}>
      <div className={`
        absolute -top-2 -right-2 text-zinc-950 text-[8px] px-1.5 py-0.5 rounded font-bold tracking-tighter uppercase shadow-lg transition-colors
        ${isSource ? 'bg-blue-500 text-zinc-950' : (state.localA !== null || state.localB !== null ? 'bg-emerald-500' : 'bg-zinc-700')}
      `}>
        {isSource ? 'Source Node' : `PE(${state.row},${state.col})`}
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="space-y-1">
          <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold block">Buf_A</span>
          <div className={`flex items-center justify-center border rounded transition-all duration-500 ${step === AlgorithmStep.BROADCAST_A ? 'bg-blue-500/20 border-blue-500 scale-105 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-zinc-900 border-zinc-800'}`}>
            {state.localA === null ? (
              <span className="text-zinc-600 font-mono text-[10px] h-7 flex items-center shrink-0">---</span>
            ) : Array.isArray(state.localA) ? (
              <BlockMiniGrid data={state.localA} color="blue" P_GRID={P_GRID} />
            ) : (
              <span className="text-blue-300 font-mono text-[10px] h-7 flex items-center">{state.localA.toFixed(1)}</span>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold block">Buf_B</span>
          <div className={`flex items-center justify-center border rounded transition-all duration-500 ${step === AlgorithmStep.BROADCAST_B ? 'bg-amber-500/20 border-amber-500 scale-105 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-zinc-900 border-zinc-800'}`}>
            {state.localB === null ? (
              <span className="text-zinc-600 font-mono text-[10px] h-7 flex items-center shrink-0">---</span>
            ) : Array.isArray(state.localB) ? (
              <BlockMiniGrid data={state.localB} color="amber" P_GRID={P_GRID} />
            ) : (
              <span className="text-amber-300 font-mono text-[10px] h-7 flex items-center">{state.localB.toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-zinc-800">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Sum_C</span>
          {step === AlgorithmStep.COMPUTE && <motion.div animate={{ scale: [1, 1.2, 1] }}><Layers size={10} className="text-emerald-400" /></motion.div>}
        </div>
        <div className={`flex items-center justify-center border rounded transition-colors ${step === AlgorithmStep.COMPUTE ? 'bg-emerald-500/20 border-emerald-500' : 'bg-zinc-900 border-zinc-800'}`}>
          {Array.isArray(state.localC) ? (
            <div className="p-1"><BlockMiniGrid data={state.localC} color="emerald" P_GRID={P_GRID} /></div>
          ) : (
            <span className="text-emerald-300 font-mono text-xs h-8 flex items-center">{state.localC.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [matrixSize, setMatrixSize] = useState(4);
  const [processorSize, setProcessorSize] = useState(2);
  const [matrixA, setMatrixA] = useState<Matrix>([]);
  const [matrixB, setMatrixB] = useState<Matrix>([]);
  const [currentK, setCurrentK] = useState(0);
  const [step, setStep] = useState<AlgorithmStep>(AlgorithmStep.DISTRIBUTION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processors, setProcessors] = useState<ProcessorState[]>([]);
  const [speed, setSpeed] = useState(1000);
  const [hoveredPE, setHoveredPE] = useState<{row: number, col: number} | null>(null);

  // Constants derived from user settings
  const GRID_SIZE = matrixSize;
  const P_GRID = processorSize;
  const BLOCK_SIZE = Math.floor(GRID_SIZE / P_GRID);
  const TOTAL_K = P_GRID; 
  const isElementMapping = BLOCK_SIZE === 1 && GRID_SIZE === P_GRID;

  const initialize = useCallback(() => {
    const A = createRandomMatrix(GRID_SIZE);
    const B = createRandomMatrix(GRID_SIZE);
    
    setMatrixA(A);
    setMatrixB(B);
    setCurrentK(0);
    setStep(AlgorithmStep.DISTRIBUTION);
    setIsPlaying(false);
    
    const initialProcessors: ProcessorState[] = [];
    for (let i = 0; i < P_GRID; i++) {
      for (let j = 0; j < P_GRID; j++) {
        initialProcessors.push({
          id: `${i}-${j}`,
          row: i,
          col: j,
          localA: null,
          localB: null,
          localC: isElementMapping ? 0 : createZeroMatrix(BLOCK_SIZE)
        });
      }
    }
    setProcessors(initialProcessors);
  }, [GRID_SIZE, P_GRID, BLOCK_SIZE, isElementMapping]);

  useEffect(() => {
    initialize();
  }, [GRID_SIZE, P_GRID, initialize]); 

  const nextStep = useCallback(() => {
    if (step === AlgorithmStep.DISTRIBUTION) {
      setStep(AlgorithmStep.BROADCAST_A);
      return;
    }

    if (step === AlgorithmStep.BROADCAST_A) {
      setProcessors(prev => prev.map(p => {
        if (isElementMapping) {
          const val = matrixA[p.row] ? matrixA[p.row][currentK] : 0;
          return { ...p, localA: val ?? 0 };
        } else {
          const block: number[][] = [];
          for (let i = 0; i < BLOCK_SIZE; i++) {
            const rowIdx = p.row * BLOCK_SIZE + i;
            if (matrixA[rowIdx]) {
              block.push(matrixA[rowIdx].slice(currentK * BLOCK_SIZE, (currentK + 1) * BLOCK_SIZE));
            }
          }
          return { ...p, localA: block.length ? block : createZeroMatrix(BLOCK_SIZE) };
        }
      }));
      setStep(AlgorithmStep.BROADCAST_B);
    } else if (step === AlgorithmStep.BROADCAST_B) {
      setProcessors(prev => prev.map(p => {
        if (isElementMapping) {
          const val = matrixB[currentK] ? matrixB[currentK][p.col] : 0;
          return { ...p, localB: val ?? 0 };
        } else {
          const block: number[][] = [];
          for (let i = 0; i < BLOCK_SIZE; i++) {
            const rowIdx = currentK * BLOCK_SIZE + i;
            if (matrixB[rowIdx]) {
              block.push(matrixB[rowIdx].slice(p.col * BLOCK_SIZE, (p.col + 1) * BLOCK_SIZE));
            }
          }
          return { ...p, localB: block.length ? block : createZeroMatrix(BLOCK_SIZE) };
        }
      }));
      setStep(AlgorithmStep.COMPUTE);
    } else if (step === AlgorithmStep.COMPUTE) {
      setProcessors(prev => prev.map(p => {
        if (isElementMapping) {
          const c = typeof p.localC === 'number' ? p.localC : 0;
          const a = typeof p.localA === 'number' ? p.localA : 0;
          const b = typeof p.localB === 'number' ? p.localB : 0;
          return { ...p, localC: c + a * b, localA: null, localB: null };
        } else {
          const C = Array.isArray(p.localC) ? p.localC : createZeroMatrix(BLOCK_SIZE);
          const A = Array.isArray(p.localA) ? p.localA : createZeroMatrix(BLOCK_SIZE);
          const B = Array.isArray(p.localB) ? p.localB : createZeroMatrix(BLOCK_SIZE);
          const nextC = C.map(row => [...row]);
          
          for (let i = 0; i < BLOCK_SIZE; i++) {
            for (let j = 0; j < BLOCK_SIZE; j++) {
              for (let kOffset = 0; kOffset < BLOCK_SIZE; kOffset++) {
                nextC[i][j] += (A[i]?.[kOffset] || 0) * (B[kOffset]?.[j] || 0);
              }
            }
          }
          return { ...p, localC: nextC, localA: null, localB: null };
        }
      }));
      
      if (currentK < TOTAL_K - 1) {
        setCurrentK(k => k + 1);
        setStep(AlgorithmStep.BROADCAST_A);
      } else {
        setStep(AlgorithmStep.FINISHED);
        setIsPlaying(false);
      }
    }
  }, [step, currentK, matrixA, matrixB, isElementMapping, BLOCK_SIZE, GRID_SIZE, P_GRID, TOTAL_K]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && step !== AlgorithmStep.FINISHED) {
      timer = setTimeout(nextStep, speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, step, nextStep, speed]);

  const reset = () => {
    initialize();
  };

  const activePEIndex = Math.min(currentK * P_GRID + currentK, (processors.length || 1) - 1);
  const activePE = processors[activePEIndex];

  const getTutorialText = () => {
    switch (step) {
      case AlgorithmStep.DISTRIBUTION:
        return {
          title: "1. Data Distribution",
          desc: `The input matrices are divided into ${P_GRID}x${P_GRID} blocks. Each Processor (PE) is assigned one local block of A and B. Hover over a PE to see its ownership area in the matrices above.`
        };
      case AlgorithmStep.BROADCAST_A:
        return {
          title: "2. Row Broadcast (Matrix A)",
          desc: `In iteration k=${currentK}, the processor in column ${currentK} of each row acts as the 'Source'. It broadcasts its local A-block to all other processors in its row. Note: The source PE already has its own data, so communication is skipped for it.`
        };
      case AlgorithmStep.BROADCAST_B:
        return {
          title: "3. Column Broadcast (Matrix B)",
          desc: `Simultaneously, the processor in row ${currentK} of each column broadcasts its local B-block to all other processors in its column. The source PE for this broadcast is row ${currentK}.`
        };
      case AlgorithmStep.COMPUTE:
        return {
          title: "4. Local Multiply-Add",
          desc: "Every PE performs a local Matrix Multiply-Accumulate (MAC) using the blocks it just received. C += A_local * B_local. This happens in parallel across the entire mesh."
        };
      case AlgorithmStep.FINISHED:
        return {
          title: "Algorithm Complete",
          desc: "After P iterations, the distributed result matrix C is computed. SUMMA is highly efficient because it balances computation and communication optimally."
        };
      default:
        return { title: "", desc: "" };
    }
  };

  const tutorial = getTutorialText();

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-300 font-sans flex flex-col overflow-hidden selection:bg-emerald-500/30">
      
      {/* Header Section */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0 z-20 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-emerald-600 flex items-center justify-center rounded text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Cpu size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight tracking-tight uppercase">SUMMA Accelerator Node</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
              Simulation Active • Iteration k={currentK}/{TOTAL_K-1}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest leading-none mb-1">Matrix Size</span>
            <select 
              value={matrixSize} 
              onChange={(e) => setMatrixSize(Number(e.target.value))}
              disabled={isPlaying}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded cursor-pointer outline-none focus:border-emerald-500 transition-colors"
            >
              {[4, 8, 12].map(s => <option key={s} value={s}>{s}x{s}</option>)}
            </select>
          </div>

          <div className="flex flex-col items-end mr-2">
            <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest leading-none mb-1">Mesh Grid</span>
            <select 
              value={processorSize} 
              onChange={(e) => setProcessorSize(Number(e.target.value))}
              disabled={isPlaying}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] px-2 py-1 rounded cursor-pointer outline-none focus:border-emerald-500 transition-colors"
            >
              {[1, 2, 4].filter(s => matrixSize % s === 0).map(s => (
                <option key={s} value={s}>{s}x{s} PE</option>
              ))}
            </select>
          </div>

          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Global Progress</span>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {TOTAL_K > 1 ? (currentK / (TOTAL_K - 1) * 100).toFixed(1) : (step === AlgorithmStep.FINISHED ? "100" : "0")}%
            </span>
          </div>
          <div className="w-px h-8 bg-zinc-800 mx-2" />
          
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            <button 
              onClick={reset}
              className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
              title="Reset State"
            >
              <RotateCcw size={16} />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={step === AlgorithmStep.FINISHED}
              className={`flex items-center gap-2 px-4 py-1.5 rounded font-bold text-[11px] uppercase transition-all shadow-md active:scale-95 ${
                isPlaying 
                ? 'bg-zinc-800 text-zinc-300' 
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
              } disabled:opacity-30`}
            >
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              <span className="hidden sm:inline">{isPlaying ? 'Halt' : 'Execute'}</span>
            </button>
            <button 
              onClick={nextStep}
              disabled={isPlaying || step === AlgorithmStep.FINISHED}
              className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors disabled:opacity-20"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 bg-zinc-900 overflow-hidden">
        
        {/* Left Sidebar: Telemetry */}
        <aside className="hidden lg:flex w-64 border-r border-zinc-800 bg-zinc-950 p-5 flex-col gap-8 shrink-0 overflow-y-auto">
          <section>
            <h3 className="text-[9px] font-bold text-zinc-500 uppercase mb-4 tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Cluster Topology
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Mesh Grid', val: `${P_GRID}x${P_GRID} Nodes` },
                { label: 'Matrix Size', val: `${GRID_SIZE}x${GRID_SIZE}` },
                { label: 'Block Size', val: `${BLOCK_SIZE}x${BLOCK_SIZE}` },
                { label: 'Link Type', val: 'Low-Latency Torus' }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500 uppercase font-medium">{item.label}</span>
                  <span className="text-white font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{item.val}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[9px] font-bold text-zinc-500 uppercase mb-4 tracking-widest">Tutorial Guide</h3>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mb-6">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center text-[10px]">{currentK + 1}</span>
                {tutorial.title}
              </h4>
              <p className="text-[11px] text-zinc-300 leading-relaxed mb-4">
                {tutorial.desc}
              </p>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={false}
                  animate={{ width: `${TOTAL_K > 1 ? (currentK / (TOTAL_K - 1) * 100) : (step === AlgorithmStep.FINISHED ? 100 : 0)}%` }}
                  className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[9px] font-bold text-zinc-500 uppercase mb-3 tracking-widest">Efficiency Metrics</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                <div className="text-[8px] text-zinc-500 uppercase font-bold text-wrap leading-tight">Comm Overhead</div>
                <div className="text-xs font-mono text-zinc-300">{( (P_GRID / GRID_SIZE) * 100 ).toFixed(1)}%</div>
              </div>
              <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                <div className="text-[8px] text-zinc-500 uppercase font-bold text-wrap leading-tight">Compute Utlz</div>
                <div className="text-xs font-mono text-emerald-400">{( 100 - (P_GRID / GRID_SIZE) * 10 ).toFixed(1)}%</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
              <p className="text-[9px] text-zinc-500 leading-relaxed uppercase font-bold mb-1 tracking-tighter">Surface-to-Volume Ratio</p>
              <p className="text-[10px] text-zinc-400 leading-tight">
                {GRID_SIZE / P_GRID >= 4 
                  ? "High data locality detected. Computation heavily outweighs communication costs."
                  : "Communication overhead is significant. Increase Matrix Size for better parallel efficiency."}
              </p>
            </div>
          </section>
        </aside>

        {/* Main Visualization Area */}
        <main className="flex-1 overflow-y-auto relative flex flex-col p-6 lg:p-10 scrollbar-hide">
          
          {/* Key Legend */}
          <div className="flex flex-wrap items-center gap-6 text-[10px] font-bold text-zinc-500 mb-8 uppercase tracking-tighter">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-600 rounded shadow-[0_0_8px_rgba(37,99,235,0.4)]"></span>
              <span>A (Panel)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-600 rounded shadow-[0_0_8px_rgba(217,119,6,0.4)]"></span>
              <span>B (Panel)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 border border-emerald-500/50 bg-emerald-500/10 rounded"></span>
              <span>Result C</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start mt-4">
            
            {/* Input Matrices Panel */}
            <div className="xl:col-span-4 space-y-10">
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                  Input Matrix A
                  {step === AlgorithmStep.BROADCAST_A && <span className="text-blue-500 animate-pulse text-[9px]">BROADCASTING</span>}
                </h3>
                <div className="grid gap-1 p-2 bg-zinc-950/50 rounded-xl border border-zinc-800 backdrop-blur shadow-inner" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
                  {matrixA.map((row, i) => 
                    row.map((val, j) => {
                      const peRow = Math.floor(i / BLOCK_SIZE);
                      const peCol = Math.floor(j / BLOCK_SIZE);
                      const isOwnedByHover = hoveredPE?.row === peRow && hoveredPE?.col === peCol;
                      const isBlockEdgeX = (j + 1) % BLOCK_SIZE === 0 && (j + 1) !== GRID_SIZE;
                      const isBlockEdgeY = (i + 1) % BLOCK_SIZE === 0 && (i + 1) !== GRID_SIZE;
                      return (
                        <MatrixCell 
                          key={`a-${i}-${j}`} 
                          value={val} 
                          color="blue"
                          gridSize={GRID_SIZE}
                          isOwned={isOwnedByHover}
                          isBlockEdgeX={isBlockEdgeX}
                          isBlockEdgeY={isBlockEdgeY}
                          highlighted={
                            isElementMapping 
                            ? j === currentK && step === AlgorithmStep.BROADCAST_A
                            : (j >= currentK * BLOCK_SIZE && j < (currentK + 1) * BLOCK_SIZE) && step === AlgorithmStep.BROADCAST_A
                          } 
                        />
                      );
                    })
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                  Input Matrix B
                  {step === AlgorithmStep.BROADCAST_B && <span className="text-amber-500 animate-pulse text-[9px]">BROADCASTING</span>}
                </h3>
                <div className="grid gap-1 p-2 bg-zinc-950/50 rounded-xl border border-zinc-800 backdrop-blur" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
                  {matrixB.map((row, i) => 
                    row.map((val, j) => {
                      const peRow = Math.floor(i / BLOCK_SIZE);
                      const peCol = Math.floor(j / BLOCK_SIZE);
                      const isOwnedByHover = hoveredPE?.row === peRow && hoveredPE?.col === peCol;
                      const isBlockEdgeX = (j + 1) % BLOCK_SIZE === 0 && (j + 1) !== GRID_SIZE;
                      const isBlockEdgeY = (i + 1) % BLOCK_SIZE === 0 && (i + 1) !== GRID_SIZE;
                      return (
                        <MatrixCell 
                          key={`b-${i}-${j}`} 
                          value={val} 
                          color="amber"
                          gridSize={GRID_SIZE}
                          isOwned={isOwnedByHover}
                          isBlockEdgeX={isBlockEdgeX}
                          isBlockEdgeY={isBlockEdgeY}
                          highlighted={
                            isElementMapping
                            ? i === currentK && step === AlgorithmStep.BROADCAST_B
                            : (i >= currentK * BLOCK_SIZE && i < (currentK + 1) * BLOCK_SIZE) && step === AlgorithmStep.BROADCAST_B
                          } 
                        />
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            {/* Processor Mesh Panel */}
            <div className="xl:col-span-8 space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Grid3X3 size={14} className="text-emerald-500" />
                Processor Accelerator Mesh
              </h3>
              
              <div className="grid gap-3 p-4 bg-zinc-950/80 rounded-3xl border border-zinc-800 backdrop-blur-md relative overflow-hidden shadow-2xl min-h-[500px]" style={{ gridTemplateColumns: `repeat(${P_GRID}, minmax(0, 1fr))` }}>
                {/* Visual Interconnect Lines */}
                <div className="absolute inset-0 pointer-events-none opacity-10">
                  {Array.from({ length: P_GRID - 1 }).map((_, idx) => (
                    <div key={`v-${idx}`} className="absolute inset-y-0 w-px bg-zinc-700" style={{ left: `${(idx + 1) * (100 / P_GRID)}%` }} />
                  ))}
                  {Array.from({ length: P_GRID - 1 }).map((_, idx) => (
                    <div key={`h-${idx}`} className="absolute inset-x-0 h-px bg-zinc-700" style={{ top: `${(idx + 1) * (100 / P_GRID)}%` }} />
                  ))}
                </div>

                {/* Broadcast Glow Overlays - REMOVED swipe animations per user request */}

                {processors.map((p) => {
                  const isSourceA = step === AlgorithmStep.BROADCAST_A && p.col === currentK;
                  const isSourceB = step === AlgorithmStep.BROADCAST_B && p.row === currentK;
                  return (
                    <ProcessorUnit 
                      key={p.id} 
                      state={p} 
                      step={step}
                      P_GRID={P_GRID}
                      isSource={isSourceA || isSourceB}
                      onHover={setHoveredPE}
                      isActive={isSourceA || isSourceB || step === AlgorithmStep.COMPUTE || step === AlgorithmStep.DISTRIBUTION} 
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Operation Detail */}
        <aside className="hidden xl:flex w-72 border-l border-zinc-800 bg-zinc-950 p-5 flex-col gap-6 shrink-0 overflow-y-auto">
          <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Rank-1 Simulation Detail</h3>
          
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Active Op</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">MUL-ACC</span>
            </div>
            
            <div className="font-mono text-[11px] space-y-3 leading-relaxed">
              <div className="flex items-center gap-3">
                <span className="text-zinc-600">Local_A:</span>
                <span className="text-blue-500 font-bold">
                  {isElementMapping 
                    ? (typeof activePE?.localA === 'number' ? activePE.localA.toFixed(2) : '0.00')
                    : 'Block_Panel'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-zinc-600">Local_B:</span>
                <span className="text-amber-500 font-bold">
                  {isElementMapping 
                    ? (typeof activePE?.localB === 'number' ? activePE.localB.toFixed(2) : '0.00')
                    : 'Block_Panel'}
                </span>
              </div>
              <div className="h-px bg-zinc-800 w-full" />
              <div className="pt-1">
                <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Target Element/Block:</div>
                <div className="text-emerald-400 font-bold text-sm">
                  {isElementMapping 
                    ? (typeof activePE?.localC === 'number' ? activePE.localC.toFixed(2) : '0.00')
                    : 'Sub-matrix Result'}
                </div>
              </div>
            </div>
          </div>

          <section>
            <h3 className="text-[9px] font-bold text-zinc-500 uppercase mb-3 tracking-widest">Broadcasting Topology</h3>
            <div className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between overflow-hidden relative group">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-zinc-500">M-Cast Ring (Bus)</span>
                <span className="text-white font-mono text-xs">{step.startsWith('BROADCAST') ? 'ACTIVE' : 'IDLE'}</span>
              </div>
              <div className="w-full flex items-center justify-center py-2 h-12">
                 <div className="w-full h-px bg-zinc-800 relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: isPlaying && step.startsWith('BROADCAST') ? "100%" : "0%" }}
                      className="absolute inset-y-0 left-0 bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                    />
                    {step.startsWith('BROADCAST') && (
                      <motion.div 
                        animate={{ left: ["0%", "100%"] }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-1 w-2 h-2 rounded-full bg-blue-400 border border-white shadow-[0_0_8px_white]"
                      />
                    )}
                 </div>
              </div>
              <p className="text-[9px] text-zinc-500 italic leading-snug">
                Data travels from source nodes to the rest of the mesh via high-speed multicast rings.
              </p>
            </div>
          </section>

          <footer className="mt-auto pt-6 border-t border-zinc-800">
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
              <div className="text-[9px] text-emerald-500 font-bold uppercase mb-1.5 flex items-center gap-1.5">
                <Info size={10} /> Optimization Active
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                SUMMA achieves superior scalability compared to Cannon's algorithm by avoiding complex initial shifts.
              </p>
            </div>
          </footer>
        </aside>

      </div>

      {/* Bottom Status Bar */}
      <footer className="h-10 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 text-[10px] text-zinc-500 shrink-0 font-mono z-20">
        <div className="flex gap-8 items-center">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> 
            SYSTEM_STABLE
          </span>
          <span className="hidden sm:inline border-l border-zinc-800 pl-8">MEM: 12.4GB/16GB</span>
          <span className="hidden md:inline border-l border-zinc-800 pl-8">IPC: {(Math.random() * 0.2 + 2.4).toFixed(2)}</span>
        </div>
        <div className="flex gap-6 items-center">
          <span className="text-zinc-600">DISTRIBUTED_MODE: ON</span>
          <span className="text-zinc-400 font-bold">V.2.4.0-STABLE</span>
        </div>
      </footer>
    </div>
  );
}
