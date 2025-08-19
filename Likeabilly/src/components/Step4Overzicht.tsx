import React from "react";

interface Step4Props {
  height: number;
  width: number;
  depth: number;
  shelves: number;
  totalShelfCount: number;
  material: string;
  prijs: string;
  customLayout: boolean;
}

const Step4Overzicht: React.FC<Step4Props> = ({
  height,
  width,
  depth,
  shelves,
  totalShelfCount,
  material,
  prijs,
  customLayout,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow mb-4">
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
            <span className="font-medium">
              {totalShelfCount}
              {customLayout ? " (aangepaste indeling)" : ""}
            </span>
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
    </div>
  );
};

export default Step4Overzicht;