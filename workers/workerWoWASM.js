// Worker script for handling messages and performing calculations
import * as THREE from 'three'
let controllerTf = new THREE.Matrix4();
let counter = 0;
let joints = null; // joint position vector. size is 6,7 or 8
let cmdVelGen = null; // コマンド速度生成器WASMオブジェクト

self.onmessage = function(event) {
  const data = event.data;
  switch (data.type) {
  case 'init':
    console.log('Initializing worker with :', data.filename);
    break;
  case 'set_initial_joints':
    // 初期ジョイントの設定処理
    console.log('Setting initial joints:', data.joints);
    joints = [...data.joints];
    break;
  case 'destination':
    // データの受信処理
    // console.log('Received destination:', data.endLinkPose);
    controllerTf.fromArray(data.endLinkPose);
    break;
  default:
    break;
  }
};

self.setInterval( () => {
  // 計算処理など
  let x = Math.floor(controllerTf.elements[12]*1000) + counter;
  let y = Math.floor(controllerTf.elements[13]*1000) + counter;
  let z = Math.floor(controllerTf.elements[14]*1000) + counter;
  // postMessage([x, y, z]);
  self.postMessage(x);
  counter += 1000;
}, 10);
