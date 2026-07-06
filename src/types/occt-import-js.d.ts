declare module "occt-import-js" {
  interface MeshData {
    positions: Float32Array;
    normals?: Float32Array;
    indices?: Uint32Array | Uint16Array;
  }

  interface ReadStepResult {
    meshes: MeshData[];
  }

  export function readStep(data: ArrayBuffer): ReadStepResult;
  export function readIges(data: ArrayBuffer): ReadStepResult;
}
