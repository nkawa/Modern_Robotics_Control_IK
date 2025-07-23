import React from 'react';

const Assets = ({robot_model})=>{
  if (robot_model === "agilex_piper") {
      return (
        <a-assets>
          {/*Model*/}
          <a-asset-items id="base" src={`/${robot_model}/base_link.gltf`} ></a-asset-items>
          <a-asset-items id="j1" src={`/${robot_model}/link1.gltf`} ></a-asset-items>
          <a-asset-items id="j2" src={`/${robot_model}/link2.gltf`} ></a-asset-items>
          <a-asset-items id="j3" src={`/${robot_model}/link3.gltf`} ></a-asset-items>
          <a-asset-items id="j4" src={`/${robot_model}/link4.gltf`} ></a-asset-items>
          <a-asset-items id="j5" src={`/${robot_model}/link5.gltf`} ></a-asset-items>
          <a-asset-items id="j6" src={`/${robot_model}/link6.gltf`} ></a-asset-items>
          <a-asset-items id="j6_1" src={`/${robot_model}/link7.gltf`} ></a-asset-items>
          <a-asset-items id="j6_2" src={`/${robot_model}/link8.gltf`} ></a-asset-items>
        </a-assets>
      )
    }
  else if (robot_model === "jaka_zu_5") {
  return (
    <a-assets>
      {/*Model*/}
      <a-asset-items id="base" src={`/${robot_model}/JAKA_Zu_5_BASE.gltf`} ></a-asset-items>
      <a-asset-items id="j1" src={`/${robot_model}/JAKA_Zu_5_J1.gltf`} ></a-asset-items>
      <a-asset-items id="j2" src={`/${robot_model}/JAKA_Zu_5_J2.gltf`} ></a-asset-items>
      <a-asset-items id="j3" src={`/${robot_model}/JAKA_Zu_5_J3.gltf`} ></a-asset-items>
      <a-asset-items id="j4" src={`/${robot_model}/JAKA_Zu_5_J4.gltf`} ></a-asset-items>
      <a-asset-items id="j5" src={`/${robot_model}/JAKA_Zu_5_J5.gltf`} ></a-asset-items>
      <a-asset-items id="j6" src={`/${robot_model}/JAKA_Zu_5_J6.gltf`} ></a-asset-items>
      <a-asset-items id="j6_1" src={`/${robot_model}/AG-160-95-body.gltf`} ></a-asset-items>
      <a-asset-items id="j6_2a" src={`/${robot_model}/AG-160-95-2a.gltf`} ></a-asset-items>
      <a-asset-items id="j6_2b" src={`/${robot_model}/AG-160-95-2b.gltf`} ></a-asset-items>
      <a-asset-items id="j6_3a" src={`/${robot_model}/AG-160-95-3a.gltf`} ></a-asset-items>
      <a-asset-items id="j6_3b" src={`/${robot_model}/AG-160-95-3b.gltf`} ></a-asset-items>
      <a-asset-items id="j6_4a" src={`/${robot_model}/AG-160-95-4a.gltf`} ></a-asset-items>
      <a-asset-items id="j6_4b" src={`/${robot_model}/AG-160-95-4b.gltf`} ></a-asset-items>
    </a-assets>
    )
  }
}
export default Assets;
