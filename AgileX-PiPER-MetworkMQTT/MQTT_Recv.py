import json
from paho.mqtt import client as mqtt
import multiprocessing as mp
import multiprocessing.shared_memory as sm
import socket

from multiprocessing import Process, Queue

import sys
import os
from datetime import datetime
import math
import numpy as np
import time

## ここでUUID を使いたい
import uuid

from dotenv import load_dotenv
import ipget

load_dotenv(os.path.join(os.path.dirname(__file__),'.env'))

MQTT_SERVER = os.getenv("MQTT_SERVER", "sora2.uclab.jp")
USER_UUID = "84f289d0-bf07-4ad2-baf1-a4c8f7c9a763-qk4b9zg-viewer"
MQTT_CTRL_TOPIC ="control/" + USER_UUID # MANAGE_RECV_TOPIC で動的に変更される

ROBOT_UUID = os.getenv("ROBOT_UUID","no-uuid")
ROBOT_MODEL = os.getenv("ROBOT_MODEL","piper")
MQTT_MANAGE_TOPIC = os.getenv("MQTT_MANAGE_TOPIC", "dev")
MQTT_MANAGE_RCV_TOPIC = os.getenv("MQTT_MANAGE_RCV_TOPIC", "dev")+"/"+ROBOT_UUID

# Get Host IP Address
def get_ip_list():
    ll = ipget.ipget()
    flag = False
    ips = []
    for p in ll.list:
        if flag:
            flag=False
            if p == "127.0.0.1/8":
                continue
            ips.append(p)
        if p == "inet":
            flag = True
    return ips

class MQTT_Recv:
    def __init__(self):
        self.start = -1

    def on_connect(self,client, userdata, flag, rc):
        print("MQTT:Connected with result code " + str(rc), "subscribe topic:", MQTT_CTRL_TOPIC)  # 接続できた旨表示
        self.client.subscribe(MQTT_CTRL_TOPIC) #　connected -> subscribe

        # ここで、MyID Register すべき
        my_info = {
            "date" :  str(datetime.today()),
            "version": "0.0.1",
            "devType": "robot",
            "robotModel": ROBOT_MODEL,
            "codeType": "PiPER-control",
            "IP": get_ip_list(),
            "devId": ROBOT_UUID 
        }
        self.client.publish("mgr/register", json.dumps(my_info))
        print("Publish",json.dumps(my_info))

        self.client.subscribe(MQTT_MANAGE_RCV_TOPIC) #　connected -> subscribe

    def on_disconnect(self,client, userdata, rc):
        if  rc != 0:
            print("Unexpected disconnection.")

    def on_message(self,client, userdata, msg):
        global MQTT_CTRL_TOPIC
        # print("收到MQTT消息:", msg.topic, msg.payload)
        if msg.topic == MQTT_MANAGE_RCV_TOPIC:  # 受信先を指定された場合
            js = json.loads(msg.payload)
            if "controller" in js:
                if "devId" in js:
                    MQTT_CTRL_TOPIC = "control/"+js["devId"]
                    self.client.subscribe(MQTT_CTRL_TOPIC) #　connected -> subscribe
                    print("Receive Contoller msg, then listen", MQTT_CTRL_TOPIC)
            
        if msg.topic == MQTT_CTRL_TOPIC:
            # Message ThetaBody
            js_joints = json.loads(msg.payload)
            joints =js_joints["joints"]
            thetaBody = [joints[i] if i < len(joints) else 0 for i in range(7)]
            # print("Set thetaBody:", thetaBody)

            # Message ThetaTool
            js_tool = js_joints["tool"]
            thetaTool = js_tool
            # print("Set thetaTool:", thetaTool)

            # Save to shared memory
            self.pose[8:15] = thetaBody
            self.pose[15] = thetaTool 
            # print("Shared memory:", self.pose[8:16])
        else:
            print("not subscribe msg",msg.topic)


    def start_mqtt(self):
        self.client = mqtt.Client()  
        self.client.on_connect = self.on_connect         # 接続時のコールバック関数を登録
        self.client.on_disconnect = self.on_disconnect   # 切断時のコールバックを登録
        self.client.on_message = self.on_message         # メッセージ到着時のコールバック
        self.client.connect(MQTT_SERVER, 1883, 60)
        # self.client.loop_forever()   # 通信処理開始
        self.client.loop_start()

    def run_proc(self):
        self.sm = mp.shared_memory.SharedMemory("PiPER")
        self.pose = np.ndarray((16,), dtype=np.dtype("float32"), buffer=self.sm.buf)
        self.start_mqtt()

    def get_shared_memory(self):
        return self.pose
    
    def get_shm_object(self):
        return self.sm
