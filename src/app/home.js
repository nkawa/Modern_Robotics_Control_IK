"use client";
import 'aframe'
const THREE = window.AFRAME.THREE;
import * as React from 'react'
import RobotScene from './RobotScene';
import registerAframeComponents from './registerAframeComponents'; 
import useMqtt from './useMqtt';
import { mqttclient,idtopic, publishMQTT, codeType } from '../lib/MetaworkMQTT'
import { three2worldMatGen, world2threeMatGen,
	   mr2urdfJoints, urdf2mrJoints
       } from './constTransformGen';

// const mr = require('../modern_robotics/modern_robotics_core.js');
// // const RobotKinematics = require('../modern_robotics/modern_robotics_Kinematics.js');
// const RobotDynamcis = require('../modern_robotics/modern_robotics_Dynamics.js');
// const Euler_order = 'ZYX'; // Euler angle order


// MQTT Topics
const MQTT_REQUEST_TOPIC = "mgr/request";
const MQTT_DEVICE_TOPIC = "dev/" + idtopic;
const MQTT_CTRL_TOPIC = "vr/"; 
const MQTT_ROBOT_STATE_TOPIC = "robot/";

export default function DynamicHome(props) {
  // State variables
  // Generate constant transformation matrices (THREE.Matrix4)
  const [three2worldMat] = React.useState(()=> three2worldMatGen());
  const [world2threeMat] = React.useState(()=> world2threeMatGen());
  // console.log("three2worldMat: ", three2worldMat.elements);
  // console.log("world2threeMat: ", world2threeMat.elements);

  // initilize Modern Robotics parameters
  // Load Robot Model
  const [robot_model] = React.useState("agilex_piper"); // Change this to your robot model
  // const [rk] = React.useState(()=> new RobotDynamcis(robot_model));
  // const [jointLimits] = React.useState(rk.jointLimits);
  // const [toolLimit] = React.useState(rk.toolLimit);
  // const [M] = React.useState(rk.get_M());
  // const [Blist] = React.useState(()=>{
  //   // const Mlist = rk.get_Mlist();
  //   // const Glist = rk.get_Glist();
  //   // const Kplist = rk.get_Kplist(); 
  //   // const Kilist = rk.get_Kilist(); 
  //   // const Kdlist = rk.get_Kdlist(); 
  //   const Slist = rk.get_Slist();
  //   return mr.SlistToBlist(M, Slist);}); // Convert Slist to Blist

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

  const [dsp_message,set_dsp_message] = React.useState("XXX")

  // Robot Tool
  const toolNameList = ["No tool"]
  const [toolName,set_toolName] = React.useState(toolNameList[0])

  // Frame ID
  const reqIdRef = React.useRef()
  // The pose of the end link
  const endLinkPose = React.useRef(new THREE.Matrix4());
  const endLinkPoseStart = React.useRef(new THREE.Matrix4());
  const controllerStartInv = React.useRef(new THREE.Matrix4());
  // Animation loop
  const loop = (timestamp)=>{
    reqIdRef.current = window.requestAnimationFrame(loop) 
  }
  React.useEffect(() => {
    loop()
    return () => window.cancelAnimationFrame(reqIdRef.current) 
  },[])
  // Worker thread generation
  const workerRef = React.useRef(null);
  const workerLastJoints = React.useRef(null);
  const workerLastStatus = React.useRef(null);
  // const useWorkerRef = React.useRef(true); // Flag to indicate if the worker is ready
  React.useEffect(() => {
    if (workerRef.current === null) {
      console.log("******** Creating new worker ********");
      workerRef.current = new Worker('/worker.js', { type: 'module'});
      console.log("workerRef.current: ", workerRef.current);
      workerRef.current.onmessage = (event) => {
	switch (event.data.type) {
	case 'ready':
	  workerRef.current
	    .postMessage({ type: 'init', filename: robot_model
			   +'/'+'urdf.json' //robot_model,
			 });
	  break;
	case 'generator_ready':
	  workerRef.current
	    .postMessage({ type: 'set_initial_joints',
			   joints: mr2urdfJoints(theta_body)});
	  break;
	case 'joints':
	  if (event.data.joints) {
	    // console.log("Worker message received:", event.data);
	    // Always skip to the latest data
	    workerLastJoints.current = event.data.joints;
	  }
	  break;
	case 'status':
	  workerLastStatus.current = event.data;
	  break;
	}
      };
    }
    // **** set status text to "dsp_message" ****
    const intervalId = setInterval(() => {
      // const statusText = 'line1'+'\n'+'line2\nline3';
      const statusText =
	    'status: ' + workerLastStatus.current?.status + '\n' +
	    ' cond:' + workerLastStatus.current?.condition_number.toFixed(2) +
	    '  manip:'  + workerLastStatus.current?.manipulability.toFixed(3) +
	    '  k:'  + workerLastStatus.current?.sensitivity_scale.toFixed(3) +
	    + ' ' + '\n' +
	    '  limit flags: ' + (workerLastStatus.current?.limit_flag || []).join(', ');
      set_dsp_message(statusText);
    }, 200); // Update every 200ms
    //
    return () => {
      if (workerRef.current) {
	workerRef.current.terminate();
	workerRef.current = null;
      }
      clearInterval(intervalId);
    };
  }, []);

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
  const [theta_body, setThetaBody] = React.useState(()=>{
    // Initial joint and tool angles
    // // // // const theta_body_initial = mr.deg2rad([0, -30, 70, 0, 65, 0]);
    // // // const theta_body_initial = [0, -0.27473, 1.44144, 0, 1.22586, 0];
    // const theta_body_initial = [0, 0, 0, 0, 0, 0].map(x=>x*Math.PI/180);
    // const theta_body_initial = [0, -30, 30, 0, 30, 0].map(x=>x*Math.PI/180);
    const theta_body_initial = [0, -15, 82.6, 0, 70, 0].map(x=>x*Math.PI/180);
    return theta_body_initial});
  const [theta_tool, setThetaTool] = React.useState(()=>{
    const theta_tool_inital = 0;
    return theta_tool_inital});

  // Theta guess for Newton's method in inverse kinematics
  const [theta_body_guess, setThetaBodyGuess] = React.useState(theta_body);


  // const [pose_ee, setPoseEE] = React.useState(() => {
  //   // Foward Kinematics solution
  //   const T0 = mr.FKinBody(M, Blist, theta_body);
  //   const [R0, p0] = mr.TransToRp(T0);
  //   // Position and orientation (rotation matrix) of end effector
  //   const pose_ee_initial = {
  //     position: p0,
  //     // orientation: R0
  //     euler: mr.RotMatToEuler(R0, Euler_order)
  //   };
  //   return pose_ee_initial;});
  // const [pose_ee_Three, setPoseEEThree] = React.useState(() => {
  //   const pose_ee_Three_initial = {
  //     position: mr.worlr2three(pose_ee.position),
  //     euler: mr.worlr2three(pose_ee.euler),
  //   };
  //   return pose_ee_Three_initial;});

  // // Update end effector position and orientation (for webcontroller)
  // React.useEffect(() => {
  //   const T = mr.FKinBody(M, Blist, theta_body);
  //   const [R, p] = mr.TransToRp(T);
  //   const euler = mr.RotMatToEuler(R, Euler_order);
  //   setPoseEE({position: p, euler: euler}); // Update to ZYX Euler angles
  //   setPoseEEThree({
  //     position: mr.worlr2three(pose_ee.position),
  //     euler: mr.worlr2three(pose_ee.euler),
  //   });
  //   }, [...theta_body]);
  
  /**
   *  Control Methods
   * /
   * 
  /** Kinamatics Control **/
  // function KinematicsControl(tf) {
  //   const T_sd = [
  //     [tf.elements[0], tf.elements[4], tf.elements[8], tf.elements[12]],
  //     [tf.elements[1], tf.elements[5], tf.elements[9], tf.elements[13]],
  //     [tf.elements[2], tf.elements[6], tf.elements[10], tf.elements[14]],
  //     [0, 0, 0, 1]];
  //   KinamaticsControlAux(T_sd);
  // }
  // function KinamaticsControl(newPos, newEuler) {
  //   const T_sd = mr.RpToTrans(mr.EulerToRotMat(newEuler, Euler_order), newPos);
  //   KinamaticsControlAux(T_sd);
  // }
  // function KinamaticsControlAux(T_sd)
  // {
  //   const [thetalist_sol, ik_success] = mr.IKinBody(Blist, M, T_sd, theta_body_guess, 1e-5, 1e-5);

  //   if (ik_success) {
  //     const thetalist_sol_limited = thetalist_sol.map((theta, i) =>
  //     Math.max(jointLimits[i].min, Math.min(jointLimits[i].max, theta))
  //     );
  //     // const theta_tmp = theta_body.map(x => x); // copy theta_body
  //     // theta_tmp[4] = theta_tmp[4] + 3.14159/180; // add 0.1 degree to theta_5
  //     // theta_tmp[0] = theta_tmp[0] + 3.14159/180; // add 0.1 degree to theta_5
  //     // setThetaBody(theta_tmp);
  //     setThetaBody(thetalist_sol_limited);
  //     setThetaBodyGuess(thetalist_sol_limited);
  //     set_target_error(false);
  //   } else {
  //     console.warn("IK failed to converge");
  //     set_target_error(true);
  //   }
  // }


  React.useEffect(() => {
    // VR input period
    // const dt = 16.5/1000;
    // if (rendered && vrModeRef.current && workerRef.current) {
    //   if (workerLastJoints.current === null
    // 	  || workerLastJoints.current.other.hasJointValue === false) {
    //   }
    // }
    if (rendered && vrModeRef.current && trigger_on ) {
      // w_B^{-1}: start^-1: controllerStartInv.current
      // w_E: goal: controllerCurrentWorld
      // w_S: begin: endLinkPoseStart.current
      // w_S': 原点はB, 向きはS
      // w_G: end: to be calculated
      const controllerCurrentWorld = three2worldMat.clone().multiply(controller_object.matrixWorld);
      const controllerDiff = controllerStartInv.current.clone().multiply(controllerCurrentWorld);
      const controllerTend = controllerStartInv.current.clone().multiply(endLinkPoseStart.current);
      controllerTend.extractRotation(controllerTend);
      const endTcontroller = controllerTend.clone().transpose();
      //
      // reduce controller movement by 0.25 -- 1.00
      const magnification = 0.60;
      const posDiff = new THREE.Vector3();
      const quatDiff = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      controllerDiff.decompose(posDiff, quatDiff, scale);
      const quaterPosDiff = posDiff.clone().multiplyScalar(magnification);
      // console.log('quaterPosDiff: ' + quaterPosDiff.x.toFixed(3)
      // 		  + ', ' + quaterPosDiff.y.toFixed(3)
      // 		  + ', ' + quaterPosDiff.z.toFixed(3));
      const quaterQuatDiff = quatDiff.clone(); // .multiplyScalar(0.25);
      quaterQuatDiff.x *= magnification;
      quaterQuatDiff.y *= magnification;
      quaterQuatDiff.z *= magnification;
      const wAbs = Math.sqrt(1.0 - (quaterQuatDiff.x**2
				    + quaterQuatDiff.y**2
				    + quaterQuatDiff.z**2));
      quaterQuatDiff.w = quaterQuatDiff.w >= 0 ? wAbs : -wAbs;
      const scale1 = new THREE.Vector3(1, 1, 1);
      const matrixDiff = new THREE.Matrix4();
      matrixDiff.compose(quaterPosDiff, quaterQuatDiff, scale1);
      const newEndLinkPose = endLinkPoseStart.current.clone()
	    .multiply(endTcontroller).multiply(matrixDiff)
	    .multiply(controllerTend);

      // **** send to worker thread ****
      workerRef.current.postMessage({ type: 'destination',
				      endLinkPose: newEndLinkPose.elements });
      // KinamaticsControl(newPos, newEuler);
      // KinematicsControl(newEndLinkPose);
      // if (workerLastJoints.current) {
      // 	setThetaBody(urdf2mrJoints(workerLastJoints.current));
      // }
    }
    // Update last position and orientation
    // ** move to theta_body's useEffect **
    if (!trigger_on ||
	endLinkPoseStart.current.equals(new THREE.Matrix4().identity())) {
      endLinkPoseStart.current = three2worldMat.clone()
	.multiply(endLinkPose.current);
    }
    if (!trigger_on ||
	controllerStartInv.current.equals(new THREE.Matrix4().identity())) {
      controllerStartInv.current = three2worldMat.clone()
	.multiply(controller_object.matrixWorld).invert();
    }
  }, [
    controller_object.position.x,
    controller_object.position.y,
    controller_object.position.z,
    controller_object.quaternion.x,
    controller_object.quaternion.y,
    controller_object.quaternion.z,
    controller_object.quaternion.w,
    rendered,
    trigger_on,
  ]);

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
    // pose_ee, setPoseEE,
    // onTargetChange: KinamaticsControl,
    // onTargetChange: DynamicsControl
  }), [
    robotName, robotNameList, set_robotName,
    toolName, toolNameList, set_toolName,
    c_pos_x,set_c_pos_x,c_pos_y,set_c_pos_y,c_pos_z,set_c_pos_z,
    c_deg_x,set_c_deg_x,c_deg_y,set_c_deg_y,c_deg_z,set_c_deg_z,
    vrModeRef.current,
    selectedMode, setSelectedMode,
    theta_body, setThetaBody,
    theta_tool, setThetaTool,
    // pose_ee, setPoseEE,
    // KinamaticsControl,
    // DynamicsControl
  ]);

  // VRController Inputs (Aframe Components)
  React.useEffect(() => {
    registerAframeComponents({
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
      // Euler_order,
      props,
      onXRFrameMQTT,
      workerLastJoints,
      setThetaBody,
      endLinkPose,
    });
    // set rendered state after a short delay to ensure the scene is ready
    // setTimeout(() => set_rendered(true), 16.5);
    set_rendered(true);
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
      // position_ee={pose_ee_Three.position}
      // euler_ee={pose_ee_Three.euler}
      // vr_controller_pos={vr_controller_pos}
      // vr_controller_euler={vr_controller_euler}
    />
  );
}
