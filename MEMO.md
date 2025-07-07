## 改造方針 2025.07.01

1. Reactの再レンダリング時のフィルタルーチンを取り除き、単純にコントローラの(トリガーからの差分の)位置姿勢に単純化して直接動かす →済
2. aframeに時間(tick)を統括する親entityを作り、個々のentity直接でなく、親entity経由のアクセスに変更する
   訂正: vr-controllerのコンポーネントのtickで、worker呼び出すテスト  
   再訂正: ReactのuseEffect(..., []);でworkerを生成して、useRefに入れておく  
   `controller_object`の`useEffect`からobject3D matrixとをworkerに送る　

3. 各リンクentityが、どのようにjointモデルに従って動いているか、FK入力調査 →済
4. [ロボットのURDF](https://wiki.ros.org/urdf/XML/joint)と、
   [河口研AFrame](https://github.com/nkawa/AgileX-PiPER-Control-IK)の
   [ジョイント定義(向き・ゼロ)](https://github.com/nkawa/AgileX-PiPER-Control-IK/blob/70faa6fb38acedbc313fd7b65fe1daa3873886dc/src/app/home.js#L1399)で、
   どのように異なっているか調査  
   WASMのSLRM moduleはフルSRDF/URDFは不要で最低限jointの`type`, `origin`, `axis`
   だけあればよい。ただし`worker.js`としてはジョイント角を積分した後に
   ジョイントリミット内に収めるために`limit`も有ったほうが良い(ほぼ必要)
5. 河口研ジョイント角とURDFジョイント角の相互変換(向き・ゼロ)作成。SLRMモジュールの
   出力をaframeに反映させるため。

6. workerのIKをModern RoboticsからWASM(slrm)に置きかえ。
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
