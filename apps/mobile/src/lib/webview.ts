// react-native-webview 14.0.1 types declare `WebView<P = undefined>` with props `WebViewProps & P`,
// which collapses to `never` under strict mode. Pin P to `object` so props type-check (SDK 58 upgrade).
import { WebView as RNWebView } from "react-native-webview";

export const WebView = RNWebView<object>;
// eslint-disable-next-line @typescript-eslint/no-redeclare -- value + type of the same name, like a class
export type WebView = RNWebView<object>;
export type { WebViewMessageEvent } from "react-native-webview";
