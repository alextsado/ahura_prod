importScripts("opencv.js"); // Load custom opencv.js with solvePnP

class PoseEstimator {
  constructor(width = 640, height = 480) {
    this.width = width;
    this.height = height;

    // 3D model points
    this.numRows = 4;
    this.modelPoints = cv.matFromArray(this.numRows, 3, cv.CV_64FC1, [
      0.0,
      0.0,
      0.0, // Nose tip
      0.0,
      -330.0,
      -65.0, // Chin
      -225.0,
      170.0,
      -135.0, // Left eye left corner
      225.0,
      170.0,
      -135.0, // Right eye right corner
      // -150.0, -150.0, -125.0,    // Left Mouth corner
      // 150.0, -150.0, -125.0,     // Right mouth corner
    ]);

    // Camera internals
    this.size = { width: this.width, height: this.height };
    this.focalLength = this.size.width;
    this.center = [this.size.width / 2, this.size.height / 2];
    this.cameraMatrix = cv.matFromArray(3, 3, cv.CV_64FC1, [
      this.focalLength,
      0,
      this.center[0],
      0,
      this.focalLength,
      this.center[1],
      0,
      0,
      1,
    ]);
    // console.log("Camera Matrix:", cameraMatrix.data64F);

    // Create Matrixes
    this.imagePoints = cv.Mat.zeros(this.numRows, 2, cv.CV_64FC1);
    this.distCoeffs = cv.Mat.zeros(4, 1, cv.CV_64FC1); // Assuming no lens distortion
    this.rvec = new cv.Mat({ width: 1, height: 3 }, cv.CV_64FC1);
    this.tvec = new cv.Mat({ width: 1, height: 3 }, cv.CV_64FC1);
    this.pointZ = cv.matFromArray(1, 3, cv.CV_64FC1, [0.0, 0.0, 500.0]);
    this.pointY = cv.matFromArray(1, 3, cv.CV_64FC1, [0.0, 500.0, 0.0]);
    this.pointX = cv.matFromArray(1, 3, cv.CV_64FC1, [500.0, 0.0, 0.0]);
    this.nose_end_point2DZ = new cv.Mat();
    this.nose_end_point2DY = new cv.Mat();
    this.nose_end_point2DX = new cv.Mat();
    this.jaco = new cv.Mat();
    // window.beforeunload = () => {
    //   this.im.delete();
    //   this.imagePoints.delete();
    //   this.distCoeffs.delete();
    //   this.rvec.delete();
    //   this.tvec.delete();
    //   this.pointZ.delete();
    //   this.pointY.delete();
    //   this.pointX.delete();
    //   this.nose_end_point2DZ.delete();
    //   this.nose_end_point2DY.delete();
    //   this.nose_end_point2DX.delete();
    //   this.jaco.delete();
    // };
  }

  calculatePoses(detections) {
    let newPoses = [];
    for (let i = 0; i < detections.length; i += 1) {
      let positions = detections[i].scaledMesh;

      // Store face landmark keypoints for PnP
      let ns = positions[4]; // Nose tip
      let ch = positions[175]; // Chin
      let re = positions[130]; //  Right eye right corner
      let le = positions[359]; // Left eye left corner
      // let rm = positions[];  //Right mouth corner
      // let lm = positions[];  //Left mouth corner
      [
        ns[0],
        ns[1],
        ch[0],
        ch[1],
        le[0],
        le[1],
        re[0],
        re[1],
        // lm[0],
        // lm[1],
        // rm[0],
        // rm[1],
      ].map((v, i) => {
        this.imagePoints.data64F[i] = v;
      });

      // Hack! initialize transition and rotation matrixes to improve estimation
      this.tvec.data64F[0] = -100;
      this.tvec.data64F[1] = 100;
      this.tvec.data64F[2] = 1000;
      const distToLeftEyeX = Math.abs(le.x - ns.x);
      const distToRightEyeX = Math.abs(re.x - ns.x);
      if (distToLeftEyeX < distToRightEyeX) {
        // console.log("LOOKING LEFT");
        this.rvec.data64F[0] = -1.0;
        this.rvec.data64F[1] = -0.75;
        this.rvec.data64F[2] = -3.0;
      } else {
        // console.log("LOOKING RIGHT");
        this.rvec.data64F[0] = 1.0;
        this.rvec.data64F[1] = -0.75;
        this.rvec.data64F[2] = -3.0;
      }

      // Solve for rotation (rvec) and translation (tvec) pose vectors
      const success = cv.solvePnP(
        this.modelPoints,
        this.imagePoints,
        this.cameraMatrix,
        this.distCoeffs,
        this.rvec,
        this.tvec,
        true
      );
      if (!success) {
        continue;
      }

      // Project axes from 3D to 2D image coords
      cv.projectPoints(
        this.pointZ,
        this.rvec,
        this.tvec,
        this.cameraMatrix,
        this.distCoeffs,
        this.nose_end_point2DZ,
        this.jaco
      );
      cv.projectPoints(
        this.pointY,
        this.rvec,
        this.tvec,
        this.cameraMatrix,
        this.distCoeffs,
        this.nose_end_point2DY,
        this.jaco
      );
      cv.projectPoints(
        this.pointX,
        this.rvec,
        this.tvec,
        this.cameraMatrix,
        this.distCoeffs,
        this.nose_end_point2DX,
        this.jaco
      );

      // 2D image coords of 3D landmarks
      const pNose = {
        x: this.imagePoints.data64F[0],
        y: this.imagePoints.data64F[1],
      };
      const pZ = {
        x: this.nose_end_point2DZ.data64F[0],
        y: this.nose_end_point2DZ.data64F[1],
      };
      const pY = {
        x: this.nose_end_point2DY.data64F[0],
        y: this.nose_end_point2DY.data64F[1],
      };
      const pX = {
        x: this.nose_end_point2DX.data64F[0],
        y: this.nose_end_point2DX.data64F[1],
      };

      // Convert Rodrigues vec to Euler angles in degrees
      const [yaw, pitch, roll] = cv.EulerFromRotVec(this.rvec.data64F);

      newPoses.push({
        pNose: pNose,
        pZ: pZ,
        pY: pY,
        pX: pX,
        yaw: yaw,
        pitch: pitch,
        roll: roll,
      });
    }

    return newPoses;
  }
}

/*
|-----------------------------------
| OpenCV custom utilities
|-----------------------------------
*/

function patchCV() {
  console.log("patching CV");
  // See https://raw.githubusercontent.com/haoking/opencvjs/master/opencv.js
  cv.Mat.prototype.mulConstant = function (constant) {
    let dst = new cv.Mat();
    cv.addWeighted(this, constant, this, 0, 0, dst);
    return dst;
  };

  cv["RodriguesFromArray"] = function (arr) {
    const theta = Math.sqrt(
      arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]
    );

    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const c1 = 1 - c;
    const itheta = theta ? 1 / theta : 0;

    const r = { x: arr[0] * itheta, y: arr[1] * itheta, z: arr[2] * itheta };

    const rrt = cv.matFromArray(3, 3, cv.CV_64FC1, [
      r.x * r.x,
      r.x * r.y,
      r.x * r.z,
      r.x * r.y,
      r.y * r.y,
      r.y * r.z,
      r.x * r.z,
      r.y * r.z,
      r.z * r.z,
    ]);
    const r_x = cv.matFromArray(3, 3, cv.CV_64FC1, [
      0,
      -r.z,
      r.y,
      r.z,
      0,
      -r.x,
      -r.y,
      r.x,
      0,
    ]);

    const m1 = r_x.mulConstant(s);
    const m2 = rrt.mulConstant(c1);
    const m3 = cv.Mat.eye(3, 3, cv.CV_64FC1);
    const m4 = m3.mulConstant(c);
    let m5 = new this.Mat();
    cv.add(m4, m2, m5);
    let dst = new this.Mat();
    cv.add(m5, m1, dst);

    rrt.delete();
    r_x.delete();
    m1.delete();
    m2.delete();
    m3.delete();
    m4.delete();
    m5.delete();
    return dst;
  };

  cv["EulerFromRotVec"] = function (rvec) {
    // See https://learnopencv.com/rotation-matrix-to-euler-angles/
    const R = cv.RodriguesFromArray(rvec).data64F;
    const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = R;

    const sy = Math.sqrt(m00 * m00 + m10 * m10);

    const singular = sy < 1e-6;

    let x, y, z;
    if (!singular) {
      x = Math.atan2(m21, m22);
      y = Math.atan2(-m20, sy);
      z = Math.atan2(m10, m00);
    } else {
      x = Math.atan2(-m12, m11);
      y = Math.atan2(-m20, sy);
      z = 0;
    }

    const yaw = (y * 180) / Math.PI;
    const pitch = (x * 180) / Math.PI;
    const roll = (z * 180) / Math.PI;

    return [yaw, pitch, roll];
  };
}

patchCV();
