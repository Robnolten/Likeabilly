  import React, { useState, useRef, useMemo, useEffect } from "react";
  import { Canvas } from "@react-three/fiber";
  import { OrbitControls, Environment, Cloud, Stars, Text } from "@react-three/drei";
  import { AnimatePresence, motion } from "framer-motion";
  import * as THREE from "three";
  import FixedCloud from "./components/FixedCloud";
  import { Suspense } from "react";

  // Toegevoegde media query hook voor responsieve aanpassingen
  const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
      const mediaQuery = window.matchMedia(query);
      setMatches(mediaQuery.matches);

      const handler = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }, [query]);

    return matches;
  };

  // ----------------------------------------------------------------------------
  // Helper functie: Bereken de verticale posities voor de dowelling (rijgat)boringen
  // – Start 19.8 cm vanaf de bovenkant van het kickboard (dus kickboardY + shelfThickness + 19.8)
  // – Herhaal elke 3.2 cm tot 19.8 cm vanaf de onderkant van de bovenplank (topBoardY - 19.8)
  // ----------------------------------------------------------------------------
  const computeRijgatPositions = (kickboardY: number, shelfThickness: number, topBoardY: number): number[] => {
    const positions: number[] = [];
    const bottomInterior = kickboardY + shelfThickness;
    const topInterior = topBoardY;
    const start = bottomInterior + 19.8;
    const end = topInterior - 19.8;
    if (start > end) return positions;
    for (let pos = start; pos <= end; pos += 3.2) {
      positions.push(pos);
    }
    return positions;
  };

  // ----------------------------------------------------------------------------
  // Component voor een enkele dowelling–(rijgat)boring
  // Gebruik hier een CylinderGeometry met een diameter van 4mm (0.4 cm) en een diepte van 1 cm
  // ----------------------------------------------------------------------------
  const Rijgat = ({ y, x, z }: { y: number; x: number; z: number }) => {
    const geometry = useMemo(() => new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8), []);
    return (
      <mesh geometry={geometry} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#555" />
      </mesh>
    );
  };

  // ----------------------------------------------------------------------------
  // Helper functie voor de prijsberekening (ongewijzigd)
  // ----------------------------------------------------------------------------
  const calculatePrice = ({ width, height, depth, shelves, chosenMaterial }: { width: number; height: number; depth: number; shelves: number; chosenMaterial: string; }): string => {
    let basisPrice;
    if (chosenMaterial === "spaanplaat") {
      basisPrice = 149;
    } else if (chosenMaterial === "MDF") {
      basisPrice = 199;
    } else if (chosenMaterial === "multiplex") {
      basisPrice = 249;
    } else {
      basisPrice = 149;
    }
    const extraWidthCost = width > 90 ? 200 : 0;
    const extraPlankCost = shelves > 5 ? (shelves - 5) * 35 : 0;
    const numberOfDividers = width > 80 ? Math.floor((width - 1) / 80) : 0;
    const totalCompartments = numberOfDividers > 0 ? numberOfDividers + 1 : 1;
    const dividerFixedCost = numberOfDividers * 150;
    const materialCosts = {
      spaanplaat: 20,
      MDF: 40,
      multiplex: 50,
    };
    const achterwandCostPerM2 = 6;
    const dikte18 = 1.8;
    const aftrekDiepte = 0.36;
    const aftrekAchterwand = 0.9;
    const areaZijkanten_m2 = 2 * (height * depth) / 10000;
    const binnenBreedte = width - 2 * dikte18;
    const bodemplankDiepte = depth - aftrekDiepte;
    const areaBodemplank_m2 = (binnenBreedte * bodemplankDiepte) / 10000;
    const areaBovenplank_m2 = (width * depth) / 10000;
    const areaPlank_m2 = (binnenBreedte * bodemplankDiepte) / 10000;
    const areaPlanken_m2 = shelves * areaPlank_m2;
    const tussenschotHeight = height - 15;
    const areaTussenschot_m2 = (tussenschotHeight * (depth - aftrekDiepte)) / 10000;
    const areaTussenschotten_m2 = numberOfDividers * areaTussenschot_m2;
    const kickboardHeight = 10;
    const areaKickboard_m2 = (binnenBreedte * kickboardHeight) / 10000;
    const achterwandBreedte = width - 2 * aftrekAchterwand;
    const achterwandHoogte = height - aftrekAchterwand;
    const areaAchterwand_m2 = (achterwandBreedte * achterwandHoogte) / 10000;
    const totalArea18 = areaZijkanten_m2 + areaBodemplank_m2 + areaBovenplank_m2 + areaPlanken_m2 + areaTussenschotten_m2 + areaKickboard_m2;
    const materialPrice = totalArea18 * materialCosts[chosenMaterial];
    const achterwandPrice = areaAchterwand_m2 * achterwandCostPerM2;
    const computedTotal = basisPrice + extraWidthCost + extraPlankCost + dividerFixedCost + materialPrice + achterwandPrice;
    const defaultWidth = 80, defaultHeight = 202, defaultDepth = 40, defaultShelves = 5;
    const defaultBinnenBreedte = defaultWidth - 2 * dikte18;
    const defaultBodemplankDiepte = defaultDepth - aftrekDiepte;
    const defaultAreaZijkanten_m2 = 2 * (defaultHeight * defaultDepth) / 10000;
    const defaultAreaBodemplank_m2 = (defaultBinnenBreedte * defaultBodemplankDiepte) / 10000;
    const defaultAreaBovenplank_m2 = (defaultWidth * defaultDepth) / 10000;
    const defaultAreaPlank_m2 = (defaultBinnenBreedte * defaultBodemplankDiepte) / 10000;
    const defaultAreaPlanken_m2 = defaultShelves * defaultAreaPlank_m2;
    const defaultNumberOfDividers = defaultWidth > 80 ? Math.floor((defaultWidth - 1) / 80) : 0;
    const defaultAreaTussenschot_m2 = ((defaultHeight - 15) * (defaultDepth - aftrekDiepte)) / 10000;
    const defaultAreaTussenschotten_m2 = defaultNumberOfDividers * defaultAreaTussenschot_m2;
    const defaultKickboardHeight = 10;
    const defaultAreaKickboard_m2 = (defaultBinnenBreedte * defaultKickboardHeight) / 10000;
    const defaultTotalArea18 = defaultAreaZijkanten_m2 + defaultAreaBodemplank_m2 + defaultAreaBovenplank_m2 + defaultAreaPlanken_m2 + defaultAreaTussenschotten_m2 + defaultAreaKickboard_m2;
    const defaultMaterialPrice = defaultTotalArea18 * materialCosts[chosenMaterial];
    const defaultAchterwandBreedte = defaultWidth - 2 * aftrekAchterwand;
    const defaultAchterwandHoogte = defaultHeight - aftrekAchterwand;
    const defaultAreaAchterwand_m2 = (defaultAchterwandBreedte * defaultAchterwandHoogte) / 10000;
    const defaultAchterwandPrice = defaultAreaAchterwand_m2 * achterwandCostPerM2;
    const computedDefaultTotal = basisPrice
      + (defaultWidth > 90 ? 200 : 0)
      + (defaultShelves > 5 ? (defaultShelves - 5) * 35 : 0)
      + (defaultWidth > 80 ? defaultNumberOfDividers * 150 : 0)
      + defaultMaterialPrice
      + defaultAchterwandPrice;
    const baselineOffset = computedDefaultTotal - basisPrice;
    const finalPrice = Math.max(computedTotal - baselineOffset, basisPrice);
    return finalPrice.toFixed(2);
  };

  // ----------------------------------------------------------------------------
  // ErrorBoundary-component
  // ----------------------------------------------------------------------------
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

  // ----------------------------------------------------------------------------
  // Component voor dowelling–(rijgat)boringen op een paneel
  // ----------------------------------------------------------------------------
  const DowellingHoles = ({
    x, z, panelWidth, panelHeight,
    // x en z geven de positie van de *binnenzijde* van het paneel (dus de zijde die naar het interieur wijst)
  }: { x: number; z: number; panelWidth: number; panelHeight: number; }) => {
    // Bereken de verticale posities op basis van de binnenhoogte van dit paneel.
    // We veronderstellen hier dat de "binnenhoogte" gelijk is aan panelHeight.
    const positions = [];
    const start = 19.8;
    const end = panelHeight - 19.8;
    if (start > end) return null;
    for (let pos = start; pos <= end; pos += 3.2) {
      positions.push(pos);
    }
    return (
      <>
        {positions.map((y, i) => (
          <React.Fragment key={i}>
            {/* Voorzijde van het paneel */}
            <Rijgat key={`front-${i}`} y={y} x={x} z={z - 3.7} />
            {/* Achterzijde van het paneel */}
            <Rijgat key={`back-${i}`} y={y} x={x} z={z + 3.7} />
          </React.Fragment>
        ))}
      </>
    );
  };

  // ----------------------------------------------------------------------------
  // BoxWithOutline-component (ongewijzigd)
  // ----------------------------------------------------------------------------
  const BoxWithOutline = ({ 
    position, 
    args, 
    color, 
    highlight = false 
  }: { 
    position: [number, number, number]; 
    args: [number, number, number]; 
    color: string;
    highlight?: boolean;
  }) => {
    const geometry = useMemo(() => new THREE.BoxGeometry(...args), [args]);
    const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
    return (
      <group position={position}>
        <mesh geometry={geometry} castShadow>
          <meshStandardMaterial 
            color={color} 
            emissive={highlight ? "#6366f1" : "#000000"} 
            emissiveIntensity={highlight ? 0.5 : 0}
          />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={highlight ? "#ffffff" : "#111"} />
        </lineSegments>
      </group>
    );
  };

  // ----------------------------------------------------------------------------
  // Verbeterde stappenbalk voor mobiele weergave
  // ----------------------------------------------------------------------------
  const NewStepProgressBar = ({ activeStep, onStepClick }: { activeStep: number; onStepClick: (step: number) => void }) => {
    const isMobile = useMediaQuery("(max-width: 768px)");
    const steps = [
      { number: 1, label: "Afmetingen" },
      { number: 2, label: "Planken" },
      { number: 3, label: "Materiaal" },
      { number: 4, label: "Overzicht" }
    ];
    
    return (
      <div className="custom-steps-container mb-4 md:mb-8 mt-2 pt-2">
        <div className="custom-steps-wrapper">
          {steps.map((step) => (
            <div 
              key={step.number}
              className="custom-step-item"
              onClick={() => onStepClick(step.number)}
            >
              <div className={`custom-step-bubble ${
                activeStep === step.number 
                  ? 'custom-step-active' 
                  : step.number < activeStep 
                    ? 'custom-step-completed' 
                    : 'custom-step-incomplete'
              }`}>
                {step.number}
              </div>
              <div className={`custom-step-label ${
                activeStep === step.number 
                  ? 'custom-label-active' 
                  : step.number < activeStep 
                    ? 'custom-label-completed' 
                    : 'custom-label-incomplete'
              }`}>
                {isMobile ? (step.number === activeStep ? step.label : "") : step.label}
              </div>
            </div>
          ))}
        </div>
        <style>{`
          .custom-steps-container {
            position: relative;
            padding-top: 10px;
            padding-bottom: 15px;
            width: 100%;
          }
          .custom-steps-wrapper {
            position: relative;
            display: flex;
            justify-content: space-around;
            z-index: 3;
            max-width: 95%;
            margin: 0 auto;
          }
          .custom-step-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            position: relative;
            padding-bottom: 25px;
          }
          .custom-step-bubble {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 500;
            background-color: white;
            z-index: 5;
          }
          .custom-step-active {
            background-color: #818cf8;
            color: white;
            box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);
          }
          .custom-step-completed {
            background-color: #a5b4fc;
            color: white;
          }
          .custom-step-incomplete {
            background-color: white;
            color: #6b7280;
            border: 2px solid #d1d5db;
          }
          .custom-step-label {
            font-size: 0.75rem;
            font-weight: 500;
            position: absolute;
            top: 40px;
            text-align: center;
            max-width: 80px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .custom-label-active {
            color: #4f46e5;
          }
          .custom-label-completed {
            color: #6366f1;
          }
          .custom-label-incomplete {
            color: #6b7280;
          }
          @media (max-width: 768px) {
            .custom-step-bubble {
              width: 32px;
              height: 32px;
            }
            .custom-step-label {
              top: 38px;
            }
          }
            
        `}</style>
      </div>
    );
  };

  export default function App() {
    // Media query voor responsieve aanpassingen
    const isMobile = useMediaQuery("(max-width: 768px)");
    
    // STATE & variabelen
    const [width, setWidth] = useState(80);
    const [height, setHeight] = useState(202);
    const [depth, setDepth] = useState(40);
    const [shelves, setShelves] = useState(5);
    const [shelfPositions, setShelfPositions] = useState<number[]>([]);
    const [customLayout, setCustomLayout] = useState(false);
    const [material, setMaterial] = useState("spaanplaat");
    const [step, setStep] = useState(1);
    const [autoRotate, setAutoRotate] = useState(false);
    const [errorWidth, setErrorWidth] = useState("");
    const [errorHeight, setErrorHeight] = useState("");
    const [errorDepth, setErrorDepth] = useState("");
    const orbitRef = useRef<any>(null);
    const [activeShelf, setActiveShelf] = useState<number | null>(null);
    const [expandedControls, setExpandedControls] = useState(false);

    // Beperkingen
    const heightLimits = { min: 40, max: 245 };
    const widthLimits = { min: 40, max: 240 };
    const depthLimits = { min: 20, max: 40 };

    // Posities van de kickboard en de bovenplank
    const shelfThickness = 1.8; // dikte van een plank (in cm)
    const kickboardY = 11 - height / 2;
    const topBoardY = height / 2 - 0.5;

    // Zorg ervoor dat numberOfDividers eerst wordt gedefinieerd
    const numberOfDividers = width > 80 ? Math.floor((width - 1) / 80) : 0;
    const totalCompartments = numberOfDividers > 0 ? numberOfDividers + 1 : 1;
    const totalShelfCount = shelves * totalCompartments;

    // Beschikbare binnenhoogte (van de bovenkant van het kickboard + plankdikte tot de onderkant van de bovenplank)
    const availableInsideHeight = topBoardY - (kickboardY + shelfThickness);
    const minGap = 20;
    const maxShelvesAllowed = Math.max(1, Math.floor((availableInsideHeight - minGap) / (minGap + shelfThickness)));

    // useEffect voor automatische berekening van de plankposities (bij niet-aangepaste layout)
    useEffect(() => {
      // Herbereken de plankposities als er geen custom layout is of als we in stap 1 zitten
      if (!customLayout || step === 1) {
        const gap = (availableInsideHeight - shelves * shelfThickness) / (shelves + 1);
        const newPositions: number[] = [];
        for (let i = 0; i < shelves; i++) {
          const pos = kickboardY + shelfThickness + gap * (i + 1) + shelfThickness * i;
          newPositions.push(pos);
        }
        // Pas de posities aan zodat ze exact aansluiten op de dichtstbijzijnde rijgatboring
        const adjustedPositions = newPositions.map(pos => {
          const bottomInterior = kickboardY + shelfThickness;
          const firstHole = bottomInterior + 19.8;
          if (pos < firstHole) return firstHole;
          const holeIndex = Math.floor((pos - firstHole) / 3.2);
          return firstHole + holeIndex * 3.2;
        });
        setShelfPositions(adjustedPositions);
      }
    }, [shelves, height, customLayout, kickboardY, topBoardY, availableInsideHeight, step]);

    const materialColor = { spaanplaat: "#f8f6e1", MDF: "#8b5e3c", multiplex: "#deb887" }[material] || "#ccc";

    const verticalDividerPositions = Array.from({ length: numberOfDividers }, (_, i) => {
      const numberOfCompartments = numberOfDividers + 1;
      const compartmentWidth = width / numberOfCompartments;
      return -width / 2 + compartmentWidth * (i + 1);
    });

    const prijs = useMemo(() => {
      const basePrice = calculatePrice({ width, height, depth, shelves, chosenMaterial: material });
      return customLayout ? (parseFloat(basePrice) + 100).toFixed(2) : basePrice;
    }, [width, height, depth, shelves, material, customLayout]);

    const validate = (val: number, min: number, max: number) =>
      val < min || val > max ? `Waarde tussen ${min} en ${max} cm` : "";

    const handleNext = () => {
      setStep((s) => Math.min(s + 1, 4));
      // Bij mobiel, scroll omhoog wanneer naar volgende stap
      if (isMobile) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const navigateToStep = (newStep: number) => {
      if (newStep >= 1 && newStep <= 4) {
        setStep(newStep);
        // Bij mobiel, scroll omhoog wanneer tussen stappen navigeert
        if (isMobile) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    const calculateSpacesBetweenShelves = () => {
      if (shelfPositions.length === 0) return [];
      const spaces = [];
      spaces.push({
        from: "Bodem",
        to: "Plank 1",
        space: Math.round((shelfPositions[0] - (kickboardY + shelfThickness)) * 10) / 10
      });
      for (let i = 0; i < shelfPositions.length - 1; i++) {
        spaces.push({
          from: `Plank ${i + 1}`,
          to: `Plank ${i + 2}`,
          space: Math.round((shelfPositions[i + 1] - shelfPositions[i] - shelfThickness) * 10) / 10
        });
      }
      spaces.push({
        from: `Plank ${shelfPositions.length}`,
        to: "Bovenkant",
        space: Math.round((topBoardY - shelfPositions[shelfPositions.length - 1] - shelfThickness) * 10) / 10
      });
      return spaces;
    };

    const materials = [
      { id: "spaanplaat", name: "Spaanplaat", color: "#f8f6e1", features: ["Licht en stevig", "Betaalbaar", "Duurzaam gekozen"] },
      { id: "MDF", name: "MDF", color: "#8b5e3c", features: ["Sterk en glad", "Makkelijk te bewerken", "Watervast mogelijk"] },
      { id: "multiplex", name: "Multiplex", color: "#deb887", features: ["Zeer duurzaam", "Decoratieve laagjes", "Hoge kwaliteit"] }
    ];

    const pageVariants = {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
      exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    // Tekstfile met details
    const handleBestellen = () => {
      const dikte18 = 1.8;
      const aftrekDiepte = 0.36;
      const aftrekAchterwand = 0.9;
      const binnenBreedte = width - 2 * dikte18;
      const binnendiepte = depth - aftrekDiepte;
      const binnenhoogte = topBoardY - (kickboardY + shelfThickness);
      const totalCompartments = numberOfDividers > 0 ? numberOfDividers + 1 : 1;
      const totalShelfCount = shelves * totalCompartments;
      const compartmentWidth = totalCompartments > 1 ? binnenBreedte / totalCompartments : binnenBreedte;
      const spaces = calculateSpacesBetweenShelves();
      let spacesInfo = "";
      spaces.forEach(space => {
        spacesInfo += `${space.from} naar ${space.to}: ${space.space} cm\n`;
      });
      const details = `
  Boekenkast Specificaties:
  -------------------------
  Hoogte: ${height} cm
  Breedte: ${width} cm
  Diepte: ${depth} cm
  Aantal planken: ${totalShelfCount}${customLayout ? " (aangepaste indeling = 100€)" : ""}
  Materiaal: ${material}

  Binnenafmetingen:
  - Binnenbreedte: ${binnenBreedte.toFixed(2)} cm
  - Binnendiepte: ${binnendiepte.toFixed(2)} cm
  - Binnenhoogte: ${binnenhoogte.toFixed(2)} cm

  Ruimte tussen de ${shelves} planken:
  ${spacesInfo}

  Onderdelen:
  - Zijkanten: 2x ${height} cm x ${depth} cm
  - Bodemplank: 1x ${binnenBreedte.toFixed(2)} cm breed x ${binnendiepte.toFixed(2)} cm diep
  - Bovenplank: 1x ${width} cm x ${depth} cm
  - Planken: ${totalShelfCount}x ${compartmentWidth.toFixed(2)} cm breed x ${binnendiepte.toFixed(2)} cm diep
  - Tussenschotten: ${numberOfDividers > 0 ? numberOfDividers + "x (" + binnenhoogte.toFixed(2) + " cm x " + binnendiepte.toFixed(2) + " cm)" : "Geen"}
  - Kickboard: 1x Binnenbreedte: ${binnenBreedte.toFixed(2)} cm, hoogte: 10 cm
  - Achterwand: 1x ${(width - 2 * aftrekAchterwand).toFixed(2)} cm breed x ${(height - aftrekAchterwand).toFixed(2)} cm hoog

  Prijs: €${prijs}
      `;
      const blob = new Blob([details], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bestelling.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // PDF download functionaliteit
    const generateAndDownloadPDF = () => {
      // Dit is een mockup - in een echte implementatie zou je een PDF bibliotheek gebruiken
      alert("PDF generatie: Deze functie zou een professioneel PDF document genereren met alle specificaties en een bestelformulier.");
      // Ideale implementatie zou gebruik maken van jsPDF of een backend service voor PDF generatie
    };

    useEffect(() => {
      const maxShelvesAllowedCalc = Math.max(1, Math.floor((availableInsideHeight - minGap) / (minGap + shelfThickness)));
      if (shelves > maxShelvesAllowedCalc) {
        setShelves(maxShelvesAllowedCalc);
      }
    }, [height, shelves, kickboardY, topBoardY, availableInsideHeight]);

    // Toggle functie voor mobiele weergave controles
    const toggleControls = () => {
      setExpandedControls(!expandedControls);
    };

    return (
      <div className="flex flex-col md:flex-row h-screen overflow-hidden">
        <style>{`
          html, body {
            overflow-x: hidden;
            touch-action: pan-y;
            overscroll-behavior: none;
          }
          
          input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 8px;
            background: linear-gradient(to right, #f9a8d4, #e9d5ff, #93c5fd);
            border-radius: 10px;
            outline: none;
          }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 24px;
            height: 24px;
            background: white;
            border: 2px solid #93c5fd;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(147, 197, 253, 0.3);
            transition: transform 0.2s, box-shadow 0.2s;
          }
          input[type="range"]::-moz-range-thumb {
            width: 24px;
            height: 24px;
            background: white;
            border: 2px solid #93c5fd;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(147, 197, 253, 0.3);
            transition: transform 0.2s, box-shadow 0.2s;
          }
          input[type="range"]::-webkit-slider-thumb:hover,
          input[type="range"]::-moz-range-thumb:hover {
            transform: scale(1.15);
            box-shadow: 0 2px 8px rgba(147, 197, 253, 0.5);
          }
          input[type="range"]:focus::-webkit-slider-thumb,
          input[type="range"]:focus::-moz-range-thumb {
            box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.2);
          }
          .custom-slider-container {
            height: 24px;
            display: flex;
            align-items: center;
          }
          
          /* Touch-vriendelijke knoppen */
          button {
            min-height: 44px;
            touch-action: manipulation;
          }
          
          /* Mobiele optimalisaties */
          @media (max-width: 768px) {
            .controls-fade-overlay {
              height: 60px;
              background: linear-gradient(to bottom, rgba(243, 244, 246, 0) 0%, rgba(243, 244, 246, 1) 100%);
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              pointer-events: none;
            }
            
            .mobile-expand-btn {
              position: fixed;
              bottom: 16px;
              right: 16px;
              z-index: 50;
              width: 56px;
              height: 56px;
              border-radius: 28px;
              background: #4f46e5;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4);
            }
          }
        `}</style>
        
        {/* Responsieve layout voor mobiel en desktop */}
        {isMobile ? (
          // Mobiele layout - Canvas bovenaan, controls onderaan
          <>
            {/* 3D Weergave */}
            <div className={`w-full ${expandedControls ? 'h-1/3' : 'h-2/3'} bg-gradient-to-br from-blue-200 via-pink-100 to-pink-300 transition-all duration-300`}>
              <ErrorBoundary>
                <Canvas 
                  shadows={false} 
                  dpr={[1, 1.5]} 
                  performance={{ min: 0.5 }}
                  logarithmicDepthBuffer 
                  camera={{ position: [120, height * -1.2, height * 1.1], fov: 45 }}
                >
                  <ambientLight intensity={2.1} />
                  <directionalLight position={[5, 10, 5]} intensity={8} castShadow={false} />
                  <OrbitControls
                    ref={orbitRef}
                    enableZoom={false}
                    minDistance={height * 2.2}
                    maxDistance={height * 2.2}
                    enablePan={false}
                    autoRotate={autoRotate}
                    autoRotateSpeed={0.8}
                    minPolarAngle={Math.PI / 2 - 0.15}
                    maxPolarAngle={Math.PI / 2 + 0.15}
                    minAzimuthAngle={-Math.PI / 2}
                    maxAzimuthAngle={Math.PI / 2}
                    enableDamping={true}
                    dampingFactor={0.2}
                    rotateSpeed={0.7}
                    touchAction="pan-y"
                  />
                  <Environment preset="sunset" />
                  <Suspense fallback={null}>
                    <FixedCloud height={height} />
                  </Suspense>
                  <group renderOrder={-1}>
                    <Stars 
                      radius={100}
                      depth={50}
                      count={1500}
                      factor={10}
                      saturation={0}
                      fade={true}
                      position={[0, 0, -500]}
                    />
                  </group>
                  <group position={[0, height / 2 - height * 0.4, 0]}>
                    <BoxWithOutline position={[0, 0, -depth / 2 - 0.5]} args={[width, height, 1]} color={materialColor} />
                    <BoxWithOutline position={[-width / 2, 0, 0]} args={[1, height, depth]} color={materialColor} />
                    <BoxWithOutline position={[width / 2, 0, 0]} args={[1, height, depth]} color={materialColor} />
                    <BoxWithOutline position={[0, topBoardY, 0]} args={[width, 1, depth]} color={materialColor} />
                    <BoxWithOutline position={[0, kickboardY, 0]} args={[width, 1, depth]} color={materialColor} />
                    {shelfPositions.map((yPos, i) => (
                      <BoxWithOutline
                        key={`shelf-${i}`}
                        position={[0, yPos, 0]}
                        args={[width, 1, depth]}
                        color={activeShelf === i ? "#edaed3" : materialColor}
                      />
                    ))}
                    {verticalDividerPositions.map((x, i) => (
                      <BoxWithOutline 
                        key={`divider-${i}`} 
                        position={[x, (topBoardY + kickboardY) / 2, 0]} 
                        args={[1, topBoardY - kickboardY, depth]} 
                        color={materialColor} 
                      />
                    ))}
                    <BoxWithOutline
                      position={[0, kickboardY - 5, depth / 2 - 1.5]}
                      args={[width - 2, 10, 1]}
                      color={materialColor}
                    />
                    {!customLayout && computeRijgatPositions(kickboardY, shelfThickness, topBoardY).map((y, i) => (
                      <React.Fragment key={`main-hole-${i}`}>
                        <Rijgat y={y} x={-width/2 + 1} z={depth/2 - 3.7} />
                        <Rijgat y={y} x={-width/2 + 1} z={-depth/2 + 3.7} />
                        <Rijgat y={y} x={width/2 - 1} z={depth/2 - 3.7} />
                        <Rijgat y={y} x={width/2 - 1} z={-depth/2 + 3.7} />
                      </React.Fragment>
                    ))}
                    {!customLayout && verticalDividerPositions.map((x, i) => (
                      computeRijgatPositions(kickboardY, shelfThickness, topBoardY).map((y, j) => (
                        <React.Fragment key={`divider-hole-${i}-${j}`}>
                          <Rijgat y={y} x={x - 0.5} z={depth/2 - 3.7} />
                          <Rijgat y={y} x={x - 0.5} z={-depth/2 + 3.7} />
                          <Rijgat y={y} x={x + 0.5} z={depth/2 - 3.7} />
                          <Rijgat y={y} x={x + 0.5} z={-depth/2 + 3.7} />
                        </React.Fragment>
                      ))
                    ))}
                  </group>
                </Canvas>
              </ErrorBoundary>
            </div>
            
            {/* Controls */}
            <div className={`w-full ${expandedControls ? 'h-2/3' : 'h-1/3'} p-4 bg-gray-100 overflow-auto relative transition-all duration-300`}>
              <h2 className="text-xl font-semibold mb-2">likeabilly, jouw maat, jouw tijd</h2>
              <NewStepProgressBar activeStep={step} onStepClick={navigateToStep} />
              
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    key="step1" 
                    className="bg-white p-4 rounded-xl shadow mb-4"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageVariants}
                  >
                    <h3 className="text-lg font-bold mb-2">Stap 1: Afmetingen</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hoogte: <span className="font-bold">{height}</span> cm
                      </label>
                      <div className="flex items-center mb-1">
                        <span className="text-xs text-gray-500 mr-2">{heightLimits.min}</span>
                        <div className="custom-slider-container flex-1">
                          <input 
                            type="range" 
                            value={height} 
                            onChange={(e) => setHeight(parseInt(e.target.value))} 
                            min={heightLimits.min}
                            max={heightLimits.max}
                            step="1"
                            className="w-full"
                          />
                        </div>
                        <span className="text-xs text-gray-500 ml-2">{heightLimits.max}</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Breedte: <span className="font-bold">{width}</span> cm
                      </label>
                      <div className="flex items-center mb-1">
                        <span className="text-xs text-gray-500 mr-2">{widthLimits.min}</span>
                        <div className="custom-slider-container flex-1">
                          <input 
                            type="range" 
                            value={width} 
                            onChange={(e) => setWidth(parseInt(e.target.value))} 
                            min={widthLimits.min}
                            max={widthLimits.max}
                            step="1"
                            className="w-full"
                          />
                        </div>
                        <span className="text-xs text-gray-500 ml-2">{widthLimits.max}</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Diepte: <span className="font-bold">{depth}</span> cm
                      </label>
                      <div className="flex items-center mb-1">
                        <span className="text-xs text-gray-500 mr-2">{depthLimits.min}</span>
                        <div className="custom-slider-container flex-1">
                          <input 
                            type="range" 
                            value={depth} 
                            onChange={(e) => setDepth(parseInt(e.target.value))} 
                            min={depthLimits.min}
                            max={depthLimits.max}
                            step="1"
                            className="w-full"
                          />
                        </div>
                        <span className="text-xs text-gray-500 ml-2">{depthLimits.max}</span>
                      </div>
                    </div>
                    {errorDepth && <p className="text-red-500 text-sm mb-2">{errorDepth}</p>}
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div 
                    key="step2" 
                    className="bg-white p-4 rounded-xl shadow mb-4"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageVariants}
                  >
                    <h3 className="text-lg font-bold mb-2">Stap 2: Planken</h3>
                    <div className="flex items-center mb-1">
                      <span className="text-xs text-gray-500 mr-2">1</span>
                      <div className="custom-slider-container flex-1">
                        <input 
                          type="range" 
                          min={1} 
                          max={maxShelvesAllowed}
                          value={shelves} 
                          onChange={(e) => {
                            const newShelves = parseInt(e.target.value);
                            setShelves(newShelves);
                            setCustomLayout(false);
                          }} 
                          className="w-full" 
                        />
                      </div>
                      <span className="text-xs text-gray-500 ml-2">{maxShelvesAllowed}</span>
                    </div>
                    <p className="text-center mt-2 font-medium">
                      {shelves} planken
                    </p>
                    <div className="mt-4 mb-4 flex items-center">
                      <input
                        type="checkbox"
                        id="customLayout"
                        checked={customLayout}
                        onChange={() => setCustomLayout(!customLayout)}
                        className="mr-2 h-5 w-5 text-indigo-600"
                      />
                      <label htmlFor="customLayout" className="font-medium">
                        Aangepaste indeling
                      </label>
                    </div>
                    {customLayout && (
                      <div className="mt-2">
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">
                            Pas {numberOfDividers > 0 ? "plankenrijposities" : "plankposities"} aan:
                          </h4>
                          {shelfPositions.map((pos, idx) => {
                            const lowerBound = idx === 0 ? kickboardY + 20 : shelfPositions[idx - 1] + 20;
                            const upperBound = idx === shelfPositions.length - 1 ? topBoardY - 20 : shelfPositions[idx + 1] - 20;
                            const percentage = ((pos - lowerBound) / (upperBound - lowerBound)) * 100;
                            const spacesBetween = calculateSpacesBetweenShelves();
                            const spaceAbove = idx < shelfPositions.length - 1 
                              ? spacesBetween[idx + 1].space 
                              : spacesBetween[spacesBetween.length - 1].space;
                            const spaceBelow = idx > 0 
                              ? spacesBetween[idx].space 
                              : spacesBetween[0].space;
                            return (
                              <div key={idx} className="mb-4 p-3 border border-gray-200 rounded-lg">
                                <div className="flex justify-between text-xs text-gray-600 mb-2">
                                  <span className="font-medium">Plank {idx + 1}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Ruimte onder: <span className="font-medium text-indigo-600">{spaceBelow} cm</span></span>
                                  <span>Ruimte boven: <span className="font-medium text-indigo-600">{spaceAbove} cm</span></span>
                                </div>
                                <div className="custom-slider-container flex-1">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.max(0, Math.min(100, percentage))}
                                    onFocus={() => setActiveShelf(idx)}
                                    onMouseEnter={() => setActiveShelf(idx)}
                                    onTouchStart={() => setActiveShelf(idx)}
                                    onBlur={() => setActiveShelf(null)}
                                    onMouseLeave={() => setActiveShelf(null)}
                                    onTouchEnd={() => setTimeout(() => setActiveShelf(null), 1500)}
                                    onChange={(e) => {
                                      const newPercentage = +e.target.value;
                                      let newPos = lowerBound + (newPercentage / 100) * (upperBound - lowerBound);
                                      const newPositions = [...shelfPositions];
                                      newPositions[idx] = newPos;
                                      for (let i = idx + 1; i < newPositions.length; i++) {
                                        if (newPositions[i] - newPositions[i - 1] < 20) {
                                          newPositions[i] = newPositions[i - 1] + 20;
                                        }
                                      }
                                      for (let i = idx - 1; i >= 0; i--) {
                                        if (newPositions[i + 1] - newPositions[i] < 20) {
                                          newPositions[i] = newPositions[i + 1] - 20;
                                        }
                                      }
                                      const offsetBottom = (kickboardY + 20) - newPositions[0];
                                      if (offsetBottom > 0) {
                                        for (let i = 0; i < newPositions.length; i++) {
                                          newPositions[i] += offsetBottom;
                                        }
                                      }
                                      const offsetTop = newPositions[newPositions.length - 1] - (topBoardY - 20);
                                      if (offsetTop > 0) {
                                        for (let i = 0; i < newPositions.length; i++) {
                                          newPositions[i] -= offsetTop;
                                        }
                                      }
                                      setShelfPositions(newPositions);
                                    }}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setCustomLayout(false)}
                          className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium py-2 px-3"
                        >
                          Reset naar gelijke tussenruimtes
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div 
                    key="step3" 
                    className="bg-white p-4 rounded-xl shadow mb-4"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageVariants}
                  >
                    <h3 className="text-lg font-bold mb-2">Stap 3: Materiaal</h3>
                    {materials.map((mat) => (
                      <div 
                        key={mat.id} 
                        onClick={() => setMaterial(mat.id)} 
                        className={`border p-3 mb-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          material === mat.id 
                            ? "border-indigo-500 bg-indigo-50 transform scale-102"
                            : "border-gray-300 hover:border-indigo-200"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-12 h-12 rounded-md" 
                            style={{ backgroundColor: mat.color }}
                          ></div>
                          <div>
                            <p className="font-semibold">{mat.name}</p>
                            <ul className="text-sm list-disc ml-5 mt-1 text-gray-600">
                              {mat.features.map((feature, i) => (
                                <li key={i}>{feature}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
                {step === 4 && (
                  <motion.div 
                    key="step4" 
                    className="bg-white p-4 rounded-xl shadow mb-4"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageVariants}
                  >
                    <h3 className="text-lg font-bold mb-3">Overzicht & prijs</h3>
                    <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-indigo-800 mb-2">Specificaties:</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span className="text-gray-600">Hoogte:</span>
                          <span className="font-medium">{height} cm</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-600">Breedte:</span>
                          <span className="font-medium">{width} cm</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-600">Diepte:</span>
                          <span className="font-medium">{depth} cm</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-600">Planken:</span>
                          <span className="font-medium">{totalShelfCount}{customLayout ? " (aangepaste indeling = 100€)" : ""}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-600">Materiaal:</span>
                          <span className="font-medium capitalize">{material}</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-4 bg-green-50 p-4 rounded-lg">
                      <p className="text-lg font-bold text-green-800">Geschatte prijs: €{prijs}</p>
                      <p className="text-sm text-green-700 mt-1">Inclusief BTW en levering</p>
                    </div>
                    <div className="mt-4 flex flex-col space-y-2">
                      <button
                        onClick={handleBestellen}
                        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Bestellen
                      </button>
                      <button
                        onClick={generateAndDownloadPDF}
                        className="w-full bg-white border border-indigo-600 text-indigo-600 py-3 px-4 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
                      >
                        Download PDF specificatie
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex justify-between mb-4">
                {step > 1 ? (
                  <button 
                    onClick={() => setStep((s) => Math.max(1, s - 1))} 
                    className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 transition-colors"
                  >
                    Vorige
                  </button>
                ) : (
                  <div>{/* Lege div voor flexbox spacing */}</div>
                )}
                {step < 4 && (
                  <button 
                    onClick={handleNext} 
                    className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Volgende
                  </button>
                )}
              </div>
              
              <div className="bg-white p-3 rounded-xl shadow mb-16">
                <h3 className="font-medium mb-2">3D Weergave</h3>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => orbitRef.current?.reset()} 
                    className="flex-1 px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Reset view
                  </button>
                  <button 
                    onClick={() => setAutoRotate(!autoRotate)} 
                    className={`flex-1 px-3 py-2 rounded transition-colors ${
                      autoRotate 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                        : 'bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {autoRotate ? 'Stop draaien' : 'Automatisch draaien'}
                  </button>
                </div>
              </div>
              
              {/* Mobiele toggle knop */}
              <button 
                className="mobile-expand-btn"
                onClick={toggleControls}
                aria-label={expandedControls ? "Toon meer 3D model" : "Toon meer instellingen"}
              >
                {expandedControls ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            </div>
          </>
        ) : (
          // Desktop layout - Split screen horizontaal
          <>
            <div className="w-full md:w-1/3 p-6 bg-gray-100 overflow-auto">
              <h2 className="text-xl font-semibold mb-4">Boekenkast configurator</h2>
              <NewStepProgressBar activeStep={step} onStepClick={navigateToStep} />
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    key="step1" 
                    className="bg-white p-4 rounded-xl shadow mb-4"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageVariants}
                  >
                    <h3 className="text-lg font-bold mb-2">Stap 1: Afmetingen</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hoogte: <span className="font-bold">{height}</span> cm
                      </label>
                      <div className="flex items-center mb-1">
                        <span className="text-xs text-gray-500 mr-2">{heightLimits.min}</span>
                        <div className="custom-slider-container flex-1">
                          <input 
                            type="range" 
                            value={height} 
                            onChange={(e) => setHeight(parseInt(e.target.value))} 
                            min={heightLimits.min}
                            max={heightLimits.max}
                            step="1"
                            className="w-full"
                          />
                        </div>
                        <span className="text-xs text-gray-500 ml-2">{heightLimits.max}</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Breedte: <span className="font-bold">{width}</span> cm
                      </label>
                      <div className="flex items-center mb-1">
                        <span className="text-xs text-gray-500 mr-2">{widthLimits.min}</span>
                        <div className="custom-slider-container flex-1">
                          <input 
                            type="range" 
                            value={width} 
                            onChange={(e) => setWidth(parseInt(e.target.value))} 
                            min={widthLimits.min}
                            max={widthLimits.max}
                            step="1"
                            className="w-full"
                          />
                        </div>
                        <span className="text-xs text-gray-500 ml-2">{widthLimits.max}</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Diepte: <span className="font-bold">{depth}</span> cm
                      </label>
                      <div className="flex items-center mb-1">
                        <span className="text-xs text-gray-500 mr-2">{depthLimits.min}</span>
                        <div className="custom-slider-container flex-1">
                          <input 
                            type="range" 
                            value={depth} 
                            onChange={(e) => setDepth(parseInt(e.target.value))} 
                            min={depthLimits.min}
                            max={depthLimits.max}
                            step="1"
                            className="w-full"
                          />
                        </div>
                        <span className="text-xs text-gray-500 ml-2">{depthLimits.max}</span>
                      </div>
                    </div>
                    {errorDepth && <p className="text-red-500 text-sm mb-2">{errorDepth}</p>}
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div 
                    key="step2" 
                    className="bg-white p-4 rounded-xl shadow mb-4"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageVariants}
                  >
                    <h3 className="text-lg font-bold mb-2">Stap 2: Planken</h3>
                    <div className="flex items-center mb-1">
                      <span className="text-xs text-gray-500 mr-2">1</span>
                      <div className="custom-slider-container flex-1">
                        <input 
                          type="range" 
                          min={1} 
                          max={maxShelvesAllowed}
                          value={shelves} 
                          onChange={(e) => {
                            const newShelves = parseInt(e.target.value);
                            setShelves(newShelves);
                            setCustomLayout(false);
                          }} 
                          className="w-full" 
                        />
                      </div>
                      <span className="text-xs text-gray-500 ml-2">{maxShelvesAllowed}</span>
                    </div>
                    <p className="text-center mt-2 font-medium">
                      {shelves} planken
                    </p>
                    <div className="mt-4 mb-4 flex items-center">
                      <input
                        type="checkbox"
                        id="customLayout"
                        checked={customLayout}
                        onChange={() => setCustomLayout(!customLayout)}
                        className="mr-2 h-4 w-4 text-indigo-600"
                      />
                      <label htmlFor="customLayout" className="font-medium">
                        Aangepaste indeling
                      </label>
                    </div>
                    {customLayout && (
                      <div className="mt-2">
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">
                            Pas {numberOfDividers > 0 ? "plankenrijposities" : "plankposities"} aan:
                          </h4>
                          {shelfPositions.map((pos, idx) => {
                            const lowerBound = idx === 0 ? kickboardY + 20 : shelfPositions[idx - 1] + 20;
                            const upperBound = idx === shelfPositions.length - 1 ? topBoardY - 20 : shelfPositions[idx + 1] - 20;
                            const percentage = ((pos - lowerBound) / (upperBound - lowerBound)) * 100;
                            const spacesBetween = calculateSpacesBetweenShelves();
                            const spaceAbove = idx < shelfPositions.length - 1 
                              ? spacesBetween[idx + 1].space 
                              : spacesBetween[spacesBetween.length - 1].space;
                            const spaceBelow = idx > 0 
                              ? spacesBetween[idx].space 
                              : spacesBetween[0].space;
                            return (
                              <div key={idx} className="mb-4 p-3 border border-gray-200 rounded-lg">
                                <div className="flex justify-between text-xs text-gray-600 mb-2">
                                  <span className="font-medium">Plank {idx + 1}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Ruimte onder: <span className="font-medium text-indigo-600">{spaceBelow} cm</span></span>
                                  <span>Ruimte boven: <span className="font-medium text-indigo-600">{spaceAbove} cm</span></span>
                                </div>
                                <div className="custom-slider-container flex-1">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.max(0, Math.min(100, percentage))}
                                    onFocus={() => setActiveShelf(idx)}
                                    onMouseEnter={() => setActiveShelf(idx)}
                                    onBlur={() => setActiveShelf(null)}
                                    onMouseLeave={() => setActiveShelf(null)}
                                    onChange={(e) => {
                                      const newPercentage = +e.target.value;
                                      let newPos = lowerBound + (newPercentage / 100) * (upperBound - lowerBound);
                                      const newPositions = [...shelfPositions];
                                      newPositions[idx] = newPos;
                                      for (let i = idx + 1; i < newPositions.length; i++) {
                                        if (newPositions[i] - newPositions[i - 1] < 20) {
                                          newPositions[i] = newPositions[i - 1] + 20;
                                        }
                                      }
                                      for (let i = idx - 1; i >= 0; i--) {
                                        if (newPositions[i + 1] - newPositions[i] < 20) {
                                          newPositions[i] = newPositions[i + 1] - 20;
                                        }
                                      }
                                      const offsetBottom = (kickboardY + 20) - newPositions[0];
                                      if (offsetBottom > 0) {
                                        for (let i = 0; i < newPositions.length; i++) {
                                          newPositions[i] += offsetBottom;
                                        }
                                      }
                                      const offsetTop = newPositions[newPositions.length - 1] - (topBoardY - 20);
                                      if (offsetTop > 0) {
                                        for (let i = 0; i < newPositions.length; i++) {
                                          newPositions[i] -= offsetTop;
                                        }
                                      }
                                      setShelfPositions(newPositions);
                                    }}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setCustomLayout(false)}
                          className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Reset naar gelijke tussenruimtes
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div 
                    key="step3" 
                    className="bg-white p-4 rounded-xl shadow mb-4"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageVariants}
                  >
                    <h3 className="text-lg font-bold mb-2">Stap 3: Materiaal</h3>
                    {materials.map((mat) => (
                      <div 
                        key={mat.id} 
                        onClick={() => setMaterial(mat.id)} 
                        className={`border p-3 mb-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          material === mat.id 
                            ? "border-indigo-500 bg-indigo-50 transform scale-102"
                            : "border-gray-300 hover:border-indigo-200"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-12 h-12 rounded-md" 
                            style={{ backgroundColor: mat.color }}
                          ></div>
                          <div>
                            <p className="font-semibold">{mat.name}</p>
                            <ul className="text-sm list-disc ml-5 mt-1 text-gray-600">
                              {mat.features.map((feature, i) => (
                                <li key={i}>{feature}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
                {step === 4 && (
                  <motion.div 
                    key="step4" 
                    className="bg-white p-4 rounded-xl shadow mb-4"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageVariants}
                  >
                    <h3 className="text-lg font-bold mb-3">Overzicht & prijs</h3>
                    <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-indigo-800 mb-2">Specificaties:</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between">
                          <span className="text-gray-600">Hoogte:</span>
                          <span className="font-medium">{height} cm</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-600">Breedte:</span>
                          <span className="font-medium">{width} cm</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-600">Diepte:</span>
                          <span className="font-medium">{depth} cm</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-600">Planken:</span>
                          <span className="font-medium">{totalShelfCount}{customLayout ? " (aangepaste indeling = 100€)" : ""}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-gray-600">Materiaal:</span>
                          <span className="font-medium capitalize">{material}</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-4 bg-green-50 p-4 rounded-lg">
                      <p className="text-lg font-bold text-green-800">Geschatte prijs: €{prijs}</p>
                      <p className="text-sm text-green-700 mt-1">Inclusief BTW en levering</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={handleBestellen}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Bestellen
                      </button>
                      <button
                        onClick={generateAndDownloadPDF}
                        className="w-full bg-white border border-indigo-600 text-indigo-600 py-3 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
                      >
                        Download PDF specificatie
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-between mb-4">
                {step > 1 ? (
                  <button 
                    onClick={() => setStep((s) => Math.max(1, s - 1))} 
                    className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 transition-colors"
                  >
                    Vorige
                  </button>
                ) : (
                  <div>{/* Lege div voor flexbox spacing */}</div>
                )}
                {step < 4 && (
                  <button 
                    onClick={handleNext} 
                    className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Volgende
                  </button>
                )}
              </div>
              <div className="bg-white p-4 rounded-xl shadow">
                <h3 className="font-medium mb-2">3D Weergave opties</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => orbitRef.current?.reset()} 
                    className="w-full px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    Reset view
                  </button>
                  <button 
                    onClick={() => setAutoRotate(!autoRotate)} 
                    className={`w-full px-4 py-2 rounded transition-colors ${
                      autoRotate 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                        : 'bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {autoRotate ? 'Stop draaien' : 'Automatisch draaien'}
                  </button>
                </div>
              </div>
            </div>
            <div className="w-full md:w-2/3 h-full relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-200 via-pink-100 to-pink-300"></div>
              <ErrorBoundary>
                <Canvas shadows logarithmicDepthBuffer camera={{ position: [180, height * -2, height * 1.4], fov: 40 }}>
                  <ambientLight intensity={2.1} />
                  <directionalLight position={[5, 10, 5]} intensity={10} castShadow />
                  <OrbitControls
                    ref={orbitRef}
                    enableZoom={false}
                    minDistance={height * 2.2}
                    maxDistance={height * 2.2}
                    enablePan={false}
                    autoRotate={autoRotate}
                    autoRotateSpeed={1.0}
                    minPolarAngle={Math.PI / 2 - 0.087}
                    maxPolarAngle={Math.PI / 2 + 0.087}
                    minAzimuthAngle={-Math.PI / 2}
                    maxAzimuthAngle={Math.PI / 2}
                    enableDamping={true}
                    dampingFactor={1.2}
                  />
                  <Environment preset="sunset" />
                  <Suspense fallback={null}>
                    <FixedCloud height={height} />
                  </Suspense>
                  <group renderOrder={-1}>
                    <Stars 
                      radius={100}
                      depth={50}
                      count={3500}
                      factor={10}
                      saturation={0}
                      fade={true}
                      position={[0, 0, -500]}
                    />
                  </group>
                  <group position={[0, height / 2 - height * 0.4, 0]}>
                    <BoxWithOutline position={[0, 0, -depth / 2 - 0.5]} args={[width, height, 1]} color={materialColor} />
                    <BoxWithOutline position={[-width / 2, 0, 0]} args={[1, height, depth]} color={materialColor} />
                    <BoxWithOutline position={[width / 2, 0, 0]} args={[1, height, depth]} color={materialColor} />
                    <BoxWithOutline position={[0, topBoardY, 0]} args={[width, 1, depth]} color={materialColor} />
                    <BoxWithOutline position={[0, kickboardY, 0]} args={[width, 1, depth]} color={materialColor} />
                    {shelfPositions.map((yPos, i) => (
                      <BoxWithOutline
                        key={`shelf-${i}`}
                        position={[0, yPos, 0]}
                        args={[width, 1, depth]}
                        color={activeShelf === i ? "#edaed3" : materialColor}
                      />
                    ))}
                    {verticalDividerPositions.map((x, i) => (
                      <BoxWithOutline 
                        key={`divider-${i}`} 
                        position={[x, (topBoardY + kickboardY) / 2, 0]} 
                        args={[1, topBoardY - kickboardY, depth]} 
                        color={materialColor} 
                      />
                    ))}
                    <BoxWithOutline
                      position={[0, kickboardY - 5, depth / 2 - 1.5]}
                      args={[width - 2, 10, 1]}
                      color={materialColor}
                    />
                    {/* Dowelling holes op de binnenzijden van de linker- en rechterpanelen */}
                    {!customLayout && computeRijgatPositions(kickboardY, shelfThickness, topBoardY).map((y, i) => (
                      <React.Fragment key={`main-hole-${i}`}>
                        <Rijgat y={y} x={-width/2 + 1} z={depth/2 - 3.7} />
                        <Rijgat y={y} x={-width/2 + 1} z={-depth/2 + 3.7} />
                        <Rijgat y={y} x={width/2 - 1} z={depth/2 - 3.7} />
                        <Rijgat y={y} x={width/2 - 1} z={-depth/2 + 3.7} />
                      </React.Fragment>
                    ))}
                    {/* Dowelling holes op de verticale tussenschotten */}
                    {!customLayout && verticalDividerPositions.map((x, i) => (
                      computeRijgatPositions(kickboardY, shelfThickness, topBoardY).map((y, j) => (
                        <React.Fragment key={`divider-hole-${i}-${j}`}>
                          <Rijgat y={y} x={x - 0.5} z={depth/2 - 3.7} />
                          <Rijgat y={y} x={x - 0.5} z={-depth/2 + 3.7} />
                          <Rijgat y={y} x={x + 0.5} z={depth/2 - 3.7} />
                          <Rijgat y={y} x={x + 0.5} z={-depth/2 + 3.7} />
                        </React.Fragment>
                      ))
                    ))}
                  </group>
                </Canvas>
              </ErrorBoundary>
            </div>
          </>
        )}
      </div>
    );
  }