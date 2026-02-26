import React, { useState } from 'react';
import { User, Terminal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSaveCallerUserProfile } from '../hooks/useQueries';

interface ProfileSetupModalProps {
  open: boolean;
  onComplete: () => void;
}

export default function ProfileSetupModal({ open, onComplete }: ProfileSetupModalProps) {
  const [name, setName] = useState('');
  const saveMutation = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await saveMutation.mutateAsync({ name: name.trim() });
    onComplete();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="bg-card border-border max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-primary" />
            <DialogTitle className="font-mono text-foreground">Initialize Profile</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-sm">
            Welcome to RepoRadar. Enter your name to get started.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Display Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="e.g. dev_wizard"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 font-mono bg-secondary/50 border-border focus:border-primary"
                autoFocus
                maxLength={50}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={!name.trim() || saveMutation.isPending}
            className="w-full font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon"
          >
            {saveMutation.isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              '> Initialize'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
