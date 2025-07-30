# Next.jsに触られない部分

ここには、ロボットのモデルと、worker(およびWASM)が入っている

## 参考情報

### IK(slrm) workerの内部状態

* `initializing`: worker生成中. workerの実行開始、必要モジュールのimport, 
  変数初期化、関数定義、factoryがWASMとのinterfaceモジュールを生成完了すると自動的に`waiting RobotType`に遷移する
* `waiting RobotType`: URDFを探すためのロボットモデル名の受信待ち状態。
2. `generatorMaking`: ロボット定義ファイル(URDF)のパスを受取、jsonを
   fetchしジョイントモデルを作り、それを引数にWASMのslrmオブジェクトを生成し、生成完了したら
   各種パラメータをオブジェクトにセットして、自動的にslrm object ready(`generatoReady`)に遷移する
3. `generatorReady`: 初期ジョイント値を受信してworker(のjs)内のjoint値として覚える。
   さらに同じものをrewind先として覚える。worker内のジョイント速度を0にし、rewind軌道生成オブジェクトを生成する。
   最後に手先目標値を[]にして、`slrm moving`に遷移する。目標値が[]の場合現在のジョイント値から得られる手先位置姿勢を
   目標値にするため、実際に動くことなくWASMのslrmオブジェクト(`cmdVelGen`)によりジョイント値から手先位置姿勢が計算(FK)される
4. `slrm converged`, `slrm moving`, `rewinding`: 手先目標値(`destination`)を受け取ると、ジョイント値を動かして
   その位置姿勢へ向かう。タイマーcallbackの処理`mainFunc`が有効になり、(あれば)手先目標位置との偏差に基づき速度レベルの
   IKを行いcallback内でそれを積算することで偏差が減っていく。
   * `cmdVelGen`が位置姿勢誤差が十分小さいと判定すると`slrm converged`に遷移
   * `slow_rewind`命令を受け取ると、`rewinding`に遷移
6. `rewinding`: 事前に登録した(`generatorReady`で受信した)ジョイント初期値に滑らかに、**ジョイントモードで**移動する。


### IK(slrm) workerの使い方

1. workerの生成とmessageハンドラー
   1. workerを生成し、workerからのメッセージを待つ。
   2. メッセージの`type`プロパティが`ready`だったら、`{type: 'init', filename: 'XXXX.json'}`messageを送信
   3. メッセージの`type`プロパティが`generator_ready`だったら各種パラメータ設定用のmessageを送信し
	  `{type 'set_initial_joints', joints: [ジョイント角] }`のmessageを送信する。これでworkerはIKを開始可能な状態になる
   4. メッセージの`type`プロパティが`joints`だったら、無限エクステントの変数(useRef)`workerLastJoints`のジョイント値を
	  上書きする(外部で読み出すとIKで計算された最新のジョイント値が得られる)
   5. `joints`と同じタイミングで、`status`(特異点からの距離やジョイントリミットに掛かっている等)IK計算結果の状態、
	  および`pose`(手先位置姿勢)メッセージも送られてくる。`endLinkPoseUpdater`という関数が定義してあるため
	  必要な所でそれを呼ぶと変換してuseRefの`endLinkPose`(THREE.Matrix4型)が更新される
2. workerへの随時の命令
   1. `set_initial_joints`: workerが想定する現在のジョイント値を直接指定する。事実上同一ロボットモデルでのworkerのリセット
   2. `destination`: workerに手先目標位置姿勢を与える。workerはそこへ向かうジョイント値を出し続ける
   3. `slow_rewind`: 手先目標値は取り消し、登録(初期)ジョイント値の位置姿勢に、手先モードでなくジョイントモードで移動する
   4. `set_end_effector_point`: 先端リンクにおける手先の位置を指定する。ハンドが変わった時や、先端中心回転では
	  使いづらいと思った時用
   5. `set_exact_solution`: `{type: 'set_exact_solution', exactSolution: false }`を送ると、特異点近傍で
	  特異点低感度運動分解を行い無理に指令値を追わず特異点通過ができるようになる。
	  `exactSolution: true`を送ると、指令とおりに正確に動くことを試みる。
	  いずれの場合もジョイント速度が最大速度を超えそうな場合、目標速度・角速度の向きが正確になるように全体の速度を落とす。

	以上が実装済のコマンド

### `home.js`と`registerAframeComponents.js`に実装されているスティックとボタン

1. 歴史的経緯で、A,Bボタンとグリップは、ハンドのopen/closeに割当
2. スティックを右に倒すと、UIモード変更(文字の表示の`MODE`が変わる)
3. `Normal`モードで、スティックを左に倒すと`rewind`
4. `Normal`モードで、トリガーオフ、スティックを上下に倒すと、感度変更
5. `ToolPoint`モードで、スティックを上下に倒すと、ツール点のZ軸値が上下する
6. ロボットのbase linkをマウスクリックすると、ロボットが入れ替わる
