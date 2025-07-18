class RobotDynamcis {
    static _builders = {};

    constructor(robot_id) {
        this.robot_id = robot_id;
        if (!(robot_id in RobotDynamcis._builders)) {
            throw new Error(`Unsupported robot_id: ${robot_id}`);
        }
        const { M, Mlist, Glist, Slist, Kplist, Kilist, Kdlist, jointLimits, toolLimit } = RobotDynamcis._builders[robot_id]();
        this.M = M;
        this.Mlist = Mlist;
        this.Glist = Glist;
        this.Slist = Slist;
        this.Kplist = Kplist;
        this.Kilist = Kilist;
        this.Kdlist = Kdlist;
        this.jointLimits = jointLimits;
        this.toolLimit = toolLimit;
    }

    static register_robot(robot_id, builderFunc) {
        RobotDynamcis._builders[robot_id] = builderFunc;
    }

    get_M() {
        return this.M;
    }

    get_Mlist() {
        return this.Mlist;
    }
    get_Glist() {
        return this.Glist;
    }

    get_Slist() {
        return this.Slist;
    }

    get_Kplist() {
        return this.Kplist;
    }

    get_Kilist() {
        return this.Kilist;
    }

    get_Kdlist() {
        return this.Kdlist;
    }

    get_jointLimits() {
        return this.jointLimits;
    }

    get_toolLimits() {
        return this.toolLimit;
    }
}

const deg2rad = deg => deg * Math.PI / 180;

function screw_axis(w, q) {
    const cross = [
        w[1]*q[2] - w[2]*q[1],
        w[2]*q[0] - w[0]*q[2],
        w[0]*q[1] - w[1]*q[0]
    ];
    return w.concat([-cross[0], -cross[1], -cross[2]]);
}



//  piper_agilex robot
RobotDynamcis.register_robot("agilex_piper", function build_piper_6dof() {
    const L_01 = 0.123, L_23 = 0.28503, L_34 = 0.25075, L_56 = 0.091, L_ee = 0.1358;
    const W_34 = 0.0219;

    const jointLimits = [
    { min: deg2rad(-150), max: deg2rad(150) },   // theta_1
    { min: deg2rad(-90),  max: deg2rad(90)  },   // theta_2
    { min: deg2rad(0),    max: deg2rad(169) },   // theta_3
    { min: deg2rad(-99),  max: deg2rad(99)  },   // theta_4
    { min: deg2rad(-69.901),    max: deg2rad(69.901) },   // theta_5
    { min: deg2rad(-120), max: deg2rad(120) },   // theta_6
    ];

    const toolLimit = { min: -1, max: 89 }; // theta_tool

    // const jointLimits = [
    // { min: deg2rad(-120), max: deg2rad(120) },   // theta_1
    // { min: deg2rad(-80),  max: deg2rad(80)  },   // theta_2
    // { min: deg2rad(10),    max: deg2rad(160) },   // theta_3
    // { min: deg2rad(-90),  max: deg2rad(90)  },   // theta_4
    // { min: deg2rad(0),    max: deg2rad(120) },   // theta_5
    // { min: deg2rad(-120), max: deg2rad(120) },   // theta_6
    // ];

    /* M */
    const M = [
        [1, 0, 0, -W_34],
        [0, 1, 0, 0],
        [0, 0, 1, L_01 + L_23 + L_34 + L_56 + L_ee],
        [0, 0, 0, 1]
    ];

    /* Mlist */
    const M01 = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, L_01],
        [0, 0, 0, 1]
    ];
    const M12 = [
        [1, 0, 0, 0],
        [0, 0, 1, 0],
        [0, -1, 0, 0],
        [0, 0, 0, 1]
    ];
    const M23 = [
        [1, 0, 0, 0],
        [0, 1, 0, -L_23],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ];
    const M34 = [
        [1, 0, 0, -W_34],
        [0, 0, -1, -L_34],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
    ];
    const M45 = [
        [1, 0, 0, 0],
        [0, 0, 1, 0],
        [0, -1, 0, 0],
        [0, 0, 0, 1]
    ];
    const M56 = [
        [1, 0, 0, 0],
        [0, 0, -1, -L_56],
        [0, 1, 0, 0],
        [0, 0, 0, 1]
    ];
    const M6ee = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, L_ee],
        [0, 0, 0, 1]
    ];
    const Mlist = [M01, M12, M23, M34, M45, M56, M6ee];
    
    /**
     * 生成6x6空间惯性矩阵
     * @param {number} mass 质量
     * @param {Array<number>} com 质心位置 [x, y, z]
     * @param {Array<Array<number>>} inertia 3x3转动惯量张量（绕body原点）
     * @returns {Array<Array<number>>} 6x6空间惯性矩阵
     */
    function spatialInertiaMatrix(mass, com, inertia) {
        // 反对称矩阵
        const com_hat = [
            [0, -com[2], com[1]],
            [com[2], 0, -com[0]],
            [-com[1], com[0], 0]
        ];
        // mc_hat = mass * com_hat
        let mc_hat = [];
        for (let i = 0; i < 3; i++) {
            mc_hat[i] = [];
            for (let j = 0; j < 3; j++) {
                mc_hat[i][j] = mass * com_hat[i][j];
            }
        }
        // inertia + mc_hat @ com_hat.T
        let rot = [];
        for (let i = 0; i < 3; i++) {
            rot[i] = [];
            for (let j = 0; j < 3; j++) {
                // inertia[i][j]
                let sum = inertia[i][j];
                // + sum_k mc_hat[i][k] * com_hat[j][k] (注意转置)
                for (let k = 0; k < 3; k++) {
                    sum += mc_hat[i][k] * com_hat[j][k];
                }
                rot[i][j] = sum;
            }
        }
        // 构造6x6
        let G = Array.from({length: 6}, () => Array(6).fill(0));
        // 左上
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
                G[i][j] = rot[i][j];
        // 右上
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
                G[i][j+3] = mc_hat[i][j];
        // 左下
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
                G[i+3][j] = mc_hat[j][i]; // 转置
        // 右下
        for (let i = 0; i < 3; i++)
            G[i+3][i+3] = mass;
        return G;
    }

    const Glist = [
        // base link
        spatialInertiaMatrix(1.02, [-0.0047364, 2.5683e-05, 0.0414515], [
            [0.00267433, -0.00000073, -0.00017389],
            [-0.00000073, 0.00282612, 0.0000004],
            [-0.00017389, 0.0000004, 0.00089624]
        ]),
        // link 1
        spatialInertiaMatrix(0.71, [0.0001215, 0.0001046, -0.004386], [
            [0.00048916, -0.00000036, -0.00000224],
            [-0.00000036, 0.00040472, -0.00000242],
            [-0.00000224, -0.00000242, 0.00043982]
        ]),
        // link 2
        spatialInertiaMatrix(1.17, [0.198666145229743, -0.010926924140076, 0.00142121714502687], [
            [0.00116918, -0.00180037, 0.00025146],
            [-0.00180037, 0.06785384, -0.00000455],
            [0.00025146, -0.00000455, 0.06774489]
        ]),
        // link 3
        spatialInertiaMatrix(0.5, [-0.0202737662, -0.133915, -0.0004587], [
            [0.01361711, 0.00165794, -0.00000048],
            [0.00165794, 0.00045024, -0.00000045],
            [-0.00000048, -0.00000045, 0.01380322]
        ]),
        // link 4
        spatialInertiaMatrix(0.38, [-9.66635792e-05, 0.00087606, -0.00496881], [
            [0.00018501, 0.00000054, 0.00000120],
            [0.00000054, 0.00018965, -0.00000841],
            [0.00000120, -0.00000841, 0.00015484]
        ]),
        // link 5
        spatialInertiaMatrix(0.383, [-4.10554119e-05, -0.05664867, -0.00372058], [
            [0.00166169, 0.00000006, -0.00000007],
            [0.00000006, 0.00018510, 0.00001026],
            [-0.00000007, 0.00001026, 0.00164321]
        ]),
        // link 6
        spatialInertiaMatrix(0.007, [-8.82590763e-05, 9.05983785e-06, -0.002], [
            [5.73015541e-07, -1.98305403e-22, -7.27918939e-23],
            [-1.98305403e-22, 5.73015541e-07, -3.41460266e-24],
            [-7.27918939e-23, -3.41460266e-24, 1.06738869e-06]
        ]),
        // link_gripper
        spatialInertiaMatrix(0.45, [-0.00018381, 8.05033e-05, 0.03214367], [
            [0.00092934, 0.00000034, -0.00000738],
            [0.00000034, 0.00071447, 0.00000005],
            [-0.00000738, 0.00000005, 0.00039442]
        ]),
        // link 7 
        spatialInertiaMatrix(0.025, [0.00065123, -0.04919299, 0.00972259], [
            [0.00007371, -0.00000113, 0.00000021],
            [-0.00000113, 0.00000781, -0.00001372],
            [0.00000021, -0.00001372, 0.0000747]
        ]),
        // link 8 
        spatialInertiaMatrix(0.025, [0.00065123, -0.04919299, 0.00972259], [
            [0.00007371, -0.00000113, 0.00000021],
            [-0.00000113, 0.00000781, -0.00001372],
            [0.00000021, -0.00001372, 0.0000747]
        ])
    ];

    /* Slist */
    const S1 = screw_axis([0, 0, 1], [0, 0, L_01]);
    const S2 = screw_axis([0, 1, 0], [0, 0, L_01]);
    const S3 = screw_axis([0, 1, 0], [0, 0, L_01 + L_23]);
    const S4 = screw_axis([0, 0, 1], [-W_34, 0, L_01 + L_23 + L_34]);
    const S5 = screw_axis([0, 1, 0], [-W_34, 0, L_01 + L_23 + L_34]);
    const S6 = screw_axis([0, 0, 1], [-W_34, 0, L_01 + L_23 + L_34 + L_56]);

    const Slist = [
        S1, S2, S3, S4, S5, S6
    ].map(col => col.slice()); 

    const SlistT = Array.from({length: 6}, (_, i) => Slist.map(row => row[i]));

    // const Kplist = [3.5, 20, 15, 2.5, 0.5, 0.45]
    // const Kilist = [0.00025, 0.035, 0.000225, 0, 0, 0.0003]
    // const Kdlist = [1.2, 6.5, 4.2, 0.85, 0.1, 0.08]

    const Kplist = [3.5, 20, 15, 2.5, 0.5, 0.45]
    const Kilist = [0.00025, 0.035, 0.000225, 0, 0, 0.0003]
    const Kdlist = [0.6, 3.0, 2.0, 0.45, 0.1, 0.08]

    return { M, Mlist, Glist, Slist: SlistT, Kplist, Kilist, Kdlist, jointLimits, toolLimit };
});


// Register JAKA_ZU_5 robot
RobotDynamcis.register_robot("jaka_zu_5", function build_jaka_zu_5_6dof() {
    const X_01 = 0, Y_01 = 0, Z_01 = +0.12015
    const X_02 = 0, Y_02 = 0, Z_02 = +0.12015
    const X_03 = 0, Y_03 = 0, Z_03 = +0.55015
    const X_04 = -0.00006, Y_04 = -0.114, Z_04 = +0.91865
    const X_05 = -0.00006, Y_05 = -0.114, Z_05 = +1.03215
    const X_06 = -0.00001, Y_06 = -0.007, Z_06 = +1.03215

    const L_ee = 0

    const jointLimits = [
    { min: deg2rad(-360), max: deg2rad(360) },   // theta_1
    { min: deg2rad(-90), max: deg2rad(90) },   // theta_2
    { min: deg2rad(-150), max: deg2rad(150) },   // theta_3
    { min: deg2rad(-180), max: deg2rad(180) },   // theta_4
    { min: deg2rad(-360), max: deg2rad(360) },   // theta_5
    { min: deg2rad(-360), max: deg2rad(360) },   // theta_6
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
// RobotDynamcis.register_robot("ur5", function ur5() {
//     // 自定义 UR5 的参数和姿态
//     // return { M, Slist };
// });

module.exports = RobotDynamcis;
