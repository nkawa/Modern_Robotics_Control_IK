import { useEffect } from 'react';
import { connectMQTT, mqttclient, idtopic, subscribeMQTT, publishMQTT, codeType } from '../lib/MetaworkMQTT'
import { AppMode } from './appmode.js';

let firstReceiveJoint = true; // 初回のロボット姿勢を受け取るまで、動作しない
let receive_state = false // ロボットの状態を受信してるかのフラグ

// Try to make independent MQTT functions
export default function useMqtt({
  props,
  requestRobot,
  setThetaBody,
  setThetaTool,
  robotIDRef,
  MQTT_DEVICE_TOPIC,
  MQTT_CTRL_TOPIC,
  MQTT_ROBOT_STATE_TOPIC,
}) {
  useEffect(() => {
    // connect to MQTT broker  
    if (typeof window.mqttClient === 'undefined') {
      if (props.appmode != AppMode.viewer) {
        window.mqttClient = connectMQTT(requestRobot);
      } else { // Viewer modeでは、 request しない
        window.mqttClient = connectMQTT();
      }
    }

    // Viewerと normal では、 handler を分ける(シンプルに）
    if (props.appmode == AppMode.viewer) {
      console.log("Initialize MQTT for Viewer Mode", MQTT_DEVICE_TOPIC);
      const handler = (topic, message) => {
        let data;
//        console.log("get MQTT Message:", topic, message.toString());
        try {
          data = JSON.parse(message.toString());
        } catch (e) {
          console.warn("MQTT error:", message.toString());
          return;
        }

        if (topic === MQTT_DEVICE_TOPIC) {
//          console.log("Viewer MQTT Device Topic: ", message.toString());
          if (data.devId != undefined) {
            robotIDRef.current = data.devId;
            const vrTopic = MQTT_CTRL_TOPIC + data.devId;
            subscribeMQTT(vrTopic);// 制御用トピックをサブスクライブ
          }
          return;
        }

        // subscribe joints and tool angles
        if (robotIDRef.current && topic === MQTT_CTRL_TOPIC + robotIDRef.current) {
          if (data.joints != undefined) {
            setThetaBody(prev => {
              const thetaJoints = data.joints.map(angle => angle * Math.PI / 180); // Convert to radians
              if (JSON.stringify(prev) !== JSON.stringify(thetaJoints)) {
                return thetaJoints;
              }
              //              console.log("Time:", data.time, "From:", topic, "Send Joint Body:", data.joints);
              return prev;
            });
          }
          if (data.tool != undefined) {
            setThetaTool(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(data.tool)) {
                return data.tool;
              }
              //             console.log("Time:", data.time, "From:", topic, "Send Joint Tool:", data.tool);
              return prev;
            });
          }
        }
      }
      window.mqttClient.on('message', handler);
 
    } else { // normal mode

      const handler = (topic, message) => {
        let data;
        // console.log("get MQTT Message:", topic, message.toString());
        try {
          data = JSON.parse(message.toString());
        } catch (e) {
          console.warn("MQTT error:", message.toString());
          return;
        }
        if (topic === MQTT_DEVICE_TOPIC) { // response 
          let data = JSON.parse(message.toString())
          console.log(" MQTT Device Topic: ", message.toString());
          if (data.devId === "none") {
            console.log("Can't find robot!")
          } else {
            robotIDRef.current = data.devId
            if (receive_state === false) { // ロボットの姿勢を受け取るまで、スタートしない。
              subscribeMQTT([
                MQTT_ROBOT_STATE_TOPIC + robotIDRef.current // 接続した実ロボットの姿勢を待つ
              ])
            }
          }
          return;
        }
        if (topic === MQTT_ROBOT_STATE_TOPIC + robotIDRef.current) { // 実ロボットの姿勢を受け取ったら
          let data = JSON.parse(message.toString()) ///
          const joints = data.joints
          // ここで、joints の安全チェックをすべき
          //mqttclient.unsubscribe(MQTT_ROBOT_STATE_TOPIC+robotIDRef.current) // これでロボット姿勢の受信は終わり
          if (firstReceiveJoint ) {
            console.log("Receive Robot Joints:", joints);

          // 受け取った位置をセットする
            setThetaBody(prev => {
              const thetaJoints = data.joints.map(angle => angle * Math.PI / 180); // Convert to radians
              if (JSON.stringify(prev) !== JSON.stringify(thetaJoints)) {
                return thetaJoints;
              }
              return prev;
            })
          }

          if (firstReceiveJoint) { // 本当はダメ！ // TCP を設定したい。
            firstReceiveJoint = false
            window.setTimeout(() => {
              console.log("Start to send movement!", robotIDRef.current);
              receive_state = true; //
              publishMQTT("dev/" + robotIDRef.current, JSON.stringify({ controller: "browser", devId: idtopic })) // 自分の topic を教える
            },500);
          }
        }


      }
      window.mqttClient.on('message', handler);


    }

    // define the joint handler for incoming messages

    // if (!props.viewer && topic === MQTT_ROBOT_STATE_TOPIC + robotIDRef.current) { ... }


    const handleBeforeUnload = () => {
      if (mqttclient != undefined) {
        publishMQTT("mgr/unregister", JSON.stringify({ devId: idtopic }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.mqttClient.off('message', handler);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
