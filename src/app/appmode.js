//
// アプリケーションモードを定義
// appmode モジュール

export const AppMode = {
  normal: 'normal',        // 通常のロボット遠隔操作：カメラ無
  withCam: 'withCam',      // 通常のロボット遠隔操作 + カメラ表示
  withDualCam: 'withDualCam',  // 通常のロボット遠隔操作 + 2カメラ表示
  viewer: 'viewer',        // ビューワ（ロボットの状態を表示するだけ）:カメラ無
  simRobot: 'simRobot',    // 仮想ロボット（実ロボットのシミュレータ）
  practice: 'practice',    // 練習モード (荷物を運ぶタイプ：VRのみ)
};
