import { useAuth } from '../contexts/AuthContext';
import { useAlliance } from '../contexts/AllianceContext';
import { useMyPlayer } from '../hooks';
import { Card, Loading, ErrorState, EmptyState } from '../components/ui';
import { EditMyStatusFields } from '../components/board';

/**
 * The dedicated, non-modal home for editing your own record — same fields,
 * validation, and save path as `EditMyStatusModal` (both render
 * `EditMyStatusFields`), just without the dialog chrome, for anyone who'd
 * rather land on a full page than open a modal from the board.
 */
export function Profile() {
  const { user, loading: authLoading, firebaseReady } = useAuth();
  const { alliance, loading: allianceLoading, error: allianceError } = useAlliance();
  const { player, loading: playerLoading, error: playerError, save, saving } = useMyPlayer();

  const header = (
    <div>
      <h1 className="font-display text-2xl text-ash-50">Your Profile</h1>
      <p className="mt-1 text-sm text-ash-400">
        Manage your own IGN, status, capability, and tags — this page only ever edits your own
        record.
      </p>
    </div>
  );

  if (!firebaseReady) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          title="Profile not configured"
          message="This deployment doesn't have a Firebase project connected yet, so there's no profile to edit."
        />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Loading label="Signing you in…" />
      </div>
    );
  }

  if (!user?.allianceId) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="No alliance joined yet"
          message="Join your alliance with its code before setting your status."
        />
      </div>
    );
  }

  if (allianceLoading || playerLoading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Loading label="Loading your profile…" />
      </div>
    );
  }

  if (allianceError || playerError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          message={allianceError ?? playerError ?? 'Could not load your profile. Please try again.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <Card className="max-w-lg">
        <EditMyStatusFields
          player={player}
          bossCategories={alliance?.bossCategories ?? []}
          lookingForOptions={alliance?.lookingForOptions ?? []}
          onSave={save}
          saving={saving}
        />
      </Card>
    </div>
  );
}
