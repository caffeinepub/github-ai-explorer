import React from 'react';
import { Settings2, Sun, Moon, Palette, Type } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { TerminalSettings as TSettings, TerminalTheme, FontSize } from '../../hooks/useTerminalState';

interface TerminalSettingsProps {
  settings: TSettings;
  onUpdate: (partial: Partial<TSettings>) => void;
}

const THEMES: { value: TerminalTheme; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Dark (Dracula)', icon: <Moon className="w-3.5 h-3.5" /> },
  { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
  { value: 'solarized', label: 'Solarized', icon: <Palette className="w-3.5 h-3.5" /> },
];

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'Small (12px)' },
  { value: 'md', label: 'Medium (14px)' },
  { value: 'lg', label: 'Large (16px)' },
];

export function TerminalSettingsMenu({ settings, onUpdate }: TerminalSettingsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10">
          <Settings2 className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 font-mono text-xs bg-[#1a1a2e] border-white/10">
        <DropdownMenuLabel className="text-white/50 text-[10px] uppercase tracking-wider">Theme</DropdownMenuLabel>
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => onUpdate({ theme: t.value })}
            className={`gap-2 cursor-pointer ${settings.theme === t.value ? 'text-neon-green' : 'text-white/70'}`}
          >
            {t.icon}
            {t.label}
            {settings.theme === t.value && <span className="ml-auto text-neon-green">✓</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuLabel className="text-white/50 text-[10px] uppercase tracking-wider flex items-center gap-1">
          <Type className="w-3 h-3" /> Font Size
        </DropdownMenuLabel>
        {FONT_SIZES.map((f) => (
          <DropdownMenuItem
            key={f.value}
            onClick={() => onUpdate({ fontSize: f.value })}
            className={`gap-2 cursor-pointer ${settings.fontSize === f.value ? 'text-neon-green' : 'text-white/70'}`}
          >
            {f.label}
            {settings.fontSize === f.value && <span className="ml-auto text-neon-green">✓</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={() => onUpdate({ showTimestamps: !settings.showTimestamps })}
          className="gap-2 cursor-pointer text-white/70"
        >
          Timestamps: {settings.showTimestamps ? 'On' : 'Off'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
