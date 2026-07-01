// Shim for the bare `import 'WebSdk'` used inside @digitalpersona/devices.
// The real implementation is the global `window.WebSdk` provided by the
// <script src="/vendor/websdk.client.ui.min.js"> tag in index.html. This empty
// module only exists so the bundler can resolve the side-effect import; the
// library reads the global `WebSdk` object at runtime.
export {};
