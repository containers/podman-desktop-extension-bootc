// Create a struct that represents:
// image information (ImageInfo)
export interface BootcBuildOptions {
  name: string;
  tag: string;
  engineId: string;
  type: string;
  folder: string;
  arch: string;
}

export interface BootcHistoryInfo {
  image: string;
  tag: string;
  type: string;
  location: string;
  arch: string;
  buildContainerId: string; // The image ID that is used to build the image
  status: BootcBuildStatus;
  timestamp: string;
  selected: boolean; // For UI purposes only, TODO: Move somewhere else
}

export type BootcBuildStatus = 'running' | 'creating' | 'success' | 'error' | 'lost' | 'deleting';
