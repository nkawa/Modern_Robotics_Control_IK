# wasm生成のためのディレクトリ

1. Emscriptenを取ってくる。このリポジトリ外の適当な場所で..  
   ```
   git clone https://github.com/emscripten-core/emsdk.git
   ```
   `README.md`に従ってinstall, activateしsourceする
1. もしrecursiveにcloneしていなければ、submoduleを取ってくる  
   * `git@github.com:TSUSAKA-ucl/moveit_jacobian.git`
   * `https://gitlab.com/libeigen/eigen.git`
1. ビルド
   ```
   cd build
   emcmake cmake -DCMAKE_BUILD_TYPE=Release
   make
   ```
   以上で、`../public/wasm/`の下にwasmとwrapperがインストールされる
1. 実装済のインターフェースは`bindings.cpp`参照
