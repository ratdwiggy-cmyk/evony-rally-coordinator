import { useState, type FormEvent } from 'react';
import { Button, Card, Input } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Shown when a signed-in (anonymous) user has no `allianceId` yet.
 * Collects IGN + the alliance's join code and hands both to
 * `submitJoinCode` (AuthContext). As of ADR-011, that verifies the code
 * directly against Firestore's `joinCodes` lookup collection and, on a
 * match, writes the user's profile (`users/{uid}`) and initial player
 * record — no Cloud Function involved, so this works on the Spark plan.
 * This component itself still never compares the code — that stays in
 * `firebase/firestore.ts`.
 */
export function AllianceJoinScreen() {
  const { submitJoinCode, error, clearError } = useAuth();
  const [ign, setIgn] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await submitJoinCode({ ign: ign.trim(), joinCode: joinCode.trim() });
    } catch {
      // error is already surfaced via context state
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-lg text-ash-50">Join your alliance's board</h1>
        <p className="mt-1 text-sm text-ash-400">
          Enter your in-game name and the join code your alliance shares in Discord.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            label="In-game name"
            value={ign}
            onChange={(e) => setIgn(e.target.value)}
            placeholder="e.g. RatDwiggy"
            autoComplete="off"
            required
          />
          <Input
            label="Join code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Ask your alliance leadership"
            autoComplete="off"
            required
          />
          {error && (
            <p role="alert" className="text-xs text-status-unavailable">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting || !ign.trim() || !joinCode.trim()}>
            {submitting ? 'Joining…' : 'Join alliance'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
