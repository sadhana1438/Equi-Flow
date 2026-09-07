'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useProject } from '@/context/ProjectContext';
import { api } from '@/lib/api';
import { DependencyGraphData, GraphNode as IGraphNode } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import { GitFork, Layers, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';

// Custom Node Component
function TaskNode({ data }: { data: IGraphNode }) {
  const statusBorder = {
    DONE: 'border-emerald-500/60 bg-emerald-500/5',
    IN_PROGRESS: 'border-indigo-500/80 bg-zinc-100 dark:bg-zinc-800',
    IN_REVIEW: 'border-amber-500/80 bg-amber-500/10',
    TODO: 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800',
  }[data.status] || 'border-slate-200 dark:border-slate-700';

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 shadow-lg min-w-[200px] max-w-[240px] text-xs transition-all ${statusBorder} ${
        data.is_bottleneck ? 'ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-900 animate-pulse' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-[11px]">
          {data.id}
        </span>
        {data.is_bottleneck ? (
          <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9px] font-bold flex items-center gap-0.5">
            <AlertTriangle className="w-2.5 h-2.5" /> Bottleneck
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-slate-400 uppercase">
            {data.status.replace('_', ' ')}
          </span>
        )}
      </div>

      <div className="font-bold text-slate-900 dark:text-white truncate">
        {data.title}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span>{data.assignee_name || 'Unassigned'}</span>
        <span className="font-mono font-bold">{data.remaining_hours}h</span>
      </div>

      {data.downstream_count > 0 && (
        <div className="mt-1 text-[9px] text-zinc-900 dark:text-zinc-100 font-semibold">
          Blocks {data.downstream_count} downstream task(s)
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  taskNode: TaskNode,
};

export default function DependencyGraphPage() {
  const { selectedProjectId } = useProject();

  const [graphData, setGraphData] = useState<DependencyGraphData | null>(null);
  const [loading, setLoading] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const loadGraph = async () => {
    try {
      setLoading(true);
      const data = await api.getGraph(selectedProjectId || undefined);
      setGraphData(data);

      // Compute topological layer layout
      const layoutNodes: Node[] = [];
      const nodeCount = data.nodes.length;
      
      data.nodes.forEach((n, idx) => {
        // Arrange in a responsive grid/flow
        const col = idx % 4;
        const row = Math.floor(idx / 4);

        layoutNodes.push({
          id: n.id,
          type: 'taskNode',
          position: { x: col * 270 + 40, y: row * 160 + 40 },
          data: n as any,
        });
      });

      const layoutEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.confidence === 'INFERRED',
        style: {
          stroke: e.confidence === 'EXPLICIT' ? '#6366f1' : '#f59e0b',
          strokeWidth: 2,
          strokeDasharray: e.confidence === 'INFERRED' ? '5 5' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: e.confidence === 'EXPLICIT' ? '#6366f1' : '#f59e0b',
        },
        label: e.confidence === 'INFERRED' ? 'Inferred' : undefined,
        labelStyle: { fill: '#94a3b8', fontSize: 10 },
      }));

      setNodes(layoutNodes);
      setEdges(layoutEdges);
    } catch (err) {
      console.error('Failed to load dependency graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [selectedProjectId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <GitFork className="w-7 h-7 text-zinc-400" />
            <span>Dependency Directed Acyclic Graph</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Interactive task graph analyzed via NetworkX. Solid edges represent explicit dependencies, dashed edges represent inferred dependencies.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 bg-indigo-500" />
            <span>Explicit (Solid)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 border-t-2 border-dashed border-amber-500" />
            <span>Inferred (Dashed)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Bottleneck Node</span>
          </div>
        </div>
      </div>

      {/* ReactFlow Canvas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mb-2" />
          <p className="text-xs text-slate-400">Rendering dependency graph...</p>
        </div>
      ) : !graphData || graphData.nodes.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No tasks in dependency graph"
          description="Create tasks and define blocking dependencies to view the interactive critical path network."
        />
      ) : (
        <div className="h-[650px] w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-inner overflow-hidden relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
          >
            <Controls className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200" />
            <MiniMap
              className="bg-white/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
              nodeColor={(node: any) => {
                if (node.data?.is_bottleneck) return '#f43f5e';
                return '#6366f1';
              }}
            />
            <Background color="#334155" gap={24} size={1} />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
