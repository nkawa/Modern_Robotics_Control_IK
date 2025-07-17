"use client";
import 'aframe'
import * as React from 'react'
import RobotScene from './RobotScene';
import registerAframeComponents from './registerAframeComponents'; 
import useMqtt from './useMqtt';
import { mqttclient,idtopic, publishMQTT, codeType } from '../lib/MetaworkMQTT'

const THREE = window.AFRAME.THREE;
const mr = require('../modern_robotics/modern_robotics_core.js');
// const RobotKinematics = require('../modern_robotics/modern_robotics_Kinematics.js');
const RobotDynamcis = require('../modern_robotics/modern_robotics_Dynamics.js');

// Load Robot Model
// const robot_model = "agilex_piper"; // Change this to your robot model
const robot_model = "jaka_zu_5"; // Change this to your robot model

const rk = new RobotDynamcis(robot_model);
const M = rk.get_M();
const Mlist = rk.get_Mlist();
const Glist = rk.get_Glist();
const Slist = rk.get_Slist();
const Kplist = rk.get_Kplist(); 
const Kilist = rk.get_Kilist(); 
const Kdlist = rk.get_Kdlist(); 
const jointLimits = rk.jointLimits;
const toolLimit = rk.toolLimit;
const Blist = mr.SlistToBlist(M, Slist); // Convert Slist to Blist

// MQTT Topics
const MQTT_REQUEST_TOPIC = "mgr/request";
const MQTT_DEVICE_TOPIC = "dev/" + idtopic;
const MQTT_CTRL_TOPIC = "control/"; 
const MQTT_ROBOT_STATE_TOPIC = "robot/";

export default function DynamicHome(props) {
  const [now, setNow] = React.useState(new Date())
  const [rendered,set_rendered] = React.useState(false)
  const robotNameList = ["Model"]
  const [robotName,set_robotName] = React.useState(robotNameList[0])

  const [target_error,set_target_error] = React.useState(false)

  const vrModeRef = React.useRef(false); 
  const [trigger_on,set_trigger_on] = React.useState(false)
  const [grip_on, set_grip_on] = React.useState(false)
  const [button_a_on, set_button_a_on] = React.useState(false)
  const [button_b_on, set_button_b_on] = React.useState(false)
  const [controller_object, set_controller_object] = React.useState(() => {
    const controller_object = new THREE.Object3D();
    return controller_object;
    });

  const [selectedMode, setSelectedMode] = React.useState('control'); 
  const robotIDRef = React.useRef(idtopic); 

  // VR camera pose
  const [c_pos_x,set_c_pos_x] = React.useState(0.23)
  const [c_pos_y,set_c_pos_y] = React.useState(0.3)
  const [c_pos_z,set_c_pos_z] = React.useState(-0.6)
  const [c_deg_x,set_c_deg_x] = React.useState(0)
  const [c_deg_y,set_c_deg_y] = React.useState(150)
  const [c_deg_z,set_c_deg_z] = React.useState(0)

  const [dsp_message,set_dsp_message] = React.useState("")

  // Robot Tool
  const toolNameList = ["No tool"]
  const [toolName,set_toolName] = React.useState(toolNameList[0])

  // Frame ID
  const reqIdRef = React.useRef()
  
  // Animation loop
  const loop = ()=>{
    reqIdRef.current = window.requestAnimationFrame(loop) 
  }
  React.useEffect(() => {
    loop()
    return () => window.cancelAnimationFrame(reqIdRef.current) 
  },[])

  // Change Robot
  const robotChange = ()=>{
    const get = (robotName)=>{
      let changeIdx = robotNameList.findIndex((e)=>e===robotName) + 1
      if(changeIdx >= robotNameList.length){
        changeIdx = 0
      }
      return robotNameList[changeIdx]
    }
    set_robotName(get)
  }

  /*** Robot Controller ***/
  // Initial joint and tool angles
  // const theta_body_initial = mr.deg2rad([0, -30, 70, 0, 65, 0]);
  // agilex_piper initial angles
  // const theta_body_initial = [0, -0.27473, 1.44144, 0, 1.22586, 0];

  //jaka_zu_5 initial angles
  const theta_body_initial = mr.deg2rad([0,20,90,-20,-90,0]);

  const [theta_body, setThetaBody] = React.useState(theta_body_initial);

  // const dtheta_body_initial = [0, 0, 0, 0, 0, 0];
  // const [dtheta_body, setdThetaBody] = React.useState(dtheta_body_initial);

  const theta_tool_inital = 0;
  const [theta_tool, setThetaTool] = React.useState(theta_tool_inital);
  // Theta guess for Newton's method in inverse kinematics
  const [theta_body_guess, setThetaBodyGuess] = React.useState(theta_body);

  /*** Dynamics VR Animation ***/
  const [qHistQueue, setQHistQueue] = React.useState([]);
  const animatingRef = React.useRef(false);
  React.useEffect(() => {
    if (animatingRef.current) return;
    if (qHistQueue.length === 0) return;
    animatingRef.current = true;
    const q_hist = qHistQueue[0];
    let idx = 0;
    function animate() {
      if (!q_hist) return;
      if (idx < q_hist.length) {
        setThetaBody(q_hist[idx]);
        idx += 1;
        // console.log('setThetaBody:', idx, q_hist.length, q_hist[idx]);
        setTimeout(animate, 1); 
      } else {
        setThetaBodyGuess(q_hist[q_hist.length - 1]);
        animatingRef.current = false;
        setQHistQueue(queue => queue.slice(1));
      }
    }
    animate();
  }, [qHistQueue]);

  // Foward Kinematics solution
  const T0 = mr.FKinBody(M, Blist, theta_body);
  const [R0, p0] = mr.TransToRp(T0);
  const Euler_order = 'ZYX'; // Euler angle order

  // Position and orientation (euler angle) of end effector
  const position_ee_initial = p0
  const [position_ee, setPositionEE] = React.useState(position_ee_initial);
  const position_ee_Three = mr.worlr2three(position_ee);

  const euler_ee_initial = mr.RotMatToEuler(R0, Euler_order); 
  const [euler_ee, setEuler] = React.useState(euler_ee_initial);
  const euler_ee_Three = mr.worlr2three(euler_ee);

  // const quaternion_ee_initial = mr.RotMatToQuaternion(R0);
  // const [quaternion_ee, setQuaternionEE] = React.useState(quaternion_ee_initial);

  // Update end effector position and orientation (for webcontroller)
  React.useEffect(() => {
    const T = mr.FKinBody(M, Blist, theta_body);
    const [R, p] = mr.TransToRp(T);
    setPositionEE(p);
    setEuler(mr.RotMatToEuler(R, Euler_order)); // Update to ZYX Euler angles
    }, [theta_body]);
  
  /**
   *  Control Methods
   * /
   * 
  /** Kinamatics Control **/
  function KinematicsControl(newPos, newEuler) {
    const T_sd = mr.RpToTrans(mr.EulerToRotMat(newEuler, Euler_order), newPos);
    const [thetalist_sol, ik_success] = mr.IKinBody(Blist, M, T_sd, theta_body_guess, 1e-5, 1e-5);

    if (ik_success) {
      const thetalist_sol_limited = thetalist_sol.map((theta, i) =>
      Math.max(jointLimits[i].min, Math.min(jointLimits[i].max, theta))
      );
      setThetaBody(thetalist_sol_limited);
      setThetaBodyGuess(thetalist_sol_limited);
      set_target_error(false);
    } else {
      console.warn("IK failed to converge");
      set_target_error(true);
    }
  }

  /** Dynamics Control **/
  function DynamicsControl(newPos, newEuler) {
    const T_sd = mr.RpToTrans(mr.EulerToRotMat(newEuler, Euler_order), newPos);
    const [thetalist_sol, ik_success] = mr.IKinBody(Blist, M, T_sd, theta_body_guess, 1e-5, 1e-5);

    const thetalist_sol_limited = thetalist_sol.map((theta, i) =>
      Math.max(jointLimits[i].min, Math.min(jointLimits[i].max, theta))
      );

    const dt = 0.01;
    const steps = 200;

    const q0 = theta_body.slice();
    const dq0 = Array(q0.length).fill(0);

    const q_ref = thetalist_sol_limited.slice();
    const dq_ref = Array(q0.length).fill(0);
    
    const [q_hist, dq_hist] = mr.simulate_PIDcontrol(q0, dq0, q_ref, dq_ref, dt, steps, Mlist, Glist, Slist, Kplist, Kilist, Kdlist)

    if (ik_success) {
      setQHistQueue(queue => [...queue, q_hist]); 
    } 
    else {
      console.warn("IK failed to converge");
    }
  }

  /* VR Controller Simulation */
  const lastPosRef = React.useRef(controller_object.position.clone());
  const lastEulerRef = React.useRef(controller_object.rotation.clone());
  // const lastQuatRef = React.useRef(controller_object.quaternion.clone());

  const v_imp_ref = React.useRef([0, 0, 0, 0, 0, 0]);
  React.useEffect(() => {
    // VR input period
    const dt = 16.5/1000;
    if (rendered && vrModeRef.current && trigger_on ) {
      const deltaPos = {
        x: controller_object.position.x - lastPosRef.current.x,
        y: controller_object.position.y - lastPosRef.current.y,
        z: controller_object.position.z - lastPosRef.current.z
      };

      /**
       * Revelant Rotation 
       * Use abusolute Euler angles or quaternion could cause drift, 
       * especeially when VR controller is far from human body.
       */

      // current and last Euler angles of VR controller
      const currentEuler_VR = [
        controller_object.rotation.x,
        controller_object.rotation.y,
        controller_object.rotation.z
      ];
      const lastEuler_VR = [
        lastEulerRef.current.x,
        lastEulerRef.current.y,
        lastEulerRef.current.z
      ];

      // revelant rotation matrix
      const R_current = mr.EulerToRotMat(currentEuler_VR, Euler_order);
      const R_last = mr.EulerToRotMat(lastEuler_VR, Euler_order);

      function matTranspose(R) {
        return R[0].map((_, i) => R.map(row => row[i]));
      }
      function matDot(A, B) {
        return A.map((row, i) =>
          B[0].map((_, j) =>
            row.reduce((sum, a, k) => sum + a * B[k][j], 0)
          )
        );
      }
      const R_relative = matDot(R_current, matTranspose(R_last));

      // revelant Euler angles
      const deltaEuler_rev = mr.RotMatToEuler(R_relative, Euler_order); 
      const deltaEuler = {
        x: deltaEuler_rev[0], 
        y: deltaEuler_rev[1],
        z: deltaEuler_rev[2]
      };
      
      // calculate the difference in position and orientation
      const deltaPos_Three = [deltaPos.x, deltaPos.y, deltaPos.z];
      const deltaPos_World = mr.three2world(deltaPos_Three);

      const deltaEuler_Three = [deltaEuler.x, deltaEuler.y, deltaEuler.z];
      const deltaEuler_World = mr.three2world(deltaEuler_Three);

      // console.log('ΔPosition:', deltaPos, 'ΔEuler:', deltaEuler);

      /* 
      * VR Input Method
      */
      // Speed
      // const speedPos = {
      //   x: deltaPos_World[0] / dt,
      //   y: deltaPos_World[1] / dt,
      //   z: deltaPos_World[2] / dt
      // };
      // const speedEuler = {
      //   x: deltaEuler_World[0] / dt,
      //   y: deltaEuler_World[1] / dt,
      //   z: deltaEuler_World[2] / dt
      // };

      // Limited Speed
      // const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

      // const speedPos = {
      //   x: clamp(deltaPos_World[0] / dt, -0.001, 0.001),
      //   y: clamp(deltaPos_World[1] / dt, -0.001, 0.001),
      //   z: clamp(deltaPos_World[2] / dt, -0.001, 0.001)
      // };
      // const speedEuler = {
      //   x: clamp(deltaEuler_World[0] / dt, -0.002, 0.002),
      //   y: clamp(deltaEuler_World[1] / dt, -0.002, 0.002),
      //   z: clamp(deltaEuler_World[2] / dt, -0.002, 0.002)
      // };

      // Vertial Inpedance
      const Kp_VR = [80, 120, 80, 15, 15, 12]; 
      const Kd_VR = [18, 20, 18, 1.8, 1.5, 1.2];    
      const M_VR = [1, 1, 1, 0.10, 0.10, 0.10];   
      
      // const Kp_VR = [15, 15, 15, 15, 15, 12]; 
      // const Kd_VR = [1.2, 1.2, 1.2, 1.8, 1.5, 1.2];    
      // const M_VR = [0.1, 0.1, 0.1, 0.10, 0.10, 0.10];    

      let v = v_imp_ref.current.slice();

      const ForcePos = {
        x: Kp_VR[0] * deltaPos_World[0] + Kd_VR[0] * (deltaPos_World[0] / dt),
        y: Kp_VR[1] * deltaPos_World[1] + Kd_VR[1] * (deltaPos_World[1] / dt),
        z: Kp_VR[2] * deltaPos_World[2] + Kd_VR[2] * (deltaPos_World[2] / dt)
      }
      const ForceEuler = {
        x: Kp_VR[3] * deltaEuler_World[0] + Kd_VR[3] * (deltaEuler_World[0] / dt),
        y: Kp_VR[4] * deltaEuler_World[1] + Kd_VR[4] * (deltaEuler_World[1] / dt),
        z: Kp_VR[5] * deltaEuler_World[2] + Kd_VR[5] * (deltaEuler_World[2] / dt)
      }

      const accPos = {
        x: ForcePos.x / M_VR[0],
        y: ForcePos.y / M_VR[1],
        z: ForcePos.z / M_VR[2]
      };
      const accEuler = {
        x: ForceEuler.x / M_VR[3],
        y: ForceEuler.y / M_VR[4],
        z: ForceEuler.z / M_VR[5]
      };

      const speedPos = {
        x: v[0] + accPos.x * dt,
        y: v[1] + accPos.y * dt,
        z: v[2] + accPos.z * dt
      };
      const speedEuler = {
        x: v[3] + accEuler.x * dt,
        y: v[4] + accEuler.y * dt,
        z: v[5] + accEuler.z * dt
      };

      // console.log('Translation Speed:', speedPos, 'Rotation Speed:', speedEuler, 'dt(s):', dt);

      /**
       * Inverse Kinematics Control
       */
      const currentPos = [...position_ee];
      const currentEuler = [...euler_ee];

      const newPos = [
        currentPos[0] + speedPos.x * dt,
        currentPos[1] + speedPos.y * dt,
        currentPos[2] + speedPos.z * dt
      ];
      const newEuler = [
        currentEuler[0] + speedEuler.z * dt,
        currentEuler[1] - speedEuler.y * dt,
        currentEuler[2] - speedEuler.x * dt
      ];

      KinematicsControl(newPos, newEuler);
      
      const Pos_scale = 0.50; 
      const Euler_scale = 0.38;
      v_imp_ref.current = [
        Pos_scale*speedPos.x, Pos_scale*speedPos.y, Pos_scale*speedPos.z,
        Euler_scale*speedEuler.x, Euler_scale*speedEuler.y, Euler_scale*speedEuler.z
      ];
      // console.log('Virtual velocity:', v_imp_ref.current);

      /**
       * Dynamics Control
       */
      // DynamicsControl(newPos, newEuler);

    }
    // Update last position and orientation
    lastPosRef.current.copy(controller_object.position);
    lastEulerRef.current.copy(controller_object.rotation);
  }, [
    controller_object.position.x,
    controller_object.position.y,
    controller_object.position.z,
    controller_object.rotation.x,
    controller_object.rotation.y,
    controller_object.rotation.z,
    rendered,
    trigger_on,
  ]);

  // const vr_controller_pos = [
  // controller_object.position.x,
  // controller_object.position.y,
  // controller_object.position.z
  // ];
  // const vr_controller_euler = [
  //   controller_object.rotation.x,
  //   controller_object.rotation.y,
  //   controller_object.rotation.z
  // ];

  // Gripper Control 
  function clampTool(value) {
    return Math.max(toolLimit.min, Math.min(toolLimit.max, value));
  }
  React.useEffect(() => {
    let intervalId = null;
    if (grip_on && button_a_on) {
      intervalId = setInterval(() => {
        setThetaTool(prev => clampTool(prev + 0.5));
      }, 16.5); 
    }
    else if (grip_on && button_b_on) {
      intervalId = setInterval(() => {
        setThetaTool(prev => clampTool(prev - 0.5));
      }, 16.5); 
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [ button_a_on, button_b_on, grip_on]);

  // webController Inputs
  const controllerProps = React.useMemo(() => ({
    robotName, robotNameList, set_robotName,
    toolName, toolNameList, set_toolName,
    c_pos_x,set_c_pos_x,c_pos_y,set_c_pos_y,c_pos_z,set_c_pos_z,
    c_deg_x,set_c_deg_x,c_deg_y,set_c_deg_y,c_deg_z,set_c_deg_z,
    vr_mode:vrModeRef.current,
    selectedMode, setSelectedMode,
    theta_body, setThetaBody,
    theta_tool, setThetaTool,
    position_ee, setPositionEE,
    euler_ee, setEuler,
    // onTargetChange: KinematicsControl,
    onTargetChange: DynamicsControl
  }), [
    robotName, robotNameList, set_robotName,
    toolName, toolNameList, set_toolName,
    c_pos_x,set_c_pos_x,c_pos_y,set_c_pos_y,c_pos_z,set_c_pos_z,
    c_deg_x,set_c_deg_x,c_deg_y,set_c_deg_y,c_deg_z,set_c_deg_z,
    vrModeRef.current,
    selectedMode, setSelectedMode,
    theta_body, setThetaBody,
    theta_tool, setThetaTool,
    position_ee, setPositionEE,
    euler_ee, setEuler,
    // KinematicsControl,
    DynamicsControl
  ]);

  // VRController Inputs (Aframe Components)
  React.useEffect(() => {
    registerAframeComponents({
      set_rendered,
      robotChange,
      set_controller_object,
      set_trigger_on,
      set_grip_on,
      set_button_a_on,
      set_button_b_on,
      set_c_pos_x, set_c_pos_y, set_c_pos_z,
      set_c_deg_x, set_c_deg_y, set_c_deg_z,
      vrModeRef,
      controller_object,
      Euler_order,
      props,
      onXRFrameMQTT,
    });
  }, []);

  /* 
  * MQTT 
  */
  const thetaBodyMQTT = React.useRef(theta_body);
  React.useEffect(() => {
    thetaBodyMQTT.current = theta_body;
  }, [theta_body]);

  const thetaToolMQTT = React.useRef(theta_tool);
  React.useEffect(() => {
    thetaToolMQTT.current = theta_tool;
  }, [theta_tool]);

  React.useEffect(() => {
    window.requestAnimationFrame(onAnimationMQTT);
  }, []);
  
  // web MQTT
  const onAnimationMQTT = (time) =>{
    const robot_state_json = JSON.stringify({
      time: time,
      joints: thetaBodyMQTT.current,
      // grip: gripRef.current      
    });
    publishMQTT(MQTT_ROBOT_STATE_TOPIC + robotIDRef.current , robot_state_json); 
    // console.log("onAnimationMQTT published:", robot_state_json);
    window.requestAnimationFrame(onAnimationMQTT); 
  }

  // VR MQTT
  const receiveStateRef = React.useRef(true); // VR MQTT switch
  const onXRFrameMQTT = (time, frame) => {
    if (vrModeRef.current){
      frame.session.requestAnimationFrame(onXRFrameMQTT);
      setNow(performance.now()); 
    }
    if ((mqttclient != null) && receiveStateRef.current) {
      const ctl_json = JSON.stringify({
        time: time,
        joints: thetaBodyMQTT.current,
        tool: thetaToolMQTT.current
      });
      publishMQTT(MQTT_CTRL_TOPIC + robotIDRef.current, ctl_json);
    }
  }
  const requestRobot = (mqclient) => {
    const requestInfo = {
      devId: idtopic,
      type: codeType,
    }
    publishMQTT(MQTT_REQUEST_TOPIC, JSON.stringify(requestInfo));
  }

  useMqtt({
    props,
    requestRobot,
    thetaBodyMQTT: setThetaBody,
    thetaToolMQTT: setThetaTool,
    robotIDRef,
    MQTT_DEVICE_TOPIC, 
    MQTT_CTRL_TOPIC, 
    MQTT_ROBOT_STATE_TOPIC,
  });

  // Robot State Update Props
  const robotProps = React.useMemo(() => ({
    robotNameList, robotName, theta_body, theta_tool
  }), [robotNameList, robotName, theta_body, theta_tool]);
  
  // Robot Secene Render
  return (
    <RobotScene
      robot_model={robot_model}
      rendered={rendered}
      target_error={target_error}
      robotProps={robotProps}
      controllerProps={controllerProps}
      dsp_message={dsp_message}
      c_pos_x={c_pos_x}
      c_pos_y={c_pos_y}
      c_pos_z={c_pos_z}
      c_deg_x={c_deg_x}
      c_deg_y={c_deg_y}
      c_deg_z={c_deg_z}
      viewer={props.viewer}
      monitor={props.monitor}
      position_ee={position_ee_Three}
      euler_ee={euler_ee_Three}
      // vr_controller_pos={vr_controller_pos}
      // vr_controller_euler={vr_controller_euler}
    />
  );
}
