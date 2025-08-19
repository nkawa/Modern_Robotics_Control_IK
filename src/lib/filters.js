export class MovingAverageQuaternionFilter {
    constructor(
        windowSize = 5,
        rotateThreshold = 0.0001 / 35
    ) {
        this.windowSize = windowSize;
        this.rotateThreshold = rotateThreshold;
        this.quaternionBuffer = [];
        this.smoothedQuaternion = new THREE.Quaternion(0, 0, 0, 1);
    }

    applyFilter(quaternion) {
        return this.smoothQuaternion(quaternion);
    }

    smoothQuaternion(quaternion) {
        // THREE.Quaternionとしてバッファに追加
        this.quaternionBuffer.push(quaternion.clone());
        if (this.quaternionBuffer.length > this.windowSize) {
            this.quaternionBuffer.shift();
        }

        if (this.quaternionBuffer.length === 1) {
            this.smoothedQuaternion = this.quaternionBuffer[0].clone();
        } else {
            this.smoothedQuaternion = this.slerpAverage(this.quaternionBuffer);
        }

        // 回転角度の閾値チェック
        const identity = new THREE.Quaternion(0, 0, 0, 1);
        const rotationAngle = this.smoothedQuaternion.angleTo(identity);

        if (Math.abs(rotationAngle) < this.rotateThreshold) {
            return new THREE.Quaternion(0, 0, 0, 1); // 単位クォータニオン
        }

        return this.smoothedQuaternion.clone();
    }

    slerpAverage(quaternions) {
        if (quaternions.length === 0) {
            return new THREE.Quaternion(0, 0, 0, 1);
        }
        if (quaternions.length === 1) {
            return quaternions[0].clone();
        }

        // 最初のクォータニオンから開始
        let result = quaternions[0].clone();

        // 段階的にSLERPで平均化
        for (let i = 1; i < quaternions.length; i++) {
            const t = 1.0 / (i + 1);
            result.slerp(quaternions[i], t);
        }

        return result.normalize();
    }

    reset() {
        this.quaternionBuffer = [];
        this.smoothedQuaternion = new THREE.Quaternion(0, 0, 0, 1);
    }
}

export class MovingAveragePositionFilter {
    constructor(
        windowSize = 5,
        moveThreshold = 0.00001 / 35
    ) {
        this.windowSize = windowSize;
        this.moveThreshold = moveThreshold;

        this.positionBuffer = [];
        this.smoothedPosition = new THREE.Vector3(0, 0, 0);
    }

    applyFilter(position) {
        return this.smoothPosition(position);
    }

    smoothPosition(position) {
        // Vector3の場合はclone、プレーンオブジェクトの場合はコピー
        if (position.isVector3) {
            this.positionBuffer.push(position.clone());
        } else {
            this.positionBuffer.push(new THREE.Vector3(position.x, position.y, position.z));
        }

        if (this.positionBuffer.length > this.windowSize) {
            this.positionBuffer.shift();
        }

        // Vector3での平均計算
        const sum = this.positionBuffer.reduce((acc, val) => {
            acc.add(val);
            return acc;
        }, new THREE.Vector3(0, 0, 0));

        this.smoothedPosition = sum.divideScalar(this.positionBuffer.length);

        // 閾値以下の微小な動きは0に設定
        this.smoothedPosition.x = Math.abs(this.smoothedPosition.x) < this.moveThreshold ? 0 : this.smoothedPosition.x;
        this.smoothedPosition.y = Math.abs(this.smoothedPosition.y) < this.moveThreshold ? 0 : this.smoothedPosition.y;
        this.smoothedPosition.z = Math.abs(this.smoothedPosition.z) < this.moveThreshold ? 0 : this.smoothedPosition.z;

        return this.smoothedPosition.clone();
    }

    reset() {
        this.positionBuffer = [];
        this.smoothedPosition = new THREE.Vector3(0, 0, 0);
    }
}

export const emphasizeMovementFilter = (position, params = {
    threshold: 0.001 / 35,
    accelerationExponent: 2.3,
    accelerationFactor: 180000 * Math.pow(35, 2.3),
    maxAcceleration: 3,
}) => {
    const movementDistance = position.length(); // Vector3のlength()メソッド使用
    const emphasizedScale = calculateEmphasizeScale(movementDistance, params);
    return position.clone().multiplyScalar(emphasizedScale); // Vector3のメソッド使用
}

export const emphasizeRotationFilter = (quaternion, params = {
    threshold: 0.005 / 35,
    accelerationExponent: 2.3,
    accelerationFactor: 1500 * Math.pow(35, 2.3),
    maxAcceleration: 3,
}) => {
    const { radian: rotationRadian } = quaternionToAngle(quaternion);
    const emphasizedScale = calculateEmphasizeScale(rotationRadian, params);
    return scaleQuaternion(quaternion, emphasizedScale);
}

export const suppressMovementFilter = (position, quaternion, params = {
    threshold: 0.01 / 35,
    suppressionExponent: 1.5,
    suppressionFactor: 500 * Math.pow(35, 1.5),
    minSuppression: 0.001,
}) => {
    const { radian: rotationRadian } = quaternionToAngle(quaternion);
    const suppressedScale = calculateSuppressScale(rotationRadian, params);
    return position.clone().multiplyScalar(suppressedScale); // Vector3のメソッド使用
}

export const suppressRotationFilter = (position, quaternion, params = {
    threshold: 0.01 / 35,
    suppressionExponent: 1.5,
    suppressionFactor: 10 * Math.pow(50, 1.5),
    minSuppression: 0.0001,
}) => {
    const movementDistance = position.length(); // Vector3のlength()メソッド使用
    const suppressedScale = calculateSuppressScale(movementDistance, params);
    return scaleQuaternion(quaternion, suppressedScale);
}

const calculateEmphasizeScale = (motionDifference, params) => {
    if (motionDifference < params.threshold) return 1.0;
    const normalizedInput = motionDifference - params.threshold;
    const curvedInput = Math.pow(normalizedInput, params.accelerationExponent);
    const acceleration = 1.0 + curvedInput * params.accelerationFactor;

    return Math.min(acceleration, params.maxAcceleration);
}

const calculateSuppressScale = (motionDifference, params) => {
    if (motionDifference < params.threshold) return 1.0;
    const normalizedInput = Math.min((motionDifference - params.threshold), 1.0);
    const curvedInput = Math.pow(normalizedInput, params.suppressionExponent);

    return Math.max(1.0 - (curvedInput * params.suppressionFactor), params.minSuppression);
}

export const scaleQuaternion = (quaternion, factor) => {
    const identity = new THREE.Quaternion()
    const scaledQuaternion = new THREE.Quaternion()
    scaledQuaternion.slerpQuaternions(identity, quaternion, factor)
    return scaledQuaternion
}

const quaternionToAngle = (q) => {
    const radian = 2 * Math.acos(round(q.w))
    if (radian === 0) {
        return { radian, axis: new THREE.Vector3(0, 0, 0) }
    }
    const sinHalfAngle = Math.sqrt(1 - q.w * q.w)
    if (sinHalfAngle > 0) {
        const axisX = (q.x / sinHalfAngle)
        const axisY = (q.y / sinHalfAngle)
        const axisZ = (q.z / sinHalfAngle)
        return { angle, radian, axis: new THREE.Vector3(axisX, axisY, axisZ) }
    } else {
        return { angle, radian, axis: new THREE.Vector3(0, 0, 0) }
    }
}

const round = (x, d = 5) => {
    const v = 10 ** (d | 0)
    return Math.round(x * v) / v
}