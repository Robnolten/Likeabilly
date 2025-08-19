import React from "react";
import { calculateSpacesBetweenShelves } from "./helpers"; // Zorg ervoor dat dit pad klopt

interface Step2Props {
  shelves: number;
  setShelves: (val: number) => void;
  maxShelvesAllowed: number;
  customLayout: boolean;
  setCustomLayout: (val: boolean) => void;
  shelfPositions: number[];
  setShelfPositions: (positions: number[]) => void;
  kickboardY: number;
  topBoardY: number;
  shelfThickness: number;
  calculateSpacesBetweenShelves: () => any[];
  activeShelf: number | null;
  setActiveShelf: (val: number | null) => void;
  numberOfDividers: number;
}

const Step2Planken: React.FC<Step2Props> = ({
  shelves,
  setShelves,
  maxShelvesAllowed,
  customLayout,
  setCustomLayout,
  shelfPositions,
  setShelfPositions,
  kickboardY,
  topBoardY,
  shelfThickness,
  calculateSpacesBetweenShelves,
  activeShelf,
  setActiveShelf,
  numberOfDividers,
}) => {
  const spacesBetween = calculateSpacesBetweenShelves();

  return (
    <div className="bg-white p-4 rounded-xl shadow mb-4">
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
        {shelves} {numberOfDividers > 0 ? "plankenrijen" : "planken"}
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
              const upperBound =
                idx === shelfPositions.length - 1 ? topBoardY - 20 : shelfPositions[idx + 1] - 20;
              const percentage = ((pos - lowerBound) / (upperBound - lowerBound)) * 100;
              const spaceAbove =
                idx < shelfPositions.length - 1
                  ? spacesBetween[idx + 1].space
                  : spacesBetween[spacesBetween.length - 1].space;
              const spaceBelow =
                idx > 0 ? spacesBetween[idx].space : spacesBetween[0].space;
              return (
                <div key={idx} className="mb-4 p-3 border border-gray-200 rounded-lg">
                  <div className="flex justify-between text-xs text-gray-600 mb-2">
                    <span className="font-medium">Plank {idx + 1}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>
                      Ruimte onder:{" "}
                      <span className="font-medium text-indigo-600">{spaceBelow} cm</span>
                    </span>
                    <span>
                      Ruimte boven:{" "}
                      <span className="font-medium text-indigo-600">{spaceAbove} cm</span>
                    </span>
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
                        // Propageren naar boven:
                        for (let i = idx + 1; i < newPositions.length; i++) {
                          if (newPositions[i] - newPositions[i - 1] < 20) {
                            newPositions[i] = newPositions[i - 1] + 20;
                          }
                        }
                        // Propageren naar beneden:
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
    </div>
  );
};

export default Step2Planken;