import SceneHierarchyPanel from "../components/panels/SceneHierarchyPanel";
import AssetPipelinePanel from "../components/panels/AssetPipelinePanel";
import ShaderGraphPanel from "../components/panels/ShaderGraphPanel";
import SceneGraphPanel from "../components/panels/SceneGraphPanel";
import UndoHistoryPanel from "../components/panels/UndoHistoryPanel";
import ShaderNodeEditorPanel from "../components/panels/ShaderNodeEditorPanel";
import FilmLUTPackPanel from "../components/panels/FilmLUTPackPanel";
import MetaHumanSkinPanel from "../components/panels/MetaHumanSkinPanel";
import GroomBrushPanel from "../components/panels/GroomBrushPanel";
import GeometryNodeStylePanel from "../components/panels/GeometryNodeStylePanel";
import SkinDepthPanel from "../components/panels/SkinDepthPanel";
import BraidGeneratorPanel from "../components/panels/BraidGeneratorPanel";
import FadeToolPanel from "../components/panels/FadeToolPanel";
import HairCardLODPanel from "../components/panels/HairCardLODPanel";
import GeometryNodePresetPanel from "../components/panels/GeometryNodePresetPanel";
import ParametricGeneratorPanel from "../components/panels/ParametricGeneratorPanel";

export const PANEL_REGISTRY = {
  undo_history: UndoHistoryPanel,
  scene_graph: SceneGraphPanel,
  scene_hierarchy: SceneHierarchyPanel,
  shader_graph: ShaderGraphPanel,
  asset_pipeline: AssetPipelinePanel,

  undo_history: UndoHistoryPanel,
  scene_graph: SceneGraphPanel,
  shader_graph: ShaderGraphPanel,
  asset_pipeline: AssetPipelinePanel,

  shader_nodes: ShaderNodeEditorPanel,
  film_lut: FilmLUTPackPanel,
  meta_skin: MetaHumanSkinPanel,
  groom_brush: GroomBrushPanel,
  geo_nodes: GeometryNodeStylePanel,
  skin_depth: SkinDepthPanel,
  braid_generator: BraidGeneratorPanel,
  fade_tool: FadeToolPanel,
  hair_lod: HairCardLODPanel,
  geo_preset: GeometryNodePresetPanel,
  parametric_generator: ParametricGeneratorPanel,
};

export function registerAllPanels() {
  window.SPXPanels = PANEL_REGISTRY;

  window.openSPXPanel = (panelId) => {
    window.dispatchEvent(
      new CustomEvent("spx-open-panel", {
        detail: { panelId }
      })
    );
  };

  window.openSPXDockPanel = (panelId, zone = "right") => {
    window.dispatchEvent(
      new CustomEvent("spx-open-panel", {
        detail: { panelId, zone, mode: "dock" }
      })
    );
  };
}
