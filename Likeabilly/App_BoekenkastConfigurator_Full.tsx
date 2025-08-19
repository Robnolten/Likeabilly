import React, { useState, useRef, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";

// ErrorBoundary-component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("3D Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) return <div>Fout in 3D-weergave.</div>;
    return this.props.children;
  }
}

// Component voor outlines
const BoxWithOutline = ({ position, args, color }: { position: [number, number, number]; args: [number, number, number]; color: string }) => {
  const geometry = useMemo(() => new THREE.BoxGeometry(...args), [args]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  return (
    <group position={position}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={color} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#111" />
      </lineSegments>
    </group>
  );
};

export default function App() {

  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(180);
  const [depth, setDepth] = useState(28);
  const [shelves, setShelves] = useState(5);
  const [material, setMaterial] = useState("spaanplaat");
  const [step, setStep] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false);
  const [errorWidth, setErrorWidth] = useState("");
  const [errorHeight, setErrorHeight] = useState("");
  const [errorDepth, setErrorDepth] = useState("");
  const orbitRef = useRef<any>(null);

  const validate = (val: number, min: number, max: number) =>
    val < min || val > max ? `Waarde tussen ${min} en ${max} cm` : "";

  const handleNext = () => {
    setErrorHeight(validate(height, 30, 240));
    setErrorWidth(validate(width, 30, 90));
    setErrorDepth(validate(depth, 20, 40));
    if (step === 1 && (errorHeight || errorWidth || errorDepth)) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const prijs = useMemo(() => (width * height * depth * 0.00005).toFixed(2), [width, height, depth]);
  const shelfSpacing = height / (shelves + 1);
  const materialColor = { spaanplaat: "#c19a6b", MDF: "#8b5e3c", multiplex: "#deb887" }[material] || "#ccc";
  const verticalDividerPositions = width > 60 ? [0] : [];

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="w-full md:w-1/3 p-6 bg-gray-100 overflow-auto">
        <h2 className="text-xl font-semibold mb-4">Boekenkast configurator</h2>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" className="bg-white p-4 rounded-xl shadow mb-4">
              <h3 className="text-lg font-bold mb-2">Stap 1: Afmetingen</h3>
              <label>Hoogte (cm)</label>
              <input type="number" value={height} onChange={(e) => setHeight(+e.target.value)} className="w-full mb-2 p-2 border rounded" />
              {errorHeight && <p className="text-red-500 text-sm mb-2">{errorHeight}</p>}
              <label>Breedte (cm)</label>
              <input type="number" value={width} onChange={(e) => setWidth(+e.target.value)} className="w-full mb-2 p-2 border rounded" />
              {errorWidth && <p className="text-red-500 text-sm mb-2">{errorWidth}</p>}
              <label>Diepte (cm)</label>
              <input type="number" value={depth} onChange={(e) => setDepth(+e.target.value)} className="w-full mb-2 p-2 border rounded" />
              {errorDepth && <p className="text-red-500 text-sm mb-2">{errorDepth}</p>}
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="step2" className="bg-white p-4 rounded-xl shadow mb-4">
              <h3 className="text-lg font-bold mb-2">Stap 2: Aantal planken</h3>
              <input type="range" min={1} max={10} value={shelves} onChange={(e) => setShelves(+e.target.value)} className="w-full" />
              <p>{shelves} planken</p>
            </motion.div>
          )}
          {step === 3 && (
            <motion.div key="step3" className="bg-white p-4 rounded-xl shadow mb-4">
              <h3 className="text-lg font-bold mb-2">Stap 3: Materiaal</h3>
              {["spaanplaat", "MDF", "multiplex"].map((mat) => (
                <div key={mat} onClick={() => setMaterial(mat)} className={\`border p-3 mb-2 rounded-xl cursor-pointer \${material === mat ? "border-indigo-500 bg-indigo-50" : "border-gray-300"}\`}>
                  <p className="capitalize font-semibold">{mat}</p>
                </div>
              ))}
            </motion.div>
          )}
          {step === 4 && (
            <motion.div key="step4" className="bg-white p-4 rounded-xl shadow mb-4">
              <h3 className="text-lg font-bold mb-2">Overzicht & prijs</h3>
              <ul className="text-sm space-y-1">
                <li>Hoogte: {height} cm</li>
                <li>Breedte: {width} cm</li>
                <li>Diepte: {depth} cm</li>
                <li>Planken: {shelves}</li>
                <li>Materiaal: {material}</li>
              </ul>
              <p className="mt-4 font-bold text-lg">Geschatte prijs: €{prijs}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between mb-4">
          <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className={\`px-4 py-2 rounded bg-gray-300 \${step === 1 ? "invisible" : ""}\`}>Vorige</button>
          {step < 4 && <button onClick={handleNext} className="px-4 py-2 rounded bg-indigo-600 text-white">Volgende</button>}
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <label className="flex items-center">
            <input type="checkbox" checked={autoRotate} onChange={() => setAutoRotate(!autoRotate)} className="mr-2" />
            Auto rotate
          </label>
          <button onClick={() => orbitRef.current?.reset()} className="mt-2 px-4 py-2 rounded bg-indigo-600 text-white">Reset view</button>
        </div>
      </div>

      <div className="w-full md:w-2/3 h-full bg-gradient-to-br from-blue-200 via-pink-100 to-pink-300">
        <ErrorBoundary>
          <Canvas shadows camera={{ position: [0, height * 0.75, height * 2], fov: 50 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
            <OrbitControls
              ref={orbitRef}
              enableZoom={true}
              minDistance={height * 1.5}
              maxDistance={height * 2.5}
              enablePan={false}
              autoRotate={autoRotate}
              autoRotateSpeed={1.0}
              minPolarAngle={Math.PI / 2 - 0.087}
              maxPolarAngle={Math.PI / 2 + 0.087}
              minAzimuthAngle={-Math.PI / 2}
              maxAzimuthAngle={Math.PI / 2}
            />
            <Environment preset="sunset" />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -height * 0.4, 0]} receiveShadow>
              <planeGeometry args={[width * 3, width * 3]} />
              <meshStandardMaterial color="#e8e0d3" />
            </mesh>
            <group position={[0, height / 2 - height * 0.4, 0]}>
              <BoxWithOutline position={[0, 0, -depth / 2 - 0.5]} args={[width, height, 1]} color={materialColor} />
              <BoxWithOutline position={[-width / 2, 0, 0]} args={[1, height, depth]} color={materialColor} />
              <BoxWithOutline position={[width / 2, 0, 0]} args={[1, height, depth]} color={materialColor} />
              <BoxWithOutline position={[0, height / 2 - 0.5, 0]} args={[width, 1, depth]} color={materialColor} />
              <BoxWithOutline position={[0, -height / 2 + 0.5, 0]} args={[width, 1, depth]} color={materialColor} />
              {Array.from({ length: shelves }, (_, i) => (
                <BoxWithOutline key={`shelf-${i}`} position={[0, height / 2 - shelfSpacing * (i + 1), 0]} args={[width, 1, depth]} color={materialColor} />
              ))}
              {verticalDividerPositions.map((x, i) => (
                <BoxWithOutline key={`divider-${i}`} position={[x, 0, 0]} args={[1, height - 1, depth]} color={materialColor} />
              ))}
            </group>
          </Canvas>
        </ErrorBoundary>
      </div>
    </div>
  );
}
