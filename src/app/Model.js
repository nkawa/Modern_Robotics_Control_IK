import React from 'react';

// Robot Params
const L_01 = 0.123, L_23 = 0.28503, L_34 = 0.25075, L_56 = 0.091, L_ee = 0.1358;
const W_34 = 0.0219;

const rad2deg = rad => rad * 180 / Math.PI;

// Agilex Piper Model
// const Model = (props) => {
//   const { theta_body = [0,0,0,0,0,0], theta_tool = 24 } = props;
//   const [theta1, theta2, theta3, theta4, theta5, theta6] = theta_body.map(rad2deg);

//   const finger_pos = (((theta_tool)*0.4) / 1000)+0.0004;

//   return (
//     <>
//       {/* Plane */}
//       <a-plane
//         position="0 0 0"
//         rotation="-90 0 0"
//         width="1.2"
//         height="1.2"
//         color="#e0e0e0"
//         opacity="0.5"
//         visible="false"
//       ></a-plane>

//       {/* Robot Base */}
//       <a-entity robot-click="" gltf-model="#base" position={'0 0 0'} visible="true">
//         {/* J1 */}
//         <a-entity j_id="1" gltf-model="#j1" position={'0 0 0'} rotation={`0 ${theta1-180} 0`}>
//           {/* J2 */}
//           <a-entity j_id="2" gltf-model="#j2" position={`0 ${L_01} 0`} rotation={`${theta2} 0 0`}>
//             {/* J3 */}
//             <a-entity j_id="3" gltf-model="#j3" position={`0 ${L_23} 0`} rotation={`${theta3} 0 0`}>
//               {/* J4 */}
//               <a-entity j_id="4" gltf-model="#j4" position={`0 ${L_34} -${W_34}`} rotation={`0 ${theta4} 0`}>
//                 {/* J5 */}
//                 <a-entity j_id="5" gltf-model="#j5" position={`0 0 0`} rotation={`${theta5-90} 0 0`}>
//                   {/* J6 */}
//                   <a-entity j_id="6" gltf-model="#j6" position={`0 0 0`} rotation={`0 0 ${theta6}`}>
//                     {/* Tool */}
//                       <a-entity gltf-model="#j6_1" position={`${finger_pos} 0 ${L_56+L_ee}`}></a-entity>
//                       <a-entity gltf-model="#j6_2" position={`${-finger_pos} 0 ${L_56+L_ee}`}></a-entity>
//                   </a-entity>
//                 </a-entity>
//               </a-entity>
//             </a-entity>
//           </a-entity>
//         </a-entity>
//       </a-entity>
//     </>
//   );
// }

// Jaka_ZU_5 Robot Params
const Model = (props) => {
  const { theta_body = [0,0,0,0,0,0], theta_tool = 24 } = props;
  const [theta1, theta2, theta3, theta4, theta5, theta6] = theta_body.map(rad2deg);
  const L_01 = 0.12015, L_23 = 0.43, L_34 = 0.3685, W_45 = 0.114, L_56 = 0.1135

  return (
    <>
      {/* Plane */}
      <a-plane
        position="0 0 0"
        rotation="-90 0 0"
        width="1.2"
        height="1.2"
        color="#e0e0e0"
        opacity="0.0"
        visible="False"
      ></a-plane>

      {/* Robot Base */}
      <a-entity robot-click="" gltf-model="#base" position={'0 0 0'} rotation={`0 -180 0`} visible="true">
        {/* J1 */}
        <a-entity j_id="1" gltf-model="#j1" position={'0 0 0'} rotation={`0 ${theta1-180} 0`}>
          {/* J2 */}
          <a-entity j_id="2" gltf-model="#j2" position={`0 ${L_01} 0`} rotation={`${-theta2} 0 0`}>
            {/* J3 */}
            <a-entity j_id="3" gltf-model="#j3" position={`0 ${L_23} 0`} rotation={`${-theta3} 0 0`}>
              {/* J4 */}
              <a-entity j_id="4" gltf-model="#j4" position={`0 ${L_34} 0`} rotation={`${-theta4} 0 0`}>
                {/* J5 */}
                <a-entity j_id="5" gltf-model="#j5" position={`${W_45} ${L_56} 0.0`} rotation={`0 ${theta5-90} 0 `}>
                  {/* J6 */}
                  <a-entity j_id="6" gltf-model="#j6" position={`0 0 0`} rotation={`0 0 ${theta6}`}>
                    {/* Tool */}
                      {/* <a-entity gltf-model="#j6_1" position={`${finger_pos} 0 ${L_56+L_ee}`}></a-entity>
                      <a-entity gltf-model="#j6_2" position={`${-finger_pos} 0 ${L_56+L_ee}`}></a-entity> */}
                      {/* <a-entity end-link position={`0 0 ${L_56+L_ee}`} rotation={`0 0 -90`}></a-entity> */}
                  </a-entity>
                </a-entity>
              </a-entity>
            </a-entity>
          </a-entity>
        </a-entity>
      </a-entity>
    </>
  );
}

const Select_Robot = (props)=>{
  const {robotNameList, robotName, ...rotateProps} = props;
  const visibletable = robotNameList.map(()=>false);
  const findindex = robotNameList.findIndex((e)=>e===robotName);
  if(findindex >= 0){
    visibletable[findindex] = true;
  }
  return (<>
    <Model visible={visibletable[0]} {...rotateProps}/>
  </>);
}

export { Select_Robot };