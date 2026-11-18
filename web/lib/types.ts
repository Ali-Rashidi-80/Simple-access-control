export type Language = "fa" | "en";

export type ThemeMode = "neon" | "matrix" | "light";

export type OpenCommandResult = "sent" | "cooldown" | "disconnected";

export interface SessionUser {
  id: number | string;
  username: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  clearanceLevel?: number;
  avatar?: string | null;
  lastLogin?: string | null;
  isActive?: boolean;
  isOnline?: boolean;
}

export interface DoorUser {
  id: number;
  name: string;
  role: string;
  rfid_tag: string;
  avatar_url?: string | null;
  created_at?: string;
  is_active?: boolean;
  expires_at?: string | null;
  has_pin?: boolean;
}

export interface AccessLog {
  id: number;
  user_name: string;
  action: string;
  timestamp: string;
  is_duress: boolean;
  temperature: number | null;
  rfid_tag?: string | null;
  avatar_url?: string | null;
}

export interface LogsStats {
  success: number;
  error: number;
  pending: number;
  all: number;
  [key: string]: number;
}

export interface LogsResponse {
  logs: AccessLog[];
  total: number;
  stats: LogsStats;
}

export interface OperatorUser {
  id: number;
  username: string;
  fullName?: string;
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  clearanceLevel?: number;
  clearance_level?: number;
  isActive?: boolean;
  is_active?: boolean;
  lastLogin?: string | null;
}

export interface TemporaryPin {
  id: number;
  label: string | null;
  expires_at: string;
  uses_remaining: number;
  created_by?: number;
  created_at?: string | null;
}

export interface TempPinCreateResponse {
  id: number;
  pin: string;
  expires_at: string;
  uses_remaining: number;
  sms_sent?: boolean;
}

export interface SettingsResponse {
  settings: Record<string, string>;
}

export interface OtpSendResponse {
  success: boolean;
  message: string;
  phone_masked?: string;
  expires_in?: number;
}

export type TranslationKey =
  | "appName"
  | "doorControl"
  | "login"
  | "logout"
  | "username"
  | "password"
  | "showPassword"
  | "hidePassword"
  | "passwordLoginTab"
  | "otpLoginTab"
  | "phone"
  | "phonePlaceholder"
  | "sendOtp"
  | "resendOtp"
  | "otpCode"
  | "verifyOtp"
  | "otpSentTo"
  | "otpExpiresIn"
  | "secondsShort"
  | "changePhone"
  | "loginDescription"
  | "cookieAuthHint"
  | "dashboard"
  | "users"
  | "logs"
  | "settings"
  | "profile"
  | "operators"
  | "temporaryPins"
  | "save"
  | "cancel"
  | "confirm"
  | "close"
  | "delete"
  | "edit"
  | "reset"
  | "search"
  | "filter"
  | "loading"
  | "noResults"
  | "error"
  | "success"
  | "retry"
  | "unexpectedError"
  | "unexpectedErrorDesc"
  | "backendUnavailable"
  | "dismiss"
  | "copy"
  | "copied"
  | "menu"
  | "quickTheme"
  | "connected"
  | "offline"
  | "websocketStatus"
  | "hardwareStatus"
  | "hardwareOnline"
  | "hardwareOffline"
  | "temperature"
  | "ping"
  | "accessLogs"
  | "recentActivity"
  | "pressAndHold"
  | "remoteOpenPrompt"
  | "unlockCommandSent"
  | "unlockCooldown"
  | "unlockDisconnected"
  | "unknown"
  | "unknownRfidDetected"
  | "registerTag"
  | "accessGranted"
  | "accessDenied"
  | "duressAlert"
  | "authorizedUsers"
  | "addUser"
  | "editUser"
  | "deleteUserConfirm"
  | "userCreated"
  | "userUpdated"
  | "userDeleted"
  | "fullName"
  | "role"
  | "standardUser"
  | "operator"
  | "guest"
  | "systemAdmin"
  | "rfidTag"
  | "pin"
  | "pinOptional"
  | "pinValidationError"
  | "setPin"
  | "clearPin"
  | "pinSaved"
  | "pinCleared"
  | "pinConfigured"
  | "noPin"
  | "managePin"
  | "expiresAt"
  | "noExpiry"
  | "status"
  | "active"
  | "inactive"
  | "all"
  | "searchUsersPlaceholder"
  | "totalLogs"
  | "grantedCount"
  | "deniedCount"
  | "pendingCount"
  | "searchLogsPlaceholder"
  | "startsAt"
  | "endsAt"
  | "exportCsv"
  | "exportSuccess"
  | "timestamp"
  | "previousPage"
  | "nextPage"
  | "pageOf"
  | "createOperator"
  | "editOperator"
  | "deactivateOperator"
  | "deactivateOperatorConfirm"
  | "operatorCreated"
  | "operatorUpdated"
  | "operatorDeactivated"
  | "cannotDeactivateSelf"
  | "adminOnlyNotice"
  | "passwordResetOptional"
  | "email"
  | "clearanceLevel"
  | "createTempPin"
  | "pinCreatedOnce"
  | "label"
  | "ttlHours"
  | "maxUses"
  | "phoneOptional"
  | "sendSms"
  | "smsSentBadge"
  | "smsNotSentBadge"
  | "usesRemaining"
  | "expired"
  | "revokePin"
  | "revokePinConfirm"
  | "pinRevoked"
  | "systemSettings"
  | "autoLockTimeout"
  | "tehranTimezoneNote"
  | "startTime"
  | "endTime"
  | "requirePinWithRfid"
  | "requirePinWithRfidDesc"
  | "theme"
  | "neon"
  | "matrix"
  | "light"
  | "language"
  | "unlockTimer"
  | "duressSettings"
  | "duressMode"
  | "duressModeDesc"
  | "duressRfid"
  | "duressRfidPlaceholder"
  | "duressPin"
  | "duressPinPlaceholder"
  | "duressPinConfigured"
  | "duressPinHint"
  | "clearDuressPin"
  | "alertPhone"
  | "alertPhonePlaceholder"
  | "readOnlySettingsNotice"
  | "saveChanges"
  | "settingsSaved"
  | "uploadAvatar"
  | "avatarRequirements"
  | "avatarTooLarge"
  | "avatarInvalidType"
  | "avatarUpdated"
  | "profileUpdated"
  | "currentPassword"
  | "newPassword"
  | "confirmPassword"
  | "passwordsDoNotMatch"
  | "passwordTooShort"
  | "currentPasswordRequired";
