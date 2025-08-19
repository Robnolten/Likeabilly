// helpers.ts

// Bereken de prijs van de kast
export const calculatePrice = ({
    width,
    height,
    depth,
    shelves,
    chosenMaterial,
  }: {
    width: number;
    height: number;
    depth: number;
    shelves: number;
    chosenMaterial: string;
  }): string => {
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
    // Let op: dit aantal is gebruikt voor de berekening, maar de uiteindelijke prijs gaat puur over de onderdelen.
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
  
    const areaZijkanten_m2 = (2 * height * depth) / 10000;
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
  
    const totalArea18 =
      areaZijkanten_m2 +
      areaBodemplank_m2 +
      areaBovenplank_m2 +
      areaPlanken_m2 +
      areaTussenschotten_m2 +
      areaKickboard_m2;
    const materialPrice = totalArea18 * materialCosts[chosenMaterial];
    const achterwandPrice = areaAchterwand_m2 * achterwandCostPerM2;
    const computedTotal =
      basisPrice + extraWidthCost + extraPlankCost + dividerFixedCost + materialPrice + achterwandPrice;
  
    // Baseline-offset berekenen (standaardconfiguratie)
    const defaultWidth = 80,
      defaultHeight = 202,
      defaultDepth = 40,
      defaultShelves = 5;
    const defaultBinnenBreedte = defaultWidth - 2 * dikte18;
    const defaultBodemplankDiepte = defaultDepth - aftrekDiepte;
    const defaultAreaZijkanten_m2 = (2 * defaultHeight * defaultDepth) / 10000;
    const defaultAreaBodemplank_m2 = (defaultBinnenBreedte * defaultBodemplankDiepte) / 10000;
    const defaultAreaBovenplank_m2 = (defaultWidth * defaultDepth) / 10000;
    const defaultAreaPlank_m2 = (defaultBinnenBreedte * defaultBodemplankDiepte) / 10000;
    const defaultAreaPlanken_m2 = defaultShelves * defaultAreaPlank_m2;
    const defaultNumberOfDividers = defaultWidth > 80 ? Math.floor((defaultWidth - 1) / 80) : 0;
    const defaultAreaTussenschot_m2 = ((defaultHeight - 15) * (defaultDepth - aftrekDiepte)) / 10000;
    const defaultAreaTussenschotten_m2 = defaultNumberOfDividers * defaultAreaTussenschot_m2;
    const defaultKickboardHeight = 10;
    const defaultAreaKickboard_m2 = (defaultBinnenBreedte * defaultKickboardHeight) / 10000;
    const defaultTotalArea18 =
      defaultAreaZijkanten_m2 +
      defaultAreaBodemplank_m2 +
      defaultAreaBovenplank_m2 +
      defaultAreaPlanken_m2 +
      defaultAreaTussenschotten_m2 +
      defaultAreaKickboard_m2;
    const defaultMaterialPrice = defaultTotalArea18 * materialCosts[chosenMaterial];
    const defaultAchterwandBreedte = defaultWidth - 2 * aftrekAchterwand;
    const defaultAchterwandHoogte = defaultHeight - aftrekAchterwand;
    const defaultAreaAchterwand_m2 = (defaultAchterwandBreedte * defaultAchterwandHoogte) / 10000;
    const defaultAchterwandPrice = defaultAreaAchterwand_m2 * achterwandCostPerM2;
    const computedDefaultTotal =
      basisPrice +
      (defaultWidth > 90 ? 200 : 0) +
      (defaultShelves > 5 ? (defaultShelves - 5) * 35 : 0) +
      (defaultWidth > 80 ? defaultNumberOfDividers * 150 : 0) +
      defaultMaterialPrice +
      defaultAchterwandPrice;
  
    const baselineOffset = computedDefaultTotal - basisPrice;
    const finalPrice = Math.max(computedTotal - baselineOffset, basisPrice);
    return finalPrice.toFixed(2);
  };
  
  // Helperfunctie voor ruimtes tussen planken
  export const calculateSpacesBetweenShelves = (
    shelfPositions: number[],
    kickboardY: number,
    shelfThickness: number,
    topBoardY: number
  ) => {
    if (shelfPositions.length === 0) return [];
    const spaces = [];
    spaces.push({
      from: "Bodem",
      to: "Plank 1",
      space: Math.round((shelfPositions[0] - (kickboardY + shelfThickness)) * 10) / 10,
    });
    for (let i = 0; i < shelfPositions.length - 1; i++) {
      spaces.push({
        from: `Plank ${i + 1}`,
        to: `Plank ${i + 2}`,
        space: Math.round((shelfPositions[i + 1] - shelfPositions[i] - shelfThickness) * 10) / 10,
      });
    }
    spaces.push({
      from: `Plank ${shelfPositions.length}`,
      to: "Bovenkant",
      space: Math.round((topBoardY - shelfPositions[shelfPositions.length - 1] - shelfThickness) * 10) / 10,
    });
    return spaces;
  };