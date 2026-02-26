import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetUserSettings, useSaveUserSettings } from '../hooks/useQueries';
import { useTheme } from '../hooks/useTheme';
import { GithubTokenSettings } from '../components/GithubTokenSettings';
import type { UserSettings } from '../types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  User,
  Search,
  Bell,
  Palette,
  Shield,
  Key,
  LogIn,
  Save,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

const DEFAULT_SETTINGS: UserSettings = {
  displayName: '',
  avatarUrl: '',
  defaultSearchSort: 'stars',
  defaultLanguageFilter: '',
  resultsPerPage: BigInt(10),
  notificationsEnabled: false,
  savedSearchAlertsEnabled: false,
  theme: 'system',
  profileVisibility: 'private',
  showActivityStats: true,
  compactView: false,
  showStarCount: true,
};

interface FormState {
  displayName: string;
  avatarUrl: string;
  defaultSearchSort: string;
  defaultLanguageFilter: string;
  resultsPerPage: number;
  notificationsEnabled: boolean;
  savedSearchAlertsEnabled: boolean;
  theme: string;
  profileVisibility: string;
  showActivityStats: boolean;
  compactView: boolean;
  showStarCount: boolean;
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <CardHeader className="pb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <CardTitle className="font-mono text-base">{title}</CardTitle>
          <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}

export default function SettingsPage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const isAuthenticated = !!identity;

  const { data: settings, isLoading } = useGetUserSettings();
  const saveSettings = useSaveUserSettings();
  const { setTheme } = useTheme();

  const [tokenSettingsOpen, setTokenSettingsOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    displayName: '',
    avatarUrl: '',
    defaultSearchSort: 'stars',
    defaultLanguageFilter: '',
    resultsPerPage: 10,
    notificationsEnabled: false,
    savedSearchAlertsEnabled: false,
    theme: 'system',
    profileVisibility: 'private',
    showActivityStats: true,
    compactView: false,
    showStarCount: true,
  });

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      setForm({
        displayName: settings.displayName,
        avatarUrl: settings.avatarUrl,
        defaultSearchSort: settings.defaultSearchSort,
        defaultLanguageFilter: settings.defaultLanguageFilter,
        resultsPerPage: Number(settings.resultsPerPage),
        notificationsEnabled: settings.notificationsEnabled,
        savedSearchAlertsEnabled: settings.savedSearchAlertsEnabled,
        theme: settings.theme,
        profileVisibility: settings.profileVisibility,
        showActivityStats: settings.showActivityStats,
        compactView: settings.compactView,
        showStarCount: settings.showStarCount,
      });
    }
  }, [settings]);

  const handleSave = () => {
    const payload: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      displayName: form.displayName,
      avatarUrl: form.avatarUrl,
      defaultSearchSort: form.defaultSearchSort,
      defaultLanguageFilter: form.defaultLanguageFilter,
      resultsPerPage: BigInt(form.resultsPerPage),
      notificationsEnabled: form.notificationsEnabled,
      savedSearchAlertsEnabled: form.savedSearchAlertsEnabled,
      theme: form.theme,
      profileVisibility: form.profileVisibility,
      showActivityStats: form.showActivityStats,
      compactView: form.compactView,
      showStarCount: form.showStarCount,
    };
    saveSettings.mutate(payload);
  };

  const handleThemeChange = (value: string) => {
    setForm((f) => ({ ...f, theme: value }));
    setTheme(value as 'light' | 'dark' | 'system');
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="p-4 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-mono font-bold text-2xl text-foreground mb-2">Login Required</h1>
        <p className="text-muted-foreground mb-6">You need to be logged in to access settings.</p>
        <Button onClick={() => navigate({ to: '/' })}>Go to Home</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48 bg-secondary" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full bg-secondary rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="font-mono font-bold text-xl text-foreground">
            Account <span className="text-primary">Settings</span>
          </h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveSettings.isPending}
          className="gap-2"
        >
          {saveSettings.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save All
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Display Section */}
        <Card className="bg-card border-border/60">
          <SectionHeader
            icon={User}
            title="Display"
            description="Customize how your profile appears"
          />
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-sm">Display Name</Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Your display name"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                This name is shown in your profile and dropdown.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl" className="text-sm">Avatar URL</Label>
              <Input
                id="avatarUrl"
                value={form.avatarUrl}
                onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                placeholder="https://example.com/avatar.png"
                className="font-mono text-sm"
              />
              {form.avatarUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={form.avatarUrl}
                    alt="Avatar preview"
                    className="w-10 h-10 rounded-full border border-border object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Search Preferences */}
        <Card className="bg-card border-border/60">
          <SectionHeader
            icon={Search}
            title="Search Preferences"
            description="Set your default search behavior"
          />
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Default Sort</Label>
              <Select
                value={form.defaultSearchSort}
                onValueChange={(v) => setForm((f) => ({ ...f, defaultSearchSort: v }))}
              >
                <SelectTrigger className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stars">Stars</SelectItem>
                  <SelectItem value="forks">Forks</SelectItem>
                  <SelectItem value="updated">Recently Updated</SelectItem>
                  <SelectItem value="best-match">Best Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultLanguage" className="text-sm">Default Language Filter</Label>
              <Input
                id="defaultLanguage"
                value={form.defaultLanguageFilter}
                onChange={(e) => setForm((f) => ({ ...f, defaultLanguageFilter: e.target.value }))}
                placeholder="e.g. TypeScript, Python, Rust"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resultsPerPage" className="text-sm">Results Per Page</Label>
              <Select
                value={String(form.resultsPerPage)}
                onValueChange={(v) => setForm((f) => ({ ...f, resultsPerPage: Number(v) }))}
              >
                <SelectTrigger className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Show Star Count</Label>
                <p className="text-xs text-muted-foreground">Display star counts on repository cards</p>
              </div>
              <Switch
                checked={form.showStarCount}
                onCheckedChange={(v) => setForm((f) => ({ ...f, showStarCount: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border/60">
          <SectionHeader
            icon={Bell}
            title="Notifications"
            description="Control your notification preferences"
          />
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Enable Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive in-app notifications</p>
              </div>
              <Switch
                checked={form.notificationsEnabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, notificationsEnabled: v }))}
              />
            </div>
            <Separator className="bg-border/50" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Saved Search Alerts</Label>
                <p className="text-xs text-muted-foreground">Get notified when new repos match saved searches</p>
              </div>
              <Switch
                checked={form.savedSearchAlertsEnabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, savedSearchAlertsEnabled: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="bg-card border-border/60">
          <SectionHeader
            icon={Palette}
            title="Appearance"
            description="Customize the look and feel of the app"
          />
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleThemeChange(value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                      form.theme === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Separator className="bg-border/50" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Compact View</Label>
                <p className="text-xs text-muted-foreground">Show more repos with reduced spacing</p>
              </div>
              <Switch
                checked={form.compactView}
                onCheckedChange={(v) => setForm((f) => ({ ...f, compactView: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="bg-card border-border/60">
          <SectionHeader
            icon={Shield}
            title="Privacy"
            description="Control your profile visibility and data sharing"
          />
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Profile Visibility</Label>
              <Select
                value={form.profileVisibility}
                onValueChange={(v) => setForm((f) => ({ ...f, profileVisibility: v }))}
              >
                <SelectTrigger className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private — Only you can see your profile</SelectItem>
                  <SelectItem value="public">Public — Anyone can view your profile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator className="bg-border/50" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Show Activity Stats</Label>
                <p className="text-xs text-muted-foreground">Display your activity stats on your profile</p>
              </div>
              <Switch
                checked={form.showActivityStats}
                onCheckedChange={(v) => setForm((f) => ({ ...f, showActivityStats: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* GitHub Token */}
        <Card className="bg-card border-border/60">
          <SectionHeader
            icon={Key}
            title="GitHub Integration"
            description="Manage your GitHub Personal Access Token for forking and committing"
          />
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setTokenSettingsOpen(true)}
              className="gap-2"
            >
              <Key className="w-4 h-4" />
              Manage GitHub Token
            </Button>
          </CardContent>
        </Card>

        {/* Save button (bottom) */}
        <div className="flex justify-end pt-2 pb-4">
          <Button
            onClick={handleSave}
            disabled={saveSettings.isPending}
            size="lg"
            className="gap-2 min-w-[140px]"
          >
            {saveSettings.isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      <GithubTokenSettings
        open={tokenSettingsOpen}
        onClose={() => setTokenSettingsOpen(false)}
      />
    </div>
  );
}
