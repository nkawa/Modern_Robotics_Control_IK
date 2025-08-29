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

const nostats = (process.env.NEXT_PUBLIC_SHOW_STATS || "YES")=="NO"
console.log("Nostat:",nostats)

function getWorldEuler(obj, order = 'XYZ'){
  // 親まで含めた最新のワールド行列を更新
  if(obj){
    obj.updateMatrixWorld(true);
  // ワールド姿勢をクォータニオンで取得
    const qWorld = new THREE.Quaternion();
    obj.getWorldQuaternion(qWorld);

  // クォータニオン→オイラー（順序は必要に応じて指定）
    const eWorld = new THREE.Euler(0, 0, 0, order);
    eWorld.setFromQuaternion(qWorld, order);

    return eWorld; // ラジアン
  }
  return null;
}
  const round = (x, d = 5) => {
    const v = 10 ** (d | 0)
    return Math.round(x * v) / v
  }
  const normalize180 = (angle) => {
    if (Math.abs(angle) === 180) {
      return angle
    }
    return ((angle + 180) % 360 + 360) % 360 - 180
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

  // 前後のずれを可視化したい
  const FrontLine = ()=> {
    //ガイドを表示したい
    const flink = document.getElementById('final_link');
    if (flink){
      const we = getWorldEuler(flink.getObject3D("mesh"))
      if (we){
      we.z = we.z + Math.PI/4;
      const angleX = THREE.MathUtils.radToDeg(we.x)-90
      const angleY = -THREE.MathUtils.radToDeg(we.y)
      const angleZ = normalize180(THREE.MathUtils.radToDeg(we.z)+180)
      const zx = Math.cos(-we.z)*0.12
      const zy = Math.sin(-we.z)*0.12
      return {
        angleStr:`${round(angleX,1)},${round(angleY,1)},${round(angleZ,1)}`,
        zPosL: `${zx-0.25} ${zy+0.1} -0.799`,
        zPosR: `${-zx-0.25} ${-zy+0.1} -0.799`,
        zRot : `0 0 ${90-angleZ}`,
        yPos: `${angleY/45-0.25} 0.24 -0.799`,
        xPos: `-0.056 ${angleX/45+0.1} -0.799`
       }
      }
    }
      return {
        angleStr:"",
        zPosL: "-0.27  0.1 -0.799",
        zPosR: "-0.13  0.1 -0.799",
        zRot : "0 0 90",
        yPos:  "0.25 0.24 -0.799",
        xPos:  "-0.056 0.1 -0.799"
      }
    
  }
  const {angleStr , yPos, xPos, zPosL, zPosR, zRot}= FrontLine()

  const frontLineObj =( <>
                <a-plane position="-0.25 0.24 -0.7995" rotation="0 0 90" width="0.013" height="0.003" color="blue" />
              <a-plane position={yPos} rotation="0 0 90" width="0.015" height="0.005" color="red" />
              <a-plane position={xPos} rotation="0 0 90" width="0.005" height="0.015" color="red" />
              <a-plane position="-0.056  0.1 -0.7995" rotation="0 0 90" width="0.003" height="0.013" color="blue" />

              <a-plane position={zPosL} rotation={zRot} width="0.005" height="0.018" color="pink" opacity="0.9" />
              <a-plane position={zPosR} rotation={zRot} width="0.005" height="0.018" color="pink" opacity="0.9" />
  </>)

  // definition of the end link axes marker
  const axis_length = 0.050;
  const cyl_length = (axis_length / 2).toString();
  const cyl_height = (axis_length).toString();
  const cyl_radius = '0.0035';
  const origin_marker_radius = '0.008';
  const origin_marker_size = `${origin_marker_radius} ${origin_marker_radius} ${origin_marker_radius}`;
  const origin_marker_color = 'blue';
  const opacity = "0.3";
  const end_link = (//  end-link component で重要な作業をしているので、これは必須
    <a-entity end-link position={`0 0 0`} rotation={`0 0 0`}>{/*
      <a-sphere
        scale={origin_marker_size}
        color={origin_marker_color}
        opacity={opacity}>
      </a-sphere>
      <a-cylinder position={`${cyl_length} 0 0`} rotation={`0 0 -90`}
        height={cyl_height} radius={cyl_radius} color="red" opacity={opacity} />
      <a-cylinder position={`0 ${cyl_length} 0`} rotation={`0 0 0`}
        height={cyl_height} radius={cyl_radius} material='color: #00ff00' opacity={opacity} />
      <a-cylinder position={`0 0 ${cyl_length}`} rotation={`90 0 0`}
        height={cyl_height} radius={cyl_radius} color="blue" opacity={opacity} />
        */}
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

    // practice 対応のロボットの下の部分
  const RobotBase = (props) => {
//    const offsetX = props.base_position - 0.50;// 本来は base_position から計算すべき！

    if (props.appmode === AppMode.practice) { // 練習モードでは、四角い枠
//          material={(props.target_error ? "color:#ff7f50;" : "color:#7BC8A4;") + " opacity: 0.7;"}>
//          material="color:#7BC8A4; opacity: 0.7;">
//        <a-entity id="robotBase" position={`0.25 0.69 0.35`} rotation="0 0 0" 
      return (
         <a-box id="robotBase" position={`0.25 0.74 0.20`}  rotation="0 0 0" shadow="receive: true;"
          width="1.2" height="0.02" depth="0.7" color={props.target_error ? "#ff7f50" : "#7BC8A4"}
          opacity="0.7"></a-box>
      )
//        <a-entity id="robotBase" position={`0.25 0.74 0.20`} rotation="0 0 0" 
 //         geometry="primitive: box; width: 1.2; height: 0.02; depth: 0.7;"
  //        material={(props.target_error ? "color: #ff7f50;" : "color: #7bc8a4;") + " opacity: 0.7;"}>
   //     </a-entity>
    } else {
      return (
        <a-circle position={props.base_position} rotation="-90 0 0" radius={"0.3"} color={props.target_error ? "#ff7f50" : "#7BC8A4"} opacity="0.5"></a-circle>
      )
    }
  }

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
//  const base_position = '0.6 0.8 0.3'

  // console.log("dsp_message: ", dsp_message);
  return (
    <>
      <a-scene scene xr-mode-ui={`enabled: ${!(props.appmode===AppMode.viewer)?'true':'false'}; XRMode: xr`}>
      {  // ステレオカメラ使うか
      (props.appmode===AppMode.withCam || props.appmode === AppMode.withDualCam || props.appmode === AppMode.monitor)?
        <StereoVideo rendered={rendered} set_rtcStats={set_rtcStats} stereo_visible='true'
          appmode={props.appmode}
       />: <></>       
      }


        {/* VR Controller */}
        <a-entity oculus-touch-controls="hand: right; model: false" vr-controller-right visible={false}></a-entity>
        {/*
        <a-circle position={robotProps.base_position} rotation="-90 0 0" radius={"0.3"} color={"#7BC8A4"} opacity="0.5"></a-circle>
        */}
        <RobotBase target_error={props.target_error} base_position={robotProps.base_position} appmode={props.appmode} />
        <Assets robot_model={robot_model} appmode={props.appmode} />

        {/* Robot */}
        <Select_Robot appmode={props.appmode} {...robotProps}  />
        {/* Light */}
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="-1 1 1"></a-entity>
        <a-entity light="type: directional; color: #EEE; intensity: 0.25" position="-1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #FFF; intensity: 0.25" position="1 1 -1"></a-entity>
        <a-entity light="type: directional; color: #EFE; intensity: 0.1" position="0 -1 0"></a-entity>
        <a-entity id="rig" position={`${c_pos_x} ${c_pos_y} ${c_pos_z}`} rotation={`${c_deg_x} ${c_deg_y} ${c_deg_z}`}>

          {/* Camera */}
          <a-camera id="camera" fov="60" zoom="0.9" cursor="rayOrigin: mouse;" position="0 0 0" stereocam>
            {/* WebRTC Stat
            <a-entity
              text={`value: ${dsp_message}; color: ${dsp_color}; backgroundColor: rgb(31, 219, 131); border: #000000; whiteSpace: pre`}
              position="0 0.35 -1.4"
            />*/}
            <a-entity id="UIBack">
                 {(props.appmode === AppMode.practice) ?
                  <a-plane id="virtualMonitor" position='-0.25 .1 -0.8' scale='0.25 0.25 1' width='1.6' height='1.2'
                  material="shader: standard" visible="true"></a-plane>:
                  <></>
                  }
            </a-entity>
            {frontLineObj}
            {nostats?<></>:
            <a-entity
                text={`value: ${rtc_message}; color: gray; backgroundColor: rgb(31, 219, 131); border: #000000; whiteSpace: pre`}
                position="0 0.35 -1.4" 
             />
            }

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
        {/* End Link Axes 
        {controller_axes}*/}
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
