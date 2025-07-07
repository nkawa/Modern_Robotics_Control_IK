改造方針 2025.07.01

1. Reactの再レンダリング時のフィルタルーチンを取り除き、単純にコントローラの(トリガーからの差分の)位置姿勢に単純化して直接動かす →済
2. aframeに時間(tick)を統括する親entityを作り、個々のentity直接でなく、親entity経由のアクセスに変更する
   訂正: vr-controllerのコンポーネントのtickで、worker呼び出すテスト  
   再訂正: ReactのuseEffect(..., []);でworkerを生成して、useRefに入れておく  
   vr-contorllerの内部でcontrollerStart(Inv)を作る <= end linkのmatrixが必要  
   vr-controllerのコンポーネントからobject3D matrixとをworkerに送る　

3. 各リンクentityが、どのようにjointモデルに従って動いているか、FK入力調査 →済
4. Reactの再レンダリングからaframeのentityの動き(position, quaternion)を切り離し、
   IK部分をtickに持ってきてtickでposition,quaternionを設定して動かすように変更
5. 親entityのコンポーネントにworker生成を追加し、IK部分をworkerで独自周期で計算。aframeはtickで最新ポストを描画
6. workerのIKをModern RoboticsからWASM(slrm)に置きかえ。ロボットのURDF由来のjsonをfetch。
