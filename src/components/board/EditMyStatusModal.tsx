import { Modal, Loading, ErrorState } from '../ui';
import { EditMyStatusFields } from './EditMyStatusFields';
import { useMyPlayer } from '../../hooks';
import type { BossCategory, LookingForOption } from '../../types/models';

interface EditMyStatusModalProps {
  open: boolean;
  onClose: () => void;
  bossCategories: BossCategory[];
  lookingForOptions: LookingForOption[];
}

/**
 * The only place a player edits their own record from the Status Board —
 * opened from their own `PlayerCard`'s "Edit" button or the board's "Edit my
 * status" action (Section 11). `useMyPlayer` guarantees the write can only
 * ever target the signed-in caller's own document; this component never
 * accepts or forwards a target uid.
 */
export function EditMyStatusModal({
  open,
  onClose,
  bossCategories,
  lookingForOptions,
}: EditMyStatusModalProps) {
  const { player, loading, error, save, saving } = useMyPlayer();

  return (
    <Modal open={open} onClose={onClose} title="Edit my status">
      {loading ? (
        <Loading label="Loading your status…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : (
        <EditMyStatusFields
          player={player}
          bossCategories={bossCategories}
          lookingForOptions={lookingForOptions}
          onSave={save}
          saving={saving}
        />
      )}
    </Modal>
  );
}
