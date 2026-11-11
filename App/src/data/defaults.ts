import type { AppSettings, BlockSettings } from '@/types'

export const DEFAULT_BLOCK_SETTINGS: BlockSettings = {
  blockPrivate: true,
  blockInternational: false,
  blockNonContacts: false,
  method: 'hangup',
  notifyOnBlock: true,
  autoBlockReported: false,
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  onboardingDone: false,
  permissionsDone: false,
  language: 'vi',
  homeCountryDial: '+84',
  callerIdEnabled: true,
  showForContacts: false,
  showAfterCall: true,
  scamWarning: true,
  popupSize: 'classic',
  popupPosition: 'top',
  callAlertNotification: true,
  missedCallNotification: true,
  remindMissedCalls: false,
  dialSound: 'both',
  ringtone: 'Mặc định',
  defaultSim: 'ask',
}
