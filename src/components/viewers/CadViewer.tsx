import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Props {
  base64Data: string;
  filePath: string;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function getLoader(ext: string): "stl" | "obj" | "gltf" | "step" | "unknown" {
  const e = ext.toLowerCase();
  if (e === ".stl") return "stl";
  if (e === ".obj") return "obj";
  if (e === ".gltf" || e === ".glb") return "gltf";
  if (e === ".step" || e === ".stp" || e === ".iges" || e === ".igs") return "step";
  return "unknown";
}

export default function CadViewer({ base64Data, filePath }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string>("");

  const ext = filePath ? "." + filePath.split(".").pop()?.toLowerCase() : "";
  const loaderType = getLoader(ext);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.01, 1000);
    camera.position.set(0, 0, 3);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 5, 5);
    scene.add(dir);

    const grid = new THREE.GridHelper(10, 20, 0x30363d, 0x21262d);
    scene.add(grid);

    let isDragging = false;
    let lastX = 0, lastY = 0;
    let theta = 0, phi = Math.PI / 4;
    let radius = 3;
    let target = new THREE.Vector3(0, 0, 0);

    const updateCamera = () => {
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.cos(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(target);
    };

    const onMouseDown = (e: MouseEvent) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      theta -= dx * 0.01;
      phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - dy * 0.01));
      lastX = e.clientX; lastY = e.clientY;
      updateCamera();
    };
    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      radius = Math.max(0.5, Math.min(50, radius + e.deltaY * 0.005));
      updateCamera();
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const onResize = () => {
      if (!canvasRef.current || !rendererRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    updateCamera();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, camera);
      }
    };
    animate();

    setLoading(true);
    setError(null);

    const loadModel = () => {
      const buffer = base64ToArrayBuffer(base64Data);

      const onLoad = (object: any) => {
        let mesh: any = object;
        if (object.scene) mesh = object.scene;
        if (Array.isArray(mesh)) {
          mesh.forEach((child: any) => {
            child.traverse((c: any) => { if (c.isMesh) { c.material = new THREE.MeshStandardMaterial({ color: 0x58a6ff, metalness: 0.3, roughness: 0.7 }); } });
          });
        } else {
          mesh.traverse((c: any) => { if (c.isMesh) { c.material = new THREE.MeshStandardMaterial({ color: 0x58a6ff, metalness: 0.3, roughness: 0.7 }); } });
        }
        scene.add(mesh);
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3()).length();
        radius = Math.max(1, size * 1.5);
        updateCamera();
        const vertCount = mesh.geometry ? mesh.geometry.attributes.position.count : 0;
        setInfo(`${vertCount.toLocaleString()} vertices`);
        setLoading(false);
      };

      if (loaderType === "stl") {
        const loader = new STLLoader();
        const geo = loader.parse(buffer);
        const mat = new THREE.MeshStandardMaterial({ color: 0x58a6ff, metalness: 0.3, roughness: 0.7 });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3()).length();
        radius = Math.max(1, size * 1.5);
        updateCamera();
        setInfo(`${(geo.attributes.position.count).toLocaleString()} vertices`);
        setLoading(false);
      } else if (loaderType === "obj") {
        const loader = new OBJLoader();
        const obj = loader.parse(new TextDecoder().decode(buffer));
        onLoad(obj);
      } else if (loaderType === "gltf") {
        const loader = new GLTFLoader();
        loader.parse(buffer, "", onLoad);
      } else {
        setError(`不支持的格式: ${ext}`);
        setLoading(false);
      }
    };

    if (loaderType === "step") {
      import("occt-import-js").then(({ readStep }) => {
        try {
          const raw = base64ToArrayBuffer(base64Data);
          const result = readStep(raw);
          if (result && result.meshes && result.meshes.length > 0) {
            result.meshes.forEach((meshData: any) => {
              const geo = new THREE.BufferGeometry();
              geo.setAttribute("position", new THREE.Float32BufferAttribute(meshData.positions, 3));
              if (meshData.normals) geo.setAttribute("normal", new THREE.Float32BufferAttribute(meshData.normals, 3));
              geo.computeVertexNormals();
              const mat = new THREE.MeshStandardMaterial({ color: 0x58a6ff, metalness: 0.3, roughness: 0.7 });
              const mesh = new THREE.Mesh(geo, mat);
              scene.add(mesh);
            });
            const box = new THREE.Box3().setFromObject(scene);
            const size = box.getSize(new THREE.Vector3()).length();
            radius = Math.max(1, size * 1.5);
            updateCamera();
            setInfo(`${result.meshes.length} mesh(es)`);
            setLoading(false);
          } else {
            setError("STEP 文件解析结果为空");
            setLoading(false);
          }
        } catch (e: any) {
          setError("STEP 解析失败: " + e.message);
          setLoading(false);
        }
      }).catch(() => {
        setError("STEP 加载器未就绪");
        setLoading(false);
      });
    } else {
      loadModel();
    }

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [base64Data, ext, loaderType]);

  return (
    <div className="flex flex-col h-full rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0" style={{ borderColor: "var(--border-muted)", background: "var(--bg-surface)" }}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>3D 预览</span>
          {info && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>{info}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>拖拽旋转 · 滚轮缩放</span>
        </div>
      </div>
      <div className="flex-1 relative min-h-0">
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(13,17,23,0.7)" }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>加载 3D 模型…</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[13px]" style={{ color: "var(--error)" }}>{error}</p>
              <button
                onClick={() => window.electronAPI.openInSystem(filePath)}
                className="mt-3 px-4 py-1.5 rounded text-[12px] font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                用系统程序打开
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

