import React, { useEffect, useState } from 'react';
import { auditApi } from '../services/api';
import type { AuditBlock } from '../types';

const EVENT_ICONS: Record<string, string> = {
  GENESIS: '🌐',
  DELIVERY_CREATED: '📦',
  DELIVERY_UPDATED: '✏️',
  DRIVER_ASSIGNED: '🔗',
  DRIVER_LOCATION: '📍',
  DRIVER_STATUS: '🔄',
  DRIVER_INCIDENT: '⚠️',
  ROUTE_OPTIMIZED: '🤖',
  DELIVERIES_REASSIGNED: '↩️',
};

const EVENT_COLORS: Record<string, string> = {
  GENESIS: 'bg-gray-100 text-gray-700 border-gray-200',
  DELIVERY_CREATED: 'bg-blue-50 text-blue-700 border-blue-200',
  DELIVERY_UPDATED: 'bg-purple-50 text-purple-700 border-purple-200',
  DRIVER_ASSIGNED: 'bg-teal-50 text-teal-700 border-teal-200',
  DRIVER_LOCATION: 'bg-sky-50 text-sky-700 border-sky-200',
  DRIVER_STATUS: 'bg-orange-50 text-orange-700 border-orange-200',
  DRIVER_INCIDENT: 'bg-red-50 text-red-700 border-red-200',
  ROUTE_OPTIMIZED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERIES_REASSIGNED: 'bg-amber-50 text-amber-700 border-amber-200',
};

const BlockCard: React.FC<{ block: AuditBlock; isExpanded: boolean; onToggle: () => void }> = ({
  block,
  isExpanded,
  onToggle,
}) => {
  const icon = EVENT_ICONS[block.eventType] ?? '📋';
  const colorClass = EVENT_COLORS[block.eventType] ?? 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        {/* Index badge */}
        <span className="font-mono text-xs text-gray-400 w-8 shrink-0">#{block.index}</span>

        {/* Event type */}
        <span className={`text-xs px-2 py-1 rounded-full font-medium border ${colorClass} shrink-0`}>
          {icon} {block.eventType.replace(/_/g, ' ')}
        </span>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 shrink-0">
          {new Date(block.timestamp).toLocaleString()}
        </span>

        {/* Hash preview */}
        <span className="font-mono text-xs text-gray-300 hidden lg:block truncate flex-1">
          {block.hash.slice(0, 16)}…
        </span>

        <span className="text-gray-400 ml-auto shrink-0">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
          <div className="grid grid-cols-1 gap-1 text-xs font-mono text-gray-500">
            <div>
              <span className="text-gray-400">hash:&nbsp;</span>
              <span className="break-all">{block.hash}</span>
            </div>
            <div>
              <span className="text-gray-400">prev:&nbsp;</span>
              <span className="break-all">{block.previousHash}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Payload</p>
            <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto max-h-48 overflow-y-auto">
              {JSON.stringify(block.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

const AuditPage: React.FC = () => {
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [chainLength, setChainLength] = useState(0);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'recent' | 'full'>('recent');
  const [error, setError] = useState('');

  const loadRecent = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await auditApi.getRecent(50);
      setBlocks(res.data.events);
    } catch {
      setError('Failed to load audit events.');
    } finally {
      setLoading(false);
    }
  };

  const loadFull = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await auditApi.getChain();
      // Full chain is oldest-first; reverse for display
      setBlocks([...res.data.chain].reverse());
      setChainLength(res.data.length);
    } catch {
      setError('Failed to load full chain. Admin access required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'recent') loadRecent();
    else loadFull();
  }, [viewMode]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await auditApi.verify();
      setChainValid(res.data.valid);
      setChainLength(res.data.length ?? chainLength);
    } catch {
      setChainValid(false);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>🔗</span> Blockchain Audit Ledger
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Immutable, cryptographically hash-chained record of all system events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-green-300 transition-colors"
          >
            {verifying ? '⏳ Verifying…' : '🔍 Verify Chain'}
          </button>
        </div>
      </div>

      {/* Chain status banner */}
      {chainValid !== null && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${chainValid ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          <span className="text-2xl">{chainValid ? '✅' : '❌'}</span>
          <div>
            <p className="font-semibold">
              {chainValid ? 'Chain Integrity Verified' : 'Chain Integrity FAILED'}
            </p>
            <p className="text-sm mt-0.5">
              {chainValid
                ? `All ${chainLength} blocks are valid and correctly hash-linked.`
                : 'One or more blocks have been tampered with or are incorrectly linked.'}
            </p>
          </div>
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('recent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'recent' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Recent Events
        </button>
        <button
          onClick={() => setViewMode('full')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'full' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          Full Chain (Admin)
        </button>
      </div>

      {/* Content */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No audit events found.</div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block) => (
            <BlockCard
              key={`${block.index}-${block.hash}`}
              block={block}
              isExpanded={expandedIdx === block.index}
              onToggle={() => setExpandedIdx(expandedIdx === block.index ? null : block.index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditPage;
