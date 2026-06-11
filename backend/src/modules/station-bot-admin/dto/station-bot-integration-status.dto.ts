export type StationBotAuthState =
  | 'not_configured'
  | 'token_request_failed'
  | 'scope_mismatch'
  | 'healthy';

export class StationBotIntegrationStatusDto {
  authState!: StationBotAuthState;
  configuredClientId!: string | null;
  grantedScopes!: string[] | null;
  missingScopes!: string[] | null;
  tokenExpiresAt!: Date | null;
}
