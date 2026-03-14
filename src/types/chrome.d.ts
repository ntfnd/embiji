/**
 * Chrome Extension API Type Declarations
 */

declare const chrome: {
  runtime: {
    getURL(path: string): string;
    getManifest(): chrome.runtime.Manifest;
    id: string;
  };
};

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const content: string;
  export default content;
}
