//
// 定数座標変換行列を生成する関数群
let three2worldCache = null;
let world2threeCache = null;
export function three2worldMatGen() {
  // if (three2worldCache) return three2worldCache.clone();
  // // /* const THREE = window.AFRAME.THREE */
  // world座標系からthree.jsの座標系への変換行列. world_T_threeに相当
  // 16個の値の配列(列優先、column-major 順)で Matrix4 を初期化
  const three2worldMat = new THREE.Matrix4().fromArray([
    0, -1, 0, 0,   // 1列目
    0, 0, 1, 0,    // 2列目
    -1, 0, 0, 0,   // 3列目
    0, 0, 0, 1     // 4列目平行移動
  ]);
  three2worldCache = three2worldMat.clone();
  return three2worldMat;
}

export function world2threeMatGen() {
  // if (world2threeCache) return world2threeCache.clone();
  // /* const THREE = window.AFRAME.THREE */
  // three_T_worldに相当
  world2threeCache = three2worldMatGen().clone().transpose(); // 逆行列
  return world2threeCache.clone();
}

// // for piper
// const j2UrdfZero = 1.46984632679; // Pi/2.0 - 0.10095
// const j3UrdfZero = -2.95319327649; // - (Pi/2 - 0.10095) - Pi/2 + ArcTan[0.25075,0.021984]
// for Jaka
const deg90 = Math.PI / 2.0; // 90度をラジアンに変換
const deg180 = Math.PI; // 180度をラジアンに変換

export function mr2urdfJoints(mrJoints) {
  const ud = [
    mrJoints[0] + deg180,
    mrJoints[1] - deg90,
    mrJoints[2],
    mrJoints[3] - deg90,
    mrJoints[4],
    mrJoints[5]
  ];
  return ud;
}
export function urdf2mrJoints(udJoints) {
  const mr = [
    udJoints[0] - deg180,
    udJoints[1] - deg90,
    udJoints[2],
    udJoints[3] - deg90,
    udJoints[4],
    udJoints[5]
  ];
  return mr;
}
