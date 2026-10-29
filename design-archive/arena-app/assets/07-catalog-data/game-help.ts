export type GameHelp = {
  readonly schemaVersion: "eslams.game.help.v1";
  readonly objective: string;
  readonly turnRules: readonly string[];
  readonly legalActionSummary: string;
  readonly scoringSummary: string;
  readonly winLossDrawSummary: string;
  readonly hiddenInfoSummary?: string | null;
  readonly firstMoveTip?: string | null;
  readonly exampleActions: readonly {
    readonly token: string;
    readonly label: string;
    readonly explanation: string;
  }[];
  readonly detailSections?: readonly {
    readonly title: string;
    readonly body: string;
  }[];
};
