import { registerPanel } from "./registry/panelRegistry";

import ShaderNodeEditorPanel from "../components/panels/ShaderNodeEditorPanel.jsx";
import FilmLUTPackPanel from "../components/panels/FilmLUTPackPanel.jsx";
import MetaHumanSkinPanel from "../components/panels/MetaHumanSkinPanel.jsx";
import GroomBrushPanel from "../components/panels/GroomBrushPanel.jsx";
import GeometryNodeStylePanel from "../components/panels/GeometryNodeStylePanel.jsx";
import SkinDepthPanel from "../components/panels/SkinDepthPanel.jsx";
import BraidGeneratorPanel from "../components/panels/BraidGeneratorPanel.jsx";
import FadeToolPanel from "../components/panels/FadeToolPanel.jsx";
import HairCardLODPanel from "../components/panels/HairCardLODPanel.jsx";
import GeometryNodePresetPanel from "../components/panels/GeometryNodePresetPanel.jsx";
import ParametricGeneratorPanel from "../components/panels/ParametricGeneratorPanel.jsx";

let registered = false;

export function registerAllPanels() {
  if (registered) return;
  registered = true;

  registerPanel("shader_node_editor", ShaderNodeEditorPanel, { title: "Shader Node Editor", group: "shader" });
  registerPanel("film_lut_pack", FilmLUTPackPanel, { title: "Film LUT Pack", group: "shader" });
  registerPanel("meta_human_skin", MetaHumanSkinPanel, { title: "MetaHuman Skin", group: "skin" });
  registerPanel("groom_brush", GroomBrushPanel, { title: "Groom Brush", group: "hair" });
  registerPanel("geometry_node_style", GeometryNodeStylePanel, { title: "Geometry Node Style", group: "geometry" });
  registerPanel("skin_depth", SkinDepthPanel, { title: "Skin Depth", group: "skin" });
  registerPanel("braid_generator", BraidGeneratorPanel, { title: "Braid Generator", group: "hair" });
  registerPanel("fade_tool", FadeToolPanel, { title: "Fade Tool", group: "hair" });
  registerPanel("hair_card_lod", HairCardLODPanel, { title: "Hair Card LOD", group: "hair" });
  registerPanel("geometry_node_preset", GeometryNodePresetPanel, { title: "Geometry Node Preset", group: "geometry" });
  registerPanel("parametric_generator", ParametricGeneratorPanel, { title: "Parametric Generator", group: "geometry" });
}
