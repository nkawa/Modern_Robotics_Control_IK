'use strict';
const st = Object.freeze({ // worker state definition
  initializing: 1,
  waitingRobotType: 2,
  generatorMaking: 3,
  generatorReady: 4,
  slrmReady: 5,
})
let workerState = st.initializing; // worker state
// Worker script for handling messages and performing calculations
// import * as THREE from 'three'
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

let controllerTfVec = null; // endLinkPoseの値を受け取るベクトル
let counter = 0;
let joints = null; // joint position vector. size is 6,7 or 8
let cmdVelGen = null; // コマンド速度生成器WASMオブジェクト

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

// メインのワーカースクリプト
self.onmessage = function(event) {
  const data = event.data;
  switch (data.type) {
  case 'init': if (workerState === st.waitingRobotType) {
    workerState = st.generatorMaking;
    console.log('constructing CmdVelGenerator with :', data.filename);
    // 初期化処理
    const { makeDoubleVector, makeJointModelVector } = createHelpers(SlrmModule);
    SlrmModule.setJsLogLevel(4);
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
	workerState = st.generatorReady;
	self.postMessage({type: 'generator_ready'});
      })
      .catch(error => {
	console.error('Error fetching or parsing JSON file:', error);
      });
    counter = 0;
  } break;
  case 'set_initial_joints': if (workerState === st.generatorReady ||
				 workerState === st.slrmReady) {
    if (data.joints) {
      // 初期ジョイントの設定処理
      console.log('Setting initial joints:', data.joints);
      joints = [...data.joints];
      // 到着処理、prevPosition未定義
      workerState = st.slrmReady;
      console.log('Worker state changed to slrmReady');
    }
  } break;
  case 'destination': if (workerState === st.slrmReady &&
			  data.endLinkPose ) {
    // データの受信処理
    controllerTfVec = [...data.endLinkPose];
    console.log('Received destination: '
		+ controllerTfVec[12].toFixed(3) + ', '
		+ controllerTfVec[13].toFixed(3) + ', '
		+ controllerTfVec[14].toFixed(3));
  } break;
  default:
    break;
  }
};

self.setInterval( () => {
  if (workerState === st.slrmReady) {
    // 計算処理など
    if (cmdVelGen === null ||
	joints === null || controllerTfVec === null) {
      // console.warn('controllerTfVec or cmdVelGen is not ready yet.');
      return;
    }
    let x = Math.floor(controllerTfVec[12]*1000) + counter;
    let y = Math.floor(controllerTfVec[13]*1000) + counter;
    let z = Math.floor(controllerTfVec[14]*1000) + counter;
    self.postMessage({type: 'joints', joints: [x, y, z]});
    counter += 1000;
  }
}, 10);

// ******** worker start ********
workerState = st.waitingRobotType;
self.postMessage({type: 'ready'});
