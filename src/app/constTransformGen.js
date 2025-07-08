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
