## 改造方針 2025.07.01

1. Reactの再レンダリング時のフィルタルーチンを取り除き、単純にコントローラの(トリガーからの差分の)位置姿勢に単純化して直接動かす →済
2. aframeに時間(tick)を統括する親entityを作り、個々のentity直接でなく、親entity経由のアクセスに変更する
   訂正: vr-controllerのコンポーネントのtickで、worker呼び出すテスト  
   再訂正: ReactのuseEffect(..., []);でworkerを生成して、useRefに入れておく  
   `controller_object`の`useEffect`からobject3D matrixとをworkerに送る　

3. 各リンクentityが、どのようにjointモデルに従って動いているか、FK入力調査 →済
4. [ロボットのURDF](https://wiki.ros.org/urdf/XML/joint)と、
   [~~河口研オリジナル~~劉さんAFrame](https://github.com/vettayruu/Modern_Robotics_Control_IK/blob/Piper_MQTT_Control/src/app/Model.js)の
   [ジョイント定義(向き・ゼロ)](https://github.com/vettayruu/Modern_Robotics_Control_IK/blob/3115ce53630e62fe32eaef36b03f5553dd3f8b62/src/app/Model.js#L32)で、
   どのように異なっているか調査 →済  
   WASMのSLRM moduleはフルSRDF/URDFは不要で最低限jointの`type`, `origin`, `axis`
   だけあればよい。ただし`worker.js`としてはジョイント角を積分した後に
   ジョイントリミット内に収めるために`limit`も有ったほうが良い(ほぼ必要)
5. 河口研ジョイント角とURDFジョイント角の相互変換(向き・ゼロ)作成。SLRMモジュールの
   出力をaframeに反映させるため。

6. workerのIKをModern RoboticsからWASM(slrm)に置きかえ。Aボタン
   1. `worker.js`でロボットタイプ、初期関節角等の初期化をメッセージで行うようにする  
      * ロボットタイプ(URDF)のセット、URDF(json)のfetch、WASMの計算オブジェクト生成  
      * 初期ジョイント角の(worker.js内)のセット
   2. WASMの計算オブジェクトの引数型にMatrix4用を追加

7. AFrame用JSXをURDF(リンクスケルトンjson)から自動生成にする
   1. `public/`の下を再整理してロボットタイプ別に変更にする
   2. xacro用stlおよびdaeをgltfに変換する。あるいは河口研バージョンから持ってくる
   3. JSX生成関数(React.createElement利用)を作り、jsオブジェクトからJSXを作る
   4. URDF構造のobjからJSX用のobjectへの変換関数を作る
   5. UIを何か考える

## worker.jsでTHREEを`import`して使う

1. Next.jsからthreeを使う以外に、Viteでthreeをworkerにバンドルする
   1. Viteをローカルに追加  
	  ```
	  pnpm add -D vite
	  ```
   2. `vite.config.js`を作成
   3. `worker.js`を`workers/`に移動する
   3. 好みに応じて、`package.json`にviteによるビルドを追加。以上準備
   4. `worker.js`を編集
   5. Workerビルド  
	  ```
	  pnpm vite build
	  ```
	  あるいは`package.json`に書いたコマンドでビルド
2. モジュールとして呼び出す  
   メインスレッド(React)側
   ```
   workerRef.current = new Worker('/worker.js', { type: 'module'});
   ```

## Agile-X提供のpiperのURDF

1. axisはすべて[0,0,1]
2. origin.rpy rpyは(X,Y,Z)の順
   1. 0,0,0
   2. Pi/2, 0, -Pi <= axisが0,0,1なのでゼロ点を変えている
   3. 0, 0, -100degree <=同上
   4. Pi/2, 0, 0
   5. -Pi/2, 0, 0
   6. Pi/2, 0, 0

PiPER xacro まとめ
URDFでは、先xyz、次rpyの順に変換。rpyは rotz.roty.rotxの順に変換

 name   ,  type     , xyz                    ,rpy
"joint1", "revolute", "0 0 0.123",            "0 0 0"
"joint2", "revolute", "0 0 0",                "1.5708 -0.10095 -3.1416"
"joint3", "revolute", "0.28503 0 0",          "0 0 -1.759"
"joint4", "revolute", "-0.021984 -0.25075 0", "1.5708 0 0"
"joint5", "revolute", "0 0 0",                "-1.5708 0 0"
"joint6", "revolute", "0 -0.091 0",           "1.5708 0 0"

-0.10095radは、joint2がゼロの時link2の先をすこし持ち上げる
-1.759rad ≒ -100°は、join3がゼロの時完全に畳まれずlink4を10°持ち上げる
ArcTan[0.25075,0.021984]/Pi*180 ≒ 5.01048°

ROS2のrvizでのPiPERの初期位置は {0.2, 1.5, -1.0, -0.1, -0.4, 1.5}
すなわち {11.5, 85.9, -57.3, -5.7, -22.9, 85.9}°

劉さんModernRoboticsのゼロ点は、joint1の直上にjoint3,4,5,6 各jointの回転の向きは同じ

mrLiuをurdfに変換
1. j1u = j1mr
2. j2u = j2mr + Pi/2 - 0.10095
3. j3u = j3mr - (Pi/2 - 0.10095) - Pi/2 + ArcTan[0.25075,0.021984]
4. j4u = j4mr
5. j5u = j5mr
6. j6u = j6mr

## workerとのコミュニケーション

### オブジェクトの`type`キー毎の動作

* robotType: 引数: URDF jsonのパス  
  jsonをfetchし、WASMでjoint modelを作り、WASMのCmdVelGeneratorを作る  
  リターン: エラータイプ
* init: 引数: currentJointPosition  
  IK用の関節角初期値(現在の関節角)をworker内にセットする。
* destination: 引数: 目標位置姿勢
  関節角が存在していれば、workerを周期計算モードに入れる。

###  workerの周期計算モード
関節角が存在していれば、
  WASMのcalc_velocityを呼んでintervalを掛けて関節角を更新する。
  jsonの関節角リミットと比較し、範囲外ならばクロッピングする。
  statusと関節角を返す。必要に応じて result.otherにworkerのstatusを付ける。
  メインスレッドに向けてpostMessageする
  
