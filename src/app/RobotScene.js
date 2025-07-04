import React from 'react';
import Assets from './Assets';
import { Select_Robot } from './Model';
import Controller from './webcontroller.js';

const Line = (props) => {
  const { pos1={x:0,y:0,z:0}, pos2={x:0,y:0,z:0}, color="magenta", opa=1, visible=false, ...otherprops } = props;

  const line_para = `start: ${pos1.x} ${pos1.y} ${pos1.z}; end: ${pos2.x} ${pos2.y} ${pos2.z}; color: ${color}; opacity: ${opa};`

  return <a-entity
      {...otherprops}
      line={line_para}
      position={`0 0 0`}
      visible={`${visible}`}
  ></a-entity>
}

export default function RobotScene(props) {
  const {
    robot_model, rendered, target_error, robotProps, controllerProps, dsp_message,
    c_pos_x, c_pos_y, c_pos_z, c_deg_x, c_deg_y, c_deg_z, 
    position_ee, euler_ee, 
    // vr_controller_pos, vr_controller_euler,
  } = props;

  const rad2deg = rad => rad * 180 / Math.PI;
  const euler_ee_deg = euler_ee.map(rad2deg);

  if (!rendered) {
    return (
      <a-scene xr-mode-ui="XRMode: ar">
        <Assets robot_model={robot_model} viewer={props.viewer}/>
      </a-scene>
    );
    }

  return (
    <>
      <a-scene scene xr-mode-ui="XRMode: ar">
        {/* VR Controller */}
        <a-entity oculus-touch-controls="hand: right" vr-controller-right visible={true}></a-entity>

        <Assets robot_model={robot_model} viewer={props.viewer} monitor={props.monitor}/>

        {/* Robot */}
        <Select_Robot {...robotProps}/>

        {/* Light */}
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="-1 1 1"></a-entity>
        <a-entity light="type: directional; color: #EEE; intensity: 0.25" position="-1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #EFE; intensity: 0.1" position="0 -1 0"></a-entity>
        <a-entity id="rig" position={`${c_pos_x} ${c_pos_y} ${c_pos_z}`} rotation={`${c_deg_x} ${c_deg_y} ${c_deg_z}`}>

          {/* Camera */}
          <a-camera id="camera" cursor="rayOrigin: mouse;" position="0 0 0">
            <a-entity jtext={`text: ${dsp_message}; color: black; background:rgb(31, 219, 131); border: #000000`} position="0 0.7 -1.4"></a-entity>
          </a-camera>

          {/* End Effector */}
          </a-entity>
          <a-sphere 
            position={`${position_ee[0]} ${position_ee[1]} ${position_ee[2]}`} 
            scale="0.012 0.012 0.012" 
            color={target_error ? "red" : "yellow"} 
            visible={true}>
          </a-sphere>
          <a-entity
            position={`${position_ee[0]} ${position_ee[1]} ${position_ee[2]}`}

            // ZYZ
            // rotation={`${euler_ee_deg[0]} ${-euler_ee_deg[2]} ${-euler_ee_deg[1]} `}
            // rotation={`${euler_ee_deg[0]} ${euler_ee_deg[1]} ${-euler_ee_deg[2]} `}

            // ZYX
            rotation={`${euler_ee_deg[0]} ${-euler_ee_deg[2]} ${-euler_ee_deg[1]} `}
          >
            {/* ZYZ */}
            {/*
            <a-cylinder position="0 0 -0.015" rotation="90 0 0" height="0.0250" radius="0.0015" color="red" />
            <a-cylinder position="-0.015 0 0" rotation="0 0 90" height="0.0250" radius="0.0015" color="green" />
            <a-cylinder position="0 0.025 0" rotation="0 90 0" height="0.0550" radius="0.0015" color="blue" />
            */}
            {/* ZYX */}
            <a-cylinder position="0      0 -0.015" rotation="90 0  0 " height="0.0250" radius="0.0015" color="red" /> 
            <a-cylinder position="-0.015 0      0" rotation="0  0 90" height="0.0250" radius="0.0015" material="color: #00ff00" />
            <a-cylinder position="0      0.025  0" rotation="0  90 0 " height="0.0550" radius="0.0015" color="blue" />
          </a-entity>

          {/* VR Controller Pose */}
          {/* <a-square 
            position={`${vr_controller_pos[0]} ${vr_controller_pos[1]} ${vr_controller_pos[2]}`} 
            rotation={`${vr_controller_euler[0]} ${vr_controller_euler[1]} ${vr_controller_euler[2]}`}
            color="green" 
            visible={true}>
          </a-square>
          <a-entity
            position={`${vr_controller_pos[0]} ${vr_controller_pos[1]} ${vr_controller_pos[2]}`} 
            rotation={`${vr_controller_euler[0]} ${vr_controller_euler[1]} ${vr_controller_euler[2]}`}
          >
            <a-cylinder position="0 0 -0.015" rotation="90 0 0" height="0.0250" radius="0.0015" color="red" />
            <a-cylinder position="-0.015 0 0" rotation="0 0 90" height="0.0250" radius="0.0015" color="green" />
            <a-cylinder position="0 0.025 0" rotation="0 90 0" height="0.0550" radius="0.0015" color="green" />
          </a-entity> */}


          {/* World Space */}
          {/* <Line pos1={{x:0,y:0,z:0}} pos2={{x:0,y:0,z:0.2}} color="blue" visible={true} /> 
          <Line pos1={{x:0,y:0,z:0}} pos2={{x:0.2,y:0,z:0}} color="red" visible={true} />   
          <Line pos1={{x:0,y:0,z:0}} pos2={{x:0,y:0.2,z:0}}  color="green" visible={true} />  */}
         
      </a-scene>
      <Controller {...controllerProps}/>
      <div className="footer">
        <div>{`add information here`}</div>
      </div>
    </>
  );
}
