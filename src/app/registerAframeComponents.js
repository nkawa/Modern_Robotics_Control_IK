// import {three2worldMatGen, world2threeMatGen} from './constTransformGen'
let registered = false;

export default function registerAframeComponents(options) {
  // const three2worldMat = three2worldMatGen();
  // const world2threeMat = world2threeMatGen();
  if (registered) return;
  registered = true;

  const {
    set_rendered,
    robotChange,
    set_controller_object,
    set_trigger_on,
    set_grip_on,
    set_button_a_on,
    set_button_b_on,
    set_c_pos_x, set_c_pos_y, set_c_pos_z,
    set_c_deg_x, set_c_deg_y, set_c_deg_z,
    vrModeRef,
    controller_object,
    Euler_order,
    props,
    onXRFrameMQTT,
    workerLastJoints,
    endLinkPose,
  } = options;
  
  // set rendered state after a short delay to ensure the scene is ready
  setTimeout(() => set_rendered(true), 16.5);

  AFRAME.registerComponent('robot-click', {
    init: function () {
      this.el.addEventListener('click', () => {
        robotChange();
        console.log('robot-click');
      });
    }
  });

  AFRAME.registerComponent('vr-controller-right', {
    schema: { type: 'string', default: '' },
    init: function () {
      set_controller_object(this.el.object3D);
      this.el.object3D.rotation.order = Euler_order;
      // Trigger 
      this.el.addEventListener('triggerdown', () => set_trigger_on(true));
      this.el.addEventListener('triggerup', () => set_trigger_on(false));

      // Gripper
      this.el.addEventListener('gripdown', () => set_grip_on(true));
      this.el.addEventListener('gripup', () => set_grip_on(false));

      // A/B
      this.el.addEventListener('abuttondown', () => set_button_a_on(true));
      this.el.addEventListener('abuttonup', () => set_button_a_on(false));
      this.el.addEventListener('bbuttondown', () => set_button_b_on(true));
      this.el.addEventListener('bbuttonup', () => set_button_b_on(false));

      this.lastPose = new THREE.Matrix4();
      this.count = 0;
    },
    tick: function () {
      const obj = this.el.object3D;
      if (!obj.matrixWorld) return; // not yet initialized
      const pose = obj.matrixWorld;
      if (this._my_init_flag) {
	if (!pose.equals(this.lastPose)) {
          set_controller_object(this.el.object3D);
	  //
	  // // **** debugging output ****
	  // const position = new THREE.Vector3();
	  // position.setFromMatrixPosition(this.el.object3D.matrixWorld);
	  // position.applyMatrix4(three2worldMat); // convert to world coord.
	  // console.log("controller position: " + position.x.toFixed(3)
	  // 	      + ", " + position.y.toFixed(3)
	  // 	      + ", " + position.z.toFixed(3));
	}
      } else {
	set_controller_object(this.el.object3D);
	this._my_init_flag = true;
      }
      ++this.count;
      this.lastPose.copy(pose);
    }
  });

  AFRAME.registerComponent('jtext', {
    schema: {
      text: { type: 'string', default: '' },
      width: { type: 'number', default: 1 },
      height: { type: 'number', default: 0.12 },
      color: { type: 'string', default: 'black' },
      background: { type: 'string', default: 'white' },
      border: { type: 'string', default: 'black' }
    },
    init: function () {
      const el = this.el;
      const data = this.data;
      const bg = document.createElement('a-plane');
      bg.setAttribute('width', data.width);
      bg.setAttribute('height', data.height);
      bg.setAttribute('color', data.background);
      bg.setAttribute('position', '0 0 0.01');
      bg.setAttribute('opacity', '0.8');
      const text = document.createElement('a-entity');
      text.setAttribute('troika-text', {
        value: data.text,
        align: 'center',
        color: data.color,
        fontSize: 0.05,
        maxWidth: data.width * 0.9,
        font: "BIZUDPGothic-Bold.ttf",
      });
      text.setAttribute('position', '0 0 0.01');
      this.text = text;
      el.appendChild(bg);
      el.appendChild(text);
    },
    update: function (oldData) {
      const data = this.data;
      this.text.setAttribute('troika-text', {
        value: data.text,
        align: 'center',
        color: data.color,
        fontSize: 0.05,
        maxWidth: data.width * 0.95,
        font: "BIZUDPGothic-Bold.ttf",
      });
      this.text.setAttribute('position', '0 0 0.01');
    }
  });

  // Start animation in VR scene
  AFRAME.registerComponent('scene', {
    init: function () {
      this.el.addEventListener('enter-vr', () => {
        vrModeRef.current = true;
        console.log('enter-vr');
        if (!props.viewer) {
          let xrSession = this.el.renderer.xr.getSession();
          xrSession.requestAnimationFrame(onXRFrameMQTT);
        }
        set_c_pos_x(0);
        set_c_pos_y(-0.6);
        set_c_pos_z(0.90);
        set_c_deg_x(0);
        set_c_deg_y(0);
        set_c_deg_z(0);
      });
      this.el.addEventListener('exit-vr', () => {
        vrModeRef.current = false;
        console.log('exit-vr');
      });
    },
    tick: function () {
      if (workerLastJoints.current) {
	// console.log('workerLastJoints: '
	// 	    + workerLastJoints.current[0].toFixed(3) + ', '
	// 	    + workerLastJoints.current[1].toFixed(3) + ', '
	// 	    + workerLastJoints.current[2].toFixed(3));
      }
    }
  });
  // ****************
  // Dedicated component for "end-link"
  // this monitors the end-link pose and sets the useRef variable
  // when it moves
  //
  AFRAME.registerComponent('end-link', {
    init() {
      this.lastPose = new THREE.Matrix4();
    },
    tick() {
      const obj = this.el.object3D;
      if (!obj.matrixWorld) return; // not yet initialized

      const pose = obj.matrixWorld;
      // console.log('end-link pose x-axis: '+
      // 		  pose.elements[0].toFixed(3) + ', ' +
      // 		  pose.elements[1].toFixed(3) + ', ' +
      // 		  pose.elements[2].toFixed(3) +
      // 		  ', y-axis: ' +
      // 		  pose.elements[4].toFixed(3) + ', ' +
      // 		  pose.elements[5].toFixed(3) + ', ' +
      // 		  pose.elements[6].toFixed(3) );
      if (this._my_init_flag) {
	if (!pose.equals(this.lastPose)) {
	  // console.log('end-link Moved !!');
	  endLinkPose.current.copy(pose);
	  // // **** debugging output ****
	  // const position = new THREE.Vector3();
	  // position.setFromMatrixPosition(pose);
	  // position.applyMatrix4(world2threeMat); // convert to world coord.
	  // console.log("end link position: " + position.x.toFixed(3)
	  // 	      + ", " + position.y.toFixed(3)
	  // 	      + ", " + position.z.toFixed(3));
	  // console.log("end link position: " + position.x
	  // 	      + ", " + position.y + ", " + position.z);
	  // const quat = new THREE.Quaternion();
	  // quat.setFromRotationMatrix(pose);
	  // console.log("end link quat: " + quat.x + ", " + quat.y
	  // 	      + ", " + quat.z + ", w:" + quat.w);
	}
      } else {
	endLinkPose.current.copy(pose);
	this._my_init_flag = true;
      }
      this.lastPose.copy(pose);
    }
  });

}
