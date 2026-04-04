import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import type { NodeInfo } from '../hooks/useDashboardData.ts';

interface NodeCardProps {
  node: NodeInfo;
  onClick: (node: NodeInfo) => void;
  index: number;
}

export default function NodeCard({ node, onClick, index }: NodeCardProps) {
  // A pseudo health simulation since the node API doesn't push live health info yet (unless we augment it later)
  // We mock a baseline healthy look, but real impl can use node health stats.
  const isHealthy = true; 

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={() => onClick(node)}
      className="glass-card p-4 cursor-pointer group flex items-start gap-4 relative overflow-hidden"
    >
      {/* Decorative Glow */}
      <div className={`absolute -inset-1 opacity-0 group-hover:opacity-20 transition-opacity blur-xl rounded-xl ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      
      <div className="relative z-10 shrink-0 mt-1">
        {isHealthy ? (
          <ShieldCheck className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
        ) : (
          <ShieldAlert className="w-6 h-6 text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]" />
        )}
      </div>
      
      <div className="relative z-10 flex-1 min-w-0">
        <h4 className="text-white font-medium truncate mb-1">{node.name}</h4>
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <span className="uppercase px-1.5 py-0.5 bg-white/10 rounded">{node.protocol}</span>
          <span className="truncate">{node.address}:{node.port}</span>
        </div>
      </div>
      
      <div className="relative z-10 shrink-0 ml-auto">
        <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center bg-zinc-900 shadow-inner">
          <Cpu className="w-4 h-4 text-zinc-500" />
        </div>
      </div>
    </motion.div>
  );
}
