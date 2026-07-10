// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../../i18n";
import CadViewer from "./CadViewer";

// Stub three + occt-import-js so the heavy bundle never loads in jsdom.
vi.mock("three", () => ({
  Scene: class { background = null; add() {} traverse() {} },
  PerspectiveCamera: class { position = { set() {} }; lookAt() {}; aspect = 1; updateProjectionMatrix() {} },
  WebGLRenderer: class { setSize() {}; setPixelRatio() {}; render() {}; dispose() {} },
  AmbientLight: class {},
  DirectionalLight: class { position = { set() {} }; },
  GridHelper: class {},
  Color: class {},
  Box3: class { setFromObject() { return this; } getSize() { return { length: () => 1 }; } },
  Vector3: class { x=0; y=0; z=0; constructor() {} },
  MeshStandardMaterial: class {},
  Mesh: class { geometry: any; material: any; constructor(g: any, m: any) { this.geometry = g; this.material = m; } },
  BufferGeometry: class { setAttribute() {} computeVertexNormals() {} attributes = { position: { count: 0 } }; },
  Float32BufferAttribute: class {},
  CanvasTexture: class {},
  SRGBColorSpace: "",
  DoubleSide: 0,
  Group: class { add() {} traverse() {} children = []; },
}));

vi.mock("three/examples/jsm/loaders/STLLoader.js", () => ({
  STLLoader: class {
    parse() {
      return { attributes: { position: { count: 4 } } };
    }
  },
}));
vi.mock("three/examples/jsm/loaders/OBJLoader.js", () => ({
  OBJLoader: class { parse() { return { children: [] }; } },
}));
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    parse(_b: any, _p: any, cb: any) {
      cb({ scene: { children: [], traverse() {} } });
    }
  },
}));
vi.mock("occt-import-js", () => ({
  readStep: () => ({ meshes: [{ positions: [], normals: [] }] }),
}));

beforeEach(() => {
  try {
    window.localStorage.setItem("openme.lang", "en");
  } catch {
    // ignore
  }
  (window as any).electronAPI = {
    openInSystem: vi.fn(),
  };
  // Stub WebGL canvas context
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as any;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCad(props: Parameters<typeof CadViewer>[0]) {
  return render(
    <I18nProvider>
      <CadViewer {...props} />
    </I18nProvider>
  );
}

describe("CadViewer polish", () => {
  it("renders header with kicker label", async () => {
    renderCad({ base64Data: "", filePath: "/tmp/cube.stl" });
    expect(screen.getByText("3D preview")).toBeTruthy();
  });

  it("renders canvas with role=img and aria-label", async () => {
    renderCad({ base64Data: "", filePath: "/tmp/cube.stl" });
    const canvas = document.querySelector('[role="img"][aria-label="3D preview canvas"]');
    expect(canvas).toBeTruthy();
  });

  it("shows loading overlay with aria-label", async () => {
      renderCad({ base64Data: "", filePath: "/tmp/cube.step" });
      // step path runs dynamic import; loading overlay should be present
      expect(screen.getByLabelText("Loading model")).toBeTruthy();
      expect(screen.getByText("Loading 3D model…")).toBeTruthy();
      await waitFor(() => {
        // occt-import-js mock returns empty meshes so loading ends in error
        expect(screen.queryByLabelText("Loading model")).toBeNull();
      });
    });

  it("hides loading overlay once STL parsed", async () => {
    renderCad({ base64Data: "", filePath: "/tmp/cube.stl" });
    await waitFor(() => {
      expect(screen.queryByLabelText("Loading model")).toBeNull();
    });
    // Info chip should appear with vertices count
    expect(screen.getByText("4 vertices")).toBeTruthy();
  });
});