# workerの状態

メインスレッド側がReactなので、コードの記述順にworkerとハンドシェークしながら処理を勧めていくことができない。そのためmessageで順次状態遷移させていく。すなわち、メインスレッド側はonmessageの関数でpostMessageでworkerの状態を変えていく。

## 状態の定義と遷移
遷移先での想定type以外のmessageが来た場合の処理は当面省略(無視)

b1. initializing:  
   worker自体の起動中およびworkerが使うwasmのロードおよびバインド関数作成中
   完了したら、waitingRobotTypeに遷移して poseMessage('ready')
2. waitingRobotType:  
   ロボットのURDF(json)ファイル名取得を待つ。
   onmessageでファイル名が得られたら、generatorMakingに遷移
2. generatorMaking:  
   URDFからjoint modelsを作りそれを引数にcmdVelGeneratorをコンストラクト。
   コンストラクト完了したら、generatorReadyに遷移して postMessage('generator_ready')
3. generatorReady:  
   onmessageで`'set_initial_joints'`だったら、グローバルjointsに値をセットし、
   到着処理、prevPosition未定義処理して、slrmReadyに遷移
4. slrmReady:  
   onmessageで'destination'だったら、グローバル目標値('controllerTfVec')を
   書き換える  
   onmessageで`'set_initial_joints'`だったら、グローバルjointsに値をセットし、
   到着処理、prevPosition未定義処理して、slrmReadyに遷移
   
## メインがpostするメッセージのtype(worker状態遷移の入力)
1. Workerをnewするだけで、何もpostしない → initializing → waitingRobotType
2. `'init'` → generatorMaking → generatorReady
3. `'set_initial_joints'` → slrmReady
4. `'destination'` シーケンス用の状態は変化しない
5. `'terminate`'当面実装省略

## 各状態における`setInterval`ループ(関数)で行う処理

1. slrmReady以外:  
   なにもしない
2. slrmReady:  
   workerグローバルのjointsがnullならば何もしない。
   もし'destination'がnullでなければ、計算処理を行う  
   1. jointsとdestinationをcmdVelGeneratorのcalcVelocityを使って
	  ジョイント速度を得る
   2. calVelocityのリターンstateに従って処理。必要に応じて'joints'を
	  更新。ジョイントリミット処理。prevPosition処理。到着処理。
   3. calcVelocityリターン値と更新済'joints'でmessageを作り
	  post
