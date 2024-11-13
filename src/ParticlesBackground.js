import React from "react";
import Particles from "react-tsparticles";
import particlesconfig from "./particlesconfig";

function ParticlesBackground() {
  return (
    <Particles
      options={particlesconfig} // Make sure this is correctly configured
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1, // Ensure particles are in the background
      }}
    />
  );
}

export default ParticlesBackground;
