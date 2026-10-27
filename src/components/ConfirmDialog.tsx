import React from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

/** Standard consequential-action dialog with impact copy and danger styling. */
export function ConfirmDialog({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Dialog
      visible={visible}
      onClose={loading ? () => undefined : onClose}
      title={title}
      description={description}
      actions={
        <>
          <Button variant="secondary" onPress={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onPress={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
