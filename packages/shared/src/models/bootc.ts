export interface BootcBuildInfo {
  name: string;
  tag: string;
  engineId: string;
  type: string;
  folder: string;
  arch: string;
  status?: BootcBuildStatus;
  timestamp?: string;
  buildContainerId?: string; // The image ID that is used to build the image
}

export type BootcBuildStatus = 'running' | 'creating' | 'success' | 'error' | 'lost' | 'deleting';
