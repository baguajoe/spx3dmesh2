import React from "react";
import MotionCaptureSystem from "../../front/js/component/MotionCaptureSystem";
import MotionFromVideo from "../../front/js/component/MotionFromVideo";
import LiveMoCapAvatar from "../../front/js/component/LiveMoCapAvatar";
import PoseVisualization from "../../front/js/component/PoseVisualization";

import "../../front/styles/VideoMocap.css";

export default function MocapWorkspace(){

  return (
    <div className="mocap-workspace">

      <div className="mocap-left-panel">

        <h3>Capture</h3>

        <MotionCaptureSystem />

        <MotionFromVideo />

      </div>

      <div className="mocap-center-panel">

        <LiveMoCapAvatar />

        <PoseVisualization />

      </div>

      <div className="mocap-right-panel">

        <h3>Settings</h3>

        <label>
          <input type="checkbox" defaultChecked />
          Full Body
        </label>

        <label>
          <input type="checkbox" defaultChecked />
          Hands
        </label>

        <label>
          <input type="checkbox" defaultChecked />
          Face
        </label>

      </div>

    </div>
  );
}
