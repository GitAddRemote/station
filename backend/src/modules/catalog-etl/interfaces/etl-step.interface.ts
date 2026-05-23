export interface EtlStepContext {
  runId: string;
}

export interface EtlStep {
  readonly name: string;
  execute(context: EtlStepContext): Promise<void>;
}
