export enum SystemPermission {
  CAN_VIEW_STATION_BOT_OPERATOR_CONSOLE = 'can_view_station_bot_operator_console',
  CAN_MANAGE_STATION_BOT_EXEC_HANGAR = 'can_manage_station_bot_exec_hangar',
  CAN_MANAGE_STATION_BOT_STATION_TIMER = 'can_manage_station_bot_station_timer',
  CAN_MANAGE_STATION_BOT_RUNTIME = 'can_manage_station_bot_runtime',
  CAN_IMPERSONATE_STATION_BOT_GUILD_ADMIN = 'can_impersonate_station_bot_guild_admin',
  CAN_EMERGENCY_REASSIGN_STATION_BOT_GUILD_OWNER = 'can_emergency_reassign_station_bot_guild_owner',
}

export const ALL_SYSTEM_PERMISSIONS: readonly SystemPermission[] =
  Object.values(SystemPermission);
