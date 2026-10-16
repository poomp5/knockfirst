// Live calls run inside a web view of the web demo, because Expo Go has no native WebRTC. The view sits
// full-size but invisible behind the native call UI (iOS mutes the mic of a hidden or tiny web view).
// Shared by grandma's ring screen and the stranger phone.
import { setAudioModeAsync } from "expo-audio";

export const WEB_DEMO_URL = "https://knockfirst.pranakorn.co.th/";

/** Runs before the page loads: makes it transparent and invisible, and keeps every mic stream it opens (for Mute). */
export const WEB_PRELOAD = `(function () { try {
  var css = document.createElement("style");
  css.textContent = "html,body{background:transparent!important} body *{visibility:hidden!important}";
  (document.head || document.documentElement).appendChild(css);
  window.__kfStreams = [];
  var md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    var g = md.getUserMedia.bind(md);
    md.getUserMedia = function (c) { return g(c).then(function (s) { window.__kfStreams.push(s); return s; }); };
  }
} catch (e) {} })(); true;`;

export const muteJs = (muted: boolean) =>
  `(window.__kfStreams || []).forEach(function (s) { s.getAudioTracks().forEach(function (t) { t.enabled = ${!muted}; }); }); true;`;

/** Props every call web view needs: autoplay, inline audio, mic granted without a second prompt, no touches. */
export const CALL_WEBVIEW_PROPS = {
  mediaPlaybackRequiresUserAction: false,
  allowsInlineMediaPlayback: true,
  mediaCapturePermissionGrantType: "grant",
  pointerEvents: "none",
} as const;

/**
 * Earpiece by default (a wired/Bluetooth headset takes over automatically); Speaker switches to the loudspeaker.
 * Only call this before the mic starts or on a Speaker tap: switching the session while the mic is live can silence it.
 */
export function setCallRoute(speaker: boolean) {
  setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
    shouldRouteThroughEarpiece: !speaker,
    interruptionMode: "doNotMix",
  }).catch((e: unknown) => console.warn("[call] audio route", e));
}

export function resetAudioRoute() {
  setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
}
