class RobotKinematics {
    static _builders = {};

    constructor(robot_id) {
        this.robot_id = robot_id;
        if (!(robot_id in RobotKinematics._builders)) {
            throw new Error(`Unsupported robot_id: ${robot_id}`);
        }
        const { M, Slist, jointLimits } = RobotKinematics._builders[robot_id]();
        this.M = M;
        this.Slist = Slist;
        this.jointLimits = jointLimits;
    }

    static register_robot(robot_id, builderFunc) {
        RobotKinematics._builders[robot_id] = builderFunc;
    }

    get_M() {
        return this.M;
    }

    get_Slist() {
        return this.Slist;
    }

    get_jointLimits() {
        return this.jointLimits;
    }
}

const deg2rad = deg => deg * Math.PI / 180;

function screw_axis(w, q) {
    // w, q: Array(3)
    // 返回长度为6的数组
    const cross = [
        w[1]*q[2] - w[2]*q[1],
        w[2]*q[0] - w[0]*q[2],
        w[0]*q[1] - w[1]*q[0]
    ];
    return w.concat([-cross[0], -cross[1], -cross[2]]);
}


// 注册 piper_agilex 机器人
RobotKinematics.register_robot("agilex_piper", function build_piper_6dof() {
    const L_01 = 0.123, L_23 = 0.28503, L_34 = 0.25075, L_56 = 0.091, L_ee = 0.1358;
    const W_34 = 0.0219;

    const jointLimits = [
    { min: deg2rad(-150), max: deg2rad(150) },   // theta_1
    { min: deg2rad(-90),  max: deg2rad(90)  },   // theta_2
    { min: deg2rad(0),    max: deg2rad(169) },   // theta_3
    { min: deg2rad(-99),  max: deg2rad(99)  },   // theta_4
    { min: deg2rad(0),    max: deg2rad(139) },   // theta_5
    { min: deg2rad(-120), max: deg2rad(120) },   // theta_6
    ];

    const M = [
        [1, 0, 0, -W_34],
        [0, 1, 0, 0],
        [0, 0, 1, L_01 + L_23 + L_34 + L_56 + L_ee],
        [0, 0, 0, 1]
    ];


    const S1 = screw_axis([0, 0, 1], [0, 0, L_01]);
    const S2 = screw_axis([0, 1, 0], [0, 0, L_01]);
    const S3 = screw_axis([0, 1, 0], [0, 0, L_01 + L_23]);
    const S4 = screw_axis([0, 0, 1], [-W_34, 0, L_01 + L_23 + L_34]);
    const S5 = screw_axis([0, 1, 0], [-W_34, 0, L_01 + L_23 + L_34]);
    const S6 = screw_axis([0, 0, 1], [-W_34, 0, L_01 + L_23 + L_34 + L_56]);

    // Slist: 6x6，每列为一个关节的螺旋轴
    const Slist = [
        S1, S2, S3, S4, S5, S6
    ].map(col => col.slice()); 

    const SlistT = Array.from({length: 6}, (_, i) => Slist.map(row => row[i]));

    return { M, Slist: SlistT, jointLimits };
});

// Register JAKA_ZU_7 robot
RobotKinematics.register_robot("jaka_zu_7", function build_jaka_zu_7_6dof() {
    const X_01 = +0.00684, Y_01 = -0.00175, Z_01 = +0.04097
    const X_02 = +0.00661, Y_02 = -0.06582, Z_02 = +0.12112
    const X_03 = +0.00727, Y_03 = -0.06582, Z_03 = +0.48112
    const X_04 = +0.00663, Y_04 = -0.07130, Z_04 = +0.78412
    const X_05 = +0.00667, Y_05 = -0.11677, Z_05 = +0.85164
    const X_06 = +0.00681, Y_06 = -0.04736, Z_06 = +0.89762

    const L_ee = 0

    const jointLimits = [
    { min: deg2rad(0), max: deg2rad(360) },   // theta_1
    { min: deg2rad(0),  max: deg2rad(360)  },   // theta_2
    { min: deg2rad(0),    max: deg2rad(360) },   // theta_3
    { min: deg2rad(0),  max: deg2rad(360)  },   // theta_4
    { min: deg2rad(-180),    max: deg2rad(180) },   // theta_5
    { min: deg2rad(0), max: deg2rad(360) },   // theta_6
    ];

    const M = [
        [-1, 0, 0, X_06],
        [0, 0, 1, Y_06],
        [0, 1, 0, Z_06 + L_ee],
        [0, 0, 0, 1]
    ];

    const S1 = screw_axis([0, 0, 1], [X_01, Y_01, Z_01]);
    const S2 = screw_axis([0, 1, 0], [X_02, Y_02, Z_02]);
    const S3 = screw_axis([0, 1, 0], [X_03, Y_03, Z_03]);
    const S4 = screw_axis([0, 1, 0], [X_04, Y_04, Z_04]);
    const S5 = screw_axis([0, 0, 1], [X_05, Y_05, Z_05]);
    const S6 = screw_axis([0, 1, 0], [X_06, Y_06, Z_06]);

    const Slist = [
        S1, S2, S3, S4, S5, S6
    ].map(col => col.slice()); 

    const SlistT = Array.from({length: 6}, (_, i) => Slist.map(row => row[i]));

    return { M, Slist: SlistT, jointLimits };
});

// Register JAKA_ZU_5 robot
RobotKinematics.register_robot("jaka_zu_5", function build_jaka_zu_5_6dof() {
    const X_01 = 0, Y_01 = 0, Z_01 = +0.12015
    const X_02 = 0, Y_02 = 0, Z_02 = +0.12015
    const X_03 = 0, Y_03 = 0, Z_03 = +0.55015
    const X_04 = -0.00006, Y_04 = -0.114, Z_04 = +0.91865
    const X_05 = -0.00006, Y_05 = -0.114, Z_05 = +1.03215
    const X_06 = -0.00001, Y_06 = -0.007, Z_06 = +1.03215

    const L_ee = 0

    const jointLimits = [
    { min: deg2rad(0), max: deg2rad(360) },   // theta_1
    { min: deg2rad(0),  max: deg2rad(360)  },   // theta_2
    { min: deg2rad(0),    max: deg2rad(360) },   // theta_3
    { min: deg2rad(0),  max: deg2rad(360)  },   // theta_4
    { min: deg2rad(-180),    max: deg2rad(180) },   // theta_5
    { min: deg2rad(0), max: deg2rad(360) },   // theta_6
    ];

    const M = [
        [-1, 0, 0, X_06],
        [0, 0, 1, Y_06],
        [0, 1, 0, Z_06 + L_ee],
        [0, 0, 0, 1]
    ];

    const S1 = screw_axis([0, 0, 1], [X_01, Y_01, Z_01]);
    const S2 = screw_axis([0, 1, 0], [X_02, Y_02, Z_02]);
    const S3 = screw_axis([0, 1, 0], [X_03, Y_03, Z_03]);
    const S4 = screw_axis([0, 1, 0], [X_04, Y_04, Z_04]);
    const S5 = screw_axis([0, 0, 1], [X_05, Y_05, Z_05]);
    const S6 = screw_axis([0, 1, 0], [X_06, Y_06, Z_06]);

    const Slist = [
        S1, S2, S3, S4, S5, S6
    ].map(col => col.slice()); 

    const SlistT = Array.from({length: 6}, (_, i) => Slist.map(row => row[i]));

    return { M, Slist: SlistT, jointLimits };
});

// // 注册其他机器人示例
// RobotKinematics.register_robot("ur5", function ur5() {
//     // 自定义 UR5 的参数和姿态
//     // return { M, Slist };
// });

module.exports = RobotKinematics;
