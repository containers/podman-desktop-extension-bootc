// eslint-disable-next-line etc/no-commented-out-code
// podman-desktop-api.d.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  export interface PodmanDesktopApi {
    getState: () => any;
    postMessage: (msg: any) => void;
    setState: (newState: any) => void;
  }

  function acquirePodmanDesktopApi(): PodmanDesktopApi;
}

export { PodmanDesktopApi };
