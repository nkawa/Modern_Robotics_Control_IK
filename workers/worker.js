// Worker script for handling messages and performing calculations
import * as THREE from 'three'
let controllerTf = new THREE.Matrix4();

self.onmessage = function(event) {
  const data = event.data;
  controllerTf.fromArray(data);
  // 計算処理など
  const result = data * 2;
  self.postMessage(result);
};

let counter = 0;
self.setInterval( () => {
  let x = Math.floor(controllerTf.elements[12]*1000) + counter;
  let y = Math.floor(controllerTf.elements[13]*1000) + counter;
  let z = Math.floor(controllerTf.elements[14]*1000) + counter;
  // postMessage([x, y, z]);
  self.postMessage(x);
  counter += 1000;
}, 10);
