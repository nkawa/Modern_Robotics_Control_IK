import React from 'react';
import Assets from './Assets';
import { Select_Robot } from './Model';
import Controller from './webcontroller.js';
import StereoVideo from '../lib/stereoWebRTC.js';
import { AppMode } from './appmode.js';


const Line = (props) => {
  const { pos1 = { x: 0, y: 0, z: 0 }, pos2 = { x: 0, y: 0, z: 0 }, color = "magenta", opa = 1, visible = false, ...otherprops } = props;

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
    robot_model, rendered, robotProps, controllerProps,
    theta_tool,
    dsp_message, dsp_color,
    c_pos_x, c_pos_y, c_pos_z, c_deg_x, c_deg_y, c_deg_z,
    set_rtcStats, rtcStats_ref
    // position_ee, euler_ee, 
    // vr_controller_pos, vr_controller_euler,
  } = props;

  const rad2deg = rad => rad * 180 / Math.PI;
  // const euler_ee_deg = euler_ee.map(rad2deg);

  if (!rendered) {
    return (
      <a-scene xr-mode-ui="XRMode: xr">
        <Assets robot_model={robot_model} appmode={props.appmode} />
      </a-scene>
    );
  }

  // definition of the end link axes marker
  const axis_length = 0.210;
  const cyl_length = (axis_length / 2).toString();
  const cyl_hight = (axis_length).toString();
  const cyl_radius = '0.0035';
  const origin_marker_radius = '0.012';
  const origin_marker_size = `${origin_marker_radius} ${origin_marker_radius} ${origin_marker_radius}`;
  const origin_marker_color = 'blue';
  const end_link = (
    <a-entity end-link position={`0 0 0`} rotation={`0 0 0`}>
      <a-sphere
        scale={origin_marker_size}
        color={origin_marker_color}
        visible={true}>
      </a-sphere>
      <a-cylinder position={`${cyl_length} 0 0`} rotation={`0 0 -90`}
        height={cyl_hight} radius={cyl_radius} color="red" />
      <a-cylinder position={`0 ${cyl_length} 0`} rotation={`0 0 0`}
        height={cyl_hight} radius={cyl_radius} material='color: #00ff00' />
      <a-cylinder position={`0 0 ${cyl_length}`} rotation={`90 0 0`}
        height={cyl_hight} radius={cyl_radius} color="blue" />
    </a-entity>
  );
  // definition of the end link axes marker
  const con_axis_length = 0.100;
  const con_length = (con_axis_length / 2).toString();
  const con_hight = (con_axis_length).toString();
  const con_radius = '0.0035';
  const controller_axes = (
    <a-entity axes1 position={'0 1 0'} >
      <a-sphere
        scale="0.012 0.012 0.012"
        color="white"
        visible={true}>
      </a-sphere>
      <a-cylinder position={`${con_length} 0 0`} rotation={`0 0 -90`}
        height={con_hight} radius={con_radius} color="red" />
      <a-cylinder position={`0 ${con_length} 0`} rotation={`0 0 0`}
        height={con_hight} radius={con_radius} material='color: #00ff00' />
      <a-cylinder position={`0 0 ${con_length}`} rotation={`90 0 0`}
        height={con_hight} radius={con_radius} color="blue" />
    </a-entity>
  );

  let rtc_message = "";
  if (props.appmode===AppMode.withCam || props.appmode === AppMode.withDualCam){
      if (rtcStats_ref.current.length > 0) {
        rtc_message = ["WebRTC Stats:"];
        rtcStats_ref.current.forEach((stat, idx) => {
          rtc_message.push(`${stat}`);
        })
        rtc_message = rtc_message.join('\n')
      }
  }
  const base_position = '0.6 0.8 0.3'

  // console.log("dsp_message: ", dsp_message);
  return (
    <>
      <a-scene scene xr-mode-ui={`enabled: ${!(props.appmode===AppMode.viewer)?'true':'false'}; XRMode: xr`}>
      {  // ステレオカメラ使うか
      (props.appmode===AppMode.withCam || props.appmode === AppMode.withDualCam)?
        <StereoVideo rendered={rendered} set_rtcStats={set_rtcStats} stereo_visible='true'
          appmode={props.appmode}
       />: <></>       
      }


        {/* VR Controller */}
        <a-entity oculus-touch-controls="hand: right" vr-controller-right visible={true}></a-entity>
        <a-circle position={base_position} rotation="-90 0 0" radius={"0.3"} color={"#7BC8A4"} opacity="0.5"></a-circle>

        <Assets robot_model={robot_model} appmode={props.appmode} />

        {/* Robot */}
        <Select_Robot {...robotProps} />
        {/* Light */}
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="-1 1 1"></a-entity>
        <a-entity light="type: directional; color: #EEE; intensity: 0.25" position="-1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #EFE; intensity: 0.1" position="0 -1 0"></a-entity>
        <a-entity id="rig" position={`${c_pos_x} ${c_pos_y} ${c_pos_z}`} rotation={`${c_deg_x} ${c_deg_y} ${c_deg_z}`}>

          {/* Camera */}
          <a-camera id="camera" cursor="rayOrigin: mouse;" position="0 0 0">
            {/*
            <a-entity
              text={`value: ${dsp_message}; color: ${dsp_color}; backgroundColor: rgb(31, 219, 131); border: #000000; whiteSpace: pre`}
              position="0 0.35 -1.4"
            />*/}
            <a-entity
                text={`value: ${rtc_message}; color: gray; backgroundColor: rgb(31, 219, 131); border: #000000; whiteSpace: pre`}
                position="0 0.35 -1.4" 
             />

          </a-camera>
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

        {/* End Link */}
        {end_link}
        {/* End Link Axes */}
        {controller_axes}
      </a-scene>
      {/*     <Controller {...controllerProps} />       
       <div className="footer">
        <div>{`add information here`}</div>
      </div>
      */
      }
    </>
  );
}
