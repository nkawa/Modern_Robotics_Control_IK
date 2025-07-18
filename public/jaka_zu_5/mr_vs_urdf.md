# Jaka zu5: Modern Robotics vs URDF, difference in the definition of thier joint angles

URDFのゼロ姿勢は、MRの{Pi, -Pi/2, 0, -Pi/2, 0, 0}
// // jaka_zu_5 urdfゼロからすこしプラス(3軸マイナス)の姿勢
// const theta_body_initial = [180, -60, -30, -70, 30, 0].map(x=>x*Math.PI/180);

ジョイント角の±の向きの違い(+:同じ, -:逆)  {+, +, +, +, +, +}
MRのゼロ姿勢は、URDFでは{Pi, +Pi/2, 0, +Pi/2, 0, 0}
