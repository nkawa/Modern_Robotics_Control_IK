"use client";
import 'aframe'
const THREE = window.AFRAME.THREE;
import * as React from 'react'
import RobotScene from './RobotScene';
import registerAframeComponents from './registerAframeComponents';
import useMqtt from './useMqtt';
import { mqttclient, idtopic, publishMQTT, codeType } from '../lib/MetaworkMQTT'
import { three2worldMatGen, world2threeMatGen } from './constTransformGen';

import { AppMode } from './appmode.js';

// const mr = require('../modern_robotics/modern_robotics_core.js');
// // const RobotKinematics = require('../modern_robotics/modern_robotics_Kinematics.js');
// const RobotDynamcis = require('../modern_robotics/modern_robotics_Dynamics.js');
// const Euler_order = 'ZYX'; // Euler angle order


// MQTT Topics
const MQTT_REQUEST_TOPIC = "mgr/request";
const MQTT_DEVICE_TOPIC = "dev/" + idtopic;
const MQTT_CTRL_TOPIC = "control/";
const MQTT_CTRL_TOPIC_ID = "control/" + idtopic;
const MQTT_ROBOT_STATE_TOPIC = "robot/";
const MQTT_AIST_LOGGER_TOPIC = "AIST/logger/Jaka";

console.log("MQTT_DEVICE_TOPIC", MQTT_DEVICE_TOPIC);

// 再レンダリングしなくて値を更新する（かつ set_update で再レンダリングさせられる）
function useRefState(updateFunc=undefined,initialValue=undefined) {
  const ref = React.useRef(initialValue);
  function setValue(arg){
    if (typeof arg === 'function') {
      ref.current = arg(ref.current)
    }else{
      ref.current = arg
    }
    if(updateFunc){
      updateFunc((v)=>v=v+1)
    }
  }
  return [ref.current, setValue, ref];
}

export default function DynamicHome(props) {
  // State variables
  // Generate constant transformation matrices (THREE.Matrix4)
  const [three2worldMat] = React.useState(() => three2worldMatGen());
  const [world2threeMat] = React.useState(() => world2threeMatGen());
//  console.debug("three2worldMat: ", three2worldMat.elements);
//  console.debug("world2threeMat: ", world2threeMat.elements);

  const [now, setNow] = React.useState(new Date())
  const [rendered, set_rendered] = React.useState(false)
  const robotNameList = ["jaka_zu_5", "agilex_piper"]
  const [robotName, set_robotName] = React.useState(robotNameList[0])

  // initilize Modern Robotics parameters
  // Load Robot Model
  const [robot_model, set_robot_model] = React.useState(robotName); // Change this to your robot model

  // 
  const toolLimitList = [{ min: -1, max: 89 }, { min: -1, max: 89 }]; 
  const [toolLimit, setToolLimit] = React.useState(toolLimitList[robotNameList.indexOf(robot_model)] || { min: -1, max: 89 });


  const vrModeRef = React.useRef(false);
  const [trigger_on, set_trigger_on] = React.useState(false)
  const [grip_on, set_grip_on] = React.useState(false)
  const [gripValue, set_grip_value] = React.useState(0);
  const [button_a_on, set_button_a_on] = React.useState(false)
  const [button_b_on, set_button_b_on] = React.useState(false)
  const [controller_object, set_controller_object] = React.useState(() => {
    const controller_object = new THREE.Matrix4();
    return controller_object;
  });

  const [controller_object_world, set_controller_object_world] = React.useState(null);
  const [camera_object_world, set_camera_object_world] = React.useState(null);

  //常に最新を読むためのRef
  const controllerObjectWorldRef = React.useRef(null);
  const cameraObjectWorldRef = React.useRef(null);
  const gripValueRef = React.useRef(0);
  const buttonARef = React.useRef(false);
  const buttonBRef = React.useRef(false);
  const triggerRef = React.useRef(false);
  const gripRef = React.useRef(false);

  //state → ref
  React.useEffect(() => { controllerObjectWorldRef.current = controller_object_world; }, [controller_object_world]);
  React.useEffect(() => { cameraObjectWorldRef.current = camera_object_world; }, [camera_object_world]);
  React.useEffect(() => { gripValueRef.current = gripValue; }, [gripValue]);
  React.useEffect(() => { buttonARef.current = button_a_on; }, [button_a_on]);
  React.useEffect(() => { buttonBRef.current = button_b_on; }, [button_b_on]);
  React.useEffect(() => { triggerRef.current = trigger_on; }, [trigger_on]);
  React.useEffect(() => { gripRef.current = grip_on; }, [grip_on]);

  const [selectedMode, setSelectedMode] = React.useState('control');
  const [toolCaught, setToolCaught] = React.useState(false); // アームの把持状態

  const robotIDRef = React.useRef("none"); // 
//  console.log("robotIDRef:", robotIDRef.current, "id:", idtopic);
  // VR camera pose
  //      set_c_pos_x(0);
   //     set_c_pos_y(-0.6);
   //     set_c_pos_z(0.90);
   //     set_c_deg_x(0);
 //       set_c_deg_y(0);
   //     set_c_deg_z(0);

  const [c_pos_x, set_c_pos_x] = React.useState(0)
  const [c_pos_y, set_c_pos_y] = React.useState(0.9)
  const [c_pos_z, set_c_pos_z] = React.useState(0.9)
  const [c_deg_x, set_c_deg_x] = React.useState(0)
  const [c_deg_y, set_c_deg_y] = React.useState(0)
  const [c_deg_z, set_c_deg_z] = React.useState(0)

  const [updateRobot, setUpdateRobot] = React.useState(0)
  const [dsp_message, set_dsp_message] = React.useState("XXX")

// for useRefState
  const [update , set_update] = React.useState(0);
// WebRTCの統計情報を記録
  const [rtcStats, set_rtcStats, rtcStats_ref ] = useRefState(set_update,[])

  const [target_error, set_target_error] = React.useState(false); // 衝突の際に色を変更する
  const target_error_ref = React.useRef(target_error)

  const green_color = 'lime';
  const red_color = 'red';
  const dsp_color = React.useRef(green_color); // Default color for DSP message

  // Robot Tool
  const toolNameList = ["No tool"]
  const [toolName, set_toolName] = React.useState(toolNameList[0])

  // Frame ID
  const reqIdRef = React.useRef()
  // The pose of the end link
  const endLinkPose = React.useRef(new THREE.Matrix4());
  const endLinkPoseStart = React.useRef(null);
  const baseLinkPoseInv = React.useRef(null);
  const controllerStartInv = React.useRef(null);
  React.useEffect(() => {
    // endLinkPose.current =
    endLinkPoseStart.current = null;
    baseLinkPoseInv.current = null;
    controllerStartInv.current = null;
  }, [robot_model]);

  //*** controller mode change functions
  // 20250801 no mode.
  const [controllerModeChange] = React.useState(() => {
    let modeNumber = 0;
    const controllerMode = ['Normal', 'ToolPoint'];
    return (incr) => {
      modeNumber += incr;
      if (modeNumber < 0) {
  modeNumber = controllerMode.length - 1;
      } else if (modeNumber >= controllerMode.length) {
  modeNumber = 0;
      }
//      console.debug("Controller Mode changed to: ", controllerMode[modeNumber]);
      return controllerMode[modeNumber];
    };
  });
  

  // *** function that sets the end effector point in the worker thread
  const [toolPointMover] = React.useState(() => {
    let toolPoint = new THREE.Vector3(0, 0, 0.180);
    return (delta) => {
      if (typeof delta === 'number') {
        toolPoint.z += delta;
        workerRef.current
          .postMessage({
            type: 'set_end_effector_point',
            endEffectorPoint: toolPoint.toArray()
          });
//        console.debug("Tool Point moved to: ", toolPoint.x.toFixed(3),
//          toolPoint.y.toFixed(3), toolPoint.z.toFixed(3));
      } else if (delta === null) {
        // reset
        toolPoint.x = 0; toolPoint.y = 0; toolPoint.z = 0.180;
      }
      return toolPoint;
    };
  });
  // *** updater of the start poses of the end link and controller
  const [controllerUpdate, setControllerUpdate] = React.useState(0);
  const [controllerUpdater] = React.useState(() => {
    return () => { setControllerUpdate(controllerUpdate + 1); };
  });
  // ****************
  // Animation loop
  const loop = (timestamp) => {
    reqIdRef.current = window.requestAnimationFrame(loop)
  }
  React.useEffect(() => {
    loop()
    return () => window.cancelAnimationFrame(reqIdRef.current)
  }, [])


  // *** Robot initial joint angles ***
  function piperMr2urdf(udJoints) {
    const j2UrdfZero = 1.46984632679; // Pi/2.0 - 0.10095
    const j3UrdfZero = -2.95319327649; // - (Pi/2 - 0.10095) - Pi/2 + ArcTan[0.25075,0.021984]
    const mr = [...udJoints];
    mr[1] += j2UrdfZero;
    mr[2] += j3UrdfZero;
    return mr;
  }
  const theta_body_initial_map = {
//    'jaka_zu_5': [0, 110, 90, 70, -90, 90].map(x => x * Math.PI / 180),
//    'jaka_zu_5': [-270, 110, 90, 70, -90, 90].map(x => x * Math.PI / 180),
    'jaka_zu_5': [-270, 100, 80, 70, -90, 90].map(x => x * Math.PI / 180),
    'agilex_piper': piperMr2urdf([0, -15, 82.6, 0, 70, 0].map(x => x * Math.PI / 180)),
  };
  const [theta_body, setThetaBody] = React.useState(() => {
    return theta_body_initial_map[robot_model] || [0, 0, 0, 0, 0, 0];
  });
  const [theta_tool, setThetaTool] = React.useState(() => {
    const theta_tool_inital = 0;
    return theta_tool_inital
  });
  React.useEffect(() => {
    setThetaBody(theta_body_initial_map[robot_model] || [0, 0, 0, 0, 0, 0]);
    setThetaTool(0);
    toolPointMover(null);
    setUpdateRobot(updateRobot + 1);

    
  }, [robot_model]);


  // ****************
  // Worker thread generation
  const workerRef = React.useRef(null);
  const workerReadyState = React.useRef(false);
  const workerLastJoints = React.useRef(null);
  const workerLastStatus = React.useRef(null);
  const workerLastPose = React.useRef(null);
//  console.log("WorkerReadyState" , workerReadyState);
  // const useWorkerRef = React.useRef(true); // Flag to indicate if the worker is ready
  React.useEffect(() => {
    if (workerRef.current === null) {
      console.log("******** Creating new worker ********");// これを MQTT接続の後で、初期状態が決まったあとにすべき。
      // need to check current working directory
      // console.log("Check Worker path dir: ", window.location.pathname);
      const simplePath = window.location.pathname.replace(/\/+$/, "")
      // パスを分割（空文字除去）
      const parts = simplePath.split("/").filter(Boolean);
      // 最初の階層だけ返す（なければルート）
      const rewriteDir = parts.length >= 1 ? `/${parts[0]}/` : "/";
      const workerPath = rewriteDir + 'worker.js';
      workerRef.current = new Worker(workerPath, { type: 'module' });
      console.log("workerRef.current: ", workerRef.current);
      workerRef.current.onmessage = (event) => {
        switch (event.data.type) {
          case 'ready':
            workerRef.current
            	.postMessage({ type: 'init',
			            filename: robot_model +'/'+'urdf.json', //robot_model
			            linkShapes: robot_model +'/'+'shapes.json'
              });
            break;
          case 'generator_ready':
            workerRef.current
              .postMessage({
                type: 'set_exact_solution',
                exactSolution: false
              });
            workerRef.current
              .postMessage({
                type: 'set_initial_joints',
                // joints: theta_body});
                joints: theta_body_initial_map[robot_model]
              });
            workerReadyState.current = true;
            console.log("Worker state is ready");
            break;
          case 'joints':
            if (event.data.joints) {
              if (props.appmode !== AppMode.viewer) {
                console.debug("Worker joint message:",
                  event.data.joints.map(x => x.toFixed(3)).join(', '));
/*                if (target_error){// 前に衝突エラー状態で、
                  console.log("WorkerLastJoints.curret",workerLastJoints.current,event.data.joints)
                  if(workerLastJoints.current !== event.data.joints){
                    set_target_error(false);
                  }
                }
*/                    
              // Always skip to the latest data
                workerLastJoints.current = event.data.joints;
              }
            }                      
            break;
          case 'status':
            workerLastStatus.current = event.data; 
            if (workerLastStatus.current.collision){
              set_target_error(true);
              target_error_ref.current = true;
            }else{
//                console.log("tg",target_error, workerLastStatus.current.collision)
              if (target_error_ref.current){// 通常は false なので。。。
                set_target_error(false);
              }
            }
            break;
          case 'pose':
            // ignore info from worker for viewer mode
            if (props.appmode !== AppMode.viewer) {
              workerLastPose.current = event.data;
            }
            break;

//          case 'collision': // 衝突が Workerから通知された
//            set_target_error(true); 
 //           console.log("Collision")
          
        }
      };

    }
    // **** set status text to "dsp_message" ****
    const intervalId = setInterval(() => {
      const controllerMode = controllerModeChange(0); // Get current controller mode
      const messageText = ['MODE: '+ controllerMode];
      switch (controllerMode) { // controllerMode) {
        case 'Normal':
          messageText
            .push('status: ' + workerLastStatus.current?.status +
              '  magnification: ' + controllerMagnificationUsed.current.toFixed(2),
              'cond:' + workerLastStatus.current?.condition_number.toFixed(2) +
              '  manip:' + workerLastStatus.current?.manipulability.toFixed(3) +
              '  k:' + workerLastStatus.current?.sensitivity_scale.toFixed(3),
              '  limit flags: ' +
              (workerLastStatus.current?.limit_flag || []).join(', ')+
               '  collision:'+ workerLastStatus.current?.collision
              );
          toolPointMover(0); // post mesasge to worker!
          break;
        case 'ToolPoint':
          messageText.push('Tool Point: ' + toolPointMover(0).toArray().
            map(x => x.toFixed(3)).join(', '));
          break;
      }
      set_dsp_message(messageText.join('\n'));
      if (workerLastStatus.current?.sensitivity_scale > 0.001) {
        dsp_color.current = 'orange'; // Orange color for singularity warning
      } else if (workerLastStatus.current?.limit_flag.map(x => x * x).reduce((sum, x) => sum + x, 0) > 0) {
        dsp_color.current = red_color; // Red color for touching the joint limits
      } else {
        dsp_color.current = green_color; // Green color for normal status
      }

    }, 200); // Update every 200ms
    //

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      clearInterval(intervalId);
    };

  }, [updateRobot]);

  // ****************
  // Change Robot
  const robotChange = () => {
    const get = (robotName) => {
      let changeIdx = robotNameList.findIndex((e) => e === robotName) + 1
      if (changeIdx >= robotNameList.length) {
        changeIdx = 0
      }
      return robotNameList[changeIdx]
    }
    set_robotName(get)
    set_robot_model(get)
  }

  // *** function that set endLinkPose from worker thread
  const [endLinkPoseUpdater] = React.useState(() => {
    return () => {
      if (workerLastPose.current) {
        const ppw = workerLastPose.current.position;
        const qqw = workerLastPose.current.quaternion;
        if (ppw && qqw) {
          const ppt = new THREE.Vector3(ppw[0], ppw[1], ppw[2]);
          const qqt = new THREE.Quaternion(qqw[1], qqw[2], qqw[3], qqw[0]);
          const poseEE = new THREE.Matrix4();
          poseEE.compose(ppt, qqt, new THREE.Vector3(1, 1, 1));
          endLinkPose.current = poseEE;
        }
      }
    };
  });

  //*** Robot Controller ***/

  const [slowRewindMode, setSlowRewindMode] = React.useState(null);

  const controllerMagnification = React.useRef(1.0);
  const controllerMagnificationPrev = React.useRef(controllerMagnification.current);
  const controllerMagnificationUsed = React.useRef(controllerMagnification.current);
  // *** a function that runs when the controller pose changes
  React.useEffect(() => {
//    console.log("Controller pose changed:", trigger_on,rendered, vrModeRef.current, endLinkPoseStart.current, baseLinkPoseInv.current);
    // VR input period
    if (endLinkPoseStart.current !== null &&
      baseLinkPoseInv.current !== null &&
      rendered && vrModeRef.current && trigger_on) {

//      console.log("Controll started with trigger_on:", trigger_on);  
      // base_B^{-1}: start^-1: controllerStartInv.current
      // base_E: goal: controllerCurrentWorld
      // base_S: begin: endLinkPoseStart.current
      // base_S': 原点はB, 向きはS
      // base_G: end: to be calculated
      const controllerCurrentWorld = three2worldMat.clone().multiply(controller_object);
      const controllerDiff = controllerStartInv.current.clone().multiply(controllerCurrentWorld);
      const controllerTend = controllerStartInv.current.clone().multiply(endLinkPoseStart.current);
      controllerTend.extractRotation(controllerTend);
      const endTcontroller = controllerTend.clone().transpose();
      //
      // reduce controller movement by 0.25 -- 1.00
      const magnification = controllerMagnificationUsed.current;
      const posDiff = new THREE.Vector3();
      const quatDiff = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      controllerDiff.decompose(posDiff, quatDiff, scale);
      const quaterPosDiff = posDiff.clone().multiplyScalar(magnification);
      // console.debug('quaterPosDiff: ' + quaterPosDiff.x.toFixed(3)
      // 		  + ', ' + quaterPosDiff.y.toFixed(3)
      // 		  + ', ' + quaterPosDiff.z.toFixed(3));
      const quaterQuatDiff = quatDiff.clone(); // .multiplyScalar(0.25);
      quaterQuatDiff.x *= magnification;
      quaterQuatDiff.y *= magnification;
      quaterQuatDiff.z *= magnification;
      const wAbs = Math.sqrt(1.0 - (quaterQuatDiff.x ** 2
        + quaterQuatDiff.y ** 2
        + quaterQuatDiff.z ** 2));
      quaterQuatDiff.w = quaterQuatDiff.w >= 0 ? wAbs : -wAbs;
      const scale1 = new THREE.Vector3(1, 1, 1);
      const matrixDiff = new THREE.Matrix4();
      matrixDiff.compose(quaterPosDiff, quaterQuatDiff, scale1);
      //
      //
      const newEndLinkPose = endLinkPoseStart.current.clone()
        .multiply(endTcontroller).multiply(matrixDiff)
        .multiply(controllerTend);
      console.debug("matrixDiff: ", matrixDiff.elements[12].toFixed(3),
        matrixDiff.elements[13].toFixed(3),
        matrixDiff.elements[14].toFixed(3));
      console.debug("newEndLinkPose: ", newEndLinkPose.elements[12].toFixed(3),
        newEndLinkPose.elements[13].toFixed(3),
        newEndLinkPose.elements[14].toFixed(3));
      // **** send to worker thread ****
      workerRef.current.postMessage({
        type: 'destination',
        endLinkPose: newEndLinkPose.elements
      });
      // KinematicsControl(newEndLinkPose);
      // if (workerLastJoints.current) {
      // 	setThetaBody(workerLastJoints.current);
      // }
    }
    // ** update the controller and end link pose at the trigger_on change
    console.debug("controllerUpdate: ", controllerUpdate);
    let updateStartPose = false;
    if (baseLinkPoseInv.current !== null) {
      if (!trigger_on) {
        // When the trigger off, 
        //  rewind mode is done if slowRewindMode is true. 
        workerRef.current.postMessage({
          type: 'slow_rewind',
          slowRewind: slowRewindMode
        });
        updateStartPose = true;
        controllerMagnificationUsed.current = controllerMagnification.current;
      }
      if (updateStartPose || endLinkPoseStart.current === null) {
        // do update start pose of end link
        console.log("update start pose of end link",workerLastPose.current);
        if (workerLastPose.current) {
          endLinkPoseStart.current = endLinkPose.current.clone();
          // endLinkPoseStart.current = three2worldMat.clone()
          //   .multiply(endLinkPose.current);
          console.debug("endLinkPoseStart: ",
            endLinkPoseStart.current.elements[12].toFixed(3),
            endLinkPoseStart.current.elements[13].toFixed(3),
            endLinkPoseStart.current.elements[14].toFixed(3));
        }
      }
      if (updateStartPose || controllerStartInv.current === null) {
        // do update start pose of controller
        controllerStartInv.current = three2worldMat.clone()
          .multiply(controller_object).invert();
        console.debug("controllerStartInv: ",
          controllerStartInv.current.elements[12].toFixed(3),
          controllerStartInv.current.elements[13].toFixed(3),
          controllerStartInv.current.elements[14].toFixed(3));
      }
    }
    controllerMagnificationPrev.current = controllerMagnification.current;
  }, [...controller_object.elements,
    controllerUpdate, rendered, trigger_on, slowRewindMode
  ]);

  // Gripper Control 
  function clampTool(value) {
    return Math.max(toolLimit.min, Math.min(toolLimit.max, value));
  }

  // no grip for A and B
  React.useEffect(() => {
    console.log("React.useEffect() of a and b starts.");
    let intervalId = null;
    // 開閉を逆にした。こっちのほうが自然！
    if (button_b_on) {
      intervalId = setInterval(() => {
        setThetaTool(prev => clampTool(prev + 0.5));
      }, 16.5);
    }
    else if (button_a_on) {
      intervalId = setInterval(() => {
        setThetaTool(prev => clampTool(prev - 0.5));
      }, 16.5);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [button_a_on, button_b_on]);

  // webController Inputs
  const controllerProps = React.useMemo(() => ({
    robotName, robotNameList, set_robotName,
    toolName, toolNameList, set_toolName,
    c_pos_x, set_c_pos_x, c_pos_y, set_c_pos_y, c_pos_z, set_c_pos_z,
    c_deg_x, set_c_deg_x, c_deg_y, set_c_deg_y, c_deg_z, set_c_deg_z,
    vr_mode: vrModeRef.current,
    selectedMode, setSelectedMode,
    theta_body, setThetaBody,
    theta_tool, setThetaTool,
    // pose_ee, setPoseEE,
    // onTargetChange: KinamaticsControl,
    // onTargetChange: DynamicsControl
  }), [
    robotName, robotNameList, set_robotName,
    toolName, toolNameList, set_toolName,
    c_pos_x, set_c_pos_x, c_pos_y, set_c_pos_y, c_pos_z, set_c_pos_z,
    c_deg_x, set_c_deg_x, c_deg_y, set_c_deg_y, c_deg_z, set_c_deg_z,
    vrModeRef.current,
    selectedMode, setSelectedMode,
    theta_body, setThetaBody,
    theta_tool, setThetaTool,
    // pose_ee, setPoseEE,
    // KinamaticsControl,
    // DynamicsControl
  ]);

  //#Added
  const setTrigger = (v) => { triggerRef.current = !!v; set_trigger_on(!!v); };
  const setGrip    = (v) => { gripRef.current    = !!v; set_grip_on(!!v);   };
  const setA       = (v) => { buttonARef.current = !!v; set_button_a_on(!!v); };
  const setB       = (v) => { buttonBRef.current = !!v; set_button_b_on(!!v); };
  const setGripVal = (v) => { 
    gripValueRef.current = (typeof v === 'number' ? v : 0); 
    set_grip_value(gripValueRef.current); 
  };

  // VRController Inputs (Aframe Components)
  React.useEffect(() => {
    registerAframeComponents({
      robotChange,
      set_controller_object,
      set_controller_object_world,
      set_camera_object_world,
      // ↓↓↓ ここをラッパーに差し替え ↓↓↓
      set_trigger_on: setTrigger,
      set_grip_on:    setGrip,
      set_grip_value: setGripVal,
      set_button_a_on: setA,
      set_button_b_on: setB,
      // ↑↑↑ 差し替えここまで ↑↑↑
      set_c_pos_x, set_c_pos_y, set_c_pos_z,
      set_c_deg_x, set_c_deg_y, set_c_deg_z,
      vrModeRef,
      // controller_object,
      // Euler_order,

      props,
      onXRFrameMQTT,
      onXRFrameRecordMQTT,
      workerLastJoints,
      setThetaBody,
      endLinkPose,
      endLinkPoseUpdater,
      baseLinkPoseInv,
      controllerMagnification,
      controllerStartInv,
      onAnimationMQTT,
      setSlowRewindMode,
      controllerModeChange,
      toolPointMover,
      controllerUpdater
    });
    // set rendered state after a short delay to ensure the scene is ready
    // setTimeout(() => set_rendered(true), 16.5);
    set_rendered(true);
  }, []);


  /* Radian to Angles*/
  const rad2deg = (rad) => {
    return rad * 180 / Math.PI;
  }

  /* 
  * MQTT 
  */
  //const thetaBodyMQTT = React.useRef(theta_body.map(rad2deg));
  const degreeBodyMQTT = React.useRef(theta_body.map(rad2deg));

  React.useEffect(() => {
    // we need to check the correntness/ safety of the angles

    degreeBodyMQTT.current = theta_body.map(rad2deg);
  }, [theta_body]);

  const thetaToolMQTT = React.useRef(theta_tool);
  React.useEffect(() => {
    thetaToolMQTT.current = theta_tool;
  }, [theta_tool]);

  /*
  React.useEffect(() => {
    window.requestAnimationFrame(onAnimationMQTT);
  }, []);
  */

  // web MQTT for Viewer に見せるためのロボット情報提示
  const onAnimationMQTT = (time) => {
    const robot_state_json = JSON.stringify({
      time: time,
      joints: degreeBodyMQTT.current,
      tool: thetaToolMQTT.current
      // grip: gripRef.current      
    });
    //    publishMQTT(MQTT_ROBOT_STATE_TOPIC + robotIDRef.current , robot_state_json); 
    // これは Viewer 用であって、ロボット制御用ではない！
    publishMQTT(MQTT_ROBOT_STATE_TOPIC + idtopic, robot_state_json);
    // console.log("onAnimationMQTT published:", robot_state_json);
    window.requestAnimationFrame(onAnimationMQTT);
  }

  // VR MQTT
  // 本当は worker からのメッセージのほうが　良いのでは？
  const receiveStateRef = React.useRef(true); // VR MQTT switch
  const onXRFrameMQTT = (time, frame) => {
    if (vrModeRef.current) {
      frame.session.requestAnimationFrame(onXRFrameMQTT);
      setNow(performance.now());
    }
    if ((mqttclient != null) && receiveStateRef.current) {
      const ctl_json = JSON.stringify({
        time: time,
        joints: degreeBodyMQTT.current,
        tool: thetaToolMQTT.current
      });
      publishMQTT(MQTT_CTRL_TOPIC_ID, ctl_json);
    }
  }

  const onXRFrameRecordMQTT = (time, frame) => {
    if (vrModeRef.current) {
      frame.session.requestAnimationFrame(onXRFrameRecordMQTT);
      setNow(performance.now());
    }
    if ((mqttclient != null) && receiveStateRef.current) {

      const ctrlInputs = {
        gripvalue: typeof gripValueRef.current === "number" ? gripValueRef.current : 0,
        grip: !!gripRef.current,
        trigger: !!triggerRef.current,
        a: !!buttonARef.current,
        b: !!buttonBRef.current,
        axis: { x: 0, y: 0 },
      };

      const P = new THREE.Vector3();
      const Q = new THREE.Quaternion();
      const S = new THREE.Vector3();

      let controllerBlock = undefined;
      if (controllerObjectWorldRef.current) {
        const m4 = controllerObjectWorldRef.current;// three の matrixWorld をそのまま
        m4.decompose(P, Q, S);
        Q.normalize();
        controllerBlock = {
          pos: { x: P.x, y: P.y, z: P.z },
          qua: { x: Q.x, y: Q.y, z: Q.z, w: Q.w },
          inputs: ctrlInputs,
        };
      }

      let headsetBlock = undefined;
      if (cameraObjectWorldRef.current) {
        const m4 = cameraObjectWorldRef.current;// three の matrixWorld をそのまま
        m4.decompose(P, Q, S);
        Q.normalize();
        headsetBlock = {
          pos: { x: P.x, y: P.y, z: P.z },
          qua: { x: Q.x, y: Q.y, z: Q.z, w: Q.w },
        };
      }

      const ctl_json = JSON.stringify({
        time: Date.now(),
        joints: degreeBodyMQTT.current,
        tool: thetaToolMQTT.current,
        grip: !!gripRef.current,
        trigger: !!triggerRef.current,
        a: !!buttonARef.current,
        b: !!buttonBRef.current,
        controller: controllerBlock,
        headset: headsetBlock,
      });

      //console.log("[MQTT SEND Record]", ctl_json);
      publishMQTT(MQTT_AIST_LOGGER_TOPIC, ctl_json);
    }
  };

  const requestRobot = (mqclient) => {
    const requestInfo = {
      devId: idtopic,
      type: codeType,
    }
    console.log("Publish request", requestInfo)
    publishMQTT(MQTT_REQUEST_TOPIC, JSON.stringify(requestInfo));
  }

  useMqtt({
    props,
    requestRobot,
	  toolCaught,
	  setToolCaught,
    setThetaBody: setThetaBody,
    setThetaTool: setThetaTool,
    workerRef: workerRef,
    workerReadyState: workerReadyState,
    robotIDRef,
    MQTT_DEVICE_TOPIC,
    MQTT_CTRL_TOPIC,
    MQTT_ROBOT_STATE_TOPIC,
  });

  // 2025/8/25- デモ用config (位置)　本来は、調整可能にすべき。
//  const base_position = '0.65 0.75 0.4'  // まあまあ
//  const base_position = '0.65 0.64 0.3'　// 視点固定の場合
  const base_position = '0.65 0.75 0.15'
  const base_rotation = '0 -180 0'

  // Robot State Update Props
  const robotProps = React.useMemo(() => ({
    updateRobot, robotNameList, robotName, theta_body, theta_tool , base_position,base_rotation,
    toolCaught
  }), [updateRobot, robotNameList, robotName, theta_body, theta_tool]);

  // Robot Secene Render
  return (
    <RobotScene
      robot_model={robot_model}
      rendered={rendered}
      robotProps={robotProps}
      controllerProps={controllerProps}
      dsp_message={dsp_message}
      dsp_color={dsp_color.current}
      c_pos_x={c_pos_x}
      c_pos_y={c_pos_y}
      c_pos_z={c_pos_z}
      c_deg_x={c_deg_x}
      c_deg_y={c_deg_y}
      c_deg_z={c_deg_z}
      appmode={props.appmode}
      set_rtcStats={set_rtcStats}
      rtcStats_ref={rtcStats_ref}
      target_error={target_error}
    // position_ee={pose_ee_Three.position}
    // euler_ee={pose_ee_Three.euler}
    // vr_controller_pos={vr_controller_pos}
    // vr_controller_euler={vr_controller_euler}
    />
  );
}
