const setupActions = new Map<string, () => void>();

/** Screens register the real action behind a setup spotlight while mounted. */
export function registerSetupAction(stepId: string, action: () => void): () => void {
  setupActions.set(stepId, action);
  return () => {
    if (setupActions.get(stepId) === action) setupActions.delete(stepId);
  };
}

export function runSetupAction(stepId: string): void {
  setupActions.get(stepId)?.();
}
