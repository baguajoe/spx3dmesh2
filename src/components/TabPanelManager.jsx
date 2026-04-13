import React from "react";
import FloatPanel from "./ui/FloatPanel.jsx";

// SURFACE
import UVEditorPanel from "./uv/UVEditorPanel.jsx";
import MaterialPanel from "./materials/MaterialPanel.jsx";
import TexturePaintPanel from "./materials/TexturePaintPanel.jsx";
import NodeMaterialEditor from "./panels/NodeMaterialEditor.jsx";
import ClothingPanel from "./clothing/ClothingPanel.jsx";
import HairPanel from "./hair/HairPanel.jsx";
import DisplacementPanel from "./panels/DisplacementPanel.jsx";

// RIG
import AutoRigPanel from "./rig/AutoRigPanel.jsx";
import AdvancedRigPanel from "./rig/AdvancedRigPanel.jsx";
import MocapRetargetPanel from "./panels/MocapRetargetPanel.jsx";
import GamepadAnimator from "./animation/GamepadAnimator.jsx";

// RENDER
import CinematicLightingPanel from "./panels/CinematicLightingPanel.jsx";
import LightingCameraPanel from "./scene/LightingCameraPanel.jsx";
import FilmCameraPanel from "./panels/FilmCameraPanel.jsx";
import FilmVolumetricsPanel from "./panels/FilmVolumetricsPanel.jsx";
import FilmPathTracerPanel from "./panels/FilmPathTracerPanel.jsx";
import FilmPostPanel from "./panels/FilmPostPanel.jsx";

// FX
import ClothSimPanel from "./panels/ClothSimPanel.jsx";
import FluidPanel from "./vfx/FluidPanel.jsx";
import WeatherPanel from "./vfx/WeatherPanel.jsx";
import DestructionPanel from "./vfx/DestructionPanel.jsx";
import PhysicsSimulation from "./generators/PhysicsSimulation.jsx";

// WORLD
import EnvironmentGenerator from "./generators/EnvironmentGenerator.jsx";
import TerrainSculpting from "./generators/TerrainSculpting.jsx";
import CityGenerator from "./generators/CityGenerator.jsx";
import ProceduralCrowdGenerator from "./generators/ProceduralCrowdGenerator.jsx";

// GEN
import ProMeshPanel from "./mesh/ProMeshPanel.jsx";
import SPX3DTo2DPanel from "./pipeline/SPX3DTo2DPanel.jsx";

export default function TabPanelManager({
  // refs
  sceneRef, meshRef, cameraRef, rendererRef, setStatus,
  // state
  uvPanelOpen, setUvPanelOpen,
  materialPanelOpen, setMaterialPanelOpen,
  paintPanelOpen, setPaintPanelOpen,
  nodeEditorOpen, setNodeEditorOpen,
  clothingPanelOpen, setClothingPanelOpen,
  hairPanelOpen, setHairPanelOpen,
  displacementOpen, setDisplacementOpen,
  autoRigOpen, setAutoRigOpen,
  advancedRigOpen, setAdvancedRigOpen,
  mocapRetargetOpen, setMocapRetargetOpen,
  gamepadOpen, setGamepadOpen,
  cinLightOpen, setCinLightOpen,
  lightingCameraPanelOpen, setLightingCameraPanelOpen,
  filmCameraOpen, setFilmCameraOpen,
  filmVolOpen, setFilmVolOpen,
  filmPTOpen, setFilmPTOpen,
  filmPostOpen, setFilmPostOpen,
  clothSimOpen, setClothSimOpen,
  fluidPanelOpen, setFluidPanelOpen,
  weatherPanelOpen, setWeatherPanelOpen,
  destructionPanelOpen, setDestructionPanelOpen,
  physicsOpen, setPhysicsOpen,
  envGenOpen, setEnvGenOpen,
  terrainOpen, setTerrainOpen,
  cityGenOpen, setCityGenOpen,
  crowdGenOpen, setCrowdGenOpen,
  proMeshOpen, setProMeshOpen,
  style3DTo2DOpen, setStyle3DTo2DOpen,
  cameras, handleApplyFunction,
  currentFrame, setCurrentFrame,
  isPlaying, setIsPlaying,
}) {
  return (
    <>
      {/* SURFACE */}
      {uvPanelOpen && <UVEditorPanel open={uvPanelOpen} onClose={() => setUvPanelOpen(false)} />}
      {materialPanelOpen && <FloatPanel title="MATERIAL" onClose={() => setMaterialPanelOpen(false)} width={480}><MaterialPanel open={materialPanelOpen} onClose={() => setMaterialPanelOpen(false)} meshRef={meshRef} /></FloatPanel>}
      {paintPanelOpen && <FloatPanel title="TEXTURE PAINT" onClose={() => setPaintPanelOpen(false)} width={500}><TexturePaintPanel open={paintPanelOpen} onClose={() => setPaintPanelOpen(false)} meshRef={meshRef} /></FloatPanel>}
      {nodeEditorOpen && <FloatPanel title="NODE MATERIAL" onClose={() => setNodeEditorOpen(false)} width={700}><NodeMaterialEditor open={nodeEditorOpen} onClose={() => setNodeEditorOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} /></FloatPanel>}
      {clothingPanelOpen && <FloatPanel title="CLOTHING" onClose={() => setClothingPanelOpen(false)} width={480}><ClothingPanel open={clothingPanelOpen} onClose={() => setClothingPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} /></FloatPanel>}
      {hairPanelOpen && <FloatPanel title="HAIR" onClose={() => setHairPanelOpen(false)} width={480}><HairPanel open={hairPanelOpen} onClose={() => setHairPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} /></FloatPanel>}
      {displacementOpen && <FloatPanel title="DISPLACEMENT" onClose={() => setDisplacementOpen(false)} width={420}><DisplacementPanel open={displacementOpen} onClose={() => setDisplacementOpen(false)} meshRef={meshRef} setStatus={setStatus} /></FloatPanel>}

      {/* RIG */}
      {autoRigOpen && <FloatPanel title="AUTO RIG" onClose={() => setAutoRigOpen(false)} width={480}><AutoRigPanel open={autoRigOpen} onClose={() => setAutoRigOpen(false)} sceneRef={sceneRef} setStatus={setStatus} /></FloatPanel>}
      {advancedRigOpen && <FloatPanel title="ADVANCED RIG" onClose={() => setAdvancedRigOpen(false)} width={480}><AdvancedRigPanel open={advancedRigOpen} onClose={() => setAdvancedRigOpen(false)} sceneRef={sceneRef} setStatus={setStatus} /></FloatPanel>}
      {mocapRetargetOpen && <FloatPanel title="MOCAP RETARGET" onClose={() => setMocapRetargetOpen(false)} width={480}><MocapRetargetPanel open={mocapRetargetOpen} onClose={() => setMocapRetargetOpen(false)} sceneRef={sceneRef} setStatus={setStatus} /></FloatPanel>}
      {gamepadOpen && <FloatPanel title="GAMEPAD ANIMATOR" onClose={() => setGamepadOpen(false)} width={520}><GamepadAnimator open={gamepadOpen} onClose={() => setGamepadOpen(false)} sceneRef={sceneRef} meshRef={meshRef} setStatus={setStatus} onApplyFunction={handleApplyFunction} currentFrame={currentFrame} setCurrentFrame={setCurrentFrame} isPlaying={isPlaying} setIsPlaying={setIsPlaying} /></FloatPanel>}

      {/* RENDER */}
      {cinLightOpen && <FloatPanel title="CINEMATIC LIGHTING" onClose={() => setCinLightOpen(false)} width={480}><CinematicLightingPanel open={cinLightOpen} onClose={() => setCinLightOpen(false)} sceneRef={sceneRef} /></FloatPanel>}
      {lightingCameraPanelOpen && <FloatPanel title="LIGHTING & CAMERA" onClose={() => setLightingCameraPanelOpen(false)} width={520}><LightingCameraPanel open={lightingCameraPanelOpen} onClose={() => setLightingCameraPanelOpen(false)} sceneRef={sceneRef} cameraRef={cameraRef} cameras={cameras} onApplyFunction={handleApplyFunction} /></FloatPanel>}
      {filmCameraOpen && <FloatPanel title="FILM CAMERA" onClose={() => setFilmCameraOpen(false)} width={480}><FilmCameraPanel open={filmCameraOpen} onClose={() => setFilmCameraOpen(false)} cameraRef={cameraRef} rendererRef={rendererRef} sceneRef={sceneRef} /></FloatPanel>}
      {filmVolOpen && <FloatPanel title="VOLUMETRICS" onClose={() => setFilmVolOpen(false)} width={480}><FilmVolumetricsPanel open={filmVolOpen} onClose={() => setFilmVolOpen(false)} sceneRef={sceneRef} /></FloatPanel>}
      {filmPTOpen && <FloatPanel title="PATH TRACER" onClose={() => setFilmPTOpen(false)} width={480}><FilmPathTracerPanel open={filmPTOpen} onClose={() => setFilmPTOpen(false)} rendererRef={rendererRef} sceneRef={sceneRef} cameraRef={cameraRef} /></FloatPanel>}
      {filmPostOpen && <FloatPanel title="POST FX" onClose={() => setFilmPostOpen(false)} width={480}><FilmPostPanel open={filmPostOpen} onClose={() => setFilmPostOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} setStatus={setStatus} /></FloatPanel>}

      {/* FX */}
      {clothSimOpen && <FloatPanel title="CLOTH SIM" onClose={() => setClothSimOpen(false)} width={420}><ClothSimPanel open={clothSimOpen} onClose={() => setClothSimOpen(false)} sceneRef={sceneRef} setStatus={setStatus} /></FloatPanel>}
      {fluidPanelOpen && <FloatPanel title="FLUID" onClose={() => setFluidPanelOpen(false)} width={420}><FluidPanel open={fluidPanelOpen} onClose={() => setFluidPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} /></FloatPanel>}
      {weatherPanelOpen && <FloatPanel title="WEATHER" onClose={() => setWeatherPanelOpen(false)} width={420}><WeatherPanel open={weatherPanelOpen} onClose={() => setWeatherPanelOpen(false)} sceneRef={sceneRef} setStatus={setStatus} /></FloatPanel>}
      {destructionPanelOpen && <FloatPanel title="DESTRUCTION" onClose={() => setDestructionPanelOpen(false)} width={420}><DestructionPanel open={destructionPanelOpen} onClose={() => setDestructionPanelOpen(false)} sceneRef={sceneRef} meshRef={meshRef} setStatus={setStatus} onApplyFunction={handleApplyFunction} /></FloatPanel>}
      {physicsOpen && <FloatPanel title="PHYSICS" onClose={() => setPhysicsOpen(false)} width={700} defaultX={100} defaultY={60}><PhysicsSimulation /></FloatPanel>}

      {/* WORLD */}
      {envGenOpen && <FloatPanel title="ENVIRONMENT GENERATOR" onClose={() => setEnvGenOpen(false)} width={700} defaultX={100} defaultY={60}><EnvironmentGenerator /></FloatPanel>}
      {terrainOpen && <FloatPanel title="TERRAIN SCULPTING" onClose={() => setTerrainOpen(false)} width={700} defaultX={100} defaultY={60}><TerrainSculpting /></FloatPanel>}
      {cityGenOpen && <FloatPanel title="CITY GENERATOR" onClose={() => setCityGenOpen(false)} width={700} defaultX={100} defaultY={60}><CityGenerator /></FloatPanel>}
      {crowdGenOpen && <FloatPanel title="CROWD GENERATOR" onClose={() => setCrowdGenOpen(false)} width={700} defaultX={100} defaultY={60}><ProceduralCrowdGenerator /></FloatPanel>}

      {/* GEN */}
      {proMeshOpen && <FloatPanel title="PRO MESH" onClose={() => setProMeshOpen(false)} width={700} defaultX={100} defaultY={60}><ProMeshPanel open={proMeshOpen} onClose={() => setProMeshOpen(false)} meshRef={meshRef} sceneRef={sceneRef} setStatus={setStatus} onApplyFunction={handleApplyFunction} /></FloatPanel>}
      {style3DTo2DOpen && <FloatPanel title="3D TO 2D STYLE" onClose={() => setStyle3DTo2DOpen(false)} width={700} defaultX={100} defaultY={60}><SPX3DTo2DPanel open={style3DTo2DOpen} onClose={() => setStyle3DTo2DOpen(false)} sceneRef={sceneRef} rendererRef={rendererRef} cameraRef={cameraRef} /></FloatPanel>}
    </>
  );
}
