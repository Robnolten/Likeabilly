import React from "react";

interface Material {
  id: string;
  name: string;
  color: string;
  features: string[];
}

interface Step3MateriaalProps {
  material: string;
  setMaterial: (mat: string) => void;
  materials: Material[];
}

const Step3Materiaal: React.FC<Step3MateriaalProps> = ({
  material,
  setMaterial,
  materials,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow mb-4">
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
    </div>
  );
};

export default Step3Materiaal;