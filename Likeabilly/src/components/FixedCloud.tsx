import React, { memo } from "react";
import { Cloud } from "@react-three/drei";

const FixedCloud = memo(({ height }) => {
  return (
    <Cloud 
      opacity={0.2}
      color="#f183ed"
      speed={0.75}
      width={25}
      depth={2}
      segments={70}
      position={[-5, -height * 0.45, -2]} // Zorg dat de Cloud achter de kast staat
      scale={[15, 10, 10]}
    />
  );
});

export default FixedCloud;