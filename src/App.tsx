/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  BrowserRouter,
  Routes,
  Route,
  Link
} from 'react-router-dom';
import { 
  ChevronRight, 
  Grid3X3, 
  Cpu
} from 'lucide-react';
import { SummaVisualizer } from './components/SummaVisualizer';
import { PersonalWebpage } from './components/PersonalWebpage';

// --- Main App ---

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PersonalWebpage />} />
        <Route path="/summa" element={<SummaVisualizer />} />
      </Routes>
    </BrowserRouter>
  );
}
