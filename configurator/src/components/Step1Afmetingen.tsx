import React from "react";

interface Step1Props {
  height: number;
  setHeight: (val: number) => void;
  width: number;
  setWidth: (val: number) => void;
  depth: number;
  setDepth: (val: number) => void;
  heightLimits: { min: number; max: number };
  widthLimits: { min: number; max: number };
  depthLimits: { min: number; max: number };
  errorDepth: string;
}

const Step1Afmetingen: React.FC<Step1Props> = ({
  height,
  setHeight,
  width,
  setWidth,
  depth,
  setDepth,
  heightLimits,
  widthLimits,
  depthLimits,
  errorDepth,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow mb-4">
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
    </div>
  );
};

export default Step1Afmetingen;