import React from 'react';
import { Wifi, WifiOff, Loader2, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from '@tanstack/react-router';
import type { BridgeStatus } from '../../hooks/useBridgeStatus';

interface BridgeStatusIndicatorProps {
  status: BridgeStatus;
  lastChecked: Date | null;
}

export function BridgeStatusIndicator({ status, lastChecked }: BridgeStatusIndicatorProps) {
  const navigate = useNavigate();

  const config = {
    connected: {
      icon: <Wifi className="w-3.5 h-3.5" />,
      label: 'Connected',
      color: 'text-green-400',
      dot: 'bg-green-400',
      tip: `Bridge connected${lastChecked ? ` · ${lastChecked.toLocaleTimeString()}` : ''}`,
    },
    disconnected: {
      icon: <WifiOff className="w-3.5 h-3.5" />,
      label: 'Disconnected',
      color: 'text-red-400',
      dot: 'bg-red-400',
      tip: 'Bridge not running. Click to set up.',
    },
    connecting: {
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      label: 'Connecting',
      color: 'text-yellow-400',
      dot: 'bg-yellow-400',
      tip: 'Checking bridge connection...',
    },
  }[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => {
            if (status === 'disconnected') {
              navigate({ to: '/bridge-setup' });
            }
          }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors ${config.color} hover:bg-white/5`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${config.dot} ${
              status === 'connecting' ? 'animate-pulse' : ''
            }`}
          />
          {config.icon}
          <span className="hidden sm:inline">{config.label}</span>
          {status === 'disconnected' && <ExternalLink className="w-3 h-3 opacity-60" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="font-mono text-xs">
        {config.tip}
      </TooltipContent>
    </Tooltip>
  );
}
