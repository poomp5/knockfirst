// Push notifications (A9/B5). Native FCM device token → families/{f}.pushTokens (guardian role)
// or families/{f}.ownerPushTokens (grandma role, update 05). Server sends via firebase-admin.
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { router, type Href } from "expo-router";
import {
  PUSH_CHANNEL_DEFAULT,
  PUSH_CHANNEL_LIVE,
  PUSH_CHANNEL_RING,
  PUSH_CHANNEL_UPDATES,
  PUSH_CHANNEL_URGENT,
} from "./contract";
import { registerPushToken } from "./actions";
import { USE_MOCKS } from "./firebase";
import { getDeviceRole } from "./role";

// Field names per expo-notifications 57 types (shouldShowAlert is deprecated).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let lastPushToken: string | null = null;
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function ensureChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_DEFAULT, {
    name: "สายแปลกรอตรวจสอบ",
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_URGENT, {
    name: "สายด่วน",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 200, 300],
  });
  // contract v2: "someone is calling now" + silent result updates (server tags by callId so they replace each other)
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_LIVE, {
    name: "สายแปลกกำลังโทรเข้า",
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_UPDATES, {
    name: "ผลการกรองสาย",
    importance: Notifications.AndroidImportance.LOW,
  });
  // contract v3: grandma's phone ringing for a known caller. Android channel settings are fixed once created,
  // so these must be right the first time. No `sound` key → system default sound, played with ringtone usage.
  // bypassDnd only takes effect if the user grants DND access; harmless otherwise.
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_RING, {
    name: "สายจากคนรู้จัก (เรียกเข้า)",
    description: "เสียงเรียกเข้าเมื่อคนที่ลูกหลานอนุญาตไว้โทรหาคุณ",
    importance: Notifications.AndroidImportance.MAX,
    enableVibrate: true,
    vibrationPattern: [0, 1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  });
}

/**
 * Creates the Android channels, asks permission, gets the native FCM token and saves it on the family doc
 * in the array that matches the device role. Does nothing until a role is chosen (first-launch chooser).
 * Call again whenever the role changes (root layout does this).
 */
export async function registerForPush(): Promise<string | null> {
  try {
    await ensureChannels();
  } catch (e) {
    console.warn("[push] channel setup failed", e);
  }
  if (Platform.OS !== "android" || !Device.isDevice) return null;
  // Remote push is not available in Expo Go on Android (SDK 53+); local notifications still work.
  if (IS_EXPO_GO) return null;
  const role = getDeviceRole();
  if (!role || role === "caller") return null; // the stranger phone gets no family pushes
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return null;
    const token = (await Notifications.getDevicePushTokenAsync()).data as string; // native FCM token (needs google-services.json)
    lastPushToken = token;
    await registerPushToken(token, role);
    return token;
  } catch (e) {
    console.warn("[push] token failed", e);
    return null;
  }
}

export async function getPushPermission(): Promise<"granted" | "denied" | "undetermined"> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
  } catch {
    return "undetermined";
  }
}

/** Asks for permission; on grant also (re)registers the push token. */
export async function requestPushPermission(): Promise<boolean> {
  try {
    await ensureChannels();
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return false;
    registerForPush().catch(() => {});
    return true;
  } catch (e) {
    console.warn("[push] permission request failed", e);
    return false;
  }
}

/** Local notification in 2 s on the screened-calls channel (proves channel + icon without the server). */
export async function scheduleTestNotification(): Promise<void> {
  await ensureChannels();
  const perm = await getPushPermission();
  if (perm !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "ทดสอบ: มีสายแปลกรอตรวจสอบ",
      body: "การแจ้งเตือนทำงานปกติ ระบบ KnockFirst พร้อมปกป้องแล้ว",
      // In mock mode tapping opens a sample call; in live mode there is no callId, so it just opens the app.
      data: USE_MOCKS ? { type: "screened_call", callId: "mock_police", urgent: "0" } : { type: "test" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: PUSH_CHANNEL_DEFAULT,
    },
  });
}

export function getLastPushToken(): string | null {
  return lastPushToken;
}

// ---------- Tap → call detail (or ringing screen for owner_ring) ----------

const handledResponses = new Set<string>();

function navigateToCall(callId: string, ring: boolean, attempt = 0) {
  const id = encodeURIComponent(callId);
  try {
    router.push((ring ? `/ring/${id}` : `/call/${id}`) as Href);
  } catch (e) {
    // Root navigator may not be mounted yet on cold start (e.g. still on the sign-in loader) → retry.
    if (attempt < 20) setTimeout(() => navigateToCall(callId, ring, attempt + 1), 250);
    else console.warn("[push] could not open call", callId, e);
  }
}

function handleResponse(r: Notifications.NotificationResponse | null) {
  if (!r) return;
  const req = r.notification.request;
  if (handledResponses.has(req.identifier)) return;
  const data = req.content.data as Record<string, unknown> | null | undefined;
  const callId = data?.callId;
  if (typeof callId !== "string" || !callId) return;
  handledResponses.add(req.identifier);
  navigateToCall(callId, data?.type === "owner_ring");
}

/** Call once in the root layout: routes notification taps (incl. cold start) to /call/[id] or /ring/[id] (owner_ring). */
export function useNotificationRouting(): void {
  useEffect(() => {
    let active = true;
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (active) setTimeout(() => handleResponse(r), 0);
      })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
}
