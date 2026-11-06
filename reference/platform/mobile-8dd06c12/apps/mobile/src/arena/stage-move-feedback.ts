export type StageMoveFeedbackObservation = Readonly<{
  moveNumber: number;
  sessionId: string;
}>;

/**
 * Emits one presentation beat when an already-baselined session advances.
 * Initial hydration, duplicate polling snapshots, and stale reconnect snapshots stay silent.
 */
export class StageMoveFeedbackTransition {
  private baseline: StageMoveFeedbackObservation | null = null;

  observe(observation: StageMoveFeedbackObservation): boolean {
    if (!Number.isSafeInteger(observation.moveNumber) || observation.moveNumber < 0 || !observation.sessionId) {
      return false;
    }
    if (!this.baseline || this.baseline.sessionId !== observation.sessionId) {
      this.baseline = Object.freeze({ ...observation });
      return false;
    }
    if (observation.moveNumber <= this.baseline.moveNumber) return false;
    this.baseline = Object.freeze({ ...observation });
    return true;
  }
}
