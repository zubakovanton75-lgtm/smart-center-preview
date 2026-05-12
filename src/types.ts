export interface ImageFile {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
}

export interface Format {
  id: string;
  label: string;
  ratio: number;
  dims: string;
}
