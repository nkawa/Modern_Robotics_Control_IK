'use strict';
// Worker script for handling messages and performing calculations
// import * as THREE from 'three' // THREE.jsを使わなければNext.jsやViteでのビルドが不要
// worker state definition
const st = Object.freeze({
  initializing: 1,
  waitingRobotType: 2,
  generatorMaking: 3,
  generatorReady: 4,
  slrmReady: 5,
})
let workerState = st.initializing; // worker state
console.log('Now intended to import ModuleFactory');
// import ModuleFactory from '/wasm/slrm_module.js';
const ModuleFactory = await import('/wasm/slrm_module.js');
console.log('ModuleFactory: ', ModuleFactory);
console.log('ModuleFactory.default type:', typeof ModuleFactory.default);
if (typeof ModuleFactory.default !== 'function') {
  console.error('ModuleFactory.default is not a function:', ModuleFactory.default);
  throw new Error('ModuleFactory.default is not a valid function');
}
const SlrmModule = await ModuleFactory.default();
if (!SlrmModule) {
  console.error('Failed to load SlrmModule');
  throw new Error('SlrmModule could not be loaded');
}

// ******** definitions of global variables ********
const timeInterval = 10; // time step for simulation in milliseconds
const timeStep = timeInterval / 1000; // time step in seconds
const logInterval = 1000n/BigInt(timeInterval); // log interval in BigInt
let controllerTfVec = null; // endLinkPoseの値を受け取るベクトル
let counter = 0n;
let joints = null; // joint position vector. size is 6,7 or 8
let prevJoints = null; // 前回のジョイントポジション
const jointUpperLimits = [];
const jointLowerLimits = [];
let cmdVelGen = null; // コマンド速度生成器WASMオブジェクト
let makeDoubleVectorG = null; // helper function for DoubleVector
// let newDestinationFlag = false; // 新しいdestinationが来たかどうか

// ******** helper functions ********
// SlrmModuleを閉じ込めて、その関連オブジェクトを生成するhelper関数群
function createHelpers(module) {
  function makeDoubleVector(jsArray) {
    const vec = new module.DoubleVector();
    for (let i = 0; i < jsArray.length; ++i) {
      vec.push_back(jsArray[i]);
    }
    return vec;
  }
  function makeJointModelVector(jsArray) {
    const vec = new module.JointModelFlatStructVector();
    for (let i = 0; i < jsArray.length; ++i) {
      vec.push_back(jsArray[i]);
    }
    return vec;
  }
  // 他のヘルパー関数もここに追加できる
  // }

  // 他にも必要な関数を追加できる
  return {
    makeDoubleVector,
    makeJointModelVector,
    // ... more helpers
  };
}

// ******** worker message handler ********
self.onmessage = function(event) {
  const data = event.data;
  switch (data.type) {
  case 'init': if (workerState === st.waitingRobotType) {
    workerState = st.generatorMaking;
    console.log('constructing CmdVelGenerator with :', data.filename);
    // 初期化処理
    const { makeDoubleVector, makeJointModelVector } = createHelpers(SlrmModule);
    makeDoubleVectorG = makeDoubleVector; // グローバルにヘルパー関数を保存
    SlrmModule.setJsLogLevel(3); // 3: info level, 4: debug level
    fetch(data.filename)
      .then(response => response.json())
      .then(jsonData => {
	const revolutes = jsonData.filter(obj => obj.$.type === 'revolute');
	// 各行をJointModelFlatStructに変換
	const jointModels = revolutes.map(obj => {
	  const xyz_in = obj.origin.$.xyz ?? [NaN, NaN, NaN];
	  const xyz = makeDoubleVector(Array.isArray(xyz_in) && xyz_in.length === 3
				       ? xyz_in : [NaN, NaN, NaN]);
	  const rpy_in = obj.origin.$.rpy ?? [NaN, NaN, NaN];
	  const rpy = makeDoubleVector(Array.isArray(rpy_in) && rpy_in.length === 3
				       ? rpy_in : [NaN, NaN, NaN]);
	  const axis_in = obj.axis.$.xyz ?? [NaN, NaN, NaN];
	  const axis = makeDoubleVector(Array.isArray(axis_in) && axis_in.length === 3
					? axis_in : [NaN, NaN, NaN]);
	  const jointModel = new SlrmModule.JointModelFlatStruct(axis, xyz, rpy);
	  axis.delete();
	  xyz.delete();
	  rpy.delete();
	  return jointModel;
	});
	const jointModelVector = makeJointModelVector(jointModels);
	console.log('type of SlrmModule.CmdVelGen: '
		    + typeof SlrmModule.CmdVelGenerator);
	cmdVelGen = new SlrmModule.CmdVelGenerator(jointModelVector);
	jointModels.forEach(model => model.delete());
	if (cmdVelGen === null || cmdVelGen === undefined) {
	  console.error('generation of CmdVelGen instance failed');
	  cmdVelGen = null;
	  return;
	}
	if (cmdVelGen !== null && cmdVelGen !== undefined) {
	  console.log('CmdVelGen instance created:', cmdVelGen);
	}
	// joint limitsの設定
	revolutes.forEach(obj => {
	  jointUpperLimits.push(obj.limit.$.upper);
	  jointLowerLimits.push(obj.limit.$.lower);
	});
	console.log('jointLimits: ', jointUpperLimits, jointLowerLimits);
	console.log('Status Definitions: ' +
		    "OK:" + SlrmModule.CmdVelGeneratorStatus.OK.value + ", " +
		    "ERROR:" + SlrmModule.CmdVelGeneratorStatus.ERROR.value + ", " +
		    "END:" + SlrmModule.CmdVelGeneratorStatus.END.value);
	cmdVelGen.setExactSolution(false); // singularity通過のため
	cmdVelGen.setLinearVelocityLimit(10.0); // 10 m/s
	cmdVelGen.setAngularVelocityLimit(2*Math.PI); // 2Pi rad/s
	cmdVelGen.setAngularGain(20.0); // 20 s^-1
	cmdVelGen.setLinearGain(20.0); // 20 s^-1
	const jointVelocityLimit
	  = makeDoubleVector(Array(revolutes.length).fill(Math.PI*20)); // 20Pi rad/s
	cmdVelGen.setJointVelocityLimit(jointVelocityLimit); // ジョイント速度制限を設定
	jointVelocityLimit.delete();
	// なにかの加減でオブジェクト生成に失敗した場合はここでエラーがthrownされる
	workerState = st.generatorReady;
	self.postMessage({type: 'generator_ready'});
      })
      .catch(error => {
	console.error('Error fetching or parsing JSON file:', error);
      });
  } break;
  case 'set_initial_joints': if (workerState === st.generatorReady ||
				 workerState === st.slrmReady) {
    if (data.joints) {
      // 初期ジョイントの設定処理
      joints = [...data.joints];
      console.log('Setting initial joints:'
		  +joints.map(v => (v*57.2958).toFixed(1)).join(', '));
      // 到着処理、prevPosition未定義
      workerState = st.slrmReady;
      console.log('Worker state changed to slrmReady');
    }
  } break;
  case 'destination': if (workerState === st.slrmReady &&
			  data.endLinkPose ) {
    // データの受信処理
    //newDestinationFlag = true; // 新しいdestinationが来た
    controllerTfVec = [...data.endLinkPose];
    // console.log('Received destination: '
    // 		+ controllerTfVec[12].toFixed(3) + ', '
    // 		+ controllerTfVec[13].toFixed(3) + ', '
    // 		+ controllerTfVec[14].toFixed(3));
  } break;
  default:
    break;
  }
};

// ******** worker main loop ********
self.setInterval( () => {
  if (workerState === st.slrmReady) {
    // 計算処理など
    if (cmdVelGen === null ||
	joints === null || controllerTfVec === null) {
      // console.warn('controllerTfVec or cmdVelGen is not ready yet.');
      return;
    }
    // console.log('joints: ' + joints.map(v => v.toFixed(3)).join(', ') + '\n' +
    // 		'controllerTfVec: ' + controllerTfVec.map(v => v.toFixed(3)).join(', '));
    const jointVec = makeDoubleVectorG(joints);
    const endLinkPose = makeDoubleVectorG(controllerTfVec);
    const result = cmdVelGen.calcVelocityMat(jointVec, endLinkPose);
    jointVec.delete();
    endLinkPose.delete();
    let velocities = new Float64Array(result.joint_velocities.size());
    velocities = velocities.map((_, idx) => result.joint_velocities.get(idx));
    result.joint_velocities.delete();
    // console.log('status: ', result.status.value);
    switch (result.status.value) {
    case SlrmModule.CmdVelGeneratorStatus.OK.value:
      prevJoints = joints;
      joints = joints.map((val, idx) => val + velocities[idx]* timeStep);
      break;
    case SlrmModule.CmdVelGeneratorStatus.END.value:
      // 目標位置に到達した場合の処理
      // cmdPoseExists = false; 
      break;
    case SlrmModule.CmdVelGeneratorStatus.SINGULARITY.value:
      // 現状のCmdVelGeneratorではこの状態は発生せずREWINDに変わる
      // cmdPoseExists = false; // cmdPoseが存在しない
      console.error('CmdVelGenerator returned SINGULARITY status');
      break;
    case SlrmModule.CmdVelGeneratorStatus.REWIND.value:
      joints = prevJoints; // 前の状態に戻す. 特異点に入る直前の状態になる
      // cmdPoseExists = false; // cmdPoseが存在しない
      break;
    case SlrmModule.CmdVelGeneratorStatus.ERROR.value:
      console.error('CmdVelGenerator returned ERROR status');
      break;
    default:
      console.error('Unknown status from CmdVelGenerator:', result.status.value);
      break;
    }
    let limitFlag = Array(joints.length).fill(0);
    joints = joints.map((val, idx) => {
      if (val > jointUpperLimits[idx]) {
	limitFlag[idx] = 1;
	return jointUpperLimits[idx];
      }
      if (val < jointLowerLimits[idx]) {
	limitFlag[idx] = -1;
	return jointLowerLimits[idx];
      }
      return val;
    });
    self.postMessage({type: 'joints', joints: joints});
    self.postMessage({type: 'status', status: result.status.value,
		      condition_number: result.other.condition_number,
		      manipulability: result.other.manipulability,
		      sensitivity_scale: result.other.sensitivity_scale,
		      limit_flag: limitFlag});
    counter ++;
    if (counter <= 1n) {
      console.log('type of logInterval: ', typeof logInterval,
		  ' type of counter: ', typeof counter);
    }
    if (counter % logInterval === 0n) {
      // ログ出力
      console.log('status: ', result.status.value ,
		  ' condition: ' , result.other.condition_number.toFixed(2) ,
		  ' manipulability: ' , result.other.manipulability.toFixed(3) ,
		  ' scale: ' , result.other.sensitivity_scale.toFixed(3)
);
      console.log('limit status: ' + limitFlag.join(', '));
      //   console.log('Worker: joints at ' + (counter / (60n*100n / BigInt(timeInterval))).toString() + ' minutes: ' + joints.map(v => (v*57.2958).toFixed(1)).join(', '));
    }
  }
}, timeInterval);

// ******** worker start ********
workerState = st.waitingRobotType;
self.postMessage({type: 'ready'});
